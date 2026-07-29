import { db, currentUser, userRole } from "./auth.js";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { showMessage, showLoader, hideLoader, escapeHtml, uploadMultipleImages } from "./utils.js";
import { getCart, addToCart, saveCart, updateCartUI } from "./cart.js";

export let allProducts = [];
let filteredProducts = [];
let recentlyViewedIds = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
let pendingProduct = null;

const dom = {
    homeSec: document.getElementById('home-section'),
    productDetailSec: document.getElementById('product-detail-section'),
    productsGrid: document.getElementById('productsGrid'),
    detailContent: document.getElementById('detailContent'),
    relatedProductsGrid: document.getElementById('relatedProductsGrid'),
    backToHomeBtn: document.getElementById('backToHomeBtn'),
    recommendationsGrid: document.getElementById('recommendationsGrid'),
    recentlyViewedGrid: document.getElementById('recentlyViewedGrid'),
    searchInput: document.getElementById('searchInput'),
    sortSelect: document.getElementById('sortSelect'),
    minPrice: document.getElementById('minPrice'),
    maxPrice: document.getElementById('maxPrice'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    customerModal: document.getElementById('customerModal'),
    closeCustomerModal: document.getElementById('closeCustomerModal'),
    customerOrderForm: document.getElementById('customerOrderForm'),
    orderProductId: document.getElementById('orderProductId'),
    orderProductName: document.getElementById('orderProductName'),
    orderProductPrice: document.getElementById('orderProductPrice'),
    orderMaxQuantity: document.getElementById('orderMaxQuantity'),
    orderProductDisplay: document.getElementById('orderProductDisplay'),
    orderPriceDisplay: document.getElementById('orderPriceDisplay'),
    orderAvailableDisplay: document.getElementById('orderAvailableDisplay'),
    loginRequiredModal: document.getElementById('loginRequiredModal'),
};

// Product card template – changed p-4 to p-3 sm:p-4 for better mobile spacing
function productCardTemplate(p) {
    const img = (p.images && p.images.length) ? p.images[0] : 'https://via.placeholder.com/300';
    const hasStock = (p.stock === 'available' && p.quantity > 0);
    const statusBadge = hasStock ? `<span class="absolute top-2 right-2 bg-yellow-600 text-black text-xs px-2 py-1 rounded-full font-bold">${p.quantity} left</span>` : `<span class="absolute top-2 right-2 bg-red-700 text-white text-xs px-2 py-1 rounded-full">Sold</span>`;
    const orderBtn = hasStock ? `<button class="add-cart-trigger btn-primary text-black font-semibold px-4 py-2 rounded-full text-sm" data-id="${p.id}"><i class="fas fa-cart-plus mr-1"></i> Inquire</button>` : `<button class="bg-gray-700 text-gray-400 font-semibold px-4 py-2 rounded-full text-sm cursor-not-allowed" disabled><i class="fas fa-times-circle mr-1"></i> Sold</button>`;
    const locationDisplay = p.location ? `<div class="flex items-center text-xs text-gray-400 mt-1"><i class="fas fa-map-marker-alt mr-1 text-yellow-500"></i>${escapeHtml(p.location)}</div>` : '';
    return `<div class="product-card bg-black rounded-2xl shadow-md overflow-hidden cursor-pointer relative" data-id="${p.id}">${statusBadge}<img src="${img}" class="h-56 w-full object-cover" loading="lazy"><div class="p-3 sm:p-4"><h3 class="font-bold text-xl text-yellow-500">${escapeHtml(p.name)}</h3>${locationDisplay}<div class="flex justify-between items-center mt-1"><span class="text-yellow-500 font-semibold">${p.price.toLocaleString()} RWF</span><span class="text-xs text-gray-400"><i class="fas fa-bed"></i> ${p.bedrooms || 0}</span></div><div class="flex justify-between items-center mt-2">${orderBtn}</div></div></div>`;
}

// Attach events to product cards
function attachProductEvents(container) {
    container.querySelectorAll('.product-card').forEach(card => {
        card.onclick = (e) => {
            if (e.target.classList.contains('add-cart-trigger') || e.target.closest('.add-cart-trigger') || e.target.disabled) return;
            showProductDetail(card.dataset.id);
        };
    });
    container.querySelectorAll('.add-cart-trigger').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const prod = allProducts.find(p => p.id === btn.dataset.id);
            if (prod && prod.stock === 'available' && prod.quantity > 0) initiateOrder(prod);
            else showMessage("This property is no longer available.", "warning");
        };
    });
}

// Show product detail
function showProductDetail(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const statusBadge = product.stock === 'available' ? '<span class="status-available px-3 py-1 rounded-full text-sm"><i class="fas fa-check-circle mr-1"></i>Available</span>' : '<span class="status-sold px-3 py-1 rounded-full text-sm"><i class="fas fa-times-circle mr-1"></i>Sold</span>';
    const orderBtn = (product.stock === 'available' && product.quantity > 0) ? `<button class="add-to-cart-detail btn-primary text-black px-6 py-2 rounded-full font-semibold mt-6" data-id="${product.id}"><i class="fas fa-cart-plus mr-2"></i>Inquire Now</button>` : `<button class="bg-gray-700 text-gray-400 px-6 py-2 rounded-full font-semibold mt-6" disabled><i class="fas fa-times-circle mr-2"></i>Not Available</button>`;
    const imagesHtml = product.images && product.images.length ? `<div class="detail-image-grid">${product.images.map(img => `<img src="${img}" class="detail-main-img rounded-lg shadow-md">`).join('')}</div>` : `<img src="https://via.placeholder.com/400" class="detail-main-img rounded-lg">`;
    const locationHtml = product.location ? `<div class="flex items-center gap-2 mt-2"><i class="fas fa-map-marker-alt text-yellow-500"></i><span class="text-gray-300">${escapeHtml(product.location)}</span></div>` : '';
    const extraInfo = `<div class="flex flex-wrap gap-3 mt-3"><span class="info-item"><i class="fas fa-bed"></i> ${product.bedrooms || 0} beds</span><span class="info-item"><i class="fas fa-bath"></i> ${product.bathrooms || 0} baths</span><span class="info-item"><i class="fas fa-vector-square"></i> ${product.area || 0} m²</span><span class="info-item"><i class="fas fa-building"></i> ${product.propertyType || 'House'}</span></div>`;
    dom.detailContent.innerHTML = `<div class="grid md:grid-cols-2 gap-8"><div>${imagesHtml}</div><div><h2 class="text-3xl font-bold text-yellow-500">${escapeHtml(product.name)}</h2><p class="price-large mt-2">${product.price.toLocaleString()} RWF</p>${locationHtml}<div class="mt-3">${statusBadge}</div>${extraInfo}<p class="text-gray-400 mt-4">${escapeHtml(product.description || 'No description provided.')}</p>${orderBtn}</div></div>`;
    if (product.stock === 'available' && product.quantity > 0) {
        dom.detailContent.querySelector('.add-to-cart-detail')?.addEventListener('click', (e) => { e.stopPropagation(); initiateOrder(product); });
    }
    const related = allProducts.filter(p => p.id !== product.id).sort(() => 0.5 - Math.random()).slice(0, 3);
    dom.relatedProductsGrid.innerHTML = related.map(p => productCardTemplate(p)).join('');
    dom.relatedProductsGrid.querySelectorAll('.product-card').forEach(card => { card.onclick = () => showProductDetail(card.dataset.id); });
    dom.homeSec.classList.add('hidden');
    dom.productDetailSec.classList.remove('hidden');
    document.getElementById('product-detail-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    addRecentlyViewed(product.id);
}

// Recently viewed
function addRecentlyViewed(productId) {
    recentlyViewedIds = recentlyViewedIds.filter(id => id !== productId);
    recentlyViewedIds.unshift(productId); if (recentlyViewedIds.length > 6) recentlyViewedIds.pop();
    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewedIds));
    renderRecentlyViewed();
}

function renderRecentlyViewed() {
    const recent = allProducts.filter(p => recentlyViewedIds.includes(p.id));
    dom.recentlyViewedGrid.innerHTML = recent.length ? recent.map(p => productCardTemplate(p)).join('') : '<div class="col-span-full text-center text-gray-500 py-8">No recently viewed</div>';
    attachProductEvents(dom.recentlyViewedGrid);
}

// Recommendations
function renderRecommendations() {
    let recs = [...allProducts];
    const cart = getCart();
    if (cart.length) recs = recs.filter(p => !cart.some(c => c.id === p.id));
    recs = recs.sort(() => 0.5 - Math.random()).slice(0, 3);
    if (!recs.length) recs = allProducts.slice(0, 3);
    dom.recommendationsGrid.innerHTML = recs.map(p => productCardTemplate(p)).join('');
    attachProductEvents(dom.recommendationsGrid);
}

// Apply filters and render
export function applyFiltersAndRender() {
    let filtered = [...allProducts];
    const search = dom.searchInput.value.toLowerCase();
    if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || (p.description && p.description.toLowerCase().includes(search)) || (p.location && p.location.toLowerCase().includes(search)));
    const min = parseFloat(dom.minPrice.value); if (!isNaN(min)) filtered = filtered.filter(p => p.price >= min);
    const max = parseFloat(dom.maxPrice.value); if (!isNaN(max)) filtered = filtered.filter(p => p.price <= max);
    const sort = dom.sortSelect.value;
    if (sort === 'price_asc') filtered.sort((a,b) => a.price - b.price);
    else if (sort === 'price_desc') filtered.sort((a,b) => b.price - a.price);
    filteredProducts = filtered;
    dom.productsGrid.innerHTML = filteredProducts.length ? filteredProducts.map(p => productCardTemplate(p)).join('') : '<div class="col-span-full text-center text-gray-500 py-10">No properties found</div>';
    attachProductEvents(dom.productsGrid);
    renderRecommendations();
}

// Fetch products
export async function fetchProducts() {
    showLoader();
    try {
        const snap = await getDocs(collection(db, "products"));
        allProducts = snap.docs.map(d => ({ id: d.id, ...d.data(), stock: d.data().stock || 'available', quantity: d.data().quantity !== undefined ? d.data().quantity : 1, bedrooms: d.data().bedrooms || 0, bathrooms: d.data().bathrooms || 0, area: d.data().area || 0, propertyType: d.data().propertyType || 'House', location: d.data().location || '' }));
        applyFiltersAndRender();
        renderRecentlyViewed();
    } catch(e) { showMessage('Failed to load properties', 'error'); }
    finally { hideLoader(); }
}

// Initiate order (inquiry)
function initiateOrder(product) {
    if (!currentUser) { pendingProduct = product; dom.loginRequiredModal.classList.remove('hidden'); return; }
    if (product.stock === 'sold' || product.quantity <= 0) { showMessage("This property is no longer available.", "warning"); return; }
    dom.orderProductId.value = product.id;
    dom.orderProductName.value = product.name;
    dom.orderProductPrice.value = product.price;
    dom.orderMaxQuantity.value = product.quantity;
    dom.orderProductDisplay.innerText = product.name;
    dom.orderPriceDisplay.innerText = product.price.toLocaleString();
    dom.orderAvailableDisplay.innerText = product.quantity;
    const qtyInput = document.getElementById('orderQuantity');
    qtyInput.max = product.quantity;
    qtyInput.value = 1;
    dom.customerModal.classList.remove('hidden');
}

// Submit order (add to cart and store in Firestore)
export async function submitOrderAndAddToCart(e) {
    e.preventDefault();
    const fullName = document.getElementById('orderFullName').value.trim();
    const email = document.getElementById('orderEmail').value.trim();
    const phone = document.getElementById('orderPhone').value.trim();
    let quantity = parseInt(document.getElementById('orderQuantity').value);
    const location = document.getElementById('orderLocation').value.trim();
    const notes = document.getElementById('orderNotes').value.trim();
    const productId = dom.orderProductId.value;
    const productName = dom.orderProductName.value;
    const productPrice = parseFloat(dom.orderProductPrice.value);
    const maxQuantity = parseInt(dom.orderMaxQuantity.value);
    if (!fullName || !email || !phone || !quantity || !location) { showMessage("Please fill all required fields", "warning"); return; }
    if (quantity > maxQuantity) { showMessage(`Only ${maxQuantity} unit(s) available.`, "warning"); return; }
    showLoader();
    try {
        await addDoc(collection(db, "orders"), { fullName, email, phone, productId, productName, productPrice, quantity, location, notes, createdAt: new Date(), totalPrice: productPrice * quantity });
        const productRef = doc(db, "products", productId);
        const newQuantity = maxQuantity - quantity;
        await updateDoc(productRef, { quantity: newQuantity, stock: newQuantity > 0 ? 'available' : 'sold' });
        const productIndex = allProducts.findIndex(p => p.id === productId);
        if (productIndex !== -1) { allProducts[productIndex].quantity = newQuantity; allProducts[productIndex].stock = newQuantity > 0 ? 'available' : 'sold'; }
        const cart = getCart();
        let existing = cart.find(i => i.id === productId);
        if (existing) existing.quantity += quantity;
        else cart.push({ id: productId, name: productName, price: productPrice, images: (allProducts.find(p=>p.id===productId)?.images) || [], quantity: quantity });
        saveCart();
        dom.customerModal.classList.add('hidden');
        dom.customerOrderForm.reset();
        showMessage(`Inquiry sent! ${productName} added to your cart.`, "success");
        applyFiltersAndRender();
        if (window.adminRefresh) window.adminRefresh();
    } catch (err) { showMessage("Failed: " + err.message, "error"); }
    finally { hideLoader(); }
}

// Bind product events
export function bindProductEvents() {
    dom.backToHomeBtn.onclick = () => {
        dom.homeSec.classList.remove('hidden');
        dom.productDetailSec.classList.add('hidden');
        applyFiltersAndRender();
    };
    dom.searchInput.addEventListener('input', applyFiltersAndRender);
    dom.sortSelect.addEventListener('change', applyFiltersAndRender);
    dom.minPrice.addEventListener('input', applyFiltersAndRender);
    dom.maxPrice.addEventListener('input', applyFiltersAndRender);
    dom.resetFiltersBtn.onclick = () => {
        dom.searchInput.value = ''; dom.sortSelect.value = 'default'; dom.minPrice.value = ''; dom.maxPrice.value = '';
        applyFiltersAndRender();
    };
    document.getElementById('heroShopBtn')?.addEventListener('click', () => document.getElementById('productsGrid')?.scrollIntoView({ behavior: 'smooth' }));
    document.getElementById('heroExploreBtn')?.addEventListener('click', () => document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' }));
    dom.closeCustomerModal.onclick = () => dom.customerModal.classList.add('hidden');
    dom.customerOrderForm.onsubmit = submitOrderAndAddToCart;
}

// All exports are individual – no duplicate export block.