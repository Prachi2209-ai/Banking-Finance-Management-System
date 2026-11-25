const settingsStorageKey = "finedgeSettings";
const settingsFields = document.querySelectorAll(".settings-panel [name]");
const settingsStatus = document.querySelector(".save-status");
const themeSelect = document.querySelector('[name="theme"]');

function showSettingsMessage(message, isError) {
    settingsStatus.textContent = message;
    settingsStatus.classList.toggle("error", isError);
}

function showSettingsPanel(button) {
    document.querySelectorAll(".setting-option").forEach((tab) => {
        const isSelected = tab === button;
        tab.classList.toggle("selected", isSelected);
        tab.setAttribute("aria-pressed", isSelected);
    });

    document.querySelectorAll(".settings-panel").forEach((panel) => {
        panel.hidden = panel.id !== button.getAttribute("aria-controls");
    });
}

function applyTheme() {
    document.body.classList.toggle("dark-theme", themeSelect.value === "dark");
}

function loadSettings() {
    try {
        const savedSettings = JSON.parse(localStorage.getItem(settingsStorageKey) || "{}");

        settingsFields.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(savedSettings, field.name)) {
                if (field.type === "checkbox") {
                    field.checked = savedSettings[field.name];
                } else {
                    field.value = savedSettings[field.name];
                }
            }
        });

        applyTheme();
    } catch (error) {
        console.error("Could not load saved settings.", error);
        showSettingsMessage("Could not load saved settings.", true);
    }
}

document.querySelectorAll(".setting-option").forEach((button) => {
    button.addEventListener("click", () => showSettingsPanel(button));
});

themeSelect.addEventListener("change", applyTheme);

document.querySelector("#save-settings").addEventListener("click", () => {
    const savedSettings = {};

    settingsFields.forEach((field) => {
        savedSettings[field.name] = field.type === "checkbox" ? field.checked : field.value;
    });

    try {
        localStorage.setItem(settingsStorageKey, JSON.stringify(savedSettings));
        showSettingsMessage("Settings saved.", false);
    } catch (error) {
        console.error("Could not save settings.", error);
        showSettingsMessage("Could not save settings. Please try again.", true);
    }
});

loadSettings();