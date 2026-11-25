const profileStorageKey = "finedgeProfile";
const profilePages = document.querySelectorAll(".profile-box .page");
const photoInput = document.querySelector("#profile-photo-input");
const photoStatus = document.querySelector(".photo-status");
let profilePhoto = "";
const profileApiUrl = "http://localhost:3000/users";
let currentUserId = localStorage.getItem("finedgeUserId");
let currentUser = null;

async function getCurrentUser() {
    const name = localStorage.getItem("finedgeUserName");
    const email = localStorage.getItem("finedgeUserEmail");

    currentUser = null;
    if (email) {
        const response = await fetch(`${profileApiUrl}?email=${encodeURIComponent(email)}`);
        if (!response.ok) {
            throw new Error(`Could not find account (${response.status}).`);
        }
        const users = await response.json();
        currentUser = users[0] || null;
    }

    if (!currentUser) {
        if (currentUserId) {
            const response = await fetch(`${profileApiUrl}/${encodeURIComponent(currentUserId)}`);
            if (response.ok) {
                currentUser = await response.json();
            }
        }

        if (!currentUser && name) {
            const response = await fetch(profileApiUrl);
            if (!response.ok) {
                throw new Error(`Could not load accounts (${response.status}).`);
            }
            const users = await response.json();
            currentUser = users.find((user) => user.fullname === name) || null;
        }
    }

    if (currentUser) {
        currentUserId = currentUser.id;
        localStorage.setItem("finedgeUserId", currentUser.id);
    }
}

async function saveCurrentUser(profile) {
    await getCurrentUser();

    if (!currentUserId) {
        throw new Error("No signed-in user found. Please log in again.");
    }

    const response = await fetch(`${profileApiUrl}/${encodeURIComponent(currentUserId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
    });

    if (!response.ok) {
        const details = await response.text();
        throw new Error(`Server returned ${response.status}${details ? `: ${details}` : ""}`);
    }

    currentUser = await response.json();
}

function showProfileMessage(page, message, isError) {
    const status = page.querySelector(".save-status");
    status.textContent = message;
    status.classList.toggle("error", isError);
}

function updateProfileName() {
    const firstName = document.querySelector('[name="firstName"]').value.trim();
    const lastName = document.querySelector('[name="lastName"]').value.trim();
    const savedName = localStorage.getItem("finedgeUserName");
    const displayName = [firstName, lastName].filter(Boolean).join(" ") || savedName || "Guest User";
    const initials = displayName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase();

    document.querySelectorAll(".profile-left h2, .user-info strong").forEach((element) => {
        element.textContent = displayName;
    });
    document.querySelectorAll(".profile-photo, .user-image").forEach((element) => {
        element.textContent = profilePhoto ? "" : initials;
        element.style.backgroundImage = profilePhoto ? `url("${profilePhoto}")` : "";
    });
}

function showPhotoMessage(message, isError) {
    photoStatus.textContent = message;
    photoStatus.classList.toggle("error", isError);
}

async function compressProfilePhoto(dataUrl) {
    if (dataUrl.length <= 70 * 1024) {
        return dataUrl;
    }

    const image = new Image();
    await new Promise((resolve, reject) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", reject, { once: true });
        image.src = dataUrl;
    });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Could not prepare the profile photo.");
    }

    let scale = Math.min(1, 500 / image.width, 500 / image.height);
    for (let resizeAttempt = 0; resizeAttempt < 5; resizeAttempt += 1) {
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        for (const quality of [0.8, 0.65, 0.5, 0.35]) {
            const blob = await new Promise((resolve) => {
                canvas.toBlob(resolve, "image/jpeg", quality);
            });

            if (blob && blob.size <= 60 * 1024) {
                return await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.addEventListener("load", () => resolve(reader.result), { once: true });
                    reader.addEventListener("error", reject, { once: true });
                    reader.readAsDataURL(blob);
                });
            }
        }

        scale *= 0.75;
    }

    throw new Error("Could not reduce the photo enough to save it.");
}

async function loadProfile() {
    try {
        await getCurrentUser();
        const localProfile = JSON.parse(localStorage.getItem(profileStorageKey) || "{}");
        const savedProfile = currentUser
            ? { ...localProfile, ...(currentUser.profile || {}) }
            : localProfile;

        document.querySelectorAll(".profile-box .page [name]").forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(savedProfile, field.name)) {
                if (field.type === "checkbox") {
                    field.checked = savedProfile[field.name];
                } else {
                    field.value = savedProfile[field.name];
                }
            }
        });

        if (typeof savedProfile.photo === "string" && savedProfile.photo.startsWith("data:image/")) {
            profilePhoto = savedProfile.photo;
        }

        updateProfileName();
    } catch (error) {
        console.error("Could not load the saved profile.", error);
        showProfileMessage(profilePages[0], "Could not load saved profile details.", true);
    }
}

profilePages.forEach((page) => {
    page.querySelector(".save button").addEventListener("click", async () => {
        const firstName = document.querySelector('[name="firstName"]');
        const lastName = document.querySelector('[name="lastName"]');

        if (page.classList.contains("personal-page") && (!firstName.value.trim() || !lastName.value.trim())) {
            showProfileMessage(page, "Enter your first and last name.", true);
            (firstName.value.trim() ? lastName : firstName).focus();
            return;
        }

        try {
            const savedProfile = JSON.parse(localStorage.getItem(profileStorageKey) || "{}");

            page.querySelectorAll("[name]").forEach((field) => {
                savedProfile[field.name] = field.type === "checkbox" ? field.checked : field.value;
            });

            if (typeof savedProfile.photo === "string") {
                savedProfile.photo = await compressProfilePhoto(savedProfile.photo);
                profilePhoto = savedProfile.photo;
            }

            localStorage.setItem(profileStorageKey, JSON.stringify(savedProfile));
            await saveCurrentUser({ profile: savedProfile });

            if (page.classList.contains("personal-page")) {
                localStorage.setItem("finedgeUserName", `${firstName.value.trim()} ${lastName.value.trim()}`);
                updateProfileName();
            }

            showProfileMessage(page, "Changes saved.", false);
        } catch (error) {
            console.error("Could not save the profile.", error);
            const detail = error instanceof Error ? error.message : "Unknown error.";
            showProfileMessage(page, `Could not save changes: ${detail}`, true);
        }
    });
});

document.querySelector("#edit-profile-photo").addEventListener("click", () => {
    photoInput.value = "";
    photoInput.click();
});

photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showPhotoMessage("Choose an image file.", true);
        photoInput.value = "";
        return;
    }

    if (file.size > 1024 * 1024) {
        showPhotoMessage("Choose an image smaller than 1 MB.", true);
        photoInput.value = "";
        return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", async () => {
        if (typeof reader.result !== "string") {
            showPhotoMessage("Could not read the selected photo.", true);
            return;
        }

        try {
            const compressedPhoto = await compressProfilePhoto(reader.result);
            const savedProfile = JSON.parse(localStorage.getItem(profileStorageKey) || "{}");
            savedProfile.photo = compressedPhoto;
            await saveCurrentUser({ profile: savedProfile });
            localStorage.setItem(profileStorageKey, JSON.stringify(savedProfile));
            profilePhoto = compressedPhoto;
            updateProfileName();
            showPhotoMessage("Profile photo saved.", false);
        } catch (error) {
            console.error("Could not save the profile photo.", error);
            const detail = error instanceof Error ? error.message : "Unknown error.";
            showPhotoMessage(`Could not save the photo: ${detail}`, true);
        }
    });

    reader.addEventListener("error", () => {
        console.error("Could not read the selected profile photo.", reader.error);
        showPhotoMessage("Could not read the selected photo.", true);
    });

    reader.readAsDataURL(file);
});

loadProfile();
