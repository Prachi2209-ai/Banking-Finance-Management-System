const sidebarContainer = document.getElementById("sidebar-container");

sidebarContainer.innerHTML = `
    <div class="sidebar">

        <div class="logo">FinEdge</div>

        <div class="menu">

            <a href="dashboard.html">Dashboard</a>

            <p>Banking Services</p>
            <a href="AccountsCards.html">Accounts &amp; Cards</a>
            <a href="MoneyTransfer.html">Money Transfer</a>
            <a href="Transactions.html">Transactions</a>

            <p>Personal Finance</p>
            <a href="BudgetExpenses.html">Budget &amp; Expenses</a>
            <a href="SavingsGoals.html">Savings Goals</a>
            <a href="BillsPayments.html">Bills &amp; Payments</a>

            <p>Profile &amp; Settings</p>
            <a href="profile.html">Profile</a>
            <a href="settings.html">Settings</a>

        </div>

        <a href="login.html" class="logout">Logout</a>

    </div>
`;

const currentPage = window.location.pathname.split("/").pop().toLowerCase();

sidebarContainer.querySelectorAll(".menu a").forEach((link) => {
    const linkPage = link.getAttribute("href").toLowerCase();
    const isCurrentPage = linkPage === currentPage;

    link.classList.toggle("active", isCurrentPage);

    if (isCurrentPage) {
        link.setAttribute("aria-current", "page");
    }
});
