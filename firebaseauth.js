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

// ---------------- REGISTER ----------------
const signUpBtn = document.getElementById('submitSignUp');
signUpBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    // --- Get input values ---
    const email = document.getElementById('signup_email').value.trim();
    const password = document.getElementById('signup_password').value.trim();
    const firstName = document.getElementById('first_name').value.trim();
    const lastName = document.getElementById('last_name').value.trim();

    // --- Basic client-side validation ---
    if (!email || !password || !firstName || !lastName) {
        showMessage('All fields are required!', 'signUpMessage');
        return;
    }
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters!', 'signUpMessage');
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Please enter a valid email!', 'signUpMessage');
        return;
    }

    try {
        // --- Create Firebase Auth user ---
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // --- Prepare Firestore data ---
        const userData = {
            email,
            first_name: firstName,
            last_name: lastName,
            createdAt: new Date().toISOString(),
            role: 'user'
        };

        // --- Save user data to Firestore ---
        await setDoc(doc(db, "users", user.uid), userData);

        showMessage("Account created successfully! Redirecting to login...", 'signUpMessage');

        // Log out immediately after registration
        await signOut(auth);

        // Show login form after short delay
        setTimeout(() => {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        }, 2000);

    } catch (error) {
        console.error("Registration error:", error);

        // Handle specific Firebase Auth errors
        switch (error.code) {
            case 'auth/email-already-in-use':
                showMessage('Email already exists!', 'signUpMessage');
                break;
            case 'auth/invalid-email':
                showMessage('Invalid email address!', 'signUpMessage');
                break;
            case 'auth/weak-password':
                showMessage('Password is too weak!', 'signUpMessage');
                break;
            default:
                showMessage(`Error: ${error.message}`, 'signUpMessage');
        }
    }
    
});
// ---------------- USER LOGIN ----------------
const signIn = document.getElementById('submitLogin');
signIn.addEventListener('click', (event) => {
    event.preventDefault();

    const email = document.getElementById('login_email').value;
    const password = document.getElementById('login_password').value;
    const auth = getAuth();

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            showMessage('Login is successful', 'signInMessage');
            const user = userCredential.user;
            localStorage.setItem('loggedInUserId', user.uid);
            window.location.href = 'user_dashboard.html';
        })
        .catch((error) => {
            const errorCode = error.code;
            console.error(error); // useful for debugging

            if (errorCode === 'auth/user-not-found') {
                showMessage('Email does not exist', 'signInMessage');
            } else if (errorCode === 'auth/wrong-password') {
                showMessage('Incorrect password', 'signInMessage');
            } else {
                showMessage('Email or password is incorrect', 'signInMessage');
            }
        });
});
