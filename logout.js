import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Get modal
const logoutModal = document.getElementById("logoutModal");
const confirmBtn = document.getElementById("confirmLogout");
const cancelBtn = document.getElementById("cancelLogout");

// Show modal
window.showLogoutModal = () => logoutModal.classList.add("show");

// Close modal
cancelBtn.addEventListener("click", () => logoutModal.classList.remove("show"));
logoutModal.addEventListener("click", e => {
    if (e.target === logoutModal) logoutModal.classList.remove("show");
});

// REAL logout function (modular)
window.logoutUser = () => {
    const auth = getAuth(); // ← FIXED: correct way to get auth

    signOut(auth)
        .then(() => {
            localStorage.removeItem("loggedInUserId");

            // Redirect to login page
            window.location.href = "user_login.html";  
        })
        .catch(err => console.error("Logout error:", err));
};

// Confirm logout button
confirmBtn.addEventListener("click", () => {
    logoutModal.classList.remove("show");
    logoutUser();
});
