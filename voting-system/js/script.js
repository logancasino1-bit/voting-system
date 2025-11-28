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

// ==========================================
//           UI INTERACTION LOGIC
// ==========================================

const modalOverlay = document.getElementById('authModal');
const closeModalBtn = document.getElementById('closeModal');
const loginFormBox = document.getElementById('loginFormBox');
const registerFormBox = document.getElementById('registerFormBox');

// Buttons that OPEN the modal
const loginBtns = document.querySelectorAll('.btn-login'); // Header login
const registerBtns = document.querySelectorAll('.btn-register, .btn-hero, .btn-small-outline'); // Header & Hero register buttons

// Links inside modal to switch views
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');

// 1. OPEN MODAL (Default to Login)
loginBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault(); // Stop page redirect if any
        openModal('login');
    });
});

// 2. OPEN MODAL (Default to Register)
registerBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault(); // Stop page redirect
        openModal('register');
    });
});

function openModal(view) {
    modalOverlay.classList.add('active');
    if (view === 'register') {
        switchView('register');
    } else {
        switchView('login');
    }
}

// 3. CLOSE MODAL
closeModalBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
});

// Close if clicking outside the white box
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
    }
});

// 4. SWITCH BETWEEN LOGIN & REGISTER INSIDE MODAL
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('register');
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('login');
});

function switchView(view) {
    // Clear messages
    document.getElementById('signInMessage').innerHTML = '';
    document.getElementById('signUpMessage').innerHTML = '';

    if (view === 'register') {
        loginFormBox.classList.add('hidden');
        registerFormBox.classList.remove('hidden');
        // Update left side text (Optional)
        document.querySelector('.modal-welcome-text h2').textContent = "Join Us!";
        document.querySelector('.modal-welcome-text p').textContent = "Create an account to start voting.";
    } else {
        registerFormBox.classList.add('hidden');
        loginFormBox.classList.remove('hidden');
        // Update left side text (Optional)
        document.querySelector('.modal-welcome-text h2').textContent = "Welcome Back!";
        document.querySelector('.modal-welcome-text p').textContent = "Login to access your voting dashboard.";
    }
}

// ==========================================
//           FIREBASE LOGIC
// ==========================================

// Helper for error messages
function showMessage(message, divId, color = 'red') {
    const messageDiv = document.getElementById(divId);
    if (!messageDiv) return;
    messageDiv.style.color = color;
    messageDiv.innerHTML = message;
    
    // Auto clear after 5 seconds
    setTimeout(() => {
        messageDiv.innerHTML = '';
    }, 5000);
}

// ---------------- REGISTER FUNCTION ----------------
const signUpBtn = document.getElementById('submitSignUp');

signUpBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const firstName = document.getElementById('first_name').value.trim();
    const lastName = document.getElementById('last_name').value.trim();
    const email = document.getElementById('signup_email').value.trim();
    const password = document.getElementById('signup_password').value.trim();

    // Validation
    if (!firstName || !lastName || !email || !password) {
        showMessage('All fields are required!', 'signUpMessage');
        return;
    }
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters!', 'signUpMessage');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save to Firestore
        const userData = {
            email,
            first_name: firstName,
            last_name: lastName,
            createdAt: new Date().toISOString(),
            role: 'user'
        };

        await setDoc(doc(db, "users", user.uid), userData);

        showMessage("Account created! Redirecting to login...", 'signUpMessage', 'green');
        
        // Short delay then switch to login view
        setTimeout(() => {
            switchView('login');
            // Auto-fill the email for them
            document.getElementById('login_email').value = email;
        }, 1500);

    } catch (error) {
        console.error("Register Error:", error);
        if (error.code === 'auth/email-already-in-use') {
            showMessage('Email is already registered.', 'signUpMessage');
        } else {
            showMessage(error.message, 'signUpMessage');
        }
    }
});

// ---------------- LOGIN FUNCTION ----------------
const signInBtn = document.getElementById('submitLogin');

signInBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login_email').value.trim();
    const password = document.getElementById('login_password').value.trim();

    if (!email || !password) {
        showMessage("Please enter email and password.", "signInMessage");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Optional: Check if admin or user based on Firestore role
        // For now, just logging in as regular user
        localStorage.setItem('loggedInUserId', user.uid);
        
        showMessage("Login successful! Redirecting...", "signInMessage", "green");
        
        setTimeout(() => {
            window.location.href = 'user_dashboard.html';
        }, 1000);

    } catch (error) {
        console.error("Login Error:", error);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            showMessage('Incorrect email or password.', 'signInMessage');
        } else {
            showMessage('Login failed. Please try again.', 'signInMessage');
        }
    }
});