const navigationGroups = [
    {
        title: "Banking Services",
        links: [
            { label: "Accounts & Cards", href: "AccountsCards.html" },
            { label: "Money Transfer", href: "MoneyTransfer.html" },
            { label: "Transactions", href: "Transactions.html" }
        ]
    },
    {
        title: "Personal Finance",
        links: [
            { label: "Budget & Expenses", href: "BudgetExpenses.html" },
            { label: "Savings Goals", href: "SavingsGoals.html" },
            { label: "Bills & Payments", href: "BillsPayments.html" }
        ]
    },
    {
        title: "Profile & Settings",
        links: [
            { label: "Profile", href: "profile.html" },
            { label: "Settings", href: "settings.html" }
        ]
    }
];

const flowPages = new Set(["dashboard.html", "budgetexpenses.html", "savingsgoals.html"]);
const supportedPages = new Set([
    ...flowPages,
    "accountscards.html",
    "moneytransfer.html",
    "transactions.html",
    "billspayments.html",
    "profile.html",
    "settings.html"
]);

const currentPage = decodeURIComponent(window.location.pathname.split("/").pop() || "").toLowerCase();
const sidebarContainer = document.getElementById("sidebar-container");

if (!supportedPages.has(currentPage) || !sidebarContainer) {
    throw new Error("Unable to initialize the page navigation.");
}

document.body.dataset.navFlow = String(flowPages.has(currentPage));
sidebarContainer.classList.add("sidebar-slot");
if (flowPages.has(currentPage)) {
    sidebarContainer.classList.add("sidebar-slot--flow");
}

function createLink(item) {
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.label;

    if (item.href.toLowerCase() === currentPage) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
    }

    return link;
}

function createSidebar() {
    const sidebar = document.createElement("aside");
    sidebar.className = "sidebar";
    sidebar.id = "main-sidebar";

    const logo = document.createElement("div");
    logo.className = "logo";
    logo.textContent = "FinEdge";
    sidebar.appendChild(logo);

    const menu = document.createElement("nav");
    menu.className = "menu";
    menu.setAttribute("aria-label", "Main navigation");
    menu.appendChild(createLink({ label: "Dashboard", href: "dashboard.html" }));

    navigationGroups.forEach((group) => {
        const title = document.createElement("p");
        title.textContent = group.title;
        menu.appendChild(title);

        group.links.forEach((item) => menu.appendChild(createLink(item)));
    });

    sidebar.appendChild(menu);

    const logout = createLink({ label: "Logout", href: "login.html" });
    logout.className = "logout";
    sidebar.appendChild(logout);

    const closeButton = document.createElement("button");
    closeButton.className = "sidebar-close";
    closeButton.type = "button";
    closeButton.textContent = "\u00D7";
    closeButton.setAttribute("aria-label", "Hide navigation");
    closeButton.setAttribute("aria-controls", sidebar.id);
    closeButton.setAttribute("aria-expanded", "true");
    closeButton.addEventListener("click", () => {
        document.body.classList.add("nav-collapsed");
        closeButton.setAttribute("aria-expanded", "false");
        openButton.setAttribute("aria-expanded", "true");
    });
    sidebar.appendChild(closeButton);

    return sidebar;
}

const sidebar = createSidebar();
const openButton = document.createElement("button");
openButton.className = "sidebar-open";
openButton.type = "button";
openButton.textContent = "\u2630";
openButton.setAttribute("aria-label", "Show navigation");
openButton.setAttribute("aria-controls", sidebar.id);
openButton.setAttribute("aria-expanded", "false");
openButton.addEventListener("click", () => {
    document.body.classList.remove("nav-collapsed");
    openButton.setAttribute("aria-expanded", "false");
    sidebar.querySelector(".sidebar-close").setAttribute("aria-expanded", "true");
});

sidebarContainer.appendChild(sidebar);
document.body.appendChild(openButton);

let displayName = "Guest User";
try {
    const savedName = window.localStorage.getItem("finedgeUserName");
    if (savedName && savedName.trim()) {
        displayName = savedName.trim();
    }
} catch (error) {
    console.error("Could not read the saved account name.", error);
}

const userRole = "Account Holder";
const nameParts = displayName.split(/\s+/);
const firstName = nameParts[0];
const initials = nameParts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

document.querySelectorAll(".username, .user-name, .user-info strong, .profile-left h2")
    .forEach((element) => {
        element.textContent = displayName;
    });

document.querySelectorAll(".user-role, .user-info small, .profile-left > p")
    .forEach((element) => {
        element.textContent = userRole;
    });

document.querySelectorAll(".user-image, .profile-photo")
    .forEach((element) => {
        element.textContent = initials;
    });

const budgetUserInfo = document.querySelector(".top-bar .user-info");
if (budgetUserInfo && !budgetUserInfo.children.length) {
    const name = document.createElement("span");
    name.className = "user-name";
    name.textContent = displayName;
    budgetUserInfo.appendChild(name);
}

const welcomeHeading = document.querySelector(".welcome-section h2");
if (welcomeHeading) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    welcomeHeading.textContent = `${greeting}, ${firstName}!`;
}
