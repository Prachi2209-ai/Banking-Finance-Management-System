const form = document.querySelector("form");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.querySelector("#email").value.trim().toLowerCase();
  const password = document.querySelector("#password").value;

  let user;
  try {
    const response = await fetch(
      `http://localhost:3000/users?email=${encodeURIComponent(email)}`
    );
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}.`);
    }

    const users = await response.json();
    user = users.find((account) => account.password === password);
  } catch (error) {
    console.error("Could not sign in.", error);
    alert("Could not connect to the account service. Please try again.");
    return;
  }

  if (!user) {
    alert("Invalid email or password.");
    return;
  }

  localStorage.setItem("finedgeUserId", user.id);
  localStorage.setItem("finedgeUserName", user.fullname);
  localStorage.setItem("finedgeUserEmail", user.email);
  window.location.href = "dashboard.html";
});