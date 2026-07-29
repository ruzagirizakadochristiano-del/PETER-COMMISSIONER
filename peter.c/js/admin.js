import { db, userRole, currentUser } from "./auth.js";
import { collection, doc, getDocs, getDoc, updateDoc, deleteDoc, addDoc, query, orderBy } from "firebase/firestore";
import { showMessage, showLoader, hideLoader, escapeHtml, uploadMultipleImages } from "./utils.js";
import { allProducts, fetchProducts, applyFiltersAndRender } from "./products.js";

let editingId = null;
let currentImages = [];

const dom = {
    productList: document.getElementById('productListAdmin'),
    userTable: document.getElementById('userListAdmin'),
    perfStats: document.getElementById('performanceStats'),
    ordersList: document.getElementById('ordersList'),
    productForm: document.getElementById('productForm'),
    productName: document.getElementById('productName'),
    productLocation: document.getElementById('productLocation'),
    productPrice: document.getElementById('productPrice'),
    productDesc: document.getElementById('productDesc'),
    productStock: document.getElementById('productStock'),
    productQuantity: document.getElementById('productQuantity'),
    productImages: document.getElementById('productImages'),
    productFormTitle: document.getElementById('productFormTitle'),
    cancelEdit: document.getElementById('cancelEdit'),
    bedrooms: document.getElementById('bedrooms'),
    bathrooms: document.getElementById('bathrooms'),
    area: document.getElementById('area'),
    propertyType: document.getElementById('propertyType'),
    existingImagesPreview: document.getElementById('existingImagesPreview'),
};

// Admin CRUD
export async function renderAdminList() {
    if (!dom.productList) return;
    if (!allProducts.length) { dom.productList.innerHTML = '<div class="text-gray-500">No properties</div>'; return; }
    dom.productList.innerHTML = allProducts.map(p => `<div class="flex justify-between items-center border-b border-gray-800 py-2"><div class="flex items-center gap-2"><img src="${p.images?.[0] || 'https://via.placeholder.com/40'}" class="w-8 h-8 object-cover rounded"><div><span class="text-gray-300"><strong class="text-yellow-500">${escapeHtml(p.name)}</strong> - ${p.price.toLocaleString()} RWF</span><div class="text-xs text-gray-400"><i class="fas fa-map-marker-alt mr-1"></i>${escapeHtml(p.location || 'No location')}</div></div><span class="ml-2 ${p.stock === 'available' ? 'text-green-400' : 'text-red-400'} text-xs">${p.stock === 'available' ? `Available (${p.quantity})` : 'Sold'}</span></div><div><button class="edit-prod bg-yellow-600 text-black px-2 py-1 rounded text-sm mr-1 font-bold" data-id="${p.id}">Edit</button><button class="del-prod bg-red-700 text-white px-2 py-1 rounded text-sm" data-id="${p.id}">Del</button></div></div>`).join('');
    dom.productList.querySelectorAll('.edit-prod').forEach(btn => btn.onclick = () => openEdit(btn.dataset.id));
    dom.productList.querySelectorAll('.del-prod').forEach(btn => btn.onclick = async () => { if (confirm('Delete property?')) await deleteProduct(btn.dataset.id); });
}

async function deleteProduct(id) {
    showLoader();
    try {
        await deleteDoc(doc(db, "products", id));
        showMessage('Property deleted', 'success');
        await fetchProducts();
        if (userRole === 'admin') await fetchUsersAndOrders();
    } catch(e) { showMessage('Delete failed', 'error'); }
    finally { hideLoader(); }
}

async function openEdit(id) {
    const prod = allProducts.find(p => p.id === id);
    if (!prod) return;
    editingId = id;
    dom.productName.value = prod.name;
    dom.productLocation.value = prod.location || '';
    dom.productPrice.value = prod.price;
    dom.productDesc.value = prod.description || '';
    dom.productStock.value = prod.stock;
    dom.productQuantity.value = prod.quantity;
    dom.bedrooms.value = prod.bedrooms; dom.bathrooms.value = prod.bathrooms; dom.area.value = prod.area; dom.propertyType.value = prod.propertyType;
    dom.productFormTitle.innerText = '✏️ Update Property';
    dom.cancelEdit.classList.remove('hidden');
    if (dom.existingImagesPreview && prod.images) {
        dom.existingImagesPreview.innerHTML = prod.images.map(url => `<div class="existing-image-item"><img src="${url}" class="image-preview"><span class="remove-image-btn" onclick="this.parentElement.remove()">×</span></div>`).join('');
        currentImages = [...prod.images];
    }
}

function resetEdit() {
    editingId = null;
    dom.productForm.reset();
    dom.productStock.value = 'available';
    dom.productQuantity.value = 1;
    dom.bedrooms.value = 3;
    dom.bathrooms.value = 2;
    dom.area.value = 150;
    dom.propertyType.value = 'House';
    dom.productFormTitle.innerText = '➕ Add New Property';
    dom.cancelEdit.classList.add('hidden');
    if (dom.existingImagesPreview) dom.existingImagesPreview.innerHTML = '';
    currentImages = [];
}

// Submit form (add/edit)
export function bindAdminForm() {
    dom.productForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = dom.productName.value.trim();
        const location = dom.productLocation.value.trim();
        const desc = dom.productDesc.value.trim();
        const price = parseInt(dom.productPrice.value);
        const stock = dom.productStock.value;
        const quantity = parseInt(dom.productQuantity.value);
        const bedrooms = parseInt(dom.bedrooms.value);
        const bathrooms = parseInt(dom.bathrooms.value);
        const area = parseInt(dom.area.value);
        const propertyType = dom.propertyType.value;
        const files = Array.from(dom.productImages.files);
        if (!name || isNaN(price)) { showMessage('Name and valid price required', 'warning'); return; }
        showLoader();
        try {
            let images = [];
            const existingPreviews = document.querySelectorAll('#existingImagesPreview .existing-image-item img');
            for (const img of existingPreviews) {
                if (img.src) images.push(img.src);
            }
            if (files.length > 0) {
                const newUrls = await uploadMultipleImages(files);
                images.push(...newUrls);
            }
            if (images.length === 0) {
                showMessage('Please add at least one image', 'warning');
                hideLoader();
                return;
            }
            const productData = { name, description: desc, price, images, stock, quantity, bedrooms, bathrooms, area, propertyType, location };
            if (editingId) {
                const existingRef = doc(db, "products", editingId);
                await updateDoc(existingRef, { ...productData, updatedAt: new Date() });
                showMessage('Property updated', 'success');
            } else {
                await addDoc(collection(db, "products"), { ...productData, createdAt: new Date() });
                showMessage('Property added', 'success');
            }
            resetEdit();
            dom.productImages.value = '';
            await fetchProducts();
            if (userRole === 'admin') await fetchUsersAndOrders();
        } catch(err) {
            console.error(err);
            showMessage('Upload error: ' + err.message, 'error');
        }
        finally { hideLoader(); }
    };
    dom.cancelEdit.onclick = resetEdit;
    dom.productImages.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'existing-image-item';
                imgContainer.innerHTML = `<img src="${event.target.result}" class="image-preview"><span class="remove-image-btn" onclick="this.parentElement.remove()">×</span>`;
                dom.existingImagesPreview.appendChild(imgContainer);
            };
            reader.readAsDataURL(file);
        }
    });
}

// Fetch users and orders
export async function fetchUsersAndOrders() {
    // Users
    if (dom.userTable) {
        try {
            const snap = await getDocs(collection(db, "users"));
            let html = `<tr><th class="text-left text-yellow-500">Name</th><th class="text-left text-yellow-500">Email</th><th class="text-left text-yellow-500">Role</th>`;
            snap.forEach(d => { const data = d.data(); html += `<tr><td class="py-1 text-gray-300">${escapeHtml(data.firstName||'')} ${escapeHtml(data.lastName||'')}</td><td class="py-1 text-gray-300">${escapeHtml(data.email)}</td><td class="py-1 text-gray-300">${escapeHtml(data.role||'user')}<tr>`; });
            dom.userTable.innerHTML = html;
            if (dom.perfStats) dom.perfStats.innerHTML = `<div class="p-3"><p class="font-semibold text-yellow-500">📊 Performance</p><p class="text-gray-300">Users: ${snap.size}</p><p class="text-gray-300">Properties: ${allProducts.length}</p><p class="text-gray-300">Inquiries: ${JSON.parse(localStorage.getItem('peterCommissionerCart') || '[]').reduce((a,b)=>a+b.quantity,0)}</p></div>`;
        } catch(e) { console.warn(e); }
    }
    // Orders
    if (dom.ordersList) {
        try {
            const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            if (snap.empty) { dom.ordersList.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">No inquiries yet</td></tr>'; return; }
            let html = '';
            snap.forEach(doc => {
                const o = doc.data();
                html += `<tr class="border-b border-gray-800"><td class="p-2 text-gray-300">${escapeHtml(o.fullName)}</td><td class="p-2 text-gray-300">${escapeHtml(o.email)}</td><td class="p-2 text-gray-300">${escapeHtml(o.phone)}</td><td class="p-2 text-gray-300">${escapeHtml(o.productName)}</td><td class="p-2 text-gray-300">${o.quantity}</td><td class="p-2 text-gray-300">${escapeHtml(o.location)}</td><td class="p-2 text-gray-300">${escapeHtml(o.notes || '')}</td><td class="p-2 text-gray-300">${new Date(o.createdAt?.toDate()).toLocaleString()}</td></tr>`;
            });
            dom.ordersList.innerHTML = html;
        } catch(e) { console.warn(e); dom.ordersList.innerHTML = '<tr><td colspan="8" class="text-center text-red-500">Error loading inquiries</td></tr>'; }
    }
}

// Expose refresh for admin after cart change
export function adminRefresh() {
    if (userRole === 'admin') {
        renderAdminList();
        fetchUsersAndOrders();
    }
}