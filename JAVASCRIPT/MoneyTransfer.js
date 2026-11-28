const transferForm = document.getElementById("transferForm");
const accountSelect = document.getElementById("accountSelect");
const balanceDisplay = document.getElementById("balanceDisplay");
const recipientInput = document.getElementById("recipient");
const amountInput = document.getElementById("amount");
const noteInput = document.getElementById("note");
const transferButton = document.getElementById("transferButton");
const transferMessage = document.getElementById("message");
const transferStorageMessage = document.getElementById("transferStorageMessage");
const transactionList = document.getElementById("transactionList");

let accounts = [];
let transfers = [];
let canTransfer = true;

function isValidAccounts(value) {
    return Array.isArray(value) && value.every(account =>
        account &&
        typeof account.id === "string" &&
        typeof account.name === "string" &&
        typeof account.type === "string" &&
        Number.isFinite(Number(account.balance)) &&
        Number(account.balance) >= 0 &&
        /^\d{4}$/.test(account.lastFour) &&
        typeof account.bank === "string"
    );
}

function isValidTransfers(value) {
    return Array.isArray(value) && value.every(transfer =>
        transfer &&
        typeof transfer.id === "string" &&
        typeof transfer.accountId === "string" &&
        typeof transfer.accountName === "string" &&
        /^\d{4}$/.test(transfer.accountLastFour) &&
        typeof transfer.recipient === "string" &&
        Number.isFinite(Number(transfer.amount)) &&
        Number(transfer.amount) > 0 &&
        typeof transfer.note === "string" &&
        typeof transfer.date === "string" &&
        Number.isFinite(Date.parse(transfer.date))
    );
}

function setStorageMessage(message) {
    transferStorageMessage.textContent = message;
    transferStorageMessage.hidden = !message;
}

function showTransferMessage(message, type) {
    transferMessage.textContent = message;
    transferMessage.className = "transfer-message" + (type ? " " + type : "");
}

async function loadData() {
    accounts = [];
    transfers = [];
    canTransfer = false;
    renderAll();

    try {
        const data = await window.FinEdgeUserData.load();
        if (!isValidAccounts(data.accounts) || !isValidTransfers(data.transfers)) {
            throw new TypeError("Saved account or transfer data has an invalid structure.");
        }
        accounts = data.accounts;
        transfers = data.transfers;
        canTransfer = true;
        setStorageMessage("");
    } catch (error) {
        console.error("Could not load transfer data.", error);
        setStorageMessage("Could not load accounts and transfers from the server. Transfers are disabled.");
    }

    renderAll();
}

function formatCurrency(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function getSelectedAccount() {
    return accounts.find(account => account.id === accountSelect.value) || null;
}

function renderAccounts() {
    const previouslySelected = accountSelect.value;
    accountSelect.replaceChildren();

    accounts.forEach(account => {
        const option = createElement(
            "option",
            "",
            account.name + " (•••• " + account.lastFour + ")"
        );
        option.value = account.id;
        accountSelect.appendChild(option);
    });

    if (accounts.some(account => account.id === previouslySelected)) {
        accountSelect.value = previouslySelected;
    }

    const selectedAccount = getSelectedAccount();
    if (selectedAccount) {
        balanceDisplay.textContent = "Available Balance: " + formatCurrency(selectedAccount.balance);
    } else {
        balanceDisplay.textContent = accounts.length
            ? "Select an account to see its available balance."
            : "No accounts available. Add an account on Accounts & Cards first.";
    }

    accountSelect.disabled = !canTransfer || accounts.length === 0;
    transferButton.disabled = !canTransfer || accounts.length === 0;
}

function formatTransferDate(dateValue) {
    const date = new Date(dateValue);
    return date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function renderTransfers() {
    transactionList.replaceChildren();
    if (!transfers.length) {
        transactionList.appendChild(createElement("p", "no-transfers", "No transfers yet."));
        return;
    }

    transfers.slice().reverse().forEach(transfer => {
        const item = createElement("article", "transfer-item");
        const details = createElement("div", "transfer-details");
        details.appendChild(createElement("span", "transfer-recipient", transfer.recipient));

        const metadata = [
            formatTransferDate(transfer.date),
            transfer.accountName + " (•••• " + transfer.accountLastFour + ")"
        ];
        if (transfer.note) metadata.push(transfer.note);
        details.appendChild(createElement("span", "transfer-meta", metadata.join(" · ")));

        item.append(
            details,
            createElement("span", "transfer-amount", "− " + formatCurrency(transfer.amount))
        );
        transactionList.appendChild(item);
    });
}

function renderAll() {
    renderAccounts();
    renderTransfers();
}

async function saveTransfer(nextAccounts, nextTransfers) {
    try {
        await window.FinEdgeUserData.save({
            accounts: nextAccounts,
            transfers: nextTransfers
        });
    } catch (error) {
        console.error("Could not save the transfer.", error);
        setStorageMessage("The transfer was not completed because it could not be saved to the server.");
        return false;
    }

    accounts = nextAccounts;
    transfers = nextTransfers;
    setStorageMessage("");
    return true;
}

function isValidRecipient(value) {
    const upiPattern = /^[\w.-]+@[\w.-]+$/;
    const accountNumberPattern = /^\d{9,18}$/;
    return upiPattern.test(value) || accountNumberPattern.test(value);
}

function createTransferId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }
    return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

async function submitTransfer(event) {
    event.preventDefault();
    showTransferMessage("", "");

    const account = getSelectedAccount();
    const recipient = recipientInput.value.trim();
    const amount = Number(amountInput.value);
    const amountInPaise = Math.round(amount * 100);
    const note = noteInput.value.trim();

    if (!canTransfer || !account) {
        showTransferMessage("A valid saved account is required to make a transfer.", "error");
        return;
    }
    if (!isValidRecipient(recipient)) {
        showTransferMessage("Enter a valid UPI ID or an account number containing 9 to 18 digits.", "error");
        recipientInput.focus();
        return;
    }
    if (
        !Number.isFinite(amount) ||
        amountInPaise < 1 ||
        Math.abs(amount - amountInPaise / 100) > 0.000001
    ) {
        showTransferMessage("Enter an amount greater than ₹0 with no more than two decimal places.", "error");
        amountInput.focus();
        return;
    }
    if (amount > Number(account.balance)) {
        showTransferMessage("The transfer amount is greater than the available balance.", "error");
        amountInput.focus();
        return;
    }

    const transfer = {
        id: createTransferId(),
        accountId: account.id,
        accountName: account.name,
        accountLastFour: account.lastFour,
        recipient,
        amount: amountInPaise / 100,
        note,
        date: new Date().toISOString()
    };
    const nextAccounts = accounts.map(item =>
        item.id === account.id
            ? { ...item, balance: Math.round((Number(item.balance) - transfer.amount) * 100) / 100 }
            : item
    );
    const nextTransfers = transfers.concat(transfer);

    if (!await saveTransfer(nextAccounts, nextTransfers)) return;

    transferForm.reset();
    renderAll();
    showTransferMessage(
        "Transfer recorded. No real money was sent.",
        "success"
    );
}

accountSelect.addEventListener("change", renderAccounts);
transferForm.addEventListener("submit", submitTransfer);
transferForm.addEventListener("input", () => {
    if (transferMessage.textContent) showTransferMessage("", "");
});

loadData();