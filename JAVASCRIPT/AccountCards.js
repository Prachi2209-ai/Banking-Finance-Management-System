const accountSearch = document.getElementById("accountSearch");
const accountsGrid = document.getElementById("accountsGrid");
const bankCardsGrid = document.getElementById("bankCardsGrid");
const accountsEmptyMessage = document.getElementById("accountsEmptyMessage");
const cardsEmptyMessage = document.getElementById("cardsEmptyMessage");
const storageMessage = document.getElementById("storageMessage");
const accountModal = document.getElementById("accountModal");
const accountForm = document.getElementById("accountForm");
const accountError = document.getElementById("accountError");

const accountFields = {
    name: document.getElementById("accountName"),
    type: document.getElementById("accountType"),
    balance: document.getElementById("accountBalance"),
    lastFour: document.getElementById("accountLastFour"),
    bank: document.getElementById("accountBank")
};

let accounts = [];
let bankCards = [];

let editingAccountId = null;
let returnFocusElement = null;

function isValidAccountList(value) {
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

function isValidCardList(value) {
    return Array.isArray(value) && value.every(card =>
        card &&
        typeof card.id === "string" &&
        /^\d{4}$/.test(card.lastFour) &&
        typeof card.holder === "string" &&
        typeof card.expiry === "string" &&
        ["VISA", "Mastercard"].includes(card.network) &&
        ["blue", "purple"].includes(card.theme) &&
        typeof card.frozen === "boolean"
    );
}

function setStorageMessage(message) {
    storageMessage.textContent = message;
    storageMessage.hidden = !message;
}

async function loadData() {
    accounts = [];
    bankCards = [];
    renderAll();

    try {
        const data = await window.FinEdgeUserData.load();
        if (!isValidAccountList(data.accounts) || !isValidCardList(data.bankCards)) {
            throw new TypeError("Saved account or card data has an invalid structure.");
        }
        accounts = data.accounts;
        bankCards = data.bankCards;
        setStorageMessage("");
    } catch (error) {
        console.error("Could not load accounts and cards.", error);
        setStorageMessage("Could not load accounts and cards from the server. Please refresh to try again.");
    }

    renderAll();
}

async function saveData() {
    try {
        await window.FinEdgeUserData.save({ accounts, bankCards });
        setStorageMessage("");
        return true;
    } catch (error) {
        console.error("Could not save accounts and cards.", error);
        setStorageMessage("Changes could not be saved to the server. Please try again.");
        return false;
    }
}

function formatCurrency(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }
    return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function createAccountCard(account) {
    const card = makeElement("article", "info-card");
    const top = makeElement("div", "card-top");
    const iconBox = makeElement(
        "div",
        "icon-box " + (account.type === "Savings Account" ? "green-icon" : "blue-icon")
    );
    const icon = makeElement("i");
    icon.setAttribute("data-lucide", "layout-grid");
    iconBox.appendChild(icon);
    top.appendChild(iconBox);

    const label = makeElement("span", "card-label", account.name);
    const balance = makeElement("div", "card-balance", formatCurrency(account.balance));
    const lastFour = makeElement("div", "card-subtext", "•••• " + account.lastFour);
    const footer = makeElement("div", "card-footer-badge");

    if (account.bank) {
        footer.appendChild(makeElement("span", "tag-badge", account.bank));
    }
    footer.appendChild(makeElement("span", "status-badge green-status", "• Active"));

    const actions = makeElement("div", "account-actions");
    const editButton = makeElement("button", "", "Edit");
    editButton.type = "button";
    editButton.addEventListener("click", () => openAccountModal(account));

    const deleteButton = makeElement("button", "remove-account-btn", "Delete");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => deleteAccount(account.id));
    actions.append(editButton, deleteButton);
    card.append(top, label, balance, lastFour, footer, actions);
    return card;
}

function createBankCard(cardData) {
    const card = makeElement(
        "article",
        "debit-card " + cardData.theme + "-card" + (cardData.frozen ? " is-frozen" : "")
    );
    const brand = makeElement("div", "card-brand");
    const brandIcon = makeElement("i");
    brandIcon.setAttribute("data-lucide", "aperture");
    brand.append(brandIcon, document.createTextNode(" FinEdge"));

    const number = makeElement("div", "card-number", "•••• " + cardData.lastFour);
    const details = makeElement("div", "card-details");
    const holder = makeElement("div");
    holder.append(
        makeElement("span", "card-holder-label", "CARD HOLDER"),
        makeElement("span", "card-holder-name", cardData.holder)
    );
    const expiry = makeElement("div");
    expiry.append(
        makeElement("span", "card-holder-label", "VALID THRU"),
        makeElement("span", "card-holder-name", cardData.expiry)
    );

    let networkLogo;
    if (cardData.network === "Mastercard") {
        networkLogo = makeElement("div", "mastercard-logo");
        networkLogo.append(
            makeElement("span", "circle red"),
            makeElement("span", "circle orange")
        );
    } else {
        networkLogo = makeElement("div", "visa-logo", "VISA");
    }
    details.append(holder, expiry, networkLogo);

    const management = makeElement("div", "card-management");
    management.appendChild(
        makeElement("span", "card-state", cardData.frozen ? "Frozen" : "Active")
    );
    const freezeButton = makeElement(
        "button",
        "freeze-btn",
        cardData.frozen ? "Unfreeze" : "Freeze"
    );
    freezeButton.type = "button";
    freezeButton.setAttribute(
        "aria-label",
        (cardData.frozen ? "Unfreeze" : "Freeze") + " card ending in " + cardData.lastFour
    );
    freezeButton.addEventListener("click", () => toggleCardFreeze(cardData.id));
    management.appendChild(freezeButton);

    card.append(brand, number, details, management);
    return card;
}

function renderAll() {
    const query = accountSearch.value.trim().toLowerCase();
    const matchingAccounts = accounts.filter(account =>
        [account.name, account.type, account.bank, account.lastFour]
            .some(value => value.toLowerCase().includes(query))
    );
    const matchingCards = bankCards.filter(card =>
        [card.holder, card.network, card.lastFour]
            .some(value => value.toLowerCase().includes(query))
    );

    accountsGrid.replaceChildren(...matchingAccounts.map(createAccountCard));
    bankCardsGrid.replaceChildren(...matchingCards.map(createBankCard));
    accountsEmptyMessage.hidden = matchingAccounts.length !== 0;
    cardsEmptyMessage.hidden = matchingCards.length !== 0;

    if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
    }
}

function openAccountModal(account) {
    editingAccountId = account ? account.id : null;
    returnFocusElement = document.activeElement;
    accountForm.reset();
    accountError.textContent = "";
    document.getElementById("accountModalTitle").textContent =
        account ? "Edit Account" : "Add Account";

    if (account) {
        accountFields.name.value = account.name;
        accountFields.type.value = account.type;
        accountFields.balance.value = account.balance;
        accountFields.lastFour.value = account.lastFour;
        accountFields.bank.value = account.bank;
    }

    accountModal.hidden = false;
    accountFields.name.focus();
}

function closeAccountModal() {
    accountModal.hidden = true;
    accountForm.reset();
    accountError.textContent = "";
    editingAccountId = null;
    if (returnFocusElement && typeof returnFocusElement.focus === "function") {
        returnFocusElement.focus();
    }
}

async function saveAccount(event) {
    event.preventDefault();

    const account = {
        name: accountFields.name.value.trim(),
        type: accountFields.type.value,
        balance: Number(accountFields.balance.value),
        lastFour: accountFields.lastFour.value.trim(),
        bank: accountFields.bank.value.trim()
    };

    if (
        !account.name ||
        !["Savings Account", "Current Account"].includes(account.type) ||
        !Number.isFinite(account.balance) ||
        account.balance < 0 ||
        !/^\d{4}$/.test(account.lastFour)
    ) {
        accountError.textContent = "Enter a name, valid account type, non-negative balance, and exactly four digits.";
        return;
    }

    if (editingAccountId) {
        accounts = accounts.map(existing =>
            existing.id === editingAccountId ? { ...existing, ...account } : existing
        );
    } else {
        accounts.push({ id: createId(), ...account });
    }

    await saveData();
    renderAll();
    closeAccountModal();
}

async function deleteAccount(id) {
    const account = accounts.find(item => item.id === id);
    if (!account || !window.confirm('Delete the account "' + account.name + '"?')) return;

    accounts = accounts.filter(item => item.id !== id);
    await saveData();
    renderAll();
}

async function toggleCardFreeze(id) {
    bankCards = bankCards.map(card =>
        card.id === id ? { ...card, frozen: !card.frozen } : card
    );
    await saveData();
    renderAll();
}

document.getElementById("addAccountBtn").addEventListener("click", () => openAccountModal());
document.getElementById("closeAccountModal").addEventListener("click", closeAccountModal);
document.getElementById("cancelAccountModal").addEventListener("click", closeAccountModal);
accountForm.addEventListener("submit", saveAccount);
accountSearch.addEventListener("input", renderAll);

accountModal.addEventListener("click", event => {
    if (event.target === accountModal) closeAccountModal();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !accountModal.hidden) closeAccountModal();
});

loadData();