import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { showLoader, hideLoader, showMessage, getFriendlyError, escapeHtml } from "./utils.js";

// Firebase config (same as before)
const firebaseConfig = {
    apiKey: "AIzaSyBmQVW-mHhcuapT0UG_7JwMybuakpaa4eY",
    authDomain: "peter-commissioner.firebaseapp.com",
    projectId: "peter-commissioner",
    storageBucket: "peter-commissioner.firebasestorage.app",
    messagingSenderId: "209455307473",
    appId: "1:209455307473:web:c9d8dd85526a5ac93d43f0",
    measurementId: "G-0635B6F6X3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// State variables
export let currentUser = null;
export let userRole = 'guest';

// DOM refs (for modals)
const dom = {
    registerBtn: document.getElementById('registerBtn'),
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    userNav: document.querySelector('[data-nav="user"]'),
    adminNav: document.querySelector('[data-nav="admin"]'),
    regModal: document.getElementById('registerModal'),
    loginModal: document.getElementById('loginModal'),
    closeReg: document.getElementById('closeRegModal'),
    closeLogin: document.getElementById('closeLoginModal'),
    regForm: document.getElementById('regForm'),
    loginForm: document.getElementById('loginForm'),
    switchToRegister: document.getElementById('switchToRegister'),
    loginRequiredModal: document.getElementById('loginRequiredModal'),
    closeLoginRequired: document.getElementById('closeLoginRequiredModal'),
    loginRequiredLoginBtn: document.getElementById('loginRequiredLoginBtn'),
    loginRequiredRegisterBtn: document.getElementById('loginRequiredRegisterBtn'),
    userInfo: document.getElementById('userInfoDisplay'),
    contactEmailSpan: document.getElementById('contactEmailSpan'),
};

// Modal helpers
export function closeModal(m) { if (m) m.classList.add('hidden'); }
export function openModal(m) { if (m) m.classList.remove('hidden'); }

// Register
export async function registerUser(email, pwd, first, last) {
    showLoader();
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pwd);
        const role = email === 'admin@petercommissioner.com' ? 'admin' : 'user';
        await setDoc(doc(db, "users", cred.user.uid), { firstName: first, lastName: last, email, role, createdAt: new Date() });
        showMessage(`Welcome ${first}!`, 'success');
        closeModal(dom.regModal);
        // if there's a pending product, we'll handle in main
    } catch(err) { showMessage(getFriendlyError(err.code), 'error'); }
    finally { hideLoader(); }
}

// Login
export async function loginUser(email, pwd) {
    showLoader();
    try {
        await signInWithEmailAndPassword(auth, email, pwd);
        showMessage('Login success', 'success');
        closeModal(dom.loginModal);
    } catch(err) { showMessage(getFriendlyError(err.code), 'error'); }
    finally { hideLoader(); }
}

// Logout
export function logoutUser() {
    signOut(auth);
    showMessage('Logged out', 'info');
}

// Load profile (user panel)
export async function loadProfile(uid) {
    if (!uid) return;
    try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
            const d = snap.data();
            dom.userInfo.innerHTML = `<div class="p-4 bg-gray-900 rounded-xl"><strong class="text-yellow-500">${escapeHtml(d.firstName)} ${escapeHtml(d.lastName)}</strong><br class="text-gray-300">${escapeHtml(d.email)}<br class="text-gray-300">Role: ${escapeHtml(d.role)}</div>`;
            dom.contactEmailSpan.innerText = d.email;
        } else dom.userInfo.innerHTML = '<p class="text-red-500">Profile error</p>';
    } catch(e) { showMessage('Profile load error', 'error'); }
}

// Update navigation buttons
export function updateNav() {
    const logged = !!currentUser;
    dom.registerBtn.classList.toggle('hidden', logged);
    dom.loginBtn.classList.toggle('hidden', logged);
    dom.logoutBtn.classList.toggle('hidden', !logged);
    dom.userNav.classList.toggle('hidden', !logged);
    dom.adminNav.classList.toggle('hidden', userRole !== 'admin');
}

// Auth state observer
export function initAuth(callback) {
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            try { const snap = await getDoc(doc(db, "users", user.uid)); userRole = snap.exists() ? snap.data().role : (user.email === 'admin@petercommissioner.com' ? 'admin' : 'user'); }
            catch(e) { userRole = 'user'; }
        } else userRole = 'guest';
        updateNav();
        if (userRole === 'admin') dom.adminNav.classList.remove('hidden');
        if (currentUser && !document.getElementById('user-panel-section').classList.contains('hidden')) loadProfile(user.uid);
        if (callback) callback(user);
    });
}

// Bind event listeners for auth modals
export function bindAuthEvents() {
    dom.registerBtn.onclick = () => openModal(dom.regModal);
    dom.loginBtn.onclick = () => openModal(dom.loginModal);
    dom.logoutBtn.onclick = logoutUser;
    dom.closeReg.onclick = () => closeModal(dom.regModal);
    dom.closeLogin.onclick = () => closeModal(dom.loginModal);

    dom.regForm.onsubmit = (e) => {
        e.preventDefault();
        const pwd = document.getElementById('regPassword').value, cp = document.getElementById('regConfirmPassword').value;
        if (pwd !== cp) { showMessage('Passwords mismatch', 'warning'); return; }
        registerUser(document.getElementById('regEmail').value, pwd, document.getElementById('regFirstName').value, document.getElementById('regLastName').value);
    };

    dom.loginForm.onsubmit = (e) => {
        e.preventDefault();
        loginUser(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
    };

    dom.switchToRegister.onclick = () => { closeModal(dom.loginModal); openModal(dom.regModal); };

    // Login required modal
    dom.closeLoginRequired.onclick = () => closeModal(dom.loginRequiredModal);
    dom.loginRequiredLoginBtn.onclick = () => { closeModal(dom.loginRequiredModal); openModal(dom.loginModal); };
    dom.loginRequiredRegisterBtn.onclick = () => { closeModal(dom.loginRequiredModal); openModal(dom.regModal); };
}

// Export some dom refs for other modules (if needed)
export { dom as authDom };