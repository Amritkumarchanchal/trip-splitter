// State Management
let appState = {
    tripName: '',
    members: [],
    upis: {}, // Maps member name to UPI ID
    expenses: []
};

// DOM Elements
const welcomeModal = document.getElementById('welcomeModal');
const mainApp = document.getElementById('mainApp');
const setupTripName = document.getElementById('setupTripName');
const startTripBtn = document.getElementById('startTripBtn');

const controlTripName = document.getElementById('controlTripName');
const displayTripName = document.getElementById('displayTripName');
const totalMembersDisplay = document.getElementById('totalMembers');

const newMemberInput = document.getElementById('newMemberInput');
const newMemberUpi = document.getElementById('newMemberUpi');
const addMemberBtn = document.getElementById('addMemberBtn');
const membersList = document.getElementById('membersList');
const expensePayerSelect = document.getElementById('expensePayer');

const expenseForm = document.getElementById('expenseForm');
const expenseItem = document.getElementById('expenseItem');
const expenseAmount = document.getElementById('expenseAmount');
const expensesBody = document.getElementById('expensesBody');
const totalExpenseAmountDisplay = document.getElementById('totalExpenseAmount');

const settlementsBody = document.getElementById('settlementsBody');

const exportBtn = document.getElementById('exportBtn');
const resetBtn = document.getElementById('resetBtn');

const paymentModal = document.getElementById('paymentModal');
const closePaymentModal = document.getElementById('closePaymentModal');
const payeeName = document.getElementById('payeeName');
const payeeUpi = document.getElementById('payeeUpi');
const paymentAmount = document.getElementById('paymentAmount');
const paymentQRCode = document.getElementById('paymentQRCode');
const openUpiAppBtn = document.getElementById('openUpiAppBtn');
const openGPayBtn = document.getElementById('openGPayBtn');
const openPhonepeBtn = document.getElementById('openPhonepeBtn');
const openPaytmBtn = document.getElementById('openPaytmBtn');

// Initialize App
function init() {
    loadState();
    
    // Check if new trip
    if (!appState.tripName) {
        welcomeModal.style.display = 'flex';
        mainApp.style.display = 'none';
        setupTripName.focus();
    } else {
        welcomeModal.style.display = 'none';
        mainApp.style.display = 'flex';
        renderAll();
    }
}

// LocalStorage
function loadState() {
    const saved = localStorage.getItem('tripSplitterState');
    if (saved) {
        try {
            appState = JSON.parse(saved);
            // Ensure upis object exists for backwards compatibility
            if (!appState.upis) appState.upis = {};
        } catch (e) {
            console.error("Failed to parse LocalStorage data.");
        }
    }
}

function saveState() {
    localStorage.setItem('tripSplitterState', JSON.stringify(appState));
}

// Event Listeners
startTripBtn.addEventListener('click', () => {
    const name = setupTripName.value.trim();
    if (name) {
        appState.tripName = name;
        saveState();
        welcomeModal.style.display = 'none';
        mainApp.style.display = 'flex';
        renderAll();
    } else {
        alert("Please enter a trip name.");
    }
});
setupTripName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startTripBtn.click();
});

addMemberBtn.addEventListener('click', addMember);
newMemberInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addMember();
});
newMemberUpi.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addMember();
});

expenseForm.addEventListener('submit', addExpense);

exportBtn.addEventListener('click', exportToPNG);

closePaymentModal.addEventListener('click', () => {
    paymentModal.style.display = 'none';
});

document.addEventListener('click', (e) => {
    // Reset Button
    if (e.target.closest('#resetBtn')) {
        if (confirm("Are you sure you want to completely reset? This cannot be undone.")) {
            localStorage.removeItem('tripSplitterState');
            appState = { tripName: '', members: [], upis: {}, expenses: [] };
            location.reload(); 
        }
    }
    
    // Remove Member
    if (e.target.classList.contains('remove-member')) {
        const name = e.target.getAttribute('data-name');
        removeMember(name);
    }
    // Edit UPI
    if (e.target.classList.contains('edit-upi')) {
        const name = e.target.getAttribute('data-name');
        const currentUpi = appState.upis[name] || '';
        const newUpi = prompt(`Enter UPI ID for ${name}:`, currentUpi);
        if (newUpi !== null) {
            if (newUpi.trim() === '') {
                delete appState.upis[name];
            } else {
                appState.upis[name] = newUpi.trim();
            }
            saveState();
            renderAll();
        }
    }
    // Delete Expense
    if (e.target.classList.contains('delete-expense')) {
        const id = parseInt(e.target.getAttribute('data-id'));
        deleteExpense(id);
    }
    // Pay Button Click
    if (e.target.closest('.pay-btn')) {
        const btn = e.target.closest('.pay-btn');
        const name = btn.getAttribute('data-name');
        const upi = btn.getAttribute('data-upi');
        const amount = btn.getAttribute('data-amount');
        
        // Generate UPI URL (standard format)
        const upiUrl = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR`;
        
        // Update modal with payment details
        payeeName.textContent = name;
        payeeUpi.textContent = upi;
        paymentAmount.textContent = amount;
        
        // Generate proper UPI QR code
        generateUPIQRCode(upiUrl);
        
        // Set up app-specific payment links
        openGPayBtn.href = `googlepaytez://upi/pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR`;
        openPhonepeBtn.href = `phonepe://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR`;
        openPaytmBtn.href = `paytmqr://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR`;
        openUpiAppBtn.href = upiUrl;
        
        paymentModal.style.display = 'flex';
    }
});

// Logic Functions
function addMember() {
    const name = newMemberInput.value.trim();
    const upi = newMemberUpi.value.trim();
    
    if (name && !appState.members.includes(name)) {
        appState.members.push(name);
        if (upi) {
            appState.upis[name] = upi;
        }
        newMemberInput.value = '';
        newMemberUpi.value = '';
        saveState();
        renderAll();
    }
}

function removeMember(name) {
    if (confirm(`Remove ${name}?`)) {
        appState.members = appState.members.filter(m => m !== name);
        delete appState.upis[name];
        saveState();
        renderAll();
    }
}

function addExpense(e) {
    e.preventDefault();
    const item = expenseItem.value.trim();
    const amount = parseFloat(expenseAmount.value);
    const payer = expensePayerSelect.value;

    if (item && amount > 0 && payer) {
        appState.expenses.push({
            id: Date.now(),
            item,
            amount,
            payer
        });
        
        expenseItem.value = '';
        expenseAmount.value = '';
        expensePayerSelect.value = '';
        
        saveState();
        renderAll();
    }
}

function deleteExpense(id) {
    appState.expenses = appState.expenses.filter(e => e.id !== id);
    saveState();
    renderAll();
}

// Render Functions
function renderAll() {
    controlTripName.textContent = appState.tripName;
    displayTripName.textContent = appState.tripName;
    totalMembersDisplay.textContent = appState.members.length;

    renderMembers();
    renderExpenses();
    calculateAndRenderSettlements();
}

function renderMembers() {
    membersList.innerHTML = appState.members.map(m => {
        let upiBadge = appState.upis && appState.upis[m] 
            ? `<span style="font-size:0.7em; color:var(--success); margin-left:4px; cursor:pointer;" class="edit-upi" data-name="${m}" title="${appState.upis[m]}">UPI ✎</span>` 
            : `<span style="font-size:0.7em; color:var(--text-muted); margin-left:4px; cursor:pointer;" class="edit-upi" data-name="${m}">+UPI</span>`;
            
        return `
        <div class="member-badge">
            ${m} ${upiBadge} <span class="remove-member" data-name="${m}" style="margin-left:8px;">✕</span>
        </div>
        `;
    }).join('');

    const currentPayer = expensePayerSelect.value;
    expensePayerSelect.innerHTML = '<option value="" disabled selected>Paid By...</option>' + 
        appState.members.map(m => `<option value="${m}">${m}</option>`).join('');
    
    if (appState.members.includes(currentPayer)) {
        expensePayerSelect.value = currentPayer;
    }
}

function renderExpenses() {
    let total = 0;
    expensesBody.innerHTML = appState.expenses.map(e => {
        total += e.amount;
        return `
            <tr>
                <td>${e.item}</td>
                <td>₹${e.amount}</td>
                <td>${e.payer}</td>
                <td class="no-print" style="text-align: right;">
                    <button class="btn btn-text delete-expense" data-id="${e.id}">Delete</button>
                </td>
            </tr>
        `;
    }).join('');

    if (appState.expenses.length === 0) {
        expensesBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 1rem;">No expenses yet.</td></tr>`;
    }

    totalExpenseAmountDisplay.textContent = `₹${total}`;
}

function calculateAndRenderSettlements() {
    if (appState.members.length === 0) {
        settlementsBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 1rem;">Add members to see settlements.</td></tr>`;
        return;
    }

    let totalExpense = appState.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    let perPersonShare = totalExpense / appState.members.length;

    let balances = {};
    appState.members.forEach(m => balances[m] = 0);

    appState.expenses.forEach(exp => {
        if (balances[exp.payer] !== undefined) {
            balances[exp.payer] += exp.amount;
        }
    });

    appState.members.forEach(m => balances[m] -= perPersonShare);

    let creditors = [];
    let debtors = [];

    for (const [person, amount] of Object.entries(balances)) {
        if (amount > 0.01) creditors.push({ person, amount });
        else if (amount < -0.01) debtors.push({ person, amount: Math.abs(amount) });
    }

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    let transactions = [];
    let i = 0; let j = 0;

    while (i < creditors.length && j < debtors.length) {
        let creditor = creditors[i];
        let debtor = debtors[j];

        let amount = Math.min(creditor.amount, debtor.amount);
        let roundedAmount = Math.round(amount);

        if (roundedAmount > 0) {
            transactions.push({
                from: debtor.person,
                to: creditor.person,
                amount: roundedAmount
            });
        }

        creditor.amount -= amount;
        debtor.amount -= amount;

        if (creditor.amount < 0.01) i++;
        if (debtor.amount < 0.01) j++;
    }

    if (transactions.length === 0 && appState.expenses.length > 0) {
        settlementsBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--success); padding: 1rem;">All settled up!</td></tr>`;
    } else if (transactions.length === 0) {
        settlementsBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 1rem;">No settlements yet.</td></tr>`;
    } else {
        settlementsBody.innerHTML = transactions.map(t => {
            let upi = appState.upis && appState.upis[t.to];
            let payBtn = upi ? `<button class="btn btn-success btn-icon no-print pay-btn" data-name="${t.to}" data-upi="${upi}" data-amount="${t.amount}" style="font-size:0.8rem; padding:0.3rem 0.6rem;">Pay</button>` : '';
            return `
            <tr>
                <td>${t.from}</td>
                <td style="color: var(--text-muted); text-align: center;">→</td>
                <td>${t.to}</td>
                <td>₹${t.amount}</td>
                <td class="no-print" style="text-align:right;">${payBtn}</td>
            </tr>
            `;
        }).join('');
    }
}

// Generate UPI QR Code
function generateUPIQRCode(upiUrl) {
    // Clear previous QR code
    const canvas = paymentQRCode;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Use QRCode library to generate QR
    try {
        new QRCode(canvas, {
            text: upiUrl,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch (e) {
        console.error("Error generating QR code:", e);
        // Fallback: show error message
        ctx.fillStyle = "#ff0000";
        ctx.font = "12px Arial";
        ctx.fillText("QR Error", 50, 100);
    }
}

// Export Function
function exportToPNG() {
    const exportArea = document.getElementById('exportArea');
    const originalBg = exportArea.style.background;
    
    // Set explicit background for export
    exportArea.style.background = getComputedStyle(document.body).getPropertyValue('--card-bg');
    exportArea.style.padding = '20px';
    exportArea.style.borderRadius = '16px';
    
    const noPrintElements = document.querySelectorAll('.no-print');
    noPrintElements.forEach(el => el.style.display = 'none');

    // Make table borders solid
    const exportCard = exportArea.querySelector('.export-card');
    exportCard.style.border = 'none'; // remove outer border for cleaner look

    html2canvas(exportArea, {
        scale: 2,
        backgroundColor: getComputedStyle(document.body).getPropertyValue('--card-bg'),
        logging: false,
        useCORS: true
    }).then(canvas => {
        // Restore styles
        exportArea.style.background = originalBg;
        exportArea.style.padding = '';
        exportArea.style.borderRadius = '';
        noPrintElements.forEach(el => el.style.display = '');
        exportCard.style.border = '';

        const safeName = appState.tripName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
        const filename = `${safeName || 'Trip'}_Settlements.png`;

        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(err => {
        console.error("Error generating image", err);
        alert("Failed to export image. Please try again.");
    });
}

// Boot up
init();
