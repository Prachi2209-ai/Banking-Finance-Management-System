"use strict";

let bills = [];
let paymentHistory = [];
let accounts = [];
let totalPaid = 0;
let editingId = null;
let pendingPaymentBillId = null;
let currentTab = "upcoming";
let previouslyFocusedElement = null;
let paymentReturnFocusElement = null;

const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
});

function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Required bills page element was not found: #${id}`);
    }
    return element;
}

const billTable = getElement("billTable");
const searchInput = getElement("searchInput");
const pendingBillsElement = getElement("pendingBills");
const pendingAmountElement = getElement("pendingAmount");
const totalPaidElement = getElement("totalPaid");
const storageMessage = getElement("storageMessage");
const upcomingTab = getElement("upcomingTab");
const historyTab = getElement("historyTab");
const billModal = getElement("billModal");
const billForm = getElement("billForm");
const billNameInput = getElement("billName");
const billAmountInput = getElement("billAmount");
const billDateInput = getElement("billDate");
const paymentModal = getElement("paymentModal");
const paymentForm = getElement("paymentForm");
const paymentAccountSelect = getElement("paymentAccount");
const paymentBillSummary = getElement("paymentBillSummary");
const paymentBalance = getElement("paymentBalance");
const paymentError = getElement("paymentError");
const confirmPaymentButton = getElement("confirmPayment");

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
    if (!match) {
        throw new RangeError(`Invalid bill date: ${dateString}`);
    }

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, month, day);

    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        throw new RangeError(`Invalid bill date: ${dateString}`);
    }

    return date;
}

function getStatus(dateString) {
    const dueDate = parseLocalDate(dateString);
    const today = parseLocalDate(localDateKey());
    const dueDay = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const daysUntilDue = Math.round((dueDay - todayDay) / 86400000);

    if (daysUntilDue < 0) {
        return "Overdue";
    }

    if (daysUntilDue <= 3) {
        return "Due Soon";
    }

    return "Upcoming";
}

function updateSummary() {
    const pending = bills.filter((bill) => !bill.paid);
    const pendingAmount = pending.reduce((total, bill) => total + bill.amount, 0);

    pendingBillsElement.textContent = String(pending.length);
    pendingAmountElement.textContent = currencyFormatter.format(pendingAmount);
    totalPaidElement.textContent = currencyFormatter.format(totalPaid);
}

function showStorageMessage(message) {
    storageMessage.textContent = message;
    storageMessage.hidden = message.length === 0;
}

function isValidBillList(value, isHistory) {
    return Array.isArray(value) && value.every((bill) =>
        bill &&
        (typeof bill.id === "string" || typeof bill.id === "number") &&
        typeof bill.name === "string" && bill.name.trim() &&
        Number.isFinite(bill.amount) && bill.amount > 0 &&
        typeof bill.date === "string" && isValidDateKey(bill.date) &&
        (isHistory ? bill.paid === true && isValidDateKey(bill.paymentDate) : bill.paid === false)
    );
}

function isValidDateKey(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;
}

async function saveBillData(nextBills, nextPaymentHistory, nextTotalPaid, nextAccounts = accounts) {
    try {
        await window.FinEdgeUserData.save({
            accounts: nextAccounts,
            bills: nextBills,
            paymentHistory: nextPaymentHistory,
            totalPaid: nextTotalPaid
        });
        showStorageMessage("");
        return true;
    } catch (error) {
        console.error("Could not save bills and payments.", error);
        showStorageMessage("Changes could not be saved to the server. Please try again.");
        return false;
    }
}

function isValidAccountList(value) {
    return Array.isArray(value) && value.every((account) =>
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

async function loadData() {
    bills = [];
    paymentHistory = [];
    accounts = [];
    totalPaid = 0;
    updateSummary();
    displayBills();

    try {
        const data = await window.FinEdgeUserData.load();
        if (!isValidAccountList(data.accounts) ||
            !isValidBillList(data.bills, false) ||
            !isValidBillList(data.paymentHistory, true) ||
            !Number.isFinite(data.totalPaid) || data.totalPaid < 0) {
            throw new TypeError("Saved bill data has an invalid structure.");
        }
        accounts = data.accounts;
        bills = data.bills;
        paymentHistory = data.paymentHistory;
        totalPaid = data.totalPaid;
        showStorageMessage("");
    } catch (error) {
        console.error("Could not load bills and payments.", error);
        showStorageMessage("Could not load bills and payments from the server. Please refresh to try again.");
    }

    updateSummary();
    displayBills();
}

function createCell(text, options = {}) {
    const cell = document.createElement("td");
    cell.textContent = text;
    if (options.className) {
        cell.className = options.className;
    }
    return cell;
}

function createActionButton(label, className, onClick, disabled = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", onClick);
    return button;
}

function displayBills() {
    billTable.replaceChildren();

    const searchValue = searchInput.value.trim().toLocaleLowerCase();
    const visibleBills = (currentTab === "upcoming"
        ? bills.filter((bill) => !bill.paid)
        : paymentHistory
    ).filter((bill) => bill.name.toLocaleLowerCase().includes(searchValue));

    if (visibleBills.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.className = "empty-state";
        cell.textContent = "No bills found";
        row.appendChild(cell);
        billTable.appendChild(row);
        return;
    }

    visibleBills.forEach((bill) => {
        const row = document.createElement("tr");
        const isPaid = bill.paid;
        const status = isPaid ? "Paid" : getStatus(bill.date);
        const displayedDate = currentTab === "history" && bill.paymentDate
            ? bill.paymentDate
            : bill.date;
        const formattedDate = parseLocalDate(displayedDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });

        row.appendChild(createCell(bill.name));
        row.appendChild(createCell(currencyFormatter.format(bill.amount), {
            className: "amount-cell"
        }));
        row.appendChild(createCell(formattedDate));

        const statusCell = document.createElement("td");
        const statusBadge = document.createElement("span");
        statusBadge.className = `status status-${status.toLowerCase().replace(/\s+/g, "-")}`;
        statusBadge.textContent = status;
        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);

        const actionCell = document.createElement("td");
        actionCell.className = "action-cell";

        if (isPaid) {
            const paidLabel = document.createElement("span");
            paidLabel.className = "paid-label";
            paidLabel.textContent = "\u2713 Paid";
            actionCell.appendChild(paidLabel);
        } else {
            const canPay = status === "Due Soon" || status === "Overdue";
            actionCell.appendChild(createActionButton(
                canPay ? "Pay" : "Not Due",
                "pay-btn",
                () => openPaymentModal(bill.id),
                !canPay
            ));
            actionCell.appendChild(createActionButton(
                "Edit",
                "edit-btn",
                () => editBill(bill.id)
            ));
            actionCell.appendChild(createActionButton(
                "Delete",
                "delete-btn",
                () => deleteBill(bill.id)
            ));
        }

        row.appendChild(actionCell);
        billTable.appendChild(row);
    });
}

function setCurrentTab(tab) {
    currentTab = tab;
    upcomingTab.classList.toggle("active", tab === "upcoming");
    historyTab.classList.toggle("active", tab === "history");
    upcomingTab.setAttribute("aria-selected", String(tab === "upcoming"));
    historyTab.setAttribute("aria-selected", String(tab === "history"));
    displayBills();
}

function openModal(title) {
    getElement("modalTitle").textContent = title;
    billDateInput.min = localDateKey();
    previouslyFocusedElement = document.activeElement;
    billModal.hidden = false;
    billNameInput.focus();
}

function closeModal() {
    billModal.hidden = true;
    billForm.reset();
    editingId = null;

    if (previouslyFocusedElement && previouslyFocusedElement.isConnected) {
        previouslyFocusedElement.focus();
    }
}

function openPaymentModal(id) {
    const bill = bills.find((item) => item.id === id);
    if (!bill || bill.paid) {
        return;
    }

    const status = getStatus(bill.date);
    if (status === "Upcoming") {
        window.alert("This bill is not due yet. You cannot pay it now!");
        return;
    }

    pendingPaymentBillId = id;
    paymentReturnFocusElement = document.activeElement;
    paymentBillSummary.textContent =
        `Pay ${currencyFormatter.format(bill.amount)} for ${bill.name}.`;
    paymentAccountSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose an account";
    placeholder.disabled = true;
    placeholder.selected = true;
    paymentAccountSelect.appendChild(placeholder);

    accounts.forEach((account) => {
        const option = document.createElement("option");
        option.value = account.id;
        option.textContent =
            `${account.name} (•••• ${account.lastFour}) — ${currencyFormatter.format(account.balance)}`;
        paymentAccountSelect.appendChild(option);
    });

    paymentBalance.textContent = "";
    paymentError.textContent = accounts.length
        ? ""
        : "Add an account before paying a bill.";
    paymentError.hidden = accounts.length > 0;
    confirmPaymentButton.disabled = accounts.length === 0;
    paymentModal.hidden = false;
    paymentAccountSelect.focus();
}

function closePaymentModal() {
    paymentModal.hidden = true;
    paymentForm.reset();
    paymentAccountSelect.replaceChildren();
    paymentBalance.textContent = "";
    paymentError.textContent = "";
    paymentError.hidden = true;
    confirmPaymentButton.disabled = false;
    pendingPaymentBillId = null;

    if (paymentReturnFocusElement && paymentReturnFocusElement.isConnected) {
        paymentReturnFocusElement.focus();
    }
}

function updatePaymentAccountDetails() {
    const account = accounts.find((item) => item.id === paymentAccountSelect.value);
    const bill = bills.find((item) => item.id === pendingPaymentBillId);
    if (!account || !bill) {
        paymentBalance.textContent = "";
        paymentError.textContent = "";
        paymentError.hidden = true;
        return;
    }

    paymentBalance.textContent =
        `Available balance: ${currencyFormatter.format(account.balance)}`;
    const hasEnoughFunds = Number(account.balance) >= bill.amount;
    paymentError.textContent = hasEnoughFunds
        ? ""
        : "This account does not have enough balance to pay this bill.";
    paymentError.hidden = hasEnoughFunds;
}

async function submitBillPayment(event) {
    event.preventDefault();

    const bill = bills.find((item) => item.id === pendingPaymentBillId);
    const account = accounts.find((item) => item.id === paymentAccountSelect.value);
    if (!bill || bill.paid || !account) {
        paymentError.textContent = "Choose a valid bill and account to continue.";
        paymentError.hidden = false;
        return;
    }

    if (Number(account.balance) < bill.amount) {
        updatePaymentAccountDetails();
        return;
    }

    const nextAccounts = accounts.map((item) => item.id === account.id
        ? { ...item, balance: Math.round((Number(item.balance) - bill.amount) * 100) / 100 }
        : item);
    const nextPaymentHistory = paymentHistory.concat({
        ...bill,
        paid: true,
        paymentDate: localDateKey(),
        accountId: account.id,
        accountName: account.name,
        accountLastFour: account.lastFour
    });
    const nextBills = bills.filter((item) => item.id !== bill.id);
    const nextTotalPaid = totalPaid + bill.amount;

    confirmPaymentButton.disabled = true;
    if (!await saveBillData(nextBills, nextPaymentHistory, nextTotalPaid, nextAccounts)) {
        confirmPaymentButton.disabled = false;
        return;
    }

    accounts = nextAccounts;
    bills = nextBills;
    paymentHistory = nextPaymentHistory;
    totalPaid = nextTotalPaid;
    closePaymentModal();
    updateSummary();
    displayBills();
    window.alert("Payment successful!");
}

function editBill(id) {
    const bill = bills.find((item) => item.id === id);
    if (!bill) {
        return;
    }

    editingId = id;
    billNameInput.value = bill.name;
    billAmountInput.value = String(bill.amount);
    billDateInput.value = bill.date;
    openModal("Edit Bill");
}

async function deleteBill(id) {
    const bill = bills.find((item) => item.id === id);
    if (!bill) {
        return;
    }

    if (!window.confirm(`Are you sure you want to delete the bill "${bill.name}"?`)) {
        return;
    }

    const nextBills = bills.filter((item) => item.id !== id);
    if (!await saveBillData(nextBills, paymentHistory, totalPaid)) {
        return;
    }
    bills = nextBills;
    updateSummary();
    displayBills();
    window.alert("Bill deleted successfully!");
}

async function saveBill(event) {
    event.preventDefault();

    const name = billNameInput.value.trim();
    const amount = Number(billAmountInput.value);
    const date = billDateInput.value;

    if (!name || !Number.isFinite(amount) || amount <= 0 || !date) {
        window.alert("Please enter valid bill details.");
        return;
    }

    if (date < localDateKey()) {
        window.alert("Please select today or a future date.");
        return;
    }

    let nextBills;
    let successMessage;
    if (editingId !== null) {
        const bill = bills.find((item) => item.id === editingId);
        if (!bill) {
            throw new Error(`Bill being edited was not found: ${editingId}`);
        }

        nextBills = bills.map((item) => item.id === editingId
            ? { ...item, name, amount, date }
            : item);
        successMessage = "Bill updated successfully!";
    } else {
        nextBills = bills.concat({
            id: Date.now(),
            name,
            amount,
            date,
            paid: false
        });
        successMessage = "New bill added successfully!";
    }

    if (!await saveBillData(nextBills, paymentHistory, totalPaid)) {
        return;
    }
    bills = nextBills;
    closeModal();
    updateSummary();
    displayBills();
    window.alert(successMessage);
}

getElement("openAddBill").addEventListener("click", () => {
    editingId = null;
    billForm.reset();
    openModal("Add New Bill");
});

getElement("cancelBill").addEventListener("click", closeModal);
billForm.addEventListener("submit", saveBill);
paymentForm.addEventListener("submit", submitBillPayment);
paymentAccountSelect.addEventListener("change", updatePaymentAccountDetails);
getElement("cancelPayment").addEventListener("click", closePaymentModal);
searchInput.addEventListener("input", displayBills);
upcomingTab.addEventListener("click", () => setCurrentTab("upcoming"));
historyTab.addEventListener("click", () => setCurrentTab("history"));

billModal.addEventListener("click", (event) => {
    if (event.target === billModal) {
        closeModal();
    }
});

paymentModal.addEventListener("click", (event) => {
    if (event.target === paymentModal) {
        closePaymentModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !billModal.hidden) {
        closeModal();
    } else if (event.key === "Escape" && !paymentModal.hidden) {
        closePaymentModal();
    }
});

loadData();
