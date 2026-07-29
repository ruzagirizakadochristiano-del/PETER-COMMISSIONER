import { db, currentUser, userRole } from "./auth.js";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { showMessage, showLoader, hideLoader } from "./utils.js";

let contactInfo = { instagramUrl: '', phoneNumber: '' };

const dom = {
    publicInstagramLink: document.getElementById('publicInstagramLink'),
    publicPhoneNumber: document.getElementById('publicPhoneNumber'),
    adminInstagramUrl: document.getElementById('adminInstagramUrl'),
    adminPhoneNumber: document.getElementById('adminPhoneNumber'),
    navbarContactLinks: document.getElementById('navbarContactLinks'),
};

// Update navbar links
function updateNavbarContactLinks() {
    if (!dom.navbarContactLinks) return;
    const insta = contactInfo.instagramUrl || 'https://www.instagram.com/__bullet_wi_gikondo__';
    const phone = contactInfo.phoneNumber || '+250786811816';
    const email = 'ruzagirizakadochriistiano@gmail.com';
    dom.navbarContactLinks.innerHTML = `
        <a href="${insta}" target="_blank" class="hover:text-yellow-500 transition flex items-center gap-1 text-gray-300">
            <i class="fab fa-instagram text-pink-500"></i> <span class="hidden sm:inline">Instagram</span>
        </a>
        <span class="text-yellow-600/50">|</span>
        <a href="https://wa.me/${phone.replace(/\D/g,'')}" target="_blank" class="hover:text-yellow-500 transition flex items-center gap-1 text-gray-300">
            <i class="fab fa-whatsapp text-green-500"></i> <span>${phone}</span> <span class="text-lg">🇷🇼</span>
        </a>
        <span class="text-yellow-600/50">|</span>
        <a href="mailto:${email}" class="hover:text-yellow-500 transition flex items-center gap-1 text-gray-300">
            <i class="fas fa-envelope"></i> <span class="hidden sm:inline">Email</span>
        </a>
    `;
}

export async function loadContactInfo() {
    try {
        const docRef = doc(db, "settings", "contactInfo");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) contactInfo = docSnap.data();
        else {
            contactInfo = { instagramUrl: "https://www.instagram.com/__bullet_wi_gikondo__", phoneNumber: "+250786811816" };
            await setDoc(docRef, contactInfo);
        }
        // Update public contact section
        if (dom.publicInstagramLink) dom.publicInstagramLink.innerHTML = `<a href="${contactInfo.instagramUrl}" target="_blank" class="text-yellow-500 underline">${contactInfo.instagramUrl}</a>`;
        if (dom.publicPhoneNumber) dom.publicPhoneNumber.innerHTML = `<a href="https://wa.me/${contactInfo.phoneNumber.replace(/\D/g,'')}" target="_blank" class="text-yellow-500 underline">${contactInfo.phoneNumber}</a>`;
        if (dom.adminInstagramUrl) dom.adminInstagramUrl.value = contactInfo.instagramUrl;
        if (dom.adminPhoneNumber) dom.adminPhoneNumber.value = contactInfo.phoneNumber;
        updateNavbarContactLinks();
    } catch (err) { console.error(err); }
}

export async function saveContactInfo(url, phone) {
    showLoader();
    try {
        await setDoc(doc(db, "settings", "contactInfo"), { instagramUrl: url, phoneNumber: phone });
        contactInfo = { instagramUrl: url, phoneNumber: phone };
        if (dom.publicInstagramLink) dom.publicInstagramLink.innerHTML = `<a href="${contactInfo.instagramUrl}" target="_blank" class="text-yellow-500 underline">${contactInfo.instagramUrl}</a>`;
        if (dom.publicPhoneNumber) dom.publicPhoneNumber.innerHTML = `<a href="https://wa.me/${contactInfo.phoneNumber.replace(/\D/g,'')}" target="_blank" class="text-yellow-500 underline">${contactInfo.phoneNumber}</a>`;
        updateNavbarContactLinks();
        showMessage("Contact info updated", "success");
    } catch (err) { showMessage("Update failed", "error"); }
    finally { hideLoader(); }
}

// Bind contact form events
export function bindContactEvents() {
    const form = document.getElementById('contactSettingsForm');
    const resetBtn = document.getElementById('resetContactBtn');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const url = dom.adminInstagramUrl.value.trim(), phone = dom.adminPhoneNumber.value.trim();
            if (!url || !phone) { showMessage('Both fields required', 'warning'); return; }
            await saveContactInfo(url, phone);
        };
    }
    if (resetBtn) {
        resetBtn.onclick = async () => {
            await saveContactInfo("https://www.instagram.com/__bullet_wi_gikondo__", "+250786811816");
        };
    }
}