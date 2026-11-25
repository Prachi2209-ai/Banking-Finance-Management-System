
const addGoalBtn = document.getElementById("addGoalBtn");
const goalFormPanel = document.getElementById("goalFormPanel");
const goalForm = document.getElementById("goalForm");
const closeFormBtn = document.getElementById("closeFormBtn");
const cancelBtn = document.getElementById("cancelBtn");
const goalsContainer = document.getElementById("goalsContainer");
const searchInput = document.getElementById("searchInput");
const formError = document.getElementById("formError");

const goalNameInput = document.getElementById("goalName");
const targetAmountInput = document.getElementById("targetAmount");
const savedAmountInput = document.getElementById("savedAmount");
const targetDateInput = document.getElementById("targetDate");
const goalIconInput = document.getElementById("goalIcon");

let goals = [];
let editingGoalId = null;

const startingGoals = [
    {
        id: "sample-laptop",
        name: "New Laptop",
        target: 60000,
        saved: 40000,
        date: "2026-12-31",
        icon: "💻"
    },
    {
        id: "sample-trip",
        name: "Europe Trip",
        target: 150000,
        saved: 50000,
        date: "2026-12-31",
        icon: "✈️"
    }
];

function loadGoals() {
    try {
        const storedGoals = localStorage.getItem("finedgeSavingsGoals");
        goals = storedGoals ? JSON.parse(storedGoals) : startingGoals;
        if (!Array.isArray(goals)) goals = startingGoals;
    } catch (error) {
        goals = startingGoals;
    }
    saveGoalsToStorage();
    renderGoals();
}

function saveGoalsToStorage() {
    try {
        localStorage.setItem("finedgeSavingsGoals", JSON.stringify(goals));
    } catch (error) {
        console.warn("Goals could not be saved in this browser.");
    }
}

function formatRupees(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN");
}

function openForm(goal = null) {
    editingGoalId = goal ? goal.id : null;
    goalForm.reset();
    formError.textContent = "";

    document.getElementById("formTitle").textContent =
        goal ? "Edit Goal" : "Add New Goal";

    if (goal) {
        goalNameInput.value = goal.name;
        targetAmountInput.value = goal.target;
        savedAmountInput.value = goal.saved;
        targetDateInput.value = goal.date;
        goalIconInput.value = goal.icon;
    } else {
        savedAmountInput.value = 0;
    }

    goalFormPanel.hidden = false;
    goalNameInput.focus();
    goalFormPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeForm() {
    goalFormPanel.hidden = true;
    goalForm.reset();
    formError.textContent = "";
    editingGoalId = null;
}

addGoalBtn.addEventListener("click", () => openForm());
closeFormBtn.addEventListener("click", closeForm);
cancelBtn.addEventListener("click", closeForm);

goalForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = goalNameInput.value.trim();
    const target = Number(targetAmountInput.value);
    const saved = Number(savedAmountInput.value);
    const date = targetDateInput.value;
    const icon = goalIconInput.value;

    if (!name || !date || !Number.isFinite(target) ||
        !Number.isFinite(saved) || target <= 0 || saved < 0 || saved > target) {
        formError.textContent =
            "Enter a goal name, a valid date, a target above ₹0, and saved amount between ₹0 and the target.";
        return;
    }

    if (editingGoalId) {
        goals = goals.map(goal => goal.id === editingGoalId
            ? { ...goal, name, target, saved, date, icon }
            : goal);
    } else {
        goals.push({
            id: (window.crypto && crypto.randomUUID)
                ? crypto.randomUUID()
                : String(Date.now()),
            name,
            target,
            saved,
            date,
            icon
        });
    }

    saveGoalsToStorage();
    renderGoals();
    closeForm();
});

function renderGoals() {
    const query = searchInput.value.trim().toLowerCase();
    const filteredGoals = goals.filter(goal =>
        goal.name.toLowerCase().includes(query)
    );

    goalsContainer.replaceChildren();

    filteredGoals.forEach(goal => {
        const percentage = Math.min(
            100,
            Math.round((Number(goal.saved) / Number(goal.target)) * 100)
        );

        const card = document.createElement("article");
        card.className = "goal-card";

        const icon = document.createElement("div");
        icon.className = "goal-icon";
        icon.textContent = goal.icon || "🎯";
        icon.setAttribute("aria-hidden", "true");

        const content = document.createElement("div");
        content.className = "goal-content";

        const top = document.createElement("div");
        top.className = "goal-top";

        const name = document.createElement("h3");
        name.className = "goal-name";
        name.textContent = goal.name;

        const target = document.createElement("span");
        target.className = "goal-target";
        target.textContent = formatRupees(goal.target);

        top.append(name, target);

        const track = document.createElement("div");
        track.className = "progress-track";
        track.setAttribute("role", "progressbar");
        track.setAttribute("aria-valuemin", "0");
        track.setAttribute("aria-valuemax", "100");
        track.setAttribute("aria-valuenow", String(percentage));
        track.setAttribute("aria-label", goal.name + " progress");

        const bar = document.createElement("div");
        bar.className = "progress-bar";
        bar.style.width = percentage + "%";
        track.appendChild(bar);

        const bottom = document.createElement("div");
        bottom.className = "goal-bottom";

        const saved = document.createElement("span");
        saved.className = "saved-label";
        saved.textContent = formatRupees(goal.saved) + " saved";

        const percent = document.createElement("strong");
        percent.textContent = percentage + "%";

        bottom.append(saved, percent);

        const date = document.createElement("div");
        date.className = "goal-bottom";

        const dateLabel = document.createElement("span");
        dateLabel.textContent = "Target: " + formatDate(goal.date);
        date.appendChild(dateLabel);

        const actions = document.createElement("div");
        actions.className = "goal-actions";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "small-btn";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => openForm(goal));

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "small-btn delete-btn";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => deleteGoal(goal.id));

        actions.append(editBtn, deleteBtn);
        content.append(top, track, bottom, date, actions);
        card.append(icon, content);
        goalsContainer.appendChild(card);
    });

    document.getElementById("emptyMessage").hidden = filteredGoals.length !== 0;
}

function formatDate(dateString) {
    if (!dateString) return "Not set";
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function deleteGoal(id) {
    const goal = goals.find(item => item.id === id);
    if (!goal) return;

    if (confirm('Delete the goal "' + goal.name + '"?')) {
        goals = goals.filter(item => item.id !== id);
        saveGoalsToStorage();
        renderGoals();
    }
}

searchInput.addEventListener("input", renderGoals);

loadGoals();