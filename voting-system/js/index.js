import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js"; 

// --- UI LOGIC ---
const modalOverlay = document.getElementById('authModal');
const closeModalBtn = document.getElementById('closeModal');
const loginFormBox = document.getElementById('loginFormBox');
const registerFormBox = document.getElementById('registerFormBox');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');

// 1. OPEN MODAL
function openModal(view) {
    modalOverlay.classList.add('active');
    if (view === 'register') {
        loginFormBox.classList.add('hidden');
        registerFormBox.classList.remove('hidden');
        document.getElementById('modalTitle').textContent = "Join Us!";
        document.getElementById('modalDesc').textContent = "Create an account to vote.";
    } else {
        registerFormBox.classList.add('hidden');
        loginFormBox.classList.remove('hidden');
        document.getElementById('modalTitle').textContent = "Welcome Back!";
        document.getElementById('modalDesc').textContent = "Login to access your dashboard.";
    }
}

document.getElementById('headerLoginBtn').addEventListener('click', () => openModal('login'));
document.getElementById('headerRegisterBtn').addEventListener('click', () => openModal('register'));
document.getElementById('heroRegisterBtn').addEventListener('click', () => openModal('register'));

// 2. CLOSE MODAL
closeModalBtn.addEventListener('click', () => modalOverlay.classList.remove('active'));
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.remove('active');
});

// 3. SWITCH TABS
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('register');
});
showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('login');
});

function showMessage(msg, type='error') {
    const el = type === 'error' ? 'signInMessage' : 'signUpMessage';
    const div = document.getElementById(el);
    div.style.color = type === 'error' ? 'red' : 'green';
    div.innerText = msg;
}

// --- REGISTER LOGIC ---
document.getElementById('submitSignUp').addEventListener('click', async (e) => {
    e.preventDefault();
    const fname = document.getElementById('first_name').value.trim();
    const lname = document.getElementById('last_name').value.trim();
    const sid = document.getElementById('student_id').value.trim();
    const email = document.getElementById('signup_email').value.trim();
    const pass = document.getElementById('signup_password').value.trim();

    if(!fname || !lname || !sid || !email || !pass) {
        return showMessage("All fields required", "signUpMessage");
    }

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        
        // Create User Doc
        await setDoc(doc(db, "users", cred.user.uid), {
            first_name: fname,
            last_name: lname,
            student_id: sid,
            email: email,
            role: 'user', // Default role
            hasVoted: false,
            createdAt: new Date().toISOString()
        });

        showMessage("Success! Logging in...", "success");
        setTimeout(() => window.location.href = "user_dashboard.html", 1500);

    } catch (err) {
        showMessage(err.message, "signUpMessage");
    }
});

// --- LOGIN LOGIC ---
document.getElementById('submitLogin').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login_email').value.trim();
    const pass = document.getElementById('login_password').value.trim();

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        // Always go to user dashboard first
        window.location.href = "user_dashboard.html";
    } catch (err) {
        document.getElementById('signInMessage').innerText = "Incorrect email or password.";
        console.error(err);
    }
});