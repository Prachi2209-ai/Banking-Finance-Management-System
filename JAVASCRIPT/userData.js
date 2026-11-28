"use strict";

(function () {
    const apiUrl = "http://localhost:3000";
    const pageUserId = window.localStorage.getItem("finedgeUserId");

    function defaultData(userId) {
        return {
            userId: String(userId),
            accounts: [],
            bankCards: [],
            transfers: [],
            transactionHistory: [],
            monthlyBudget: 20000,
            expenses: [],
            savingsGoals: [],
            bills: [],
            paymentHistory: [],
            totalPaid: 0,
            settings: {}
        };
    }

    async function readRecord(userId) {
        const response = await fetch(
            `${apiUrl}/userData?userId=${encodeURIComponent(userId)}`
        );
        if (!response.ok) {
            throw new Error(`Could not load account data (${response.status}).`);
        }

        const records = await response.json();
        if (!Array.isArray(records)) {
            throw new TypeError("The account data response has an invalid structure.");
        }
        return records.find((record) => String(record.userId) === String(userId)) || null;
    }

    async function initialize(userId) {
        const existing = await readRecord(userId);
        if (existing) {
            return existing;
        }

        const response = await fetch(`${apiUrl}/userData`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(defaultData(userId))
        });

        if (!response.ok) {
            const recordAfterConflict = await readRecord(userId);
            if (recordAfterConflict) {
                return recordAfterConflict;
            }
            throw new Error(`Could not initialize account data (${response.status}).`);
        }
        return response.json();
    }

    function getSessionUserId() {
        const currentUserId = window.localStorage.getItem("finedgeUserId");
        if (!pageUserId || currentUserId !== pageUserId) {
            window.location.replace("login.html");
            throw new Error("Sign in again to access account data.");
        }
        return pageUserId;
    }

    async function load() {
        const userId = getSessionUserId();
        const record = await readRecord(userId);
        return record || initialize(userId);
    }

    async function save(fields) {
        const userId = getSessionUserId();
        if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
            throw new TypeError("Account data changes must be an object.");
        }

        const record = await readRecord(userId) || await initialize(userId);
        const response = await fetch(
            `${apiUrl}/userData/${encodeURIComponent(record.id)}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...fields, userId })
            }
        );
        if (!response.ok) {
            throw new Error(`Could not save account data (${response.status}).`);
        }
        return response.json();
    }

    window.addEventListener("storage", (event) => {
        if (event.key === "finedgeUserId" && event.newValue !== pageUserId) {
            window.location.replace("login.html");
        }
    });

    window.FinEdgeUserData = { initialize, load, save };
})();
