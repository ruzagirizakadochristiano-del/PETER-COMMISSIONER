import { initAuth, bindAuthEvents, currentUser, userRole, loadProfile, closeModal, openModal } from "./auth.js";
import { loadCart, bindCartEvents, saveCart, updateCartUI } from "./cart.js";
import { fetchProducts, bindProductEvents, applyFiltersAndRender } from "./products.js";
import { loadContactInfo, bindContactEvents } from "./contact.js";
import { renderAdminList, bindAdminForm, fetchUsersAndOrders, adminRefresh } from "./admin.js";

// Expose admin refresh to cart module
window.adminRefresh = adminRefresh;
// Expose onCartChange for cart module
window.onCartChange = () => {
    applyFiltersAndRender();
    if (userRole === 'admin') {
        renderAdminList();
        fetchUsersAndOrders();
    }
};

// Init all
document.addEventListener('DOMContentLoaded', () => {
    // Load cart
    loadCart();
    // Load contact info
    loadContactInfo();
    // Fetch products
    fetchProducts();
    // Bind UI events
    bindAuthEvents();
    bindCartEvents();
    bindProductEvents();
    bindContactEvents();
    bindAdminForm();

    // Navigation
    const navBtns = document.querySelectorAll('[data-nav]');
    const homeSec = document.getElementById('home-section');
    const contactSec = document.getElementById('contact-section');
    const userSec = document.getElementById('user-panel-section');
    const adminSec = document.getElementById('admin-panel-section');
    const detailSec = document.getElementById('product-detail-section');

    navBtns.forEach(btn => {
        btn.onclick = () => {
            const target = btn.dataset.nav;
            // hide all
            [homeSec, contactSec, userSec, adminSec, detailSec].forEach(s => s.classList.add('hidden'));
            if (target === 'home') { homeSec.classList.remove('hidden'); applyFiltersAndRender(); }
            else if (target === 'contact') contactSec.classList.remove('hidden');
            else if (target === 'user') {
                if (!currentUser) { showMessage('Please login first', 'warning'); return; }
                userSec.classList.remove('hidden');
                loadProfile(currentUser.uid);
            } else if (target === 'admin') {
                if (userRole !== 'admin') { showMessage('Admin only', 'error'); return; }
                adminSec.classList.remove('hidden');
                renderAdminList();
                fetchUsersAndOrders();
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    });

    // Auth state observer
    initAuth((user) => {
        if (user && !document.getElementById('user-panel-section').classList.contains('hidden')) {
            loadProfile(user.uid);
        }
        if (userRole === 'admin') {
            document.querySelector('[data-nav="admin"]').classList.remove('hidden');
        }
        // refresh products after login (in case of role changes)
        fetchProducts();
    });
});