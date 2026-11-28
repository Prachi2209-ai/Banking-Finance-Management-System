"use strict";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
});

function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Required savings page element was not found: #${id}`);
    }
    return element;
}

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

let nextGoalId = 1;
let editingGoalId = null;
let previouslyFocusedElement = null;
let goals = [];

const searchInput = getElement("searchInput");
const formPanel = getElement("goalFormPanel");
const goalForm = getElement("goalForm");
const goalNameInput = getElement("goalName");
const targetAmountInput = getElement("targetAmount");
const savedAmountInput = getElement("savedAmount");
const targetDateInput = getElement("targetDate");
const goalIconInput = getElement("goalIcon");
const formError = getElement("formError");
const goalsContainer = getElement("goalsContainer");
const emptyMessage = getElement("emptyMessage");
const storageMessage = getElement("storageMessage");

function isValidDateKey(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidGoalList(value) {
    if (!Array.isArray(value)) {
        return false;
    }

    const ids = new Set();
    return value.every((goal) => {
        if (!goal || typeof goal !== "object" ||
            (typeof goal.id !== "string" && typeof goal.id !== "number") ||
            String(goal.id).length === 0 ||
            typeof goal.name !== "string" || !goal.name.trim() ||
            typeof goal.target !== "number" || !Number.isFinite(goal.target) ||
            goal.target <= 0 ||
            typeof goal.saved !== "number" || !Number.isFinite(goal.saved) ||
            goal.saved < 0 || goal.saved > goal.target ||
            !isValidDateKey(goal.date) ||
            typeof goal.icon !== "string" || !goal.icon) {
            return false;
        }

        const id = String(goal.id);
        if (ids.has(id)) {
            return false;
        }
        ids.add(id);
        return true;
    });
}

function showStorageMessage(message) {
    storageMessage.textContent = message;
    storageMessage.hidden = message.length === 0;
}

async function saveGoalsToStorage() {
    try {
        await window.FinEdgeUserData.save({ savingsGoals: goals });
        showStorageMessage("");
        return true;
    } catch (error) {
        console.error("Could not save savings goals.", error);
        showStorageMessage("Changes could not be saved to the server. Please try again.");
        return false;
    }
}

async function loadGoals() {
    renderGoals();

    try {
        const data = await window.FinEdgeUserData.load();
        if (!isValidGoalList(data.savingsGoals)) {
            throw new TypeError("Saved savings goals have an invalid structure.");
        }
        goals = data.savingsGoals;
        const numericIds = goals
            .map((goal) => Number(goal.id))
            .filter((id) => Number.isSafeInteger(id) && id >= 0);
        nextGoalId = Math.max(0, ...numericIds) + 1;
        showStorageMessage("");
    } catch (error) {
        console.error("Could not load savings goals.", error);
        showStorageMessage("Could not load savings goals from the server. Please refresh to try again.");
    }

    renderGoals();
}

function formatCurrency(amount) {
    return currencyFormatter.format(amount);
}

function formatTargetDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        throw new RangeError(`Invalid savings goal date: ${dateString}`);
    }
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function createButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
}

function renderGoals() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const visibleGoals = goals.filter((goal) => goal.name.toLocaleLowerCase().includes(query));
    goalsContainer.replaceChildren();
    emptyMessage.hidden = visibleGoals.length > 0;

    visibleGoals.forEach((goal) => {
        const progress = Math.min(Math.round(goal.saved / goal.target * 100), 100);
        const card = document.createElement("article");
        card.className = "goal-card";

        const icon = document.createElement("div");
        icon.className = "goal-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = goal.icon;

        const details = document.createElement("div");
        details.className = "goal-content";

        const header = document.createElement("div");
        header.className = "goal-top";
        const name = document.createElement("h3");
        name.className = "goal-name";
        name.textContent = goal.name;
        const target = document.createElement("span");
        target.className = "goal-target";
        target.textContent = formatCurrency(goal.target);
        header.append(name, target);

        const progressRow = document.createElement("div");
        progressRow.className = "progress-row";
        const progressBackground = document.createElement("div");
        progressBackground.className = "progress-track";
        progressBackground.setAttribute("role", "progressbar");
        progressBackground.setAttribute("aria-label", `${goal.name} savings progress`);
        progressBackground.setAttribute("aria-valuemin", "0");
        progressBackground.setAttribute("aria-valuemax", "100");
        progressBackground.setAttribute("aria-valuenow", String(progress));
        const progressFill = document.createElement("div");
        progressFill.className = "progress-bar";
        progressFill.style.width = `${progress}%`;
        progressBackground.appendChild(progressFill);
        const percentage = document.createElement("span");
        percentage.className = "percent-text";
        percentage.textContent = `${progress}%`;
        progressRow.append(progressBackground, percentage);

        const footer = document.createElement("div");
        footer.className = "goal-bottom";
        const saved = document.createElement("p");
        saved.className = "saved-label";
        saved.textContent = `${formatCurrency(goal.saved)} saved`;
        const deadline = document.createElement("p");
        deadline.className = "target-date";
        deadline.textContent = `Target: ${formatTargetDate(goal.date)}`;
        footer.append(saved, deadline);

        const actions = document.createElement("div");
        actions.className = "goal-actions";
        actions.append(
            createButton("Edit", "small-btn", () => editGoal(goal.id)),
            createButton("Delete", "small-btn delete-btn", () => deleteGoal(goal.id))
        );

        details.append(header, progressRow, footer, actions);
        card.append(icon, details);
        goalsContainer.appendChild(card);
    });
}

function openForm(title) {
    getElement("formTitle").textContent = title;
    formError.textContent = "";
    const editingGoal = goals.find((goal) => goal.id === editingGoalId);
    targetDateInput.min = editingGoal && editingGoal.date < localDateKey()
        ? editingGoal.date
        : localDateKey();
    previouslyFocusedElement = document.activeElement;
    formPanel.hidden = false;
    goalNameInput.focus();
}

function closeForm() {
    formPanel.hidden = true;
    goalForm.reset();
    savedAmountInput.value = "0";
    formError.textContent = "";
    editingGoalId = null;
    getElement("formTitle").textContent = "Add New Goal";

    if (previouslyFocusedElement && previouslyFocusedElement.isConnected) {
        previouslyFocusedElement.focus();
    }
}

function editGoal(id) {
    const goal = goals.find((item) => item.id === id);
    if (!goal) {
        return;
    }

    editingGoalId = id;
    goalNameInput.value = goal.name;
    targetAmountInput.value = String(goal.target);
    savedAmountInput.value = String(goal.saved);
    targetDateInput.value = goal.date;
    goalIconInput.value = goal.icon;
    openForm("Edit Savings Goal");
}

function deleteGoal(id) {
    const goal = goals.find((item) => item.id === id);
    if (!goal || !window.confirm(`Delete the savings goal "${goal.name}"?`)) {
        return;
    }

    goals = goals.filter((item) => item.id !== id);
    saveGoalsToStorage();
    renderGoals();
}

function saveGoal(event) {
    event.preventDefault();
    formError.textContent = "";

    const name = goalNameInput.value.trim();
    const target = Number(targetAmountInput.value);
    const saved = Number(savedAmountInput.value);
    const date = targetDateInput.value;

    if (!name || !Number.isFinite(target) || target <= 0 ||
        !Number.isFinite(saved) || saved < 0 || !date) {
        formError.textContent = "Enter a name, valid target and saved amounts, and target date.";
        return;
    }

    if (saved > target) {
        formError.textContent = "Amount saved cannot be greater than the target amount.";
        return;
    }

    const originalGoal = editingGoalId === null
        ? null
        : goals.find((goal) => goal.id === editingGoalId);
    if (date < localDateKey() && (!originalGoal || date !== originalGoal.date)) {
        formError.textContent = "Choose today or a future target date.";
        return;
    }

    if (editingGoalId !== null) {
        const goal = goals.find((item) => item.id === editingGoalId);
        if (!goal) {
            throw new Error(`Savings goal being edited was not found: ${editingGoalId}`);
        }

        goal.name = name;
        goal.target = target;
        goal.saved = saved;
        goal.date = date;
        goal.icon = goalIconInput.value;
    } else {
        goals.push({
            id: nextGoalId++,
            name,
            target,
            saved,
            date,
            icon: goalIconInput.value
        });
    }

    saveGoalsToStorage();
    closeForm();
    renderGoals();
}

getElement("addGoalBtn").addEventListener("click", () => {
    editingGoalId = null;
    goalForm.reset();
    savedAmountInput.value = "0";
    openForm("Add New Goal");
});

getElement("closeFormBtn").addEventListener("click", closeForm);
getElement("cancelBtn").addEventListener("click", closeForm);
goalForm.addEventListener("submit", saveGoal);
searchInput.addEventListener("input", renderGoals);

loadGoals();
