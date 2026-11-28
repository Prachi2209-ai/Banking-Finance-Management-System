const transactionSearch = document.getElementById("transactionSearch");
const typeFilter = document.getElementById("typeFilter");
const dateFilter = document.getElementById("dateFilter");
const transactionTableBody = document.getElementById("transactionTableBody");
const transactionMessage = document.getElementById("transactionMessage");
const exportButton = document.getElementById("exportBtn");

let transfers = [];
let transactionHistory = [];
let transferLoadWarning = "";
let visibleTransactions = [];

function isValidTransferList(value) {
    return Array.isArray(value) && value.every(transfer =>
        transfer &&
        typeof transfer.id === "string" &&
        typeof transfer.accountId === "string" &&
        typeof transfer.accountName === "string" &&
        /^\d{4}$/.test(transfer.accountLastFour) &&
        typeof transfer.recipient === "string" &&
        Number.isFinite(Number(transfer.amount)) &&
        Number(transfer.amount) > 0 &&
        typeof transfer.note === "string" &&
        typeof transfer.date === "string" &&
        Number.isFinite(Date.parse(transfer.date))
    );
}

function normalizeLegacyDate(value) {
    if (typeof value !== "string") return null;

    const match = value.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i
    );
    if (!match) {
        const parsedTimestamp = Date.parse(value);
        return Number.isFinite(parsedTimestamp)
            ? new Date(parsedTimestamp).toISOString()
            : null;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const hasTime = match[4] !== undefined;
    let hour = hasTime ? Number(match[4]) : 0;
    const minute = hasTime ? Number(match[5]) : 0;
    const second = hasTime && match[6] ? Number(match[6]) : 0;
    const meridiem = match[7] ? match[7].toLowerCase() : "";

    if (meridiem) {
        if (hour < 1 || hour > 12) return null;
        hour = hour % 12 + (meridiem === "pm" ? 12 : 0);
    } else if (hour > 23) {
        return null;
    }

    if (month < 1 || month > 12 || day < 1 || minute > 59 || second > 59) return null;
    const date = new Date(year, month - 1, day, hour, minute, second);
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }
    return date.toISOString();
}

function normalizeTransactionHistory(value) {
    if (!Array.isArray(value)) return null;

    const normalizedTransactions = value.map((transaction, index) => {
        if (
            !transaction ||
            typeof transaction.description !== "string" ||
            typeof transaction.category !== "string" ||
            !Number.isFinite(Number(transaction.amount)) ||
            typeof transaction.status !== "string"
        ) {
            return null;
        }

        const date = normalizeLegacyDate(transaction.date);
        if (!date) return null;

        return {
            id: transaction.id === undefined || transaction.id === null
                ? "saved-transaction-" + index
                : String(transaction.id),
            date,
            description: transaction.description,
            category: transaction.category,
            amount: Number(transaction.amount),
            status: transaction.status
        };
    });

    return normalizedTransactions.every(Boolean) ? normalizedTransactions : null;
}

async function loadData() {
    transfers = [];
    transactionHistory = [];
    transferLoadWarning = "";

    try {
        const data = await window.FinEdgeUserData.load();
        const savedHistory = normalizeTransactionHistory(data.transactionHistory);
        if (!savedHistory || !isValidTransferList(data.transfers)) {
            throw new TypeError("Saved transaction data has an invalid structure.");
        }

        transactionHistory = savedHistory;
        transfers = data.transfers;
    } catch (error) {
        transferLoadWarning = "Could not load transaction history from the server. Please refresh to try again.";
        console.error("Could not load transactions.", error);
    }

    renderTransactions();
}

function getAllTransactions() {
    const savedTransfers = transfers.map(transfer => ({
        id: "transfer-" + transfer.id,
        date: transfer.date,
        description: "Transfer to " + transfer.recipient,
        category: "Transfer",
        amount: -Number(transfer.amount),
        status: "Completed"
    }));

    const uniqueTransfers = savedTransfers.filter(transfer =>
        !transactionHistory.some(historyEntry =>
            historyEntry.category === "Transfer" &&
            historyEntry.description === transfer.description &&
            Number(historyEntry.amount) === transfer.amount &&
            new Date(historyEntry.date).toDateString() === new Date(transfer.date).toDateString()
        )
    );

    return transactionHistory.concat(uniqueTransfers);
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function formatCurrency(amount) {
    return "₹" + Math.abs(Number(amount)).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(dateValue) {
    return new Date(dateValue).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function getDateFilterStart(value) {
    if (value === "all") return null;

    const cutoffDate = new Date();
    cutoffDate.setHours(0, 0, 0, 0);
    if (value === "thisMonth") {
        return new Date(cutoffDate.getFullYear(), cutoffDate.getMonth(), 1);
    }

    const monthCount = Number(value);
    if (!Number.isFinite(monthCount) || monthCount <= 0) return null;
    cutoffDate.setMonth(cutoffDate.getMonth() - monthCount);
    return cutoffDate;
}

function getFilteredTransactions() {
    const query = transactionSearch.value.trim().toLowerCase();
    const selectedType = typeFilter.value;
    const startDate = getDateFilterStart(dateFilter.value);

    return getAllTransactions()
        .filter(transaction => {
            const transactionDate = new Date(transaction.date);
            if (startDate && transactionDate < startDate) return false;
            if (selectedType !== "all" && transaction.category !== selectedType) return false;

            const searchableText = [
                transaction.description,
                transaction.category,
                transaction.status,
                formatDate(transaction.date),
                String(transaction.amount)
            ].join(" ").toLowerCase();
            return searchableText.includes(query);
        })
        .sort((first, second) => Date.parse(second.date) - Date.parse(first.date));
}

function getCategoryClass(category) {
    const categoryClasses = {
        Income: "cat-green",
        Shopping: "cat-red",
        Food: "cat-orange",
        Bills: "cat-green",
        Transfer: "cat-blue"
    };
    return categoryClasses[category] || "cat-blue";
}

function renderTransactions() {
    visibleTransactions = getFilteredTransactions();
    transactionTableBody.replaceChildren();

    if (!visibleTransactions.length) {
        const row = document.createElement("tr");
        const cell = createElement("td", "empty-transactions", "No transactions match these filters.");
        cell.colSpan = 5;
        row.appendChild(cell);
        transactionTableBody.appendChild(row);
    } else {
        visibleTransactions.forEach(transaction => {
            const row = document.createElement("tr");
            row.appendChild(createElement("td", "td-date", formatDate(transaction.date)));
            row.appendChild(createElement("td", "td-desc", transaction.description));

            const categoryCell = document.createElement("td");
            const categoryBadge = createElement("span", "cat-badge " + getCategoryClass(transaction.category));
            categoryBadge.append(
                createElement("span", "dot"),
                document.createTextNode(" " + transaction.category)
            );
            categoryCell.appendChild(categoryBadge);
            row.appendChild(categoryCell);

            const amountClass = transaction.amount < 0 ? "amount-debit" : "amount-credit";
            const amountPrefix = transaction.amount < 0 ? "− " : "+ ";
            row.appendChild(
                createElement("td", "td-amount text-right " + amountClass, amountPrefix + formatCurrency(transaction.amount))
            );

            const statusCell = document.createElement("td");
            statusCell.className = "text-center";
            statusCell.appendChild(createElement("span", "status-badge", transaction.status));
            row.appendChild(statusCell);
            transactionTableBody.appendChild(row);
        });
    }

    if (transferLoadWarning) {
        transactionMessage.textContent = transferLoadWarning;
        transactionMessage.classList.add("transaction-warning");
    } else {
        transactionMessage.textContent = visibleTransactions.length
            ? "Showing " + visibleTransactions.length + " transaction" + (visibleTransactions.length === 1 ? "" : "s") + "."
            : "No transactions match these filters.";
        transactionMessage.classList.remove("transaction-warning");
    }
}

function escapeCsvValue(value) {
    return '"' + String(value).replace(/"/g, '""') + '"';
}

function exportTransactions() {
    const headers = ["Date", "Description", "Category", "Amount", "Status"];
    const rows = visibleTransactions.map(transaction => [
        formatDate(transaction.date),
        transaction.description,
        transaction.category,
        (transaction.amount < 0 ? "-" : "+") + " " + formatCurrency(transaction.amount),
        transaction.status
    ]);
    const csv = [headers, ...rows]
        .map(row => row.map(escapeCsvValue).join(","))
        .join("\r\n");

    try {
        const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
        const downloadUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.href = downloadUrl;
        downloadLink.download = "finedge-transactions.csv";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        transactionMessage.textContent = "Exported " + visibleTransactions.length + " transaction" +
            (visibleTransactions.length === 1 ? "" : "s") + ".";
        transactionMessage.classList.remove("transaction-warning");
    } catch (error) {
        console.error("Could not export transactions.", error);
        transactionMessage.textContent = "Transactions could not be exported in this browser.";
        transactionMessage.classList.add("transaction-warning");
    }
}

transactionSearch.addEventListener("input", renderTransactions);
typeFilter.addEventListener("change", renderTransactions);
dateFilter.addEventListener("change", renderTransactions);
exportButton.addEventListener("click", exportTransactions);
loadData();