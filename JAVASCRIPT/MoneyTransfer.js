// ========================================
// FINEDGE - MONEY TRANSFER
// ========================================

// Initial account balances
const defaultAccounts = {
    savings: 85240,
    current: 39260
};

// Load accounts from LocalStorage
let accounts = JSON.parse(localStorage.getItem("accounts")) || defaultAccounts;

// Load transactions from LocalStorage
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

// DOM Elements
const transferForm = document.getElementById("transferForm");
const accountSelect = document.getElementById("accountSelect");
const recipientInput = document.getElementById("recipient");
const amountInput = document.getElementById("amount");
const noteInput = document.getElementById("note");
const balanceDisplay = document.getElementById("balanceDisplay");
const message = document.getElementById("message");
const transactionList = document.getElementById("transactionList");


// ========================================
// 1. DISPLAY BALANCE
// ========================================

function displayBalance() {

    const selectedAccount = accountSelect.value;

    const balance = accounts[selectedAccount];

    balanceDisplay.textContent =
        `Available Balance: ₹${balance.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
}


// ========================================
// 2. ACCOUNT SELECTION
// ========================================

accountSelect.addEventListener("change", function () {

    displayBalance();

});


// ========================================
// 3. FORM SUBMISSION
// ========================================

transferForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const recipient = recipientInput.value.trim();
    const amount = Number(amountInput.value);
    const note = noteInput.value.trim();

    const selectedAccount = accountSelect.value;
    const balance = accounts[selectedAccount];


    // ========================================
    // 4. VALIDATION
    // ========================================

    if (recipient === "") {

        showMessage("Please enter recipient details.", "error");
        return;

    }


    if (amountInput.value === "" || amount <= 0) {

        showMessage("Please enter a valid amount.", "error");
        return;

    }


    if (!isValidRecipient(recipient)) {

        showMessage("Enter a valid UPI ID or account number.", "error");
        return;

    }


    // ========================================
    // 5. CHECK BALANCE
    // ========================================

    if (amount > balance) {

        showMessage("Insufficient balance!", "error");
        return;

    }


    // ========================================
    // 6. CONFIRM TRANSFER
    // ========================================

    const confirmTransfer = confirm(
        `Confirm transfer of ₹${amount.toLocaleString("en-IN")} to ${recipient}?`
    );

    if (!confirmTransfer) {

        return;

    }


    // ========================================
    // 7. UPDATE BALANCE
    // ========================================

    accounts[selectedAccount] -= amount;


    // ========================================
    // 8. CREATE TRANSACTION
    // ========================================

    const transaction = {

        id: Date.now(),

        recipient: recipient,

        amount: amount,

        account: selectedAccount,

        note: note || "Money Transfer",

        date: new Date().toLocaleString("en-IN")

    };


    transactions.unshift(transaction);


    // ========================================
    // 9. SAVE DATA IN LOCALSTORAGE
    // ========================================

    localStorage.setItem("accounts", JSON.stringify(accounts));

    localStorage.setItem("transactions", JSON.stringify(transactions));


    // ========================================
    // 10. UPDATE UI
    // ========================================

    displayBalance();

    displayTransactions();

    showMessage("Transfer successful!", "success");


    // ========================================
    // 11. RESET FORM
    // ========================================

    recipientInput.value = "";

    amountInput.value = "";

    noteInput.value = "";

});


// ========================================
// 12. RECIPIENT VALIDATION
// ========================================

function isValidRecipient(recipient) {

    // Basic UPI ID format
    const upiPattern = /^[\w.-]+@[\w.-]+$/;

    // Account number: 9 to 18 digits
    const accountPattern = /^\d{9,18}$/;

    return upiPattern.test(recipient) || accountPattern.test(recipient);

}


// ========================================
// 13. SHOW SUCCESS / ERROR MESSAGE
// ========================================

function showMessage(text, type) {

    message.textContent = text;

    message.style.padding = "12px";

    message.style.marginTop = "15px";

    message.style.borderRadius = "8px";

    message.style.fontSize = "13px";

    if (type === "success") {

        message.style.backgroundColor = "#dcfce7";

        message.style.color = "#166534";

    } else {

        message.style.backgroundColor = "#fee2e2";

        message.style.color = "#991b1b";

    }


    // Automatically hide message
    setTimeout(function () {

        message.textContent = "";

        message.style.padding = "0";

        message.style.marginTop = "0";

    }, 4000);

}


// ========================================
// 14. DISPLAY TRANSACTION HISTORY
// ========================================

function displayTransactions() {

    transactionList.innerHTML = "";


    if (transactions.length === 0) {

        transactionList.innerHTML = "<p>No transactions yet.</p>";

        return;

    }


    transactions.forEach(function (transaction) {

        const transactionDiv = document.createElement("div");

        transactionDiv.style.padding = "15px 0";

        transactionDiv.style.borderBottom = "1px solid #e2e8f0";


        const title = document.createElement("p");

        title.style.fontWeight = "600";

        title.textContent = `Sent to: ${transaction.recipient}`;


        const amountText = document.createElement("p");

        amountText.style.color = "#ef4444";

        amountText.textContent =
            `- ₹${transaction.amount.toLocaleString("en-IN")}`;


        const noteText = document.createElement("p");

        noteText.style.fontSize = "12px";

        noteText.style.color = "#64748b";

        noteText.textContent = transaction.note;


        const dateText = document.createElement("p");

        dateText.style.fontSize = "12px";

        dateText.style.color = "#64748b";

        dateText.textContent = transaction.date;


        transactionDiv.appendChild(title);

        transactionDiv.appendChild(amountText);

        transactionDiv.appendChild(noteText);

        transactionDiv.appendChild(dateText);


        transactionList.appendChild(transactionDiv);

    });

}


// ========================================
// 15. INITIALIZE PAGE
// ========================================

displayBalance();

displayTransactions();