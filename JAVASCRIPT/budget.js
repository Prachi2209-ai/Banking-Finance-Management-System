"use strict";

const categories = [
    { name: "Food", color: "#4169e1" },
    { name: "Transport", color: "#1e90ff" },
    { name: "Shopping", color: "#db2777" },
    { name: "Bills", color: "#7c3aed" },
    { name: "Entertainment", color: "#ea580c" },
    { name: "Others", color: "#eab308" }
];

const historicalMonthlyTotals = [];
const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
});

function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Required budget page element was not found: #${id}`);
    }
    return element;
}

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isValidDateKey(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidExpenseList(value) {
    if (!Array.isArray(value)) {
        return false;
    }

    const ids = new Set();
    return value.every((expense) => {
        if (!expense || typeof expense !== "object" ||
            (typeof expense.id !== "string" && typeof expense.id !== "number") ||
            String(expense.id).length === 0 ||
            typeof expense.name !== "string" || !expense.name.trim() ||
            !categories.some((category) => category.name === expense.category) ||
            typeof expense.amount !== "number" || !Number.isFinite(expense.amount) ||
            expense.amount <= 0 || !isValidDateKey(expense.date)) {
            return false;
        }

        const id = String(expense.id);
        if (ids.has(id)) {
            return false;
        }
        ids.add(id);
        return true;
    });
}

let monthlyBudget = 20000;
let nextExpenseId = 1;
let editingExpenseId = null;
let previouslyFocusedElement = null;
let expenses = [];

const searchInput = getElement("searchInput");
const categoryFilter = getElement("categoryFilter");
const expenseTableBody = getElement("expenseTableBody");
const emptyMessage = getElement("emptyMessage");
const storageMessage = getElement("storageMessage");
const budgetModal = getElement("budgetModal");
const budgetForm = getElement("budgetForm");
const budgetInput = getElement("budgetInput");
const budgetError = getElement("budgetError");
const expenseModal = getElement("expenseModal");
const expenseForm = getElement("expenseForm");
const expenseNameInput = getElement("expenseName");
const expenseAmountInput = getElement("expenseAmount");
const expenseCategoryInput = getElement("expenseCategory");
const expenseDateInput = getElement("expenseDate");
const expenseError = getElement("expenseError");

function formatCurrency(amount) {
    return currencyFormatter.format(amount);
}

function isDateInCurrentMonth(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth();
}

function getCurrentMonthExpenses() {
    return expenses.filter((expense) => isDateInCurrentMonth(expense.date));
}

function getCurrentMonthSpend() {
    return getCurrentMonthExpenses().reduce((total, expense) => total + expense.amount, 0);
}

function showStorageMessage(message) {
    storageMessage.textContent = message;
    storageMessage.hidden = message.length === 0;
}

async function saveData() {
    try {
        await window.FinEdgeUserData.save({ monthlyBudget, expenses });
        showStorageMessage("");
        return true;
    } catch (error) {
        console.error("Could not save budget and expense data.", error);
        showStorageMessage("Changes could not be saved to the server. Please try again.");
        return false;
    }
}

async function loadData() {
    updateSummary();
    renderExpenses();

    try {
        const data = await window.FinEdgeUserData.load();
        if (!Number.isFinite(data.monthlyBudget) || data.monthlyBudget <= 0 ||
            !isValidExpenseList(data.expenses)) {
            throw new TypeError("Saved budget data has an invalid structure.");
        }

        monthlyBudget = data.monthlyBudget;
        expenses = data.expenses;
        const numericIds = expenses
            .map((expense) => Number(expense.id))
            .filter((id) => Number.isSafeInteger(id) && id >= 0);
        nextExpenseId = Math.max(0, ...numericIds) + 1;
        showStorageMessage("");
    } catch (error) {
        console.error("Could not load budget and expense data.", error);
        showStorageMessage("Could not load budget and expenses from the server. Please refresh to try again.");
    }

    updateSummary();
    renderExpenses();
}

function updateSummary() {
    const spent = getCurrentMonthSpend();
    const remaining = monthlyBudget - spent;
    const spentPercent = monthlyBudget > 0 ? (spent / monthlyBudget) * 100 : 0;
    const remainingPercent = monthlyBudget > 0 ? Math.max(remaining / monthlyBudget * 100, 0) : 0;
    const spentProgress = getElement("spentProgress");
    const remainingProgress = getElement("remainingProgress");
    const spentBar = Math.min(Math.max(spentPercent, 0), 100);
    const remainingBar = Math.min(Math.max(remainingPercent, 0), 100);

    getElement("budgetAmount").textContent = formatCurrency(monthlyBudget);
    getElement("remainingAmount").textContent = formatCurrency(remaining);
    getElement("spentText").textContent = `${formatCurrency(spent)} spent`;
    getElement("spentPercent").textContent = `${Math.round(spentPercent)}%`;
    getElement("remainingPercent").textContent = `${Math.round(remainingPercent)}% of budget left`;
    getElement("donutTotal").textContent = formatCurrency(spent);

    spentProgress.style.width = `${spentBar}%`;
    remainingProgress.style.width = `${remainingBar}%`;
    spentProgress.parentElement.setAttribute("aria-valuenow", String(Math.round(spentBar)));
    remainingProgress.parentElement.setAttribute("aria-valuenow", String(Math.round(remainingBar)));

    const remainingElement = getElement("remainingAmount");
    const budgetMessage = getElement("budgetMessage");
    remainingElement.classList.toggle("over-budget", remaining < 0);
    budgetMessage.textContent = remaining < 0
        ? `${formatCurrency(Math.abs(remaining))} over budget`
        : "";

    renderCategoryBreakdown(spent);
    renderMonthlyTrend();
}

function renderCategoryBreakdown(totalSpent) {
    const totals = new Map(categories.map((category) => [category.name, 0]));
    getCurrentMonthExpenses().forEach((expense) => {
        totals.set(expense.category, (totals.get(expense.category) || 0) + expense.amount);
    });

    const slices = categories
        .map((category) => ({
            ...category,
            amount: totals.get(category.name) || 0
        }))
        .filter((category) => category.amount > 0);
    const legend = getElement("categoryLegend");
    legend.replaceChildren();

    if (totalSpent <= 0) {
        getElement("expenseDonut").style.background = "#e2e8f0";
        const empty = document.createElement("p");
        empty.className = "chart-empty";
        empty.textContent = "No expenses this month";
        legend.appendChild(empty);
        return;
    }

    let position = 0;
    const gradientStops = slices.map((category) => {
        const start = position;
        position += category.amount / totalSpent * 100;
        return `${category.color} ${start}% ${position}%`;
    });
    getElement("expenseDonut").style.background =
        `conic-gradient(${gradientStops.join(", ")})`;

    slices.forEach((category) => {
        const item = document.createElement("div");
        item.className = "legend-item";

        const dot = document.createElement("span");
        dot.className = "legend-dot";
        dot.style.backgroundColor = category.color;

        const label = document.createElement("span");
        label.textContent = category.name;

        const percentage = document.createElement("strong");
        percentage.textContent = `${Math.round(category.amount / totalSpent * 100)}%`;

        item.append(dot, label, percentage);
        legend.appendChild(item);
    });
}

function getRecentMonths() {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
        const monthTotal = index === 5
            ? getCurrentMonthSpend()
            : historicalMonthlyTotals[index] || 0;
        return {
            label: date.toLocaleDateString("en-US", { month: "short" }),
            total: monthTotal
        };
    });
}

function renderMonthlyTrend() {
    const chart = getElement("chartBars");
    chart.replaceChildren();
    const months = getRecentMonths();
    const scale = Math.max(monthlyBudget, ...months.map((month) => month.total), 1);

    months.forEach((month) => {
        const column = document.createElement("div");
        column.className = "bar-column";

        const amount = document.createElement("span");
        amount.className = "bar-amount";
        amount.textContent = formatCurrency(month.total);

        const bar = document.createElement("div");
        bar.className = "bar";
        bar.style.height = `${Math.max(month.total / scale * 100, month.total > 0 ? 2 : 0)}%`;
        bar.title = `${month.label}: ${formatCurrency(month.total)}`;
        bar.setAttribute("aria-label", `${month.label}: ${formatCurrency(month.total)}`);

        const label = document.createElement("span");
        label.className = "bar-label";
        label.textContent = month.label;

        column.append(amount, bar, label);
        chart.appendChild(column);
    });
}

function createCell(text) {
    const cell = document.createElement("td");
    cell.textContent = text;
    return cell;
}

function createActionButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
}

function renderExpenses() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const selectedCategory = categoryFilter.value;
    const visibleExpenses = [...expenses]
        .sort((first, second) => second.date.localeCompare(first.date) || second.id - first.id)
        .filter((expense) => selectedCategory === "All" || expense.category === selectedCategory)
        .filter((expense) =>
            expense.name.toLocaleLowerCase().includes(query) ||
            expense.category.toLocaleLowerCase().includes(query)
        );

    expenseTableBody.replaceChildren();
    emptyMessage.hidden = visibleExpenses.length > 0;

    visibleExpenses.forEach((expense) => {
        const row = document.createElement("tr");
        row.appendChild(createCell(expense.name));
        const categoryCell = document.createElement("td");
        const categoryTag = document.createElement("span");
        categoryTag.className = "category-tag";
        categoryTag.textContent = expense.category;
        categoryCell.appendChild(categoryTag);
        row.appendChild(categoryCell);
        row.appendChild(createCell(new Date(`${expense.date}T00:00:00`).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
        })));
        row.appendChild(createCell(formatCurrency(expense.amount)));

        const actions = document.createElement("td");
        actions.className = "expense-actions";
        actions.appendChild(createActionButton(
            "Edit",
            "edit-btn",
            () => editExpense(expense.id)
        ));
        actions.appendChild(createActionButton(
            "Delete",
            "delete-btn",
            () => deleteExpense(expense.id)
        ));
        row.appendChild(actions);
        expenseTableBody.appendChild(row);
    });
}

function showModal(modal) {
    previouslyFocusedElement = document.activeElement;
    modal.hidden = false;
    const firstInput = modal.querySelector("input, select");
    if (firstInput) {
        firstInput.focus();
    }
}

function closeModal(modal) {
    modal.hidden = true;

    if (modal === budgetModal) {
        budgetForm.reset();
        budgetError.textContent = "";
    } else {
        expenseForm.reset();
        expenseError.textContent = "";
        editingExpenseId = null;
        getElement("expenseModalTitle").textContent = "Add Expense";
    }

    if (previouslyFocusedElement && previouslyFocusedElement.isConnected) {
        previouslyFocusedElement.focus();
    }
}

function openExpenseModal() {
    editingExpenseId = null;
    expenseForm.reset();
    expenseError.textContent = "";
    getElement("expenseModalTitle").textContent = "Add Expense";
    expenseDateInput.max = localDateKey();
    expenseDateInput.value = localDateKey();
    showModal(expenseModal);
}

function editExpense(id) {
    const expense = expenses.find((item) => item.id === id);
    if (!expense) {
        return;
    }

    editingExpenseId = id;
    expenseError.textContent = "";
    getElement("expenseModalTitle").textContent = "Edit Expense";
    expenseNameInput.value = expense.name;
    expenseAmountInput.value = String(expense.amount);
    expenseCategoryInput.value = expense.category;
    expenseDateInput.max = localDateKey();
    expenseDateInput.value = expense.date;
    showModal(expenseModal);
}

function deleteExpense(id) {
    const expense = expenses.find((item) => item.id === id);
    if (!expense || !window.confirm(`Delete "${expense.name}"?`)) {
        return;
    }

    expenses = expenses.filter((item) => item.id !== id);
    saveData();
    updateSummary();
    renderExpenses();
}

function saveBudget(event) {
    event.preventDefault();
    budgetError.textContent = "";

    const amount = Number(budgetInput.value);
    if (!Number.isFinite(amount) || amount <= 0) {
        budgetError.textContent = "Enter a budget amount greater than zero.";
        return;
    }

    if (amount < getCurrentMonthSpend()) {
        budgetError.textContent = "Budget cannot be less than your spending so far this month.";
        return;
    }

    monthlyBudget = amount;
    saveData();
    closeModal(budgetModal);
    updateSummary();
}

function saveExpense(event) {
    event.preventDefault();
    expenseError.textContent = "";

    const name = expenseNameInput.value.trim();
    const amount = Number(expenseAmountInput.value);
    const category = expenseCategoryInput.value;
    const date = expenseDateInput.value;

    if (!name || !Number.isFinite(amount) || amount <= 0 || !date) {
        expenseError.textContent = "Enter a name, positive amount, category, and date.";
        return;
    }

    if (date > localDateKey()) {
        expenseError.textContent = "Expense date cannot be in the future.";
        return;
    }

    const existingExpense = expenses.find((item) => item.id === editingExpenseId);
    const amountBeingReplaced = existingExpense &&
        getCurrentMonthExpenses().includes(existingExpense)
        ? existingExpense.amount
        : 0;
    const amountBeingAdded = isDateInCurrentMonth(date) ? amount : 0;
    if (getCurrentMonthSpend() - amountBeingReplaced + amountBeingAdded > monthlyBudget) {
        expenseError.textContent = "Expense exceeds your remaining budget.";
        return;
    }

    if (editingExpenseId !== null) {
        const expense = expenses.find((item) => item.id === editingExpenseId);
        if (!expense) {
            throw new Error(`Expense being edited was not found: ${editingExpenseId}`);
        }

        expense.name = name;
        expense.amount = amount;
        expense.category = category;
        expense.date = date;
    } else {
        expenses.push({
            id: nextExpenseId++,
            name,
            amount,
            category,
            date
        });
    }

    saveData();
    closeModal(expenseModal);
    updateSummary();
    renderExpenses();
}

getElement("createBudgetBtn").addEventListener("click", () => {
    budgetInput.value = String(monthlyBudget);
    budgetError.textContent = "";
    showModal(budgetModal);
});

getElement("addExpenseBtn").addEventListener("click", openExpenseModal);
budgetForm.addEventListener("submit", saveBudget);
expenseForm.addEventListener("submit", saveExpense);
searchInput.addEventListener("input", renderExpenses);
categoryFilter.addEventListener("change", renderExpenses);

document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
        closeModal(getElement(button.dataset.close));
    });
});

[budgetModal, expenseModal].forEach((modal) => {
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeModal(modal);
        }
    });
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        if (!expenseModal.hidden) {
            closeModal(expenseModal);
        } else if (!budgetModal.hidden) {
            closeModal(budgetModal);
        }
    }
});

loadData();
