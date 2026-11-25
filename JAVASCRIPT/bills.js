
"use strict";

// Initial Bills
let bills = [
    {
        id: 1,
        name: "Internet",
        amount: 800,
        date: "2026-11-27",
        paid: false
    },
    {
        id: 2,
        name: "Water",
        amount: 600,
        date: "2026-12-07",
        paid: false
    },
    {
        id: 3,
        name: "Electricity",
        amount: 1500,
        date: "2026-12-06",
        paid: false
    }
];

// Payment History
let paymentHistory = [];

let totalPaid = 13699;
let editingId = null;
let currentTab = "upcoming";

// Get bill status based on due date
function getStatus(date) {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(date + "T00:00:00");

    const difference = Math.round(
        (dueDate - today) / (1000 * 60 * 60 * 24)
    );

    if (difference < 0) {
        return "Overdue";
    }

    if (difference <= 3) {
        return "Due Soon";
    }

    return "Upcoming";
}

// Update Dashboard Cards
function updateSummary() {

    const pendingBills = bills.filter(bill => !bill.paid);

    const pendingAmount = pendingBills.reduce(
        (total, bill) => total + bill.amount, 0
    );

    document.getElementById("pendingBills").innerText =
        pendingBills.length;

    document.getElementById("pendingAmount").innerText =
        "₹" + pendingAmount.toLocaleString("en-IN");

    document.getElementById("totalPaid").innerText =
        "₹" + totalPaid.toLocaleString("en-IN");
}

// Display Bills
function displayBills() {

    const table = document.getElementById("billTable");
    table.innerHTML = "";

    let searchValue = document.getElementById("searchInput")
        .value.toLowerCase();

    let displayedBills = currentTab === "upcoming"
        ? bills.filter(bill => !bill.paid)
        : paymentHistory;

    displayedBills = displayedBills.filter(bill =>
        bill.name.toLowerCase().includes(searchValue)
    );

    if (displayedBills.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:25px">
                    No bills found
                </td>
            </tr>
        `;

        return;
    }

    displayedBills.forEach(bill => {

        const status = bill.paid
            ? "Paid"
            : getStatus(bill.date);

        const formattedDate = new Date(
            bill.date + "T00:00:00"
        ).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });

        const statusClass = status.toLowerCase().replace(" ", "-");

        let actionButtons = "";

        if (bill.paid) {

            actionButtons = `<span style="color:green">✓ Paid</span>`;

        } else {

            // IMPORTANT: Upcoming bills cannot be paid
            const canPay =
                status === "Due Soon" || status === "Overdue";

            actionButtons = `
                <button class="pay-btn"
                    ${canPay ? "" : "disabled"}
                    onclick="payBill(${bill.id})">
                    ${canPay ? "Pay" : "Not Due"}
                </button>

                <button class="edit-btn"
                    onclick="editBill(${bill.id})">
                    Edit
                </button>

                <button class="delete-btn"
                    onclick="deleteBill(${bill.id})">
                    Delete
                </button>
            `;
        }

        table.innerHTML += `
            <tr>
                <td>${bill.name}</td>
                <td><b>₹${bill.amount.toLocaleString("en-IN")}</b></td>
                <td>${formattedDate}</td>

                <td>
                    <span class="status ${statusClass}">
                        ${status}
                    </span>
                </td>

                <td>${actionButtons}</td>
            </tr>
        `;
    });
}

// Switch Tabs
function showTab(tab) {

    currentTab = tab;

    document.getElementById("upcomingTab")
        .classList.toggle("active", tab === "upcoming");

    document.getElementById("historyTab")
        .classList.toggle("active", tab === "history");

    displayBills();
}

// Pay Bill
function payBill(id) {

    const bill = bills.find(item => item.id === id);

    if (!bill || bill.paid) return;

    const status = getStatus(bill.date);

    // Prevent payment of upcoming bills
    if (status === "Upcoming") {
        alert("This bill is not due yet. You cannot pay it now!");
        return;
    }

    const confirmation = confirm(
        `Are you sure you want to pay ₹${bill.amount} for ${bill.name}?`
    );

    if (!confirmation) return;

    bill.paid = true;

    totalPaid += bill.amount;

    paymentHistory.push({
        ...bill,
        paid: true,
        paymentDate: new Date().toISOString().split("T")[0]
    });

    bills = bills.filter(item => item.id !== id);

    updateSummary();
    displayBills();

    alert("Payment successful!");
}

// Open Add Bill Modal
function openAddBill() {

    editingId = null;

    document.getElementById("modalTitle").innerText =
        "Add New Bill";

    document.getElementById("billForm").reset();

    document.getElementById("billModal").style.display = "flex";
}

// Close Modal
function closeModal() {

    document.getElementById("billModal").style.display = "none";
}

// Add / Edit Bill
document.getElementById("billForm").addEventListener(
    "submit", function(event) {

        event.preventDefault();

        const name = document.getElementById("billName")
            .value.trim();

        const amount = Number(
            document.getElementById("billAmount").value
        );

        const date = document.getElementById("billDate").value;

        if (!name || amount <= 0 || !date) {
            alert("Please enter valid bill details.");
            return;
        }

        if (date < new Date().toLocaleDateString("en-CA")) {
            alert("Please select today or a future date.");
            return;
        }

        if (editingId !== null) {

            const bill = bills.find(item => item.id === editingId);

            if (bill) {
                bill.name = name;
                bill.amount = amount;
                bill.date = date;
            }

            alert("Bill updated successfully!");

        } else {

            bills.push({
                id: Date.now(),
                name: name,
                amount: amount,
                date: date,
                paid: false
            });

            alert("New bill added successfully!");
        }

        closeModal();
        updateSummary();
        displayBills();
    }
);

// Edit Bill
function editBill(id) {

    const bill = bills.find(item => item.id === id);

    if (!bill) return;

    editingId = id;

    document.getElementById("modalTitle").innerText =
        "Edit Bill";

    document.getElementById("billName").value = bill.name;
    document.getElementById("billAmount").value = bill.amount;
    document.getElementById("billDate").value = bill.date;

    document.getElementById("billModal").style.display = "flex";
}

// Delete Bill
function deleteBill(id) {

    const confirmation = confirm(
        "Are you sure you want to delete this bill?"
    );

    if (!confirmation) return;

    bills = bills.filter(bill => bill.id !== id);

    updateSummary();
    displayBills();

    alert("Bill deleted successfully!");
}

// Search Bills
document.getElementById("searchInput")
    .addEventListener("input", displayBills);

// Initial Display
updateSummary();
displayBills();
