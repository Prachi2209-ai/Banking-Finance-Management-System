
const createBudgetBtn = document.getElementById("createBudgetBtn");
const addExpenseBtn = document.getElementById("addExpenseBtn");

const budgetModal = document.getElementById("budgetModal");
const expenseModal = document.getElementById("expenseModal");

const budgetForm = document.getElementById("budgetForm");
const expenseForm = document.getElementById("expenseForm");

const expenseTableBody = document.getElementById("expenseTableBody");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

let monthlyBudget = 20000;
let expenses = [];
let editingExpenseId = null;

const colors = {
    Food: "#4169e8",
    Transport: "#18a8ee",
    Shopping: "#ff168b",
    Bills: "#8427df",
    Entertainment: "#ff6b21",
    Others: "#f4c400"
};

const defaultExpenses = [
    {id: "1", name: "Groceries", category: "Food", amount: 4000, date: "2026-11-02"},
    {id: "2", name: "Bus & Metro", category: "Transport", amount: 1875, date: "2026-11-04"},
    {id: "3", name: "Clothes", category: "Shopping", amount: 2500, date: "2026-11-08"},
    {id: "4", name: "Electricity Bill", category: "Bills", amount: 2250, date: "2026-11-12"},
    {id: "5", name: "Movie", category: "Entertainment", amount: 1250, date: "2026-11-15"},
    {id: "6", name: "Other Items", category: "Others", amount: 625, date: "2026-11-18"}
];

// Load data from LocalStorage
function loadData() {

    const savedBudget = localStorage.getItem("finedgeBudget");
    const savedExpenses = localStorage.getItem("finedgeExpenses");

    if (savedBudget !== null && Number(savedBudget) > 0) {
        monthlyBudget = Number(savedBudget);
    }

    if (savedExpenses !== null) {
        try {
            const parsed = JSON.parse(savedExpenses);
            expenses = Array.isArray(parsed) ? parsed : defaultExpenses;
        } catch {
            expenses = defaultExpenses;
        }
    } else {
        expenses = defaultExpenses;
    }

    saveData();
    renderPage();
}

// Save data
function saveData() {
    localStorage.setItem("finedgeBudget", monthlyBudget);
    localStorage.setItem("finedgeExpenses", JSON.stringify(expenses));
}

// Format currency
function formatMoney(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN");
}

// Calculate total expense
function getTotalSpent() {
    return expenses.reduce((total, expense) => {
        return total + Number(expense.amount);
    }, 0);
}

// Open and close modal
function openModal(modal) {
    modal.hidden = false;
}

function closeModal(modal) {
    modal.hidden = true;
}

// Create Budget button
createBudgetBtn.addEventListener("click", function() {

    document.getElementById("budgetInput").value = monthlyBudget;
    document.getElementById("budgetError").textContent = "";

    openModal(budgetModal);
});

// Save Budget
budgetForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const newBudget = Number(document.getElementById("budgetInput").value);

    if (!Number.isFinite(newBudget) || newBudget <= 0) {
        document.getElementById("budgetError").textContent =
            "Enter a valid budget.";
        return;
    }

    if (newBudget < getTotalSpent()) {
        document.getElementById("budgetError").textContent =
            "Budget cannot be less than total expenses.";
        return;
    }

    monthlyBudget = newBudget;

    saveData();
    renderPage();

    closeModal(budgetModal);
});

// Add Expense button
addExpenseBtn.addEventListener("click", function() {

    editingExpenseId = null;

    expenseForm.reset();

    document.getElementById("expenseDate").value =
        new Date().toISOString().split("T")[0];

    document.getElementById("expenseModalTitle").textContent = "Add Expense";
    document.getElementById("expenseError").textContent = "";

    openModal(expenseModal);
});

// Save or Edit Expense
expenseForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const name = document.getElementById("expenseName").value.trim();
    const amount = Number(document.getElementById("expenseAmount").value);
    const category = document.getElementById("expenseCategory").value;
    const date = document.getElementById("expenseDate").value;

    const oldExpense = expenses.find(item => item.id === editingExpenseId);
    const oldAmount = oldExpense ? oldExpense.amount : 0;

    if (!name || !Number.isFinite(amount) || amount <= 0 || !date) {
        document.getElementById("expenseError").textContent =
            "Enter valid expense details.";
        return;
    }

    if (getTotalSpent() - oldAmount + amount > monthlyBudget) {
        document.getElementById("expenseError").textContent =
            "Expense exceeds your remaining budget.";
        return;
    }

    if (editingExpenseId) {

        expenses = expenses.map(expense => {

            if (expense.id === editingExpenseId) {
                return {
                    ...expense,
                    name,
                    amount,
                    category,
                    date
                };
            }

            return expense;
        });

    } else {

        const newExpense = {
            id: Date.now().toString(),
            name,
            amount,
            category,
            date
        };

        expenses.push(newExpense);
    }

    saveData();
    renderPage();

    closeModal(expenseModal);
});

// Edit Expense
function editExpense(id) {

    const expense = expenses.find(item => item.id === id);

    if (!expense) return;

    editingExpenseId = id;

    document.getElementById("expenseName").value = expense.name;
    document.getElementById("expenseAmount").value = expense.amount;
    document.getElementById("expenseCategory").value = expense.category;
    document.getElementById("expenseDate").value = expense.date;

    document.getElementById("expenseModalTitle").textContent = "Edit Expense";
    document.getElementById("expenseError").textContent = "";

    openModal(expenseModal);
}

// Delete Expense
function deleteExpense(id) {

    if (confirm("Do you want to delete this expense?")) {

        expenses = expenses.filter(expense => expense.id !== id);

        saveData();
        renderPage();
    }
}

// Update all sections
function renderPage() {
    updateBudget();
    updateBreakdown();
    updateMonthlyTrend();
    displayExpenses();
}

// Update Budget and Remaining
function updateBudget() {

    const spent = getTotalSpent();
    const remaining = monthlyBudget - spent;

    const spentPercent = (spent / monthlyBudget) * 100;
    const remainingPercent = Math.max(0, 100 - spentPercent);

    document.getElementById("budgetAmount").textContent =
        formatMoney(monthlyBudget);

    document.getElementById("remainingAmount").textContent =
        formatMoney(remaining);

    document.getElementById("spentText").textContent =
        formatMoney(spent) + " spent";

    document.getElementById("spentPercent").textContent =
        Math.round(spentPercent) + "%";

    document.getElementById("remainingPercent").textContent =
        Math.round(remainingPercent) + "% of budget left";

    document.getElementById("spentProgress").style.width =
        Math.min(100, spentPercent) + "%";

    document.getElementById("remainingProgress").style.width =
        remainingPercent + "%";

    document.getElementById("budgetMessage").textContent =
        remaining < 0 ? "Over budget" : "";

    document.getElementById("spentProgress").style.background =
        spent > monthlyBudget ? "#dc4444" : "#4169e8";

    document.getElementById("donutTotal").textContent =
        formatMoney(spent);
}

// Expense Breakdown
function updateBreakdown() {

    const categories = Object.keys(colors);
    const total = getTotalSpent();

    const legend = document.getElementById("categoryLegend");

    legend.replaceChildren();

    let currentPercent = 0;
    const gradientParts = [];

    categories.forEach(category => {

        const categoryTotal = expenses
            .filter(expense => expense.category === category)
            .reduce((sum, expense) => sum + expense.amount, 0);

        const percent = total > 0 ? categoryTotal / total * 100 : 0;

        if (percent > 0) {

            gradientParts.push(
                colors[category] + " " + currentPercent + "% " +
                (currentPercent + percent) + "%"
            );

            currentPercent += percent;
        }

        const name = document.createElement("div");
        name.className = "legend-item";

        const dot = document.createElement("span");
        dot.className = "legend-dot";
        dot.style.backgroundColor = colors[category];

        const label = document.createElement("span");
        label.textContent = category;

        name.appendChild(dot);
        name.appendChild(label);

        const value = document.createElement("span");
        value.textContent = Math.round(percent) + "%";

        legend.appendChild(name);
        legend.appendChild(value);
    });

    document.getElementById("expenseDonut").style.background =
        gradientParts.length
            ? "conic-gradient(" + gradientParts.join(", ") + ")"
            : "conic-gradient(#e5e7eb 0% 100%)";
}

// Monthly Trend
function updateMonthlyTrend() {

    const chart = document.getElementById("chartBars");

    chart.replaceChildren();

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

    const values = [8000, 11000, 16000, 9000, 18000, getTotalSpent()];

    const maxValue = Math.max(20000, ...values);

    values.forEach((value, index) => {

        const column = document.createElement("div");
        column.className = "bar-column";

        const bar = document.createElement("div");
        bar.className = "bar";

        bar.style.height = Math.max(2, value / maxValue * 100) + "%";
        bar.title = formatMoney(value);

        const label = document.createElement("span");
        label.className = "bar-label";
        label.textContent = months[index];

        column.appendChild(bar);
        column.appendChild(label);

        chart.appendChild(column);
    });
}

// Display Expenses
function displayExpenses() {

    const searchText = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;

    const filteredExpenses = expenses.filter(expense => {

        const matchesSearch =
            expense.name.toLowerCase().includes(searchText);

        const matchesCategory =
            selectedCategory === "All" ||
            expense.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    expenseTableBody.replaceChildren();

    filteredExpenses.forEach(expense => {

        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = expense.name;

        const categoryCell = document.createElement("td");

        const tag = document.createElement("span");
        tag.className = "category-tag";
        tag.textContent = expense.category;

        categoryCell.appendChild(tag);

        const dateCell = document.createElement("td");
        dateCell.textContent = new Date(
            expense.date + "T00:00:00"
        ).toLocaleDateString("en-IN");

        const amountCell = document.createElement("td");
        amountCell.textContent = formatMoney(expense.amount);

        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.className = "edit-btn";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", function() {
            editExpense(expense.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", function() {
            deleteExpense(expense.id);
        });

        actionCell.appendChild(editButton);
        actionCell.appendChild(deleteButton);

        row.appendChild(nameCell);
        row.appendChild(categoryCell);
        row.appendChild(dateCell);
        row.appendChild(amountCell);
        row.appendChild(actionCell);

        expenseTableBody.appendChild(row);
    });

    document.getElementById("emptyMessage").hidden =
        filteredExpenses.length > 0;
}

// Search
searchInput.addEventListener("input", displayExpenses);

// Category Filter
categoryFilter.addEventListener("change", displayExpenses);

// Close Modal Buttons
document.querySelectorAll("[data-close]").forEach(button => {

    button.addEventListener("click", function() {

        closeModal(
            document.getElementById(button.dataset.close)
        );
    });
});

// Close modal by clicking outside
document.querySelectorAll(".modal-backdrop").forEach(modal => {

    modal.addEventListener("click", function(event) {

        if (event.target === modal) {
            closeModal(modal);
        }
    });
});

// Start application
loadData();



