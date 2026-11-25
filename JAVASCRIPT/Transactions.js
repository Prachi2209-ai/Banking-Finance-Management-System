// ==========================================
// FINEDGE - TRANSACTIONS PAGE
// ==========================================


// ==========================================
// 1. DEFAULT TRANSACTIONS
// ==========================================

const defaultTransactions = [
    {
        id: 1,
        date: "2026-09-14",
        description: "Amazon",
        category: "Shopping",
        amount: -2499,
        status: "Completed"
    },
    {
        id: 2,
        date: "2026-09-12",
        description: "Swiggy",
        category: "Food",
        amount: -450,
        status: "Completed"
    },
    {
        id: 3,
        date: "2026-09-10",
        description: "Electricity Bill",
        category: "Bills",
        amount: -1200,
        status: "Completed"
    },
    {
        id: 4,
        date: "2026-09-01",
        description: "Salary Credit",
        category: "Income",
        amount: 32000,
        status: "Completed"
    },
    {
        id: 5,
        date: "2026-08-28",
        description: "Transfer to Priya",
        category: "Transfer",
        amount: -5000,
        status: "Completed"
    }
];


// ==========================================
// 2. LOAD DATA FROM LOCALSTORAGE
// ==========================================

let transactions = JSON.parse(
    localStorage.getItem("transactionHistory")
);

if (!transactions) {

    transactions = defaultTransactions;

    localStorage.setItem(
        "transactionHistory",
        JSON.stringify(transactions)
    );

}


// ==========================================
// 3. DOM ELEMENTS
// ==========================================

const searchInput = document.getElementById("transactionSearch");

const typeFilter = document.getElementById("typeFilter");

const dateFilter = document.getElementById("dateFilter");

const tableBody = document.getElementById("transactionTableBody");

const exportBtn = document.getElementById("exportBtn");


// ==========================================
// 4. CATEGORY CLASS
// ==========================================

function getCategoryClass(category) {

    switch (category) {

        case "Shopping":
            return "cat-red";

        case "Food":
            return "cat-orange";

        case "Bills":
        case "Income":
            return "cat-green";

        case "Transfer":
            return "cat-blue";

        default:
            return "cat-blue";

    }

}


// ==========================================
// 5. FORMAT DATE
// ==========================================

function formatDate(dateValue) {

    const date = new Date(dateValue + "T00:00:00");

    if (isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

}


// ==========================================
// 6. FORMAT AMOUNT
// ==========================================

function formatAmount(amount) {

    const formattedAmount = Math.abs(amount).toLocaleString("en-IN");

    if (amount >= 0) {

        return "+ ₹" + formattedAmount;

    }

    return "- ₹" + formattedAmount;

}


// ==========================================
// 7. DISPLAY TRANSACTIONS
// ==========================================

function displayTransactions(data) {

    tableBody.innerHTML = "";


    if (data.length === 0) {

        const row = document.createElement("tr");

        const cell = document.createElement("td");

        cell.colSpan = 5;

        cell.textContent = "No transactions found.";

        cell.style.textAlign = "center";

        cell.style.padding = "25px";

        row.appendChild(cell);

        tableBody.appendChild(row);

        return;

    }


    data.forEach(function (transaction) {

        const row = document.createElement("tr");


        // DATE
        const dateCell = document.createElement("td");

        dateCell.className = "td-date";

        dateCell.textContent = formatDate(transaction.date);


        // DESCRIPTION
        const descriptionCell = document.createElement("td");

        descriptionCell.className = "td-desc";

        descriptionCell.textContent = transaction.description;


        // CATEGORY
        const categoryCell = document.createElement("td");

        const categoryBadge = document.createElement("span");

        categoryBadge.className =
            "cat-badge " + getCategoryClass(transaction.category);


        const dot = document.createElement("span");

        dot.className = "dot";


        categoryBadge.appendChild(dot);

        categoryBadge.appendChild(
            document.createTextNode(" " + transaction.category)
        );


        categoryCell.appendChild(categoryBadge);


        // AMOUNT
        const amountCell = document.createElement("td");

        amountCell.className = "td-amount text-right";

        amountCell.textContent = formatAmount(transaction.amount);


        if (transaction.amount >= 0) {

            amountCell.classList.add("amount-credit");

        } else {

            amountCell.classList.add("amount-debit");

        }


        // STATUS
        const statusCell = document.createElement("td");

        statusCell.className = "text-center";


        const statusBadge = document.createElement("span");

        statusBadge.className = "status-badge";

        statusBadge.textContent = transaction.status;


        statusCell.appendChild(statusBadge);


        // ADD CELLS TO ROW
        row.appendChild(dateCell);

        row.appendChild(descriptionCell);

        row.appendChild(categoryCell);

        row.appendChild(amountCell);

        row.appendChild(statusCell);


        // ADD ROW TO TABLE
        tableBody.appendChild(row);

    });

}


// ==========================================
// 8. SEARCH AND FILTER
// ==========================================

function applyFilters() {

    const searchText = searchInput.value.toLowerCase().trim();

    const selectedType = typeFilter.value;

    const selectedDate = dateFilter.value;


    let filteredTransactions = transactions.filter(function (transaction) {

        const matchesSearch =
            transaction.description.toLowerCase().includes(searchText)
            ||
            transaction.category.toLowerCase().includes(searchText);


        const matchesType =
            selectedType === "all"
            ||
            transaction.category === selectedType;


        return matchesSearch && matchesType;

    });


    // DATE FILTER

    if (selectedDate !== "all") {

        const currentDate = new Date();

        currentDate.setHours(23, 59, 59, 999);


        let cutoffDate = new Date();


        if (selectedDate === "thisMonth") {

            cutoffDate = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                1
            );

        } else {

            cutoffDate.setMonth(
                currentDate.getMonth() - Number(selectedDate)
            );

        }


        filteredTransactions = filteredTransactions.filter(function (transaction) {

            const transactionDate = new Date(
                transaction.date + "T00:00:00"
            );

            return transactionDate >= cutoffDate
                && transactionDate <= currentDate;

        });

    }


    displayTransactions(filteredTransactions);

}


// ==========================================
// 9. EXPORT TO CSV
// ==========================================

function exportTransactions() {

    if (transactions.length === 0) {

        alert("No transactions available.");

        return;

    }


    const headers = [
        "Date",
        "Description",
        "Category",
        "Amount",
        "Status"
    ];


    const rows = transactions.map(function (transaction) {

        return [
            transaction.date,
            transaction.description,
            transaction.category,
            transaction.amount,
            transaction.status
        ];

    });


    const csvContent = [headers, ...rows]

        .map(function (row) {

            return row.map(function (value) {

                return `"${String(value).replace(/"/g, '""')}"`;

            }).join(",");

        }).join("\n");


    const blob = new Blob(
        ["\uFEFF" + csvContent],
        {
            type: "text/csv;charset=utf-8;"
        }
    );


    const url = URL.createObjectURL(blob);


    const link = document.createElement("a");

    link.href = url;

    link.download = "FinEdge_Transactions.csv";


    document.body.appendChild(link);

    link.click();


    link.remove();

    URL.revokeObjectURL(url);

}


// ==========================================
// 10. EVENT LISTENERS
// ==========================================

searchInput.addEventListener("input", applyFilters);

typeFilter.addEventListener("change", applyFilters);

dateFilter.addEventListener("change", applyFilters);

exportBtn.addEventListener("click", exportTransactions);


// ==========================================
// 11. INITIAL DISPLAY
// ==========================================

displayTransactions(transactions);