// ================= INITIAL ACCOUNT DATA =================

const defaultAccounts = [
    {
        id: 1,
        name: "Savings Account",
        balance: 85240,
        number: "1234",
        bank: "AMP",
        color: "green-icon"
    },
    {
        id: 2,
        name: "Current Account",
        balance: 39260,
        number: "5678",
        bank: "",
        color: "blue-icon"
    }
];


// ================= LOAD ACCOUNTS =================

let accounts = JSON.parse(localStorage.getItem("accounts"));

if (!accounts) {
    accounts = defaultAccounts;
    localStorage.setItem("accounts", JSON.stringify(accounts));
}


// ================= DOM ELEMENTS =================

const addAccountBtn = document.getElementById("addAccountBtn");


// ================= FORMAT CURRENCY =================

function formatBalance(balance) {
    return "₹" + Number(balance).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


// ================= DISPLAY ACCOUNTS =================

function displayAccounts() {

    const accountCards = document.querySelectorAll(".info-card");

    accounts.forEach((account, index) => {

        if (index >= accountCards.length) {
            return;
        }

        const card = accountCards[index];

        const balanceElement = card.querySelector(".card-balance");
        const labelElement = card.querySelector(".card-label");
        const numberElement = card.querySelector(".card-subtext");

        if (balanceElement) {
            balanceElement.textContent = formatBalance(account.balance);
        }

        if (labelElement) {
            labelElement.textContent = account.name;
        }

        if (numberElement) {
            numberElement.textContent = "•••• " + account.number;
        }

    });

}


// ================= ADD NEW ACCOUNT =================

function addAccount() {

    const accountName = prompt("Enter account name:");

    if (!accountName || accountName.trim() === "") {
        alert("Account name cannot be empty!");
        return;
    }

    const initialBalance = prompt("Enter initial balance:");

    if (initialBalance === null || initialBalance.trim() === "") {
        alert("Please enter a balance!");
        return;
    }

    const balance = Number(initialBalance);

    if (!Number.isFinite(balance) || balance < 0) {
        alert("Please enter a valid balance!");
        return;
    }

    const accountNumber = Math.floor(1000 + Math.random() * 9000);

    const newAccount = {
        id: Date.now(),
        name: accountName.trim(),
        balance: balance,
        number: String(accountNumber),
        bank: "",
        color: "green-icon"
    };

    accounts.push(newAccount);

    localStorage.setItem("accounts", JSON.stringify(accounts));

    alert("Account added successfully!");

    displayAccounts();

}


// ================= ADD ACCOUNT BUTTON =================

if (addAccountBtn) {
    addAccountBtn.addEventListener("click", function () {
        alert("Button is working!");
        addAccount();
    });
} else {
    console.log("Add Account button not found!");
}

// ================= INITIAL DISPLAY =================

displayAccounts();