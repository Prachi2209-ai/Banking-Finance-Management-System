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

async function loadSettings() {
    try {
        const data = await window.FinEdgeUserData.load();
        const savedSettings = data.settings;
        if (!savedSettings || typeof savedSettings !== "object" || Array.isArray(savedSettings)) {
            throw new TypeError("Saved settings have an invalid structure.");
        }

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
        showSettingsMessage("Could not load settings from the server.", true);
    }
}

document.querySelectorAll(".setting-option").forEach((button) => {
    button.addEventListener("click", () => showSettingsPanel(button));
});

themeSelect.addEventListener("change", applyTheme);

document.querySelector("#save-settings").addEventListener("click", async () => {
    const savedSettings = {};

    settingsFields.forEach((field) => {
        savedSettings[field.name] = field.type === "checkbox" ? field.checked : field.value;
    });

    try {
        await window.FinEdgeUserData.save({ settings: savedSettings });
        showSettingsMessage("Settings saved.", false);
    } catch (error) {
        console.error("Could not save settings.", error);
        showSettingsMessage("Could not save settings. Please try again.", true);
    }
});

loadSettings();