"use strict";

function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Required dashboard element was not found: #${id}`);
    }
    return element;
}

function getDisplayName() {
    const nameElement = document.querySelector(".username");
    if (!nameElement) {
        throw new Error("Required dashboard username element was not found.");
    }

    return nameElement.textContent.trim() || "Guest User";
}

function updateGreeting(displayName) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const firstName = displayName.split(/\s+/)[0];
    const symbol = hour < 18 ? "\u2600\uFE0F" : "\u{1F319}";
    getElement("welcomeHeading").textContent = `${greeting}, ${firstName}! ${symbol}`;
}

function formatCurrency(amount) {
    return "₹" + Math.abs(Number(amount)).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatTransactionDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function filterTransactions() {
    const query = getElement("dashboardSearch").value.trim().toLocaleLowerCase();
    const transactions = Array.from(getElement("transactionList").children);
    let visibleCount = 0;

    transactions.forEach((transaction) => {
        const matches = transaction.textContent.toLocaleLowerCase().includes(query);
        transaction.hidden = !matches;
        if (matches) {
            visibleCount += 1;
        }
    });

    getElement("noTransactions").hidden = visibleCount > 0;
}

function getCurrentMonth(dateValue) {
    const date = new Date(dateValue);
    const now = new Date();
    return !Number.isNaN(date.getTime()) &&
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth();
}

function renderSpending(expenses) {
    const thisMonth = expenses.filter((expense) => getCurrentMonth(expense.date));
    const total = thisMonth.reduce((sum, expense) => sum + expense.amount, 0);
    getElement("spendingTotal").textContent = formatCurrency(total);
    const chart = document.querySelector(".donut-chart");

    const totals = new Map();
    thisMonth.forEach((expense) => {
        totals.set(expense.category, (totals.get(expense.category) || 0) + expense.amount);
    });

    const legend = getElement("spendingLegend");
    legend.replaceChildren();
    if (total === 0) {
        chart.style.background = "#e2e8f0";
        const emptyItem = document.createElement("li");
        emptyItem.textContent = "No expenses this month.";
        legend.appendChild(emptyItem);
        return;
    }

    const categoryColors = {
        Food: "#1e6fd9",
        Transport: "#4fb0e8",
        Shopping: "#f5a623",
        Bills: "#d94848",
        Others: "#8a94ad"
    };
    let position = 0;
    const gradientStops = Array.from(totals, ([category, amount]) => {
        const start = position;
        position += amount / total * 100;
        return `${categoryColors[category] || "#8a94ad"} ${start}% ${position}%`;
    });
    chart.style.background = `conic-gradient(${gradientStops.join(", ")})`;

    totals.forEach((amount, category) => {
        const item = document.createElement("li");
        const dot = document.createElement("span");
        dot.className = "dot dot-" + category.toLowerCase();
        const percentage = Math.round(amount / total * 100);
        item.append(dot, document.createTextNode(`${category} — ${percentage}%`));
        legend.appendChild(item);
    });
}

function renderRecentTransactions(data) {
    const recent = data.transactionHistory.map((transaction) => ({
        description: transaction.description,
        amount: Number(transaction.amount),
        date: transaction.date
    })).concat(
        data.transfers.map((transfer) => ({
            description: "Transfer to " + transfer.recipient,
            amount: -Number(transfer.amount),
            date: transfer.date
        })),
        data.paymentHistory.map((bill) => ({
            description: bill.name,
            amount: -Number(bill.amount),
            date: bill.paymentDate
        }))
    ).sort((first, second) => Date.parse(second.date) - Date.parse(first.date));

    const list = getElement("transactionList");
    list.replaceChildren();
    recent.slice(0, 6).forEach((transaction) => {
        const item = document.createElement("li");
        const details = document.createElement("div");
        const name = document.createElement("p");
        name.className = "tx-name";
        name.textContent = transaction.description;
        const date = document.createElement("p");
        date.className = "tx-date";
        date.textContent = formatTransactionDate(transaction.date);
        details.append(name, date);

        const amount = document.createElement("p");
        amount.className = "tx-amount " + (transaction.amount >= 0 ? "income" : "expense");
        amount.textContent = (transaction.amount >= 0 ? "+" : "−") + formatCurrency(transaction.amount);
        item.append(details, amount);
        list.appendChild(item);
    });
    getElement("noTransactions").hidden = recent.length > 0;
    filterTransactions();
}

function renderDashboard(data) {
    const accounts = data.accounts;
    const expenses = data.expenses;
    const goals = data.savingsGoals;
    const history = data.transactionHistory;
    if (![accounts, expenses, goals, history, data.transfers, data.paymentHistory].every(Array.isArray)) {
        throw new TypeError("Saved dashboard data has an invalid structure.");
    }

    const currentMonthIncome = history
        .filter((transaction) => transaction.category === "Income" &&
            transaction.amount > 0 && getCurrentMonth(transaction.date))
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    const currentMonthExpenses = expenses
        .filter((expense) => getCurrentMonth(expense.date))
        .reduce((sum, expense) => sum + expense.amount, 0);
    const summaryValues = [
        accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0),
        currentMonthIncome,
        currentMonthExpenses,
        goals.reduce((sum, goal) => sum + Number(goal.saved || 0), 0)
    ];

    ["totalBalance", "monthlyIncome", "monthlyExpenses", "totalSavings"].forEach((id, index) => {
        getElement(id).textContent = formatCurrency(summaryValues[index]);
    });
    getElement("spendingMonth").textContent = new Date().toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
    });

    renderSpending(expenses);
    renderRecentTransactions(data);
}

async function loadDashboard() {
    try {
        const data = await window.FinEdgeUserData.load();
        renderDashboard(data);
        getElement("dashboardMessage").hidden = true;
    } catch (error) {
        console.error("Could not load dashboard data.", error);
        getElement("dashboardMessage").textContent =
            "Could not load your financial overview from the server. Please refresh to try again.";
        getElement("dashboardMessage").hidden = false;
        getElement("transactionList").replaceChildren();
        getElement("noTransactions").hidden = false;
    }
}

const dashboardDisplayName = getDisplayName();
const username = document.querySelector(".username");
username.textContent = dashboardDisplayName;

updateGreeting(dashboardDisplayName);
getElement("spendingMonth").textContent = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
});
getElement("dashboardSearch").addEventListener("input", filterTransactions);
loadDashboard();
