const form = document.querySelector("form");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const password = document.querySelector("#password").value;
  const confirmPassword = document.querySelector("#confirm-password").value;

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  const user = {
    fullname: document.querySelector("#fullname").value,
    email: document.querySelector("#email").value.trim().toLowerCase(),
    phone: document.querySelector("#phone").value,
    password: password
  };

  const response = await fetch("http://localhost:3000/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(user)
  });

  if (!response.ok) {
    alert("Could not create account.");
    return;
  }

  const savedUser = await response.json();
  localStorage.setItem("finedgeUserId", savedUser.id);
  localStorage.setItem("finedgeUserName", savedUser.fullname);
  localStorage.setItem("finedgeUserEmail", savedUser.email);

  alert("Account created successfully.");
  window.location.href = "dashboard.html";
});