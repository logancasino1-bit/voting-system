// ---------------- Firebase Imports ----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ---------------- Firebase Config ----------------
const firebaseConfig = {
  apiKey: "AIzaSyBrMco-_L76Prf7dkCOu3QfBTC5DTB315M",
  authDomain: "login-form-d9e8b.firebaseapp.com",
  projectId: "login-form-d9e8b",
  storageBucket: "login-form-d9e8b.appspot.com",
  messagingSenderId: "780297703902",
  appId: "1:780297703902:web:3f1acdbce4faf06aff0d4f",
  measurementId: "G-VTZ78CJHES"
};

// ---------------- Initialize Firebase ----------------
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// ---------------- Shared Admin Password ----------------
const ADMIN_SHARED_PASSWORD = "Admin123456"; // All admins use this password

// ---------------- Message Helper ----------------
function showMessage(message, divId) {
    const messageDiv = document.getElementById(divId);
    if (!messageDiv) return;
    messageDiv.style.display = "block";
    messageDiv.innerHTML = message;
    messageDiv.style.opacity = 1;
    setTimeout(() => {
        messageDiv.style.opacity = 0;
        messageDiv.style.display = "none";
    }, 5000);
}

// ---------------- Form Switching ----------------
const registerLink = document.querySelector('.register-link');
const loginLink = document.querySelector('.login-link');
const loginForm = document.querySelector('.form-box.login');
const registerForm = document.querySelector('.form-box.register');

registerLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
});

loginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
});

// ---------------- ADMIN REGISTER ----------------
const signUpBtn = document.getElementById('submitAdminSignUp');
signUpBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    // --- Get input values ---
    const firstName = document.getElementById('admin_first_name').value.trim();
    const lastName = document.getElementById('admin_last_name').value.trim();
    const email = document.getElementById('admin_email').value.trim();
    const password = document.getElementById('admin_password').value.trim();

    // --- Validation ---
    if (!firstName || !lastName || !email || !password) {
        showMessage("All fields are required!", "adminSignUpMessage");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage("Please enter a valid email!", "adminSignUpMessage");
        return;
    }

    // --- Check shared password ---
    if (password !== ADMIN_SHARED_PASSWORD) {
        showMessage("Invalid admin password.", "adminSignUpMessage");
        return;
    }

    try {
        // --- Create user in Firebase Auth ---
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // --- Save admin data to Firestore ---
        const userData = {
            email,
            first_name: firstName,
            last_name: lastName,
            role: "admin",
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, "users", user.uid), userData);

        showMessage("Admin account created successfully! Redirecting to login...", "adminSignUpMessage");

        // Log out immediately
        await signOut(auth);

        setTimeout(() => {
            loginForm.style.display = "block";
            registerForm.style.display = "none";
        }, 2000);

    } catch (error) {
        console.error("Admin registration error:", error);

        switch (error.code) {
            case 'auth/email-already-in-use':
                showMessage("Email already exists!", "adminSignUpMessage");
                break;
            case 'auth/invalid-email':
                showMessage("Invalid email address!", "adminSignUpMessage");
                break;
            case 'auth/weak-password':
                showMessage("Password is too weak!", "adminSignUpMessage");
                break;
            default:
                showMessage(`Error: ${error.message}`, "adminSignUpMessage");
        }
    }
});

// ---------------- ADMIN LOGIN ----------------
const signInBtn = document.getElementById('submitAdminLogin');
signInBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const email = document.getElementById('admin_email_login').value.trim();
    const password = document.getElementById('admin_password_login').value.trim();

    if (!email || !password) {
        showMessage("Email and password are required!", "adminSignInMessage");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch user data from Firestore
        const docSnap = await getDoc(doc(db, "users", user.uid));

        if (!docSnap.exists()) {
            showMessage("User data not found!", "adminSignInMessage");
            return;
        }

        const userData = docSnap.data();

        if (userData.role !== "admin") {
            showMessage("Access denied. Not an admin.", "adminSignInMessage");
            await signOut(auth);
            return;
        }

        // Redirect admin
        window.location.href = "admin_dashboard.html";

    } catch (error) {
        console.error("Admin login error:", error);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            showMessage("Incorrect email or password", "adminSignInMessage");
        } else {
            showMessage(`Error: ${error.message}`, "adminSignInMessage");
        }
    }
});
