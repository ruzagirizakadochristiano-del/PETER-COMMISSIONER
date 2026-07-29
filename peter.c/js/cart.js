import { showMessage } from "./utils.js";

// Cart state
let cart = [];
const dom = {
    cartItemsDiv: document.getElementById('cartItems'),
    cartTotal: document.getElementById('cartTotal'),
    cartCount: document.getElementById('cartCount'),
    cartSidebar: document.getElementById('cartSidebar'),
    cartOverlay: document.getElementById('cartOverlay'),
    closeCart: document.getElementById('closeCart'),
    cartIcon: document.getElementById('cartIconBtn'),
};

export function saveCart() {
    localStorage.setItem('peterCommissionerCart', JSON.stringify(cart));
    updateCartUI();
}

export function loadCart() {
    cart = JSON.parse(localStorage.getItem('peterCommissionerCart') || '[]');
    updateCartUI();
}

export function updateCartUI() {
    let total = 0, count = 0;
    dom.cartItemsDiv.innerHTML = '';
    if (!cart.length) dom.cartItemsDiv.innerHTML = '<div class="text-center py-6 text-gray-400">No inquiries yet</div>';
    else cart.forEach((item, idx) => {
        total += item.price * item.quantity;
        count += item.quantity;
        const div = document.createElement('div');
        div.className = 'flex gap-3 border-b border-gray-800 pb-3 mb-3';
        div.innerHTML = `<img src="${item.images?.[0] || 'https://via.placeholder.com/60'}" class="w-14 h-14 object-cover rounded"><div class="flex-1"><b class="text-yellow-500">${item.name}</b><br><span class="text-gray-300">${item.price.toLocaleString()} RWF</span><div class="flex gap-2 mt-1"><button class="cart-dec bg-gray-800 text-yellow-500 px-2 rounded" data-idx="${idx}">-</button><span class="text-white">${item.quantity}</span><button class="cart-inc bg-gray-800 text-yellow-500 px-2 rounded" data-idx="${idx}">+</button><button class="cart-del text-red-500 ml-1" data-idx="${idx}">🗑</button></div></div><div class="text-yellow-500">${(item.price * item.quantity).toLocaleString()} RWF</div>`;
        dom.cartItemsDiv.appendChild(div);
    });
    dom.cartTotal.innerText = total.toLocaleString();
    dom.cartCount.innerText = count;

    // Attach events
    dom.cartItemsDiv.querySelectorAll('.cart-dec, .cart-inc, .cart-del').forEach(btn => {
        btn.onclick = () => {
            const i = parseInt(btn.dataset.idx);
            if (btn.classList.contains('cart-dec')) { if (cart[i].quantity > 1) cart[i].quantity--; else cart.splice(i,1); }
            else if (btn.classList.contains('cart-inc')) cart[i].quantity++;
            else if (btn.classList.contains('cart-del')) cart.splice(i,1);
            saveCart();
            // After cart change, we need to refresh product display? We'll trigger via main callback.
            if (window.onCartChange) window.onCartChange();
        };
    });
}

export function getCart() { return cart; }

export function addToCart(productId, name, price, images, quantity) {
    let existing = cart.find(i => i.id === productId);
    if (existing) existing.quantity += quantity;
    else cart.push({ id: productId, name, price, images, quantity });
    saveCart();
}

// Bind cart UI events
export function bindCartEvents() {
    dom.cartIcon.onclick = () => {
        dom.cartSidebar.classList.remove('translate-x-full');
        dom.cartOverlay.classList.remove('hidden');
    };
    dom.closeCart.onclick = () => {
        dom.cartSidebar.classList.add('translate-x-full');
        dom.cartOverlay.classList.add('hidden');
    };
    dom.cartOverlay.onclick = () => {
        dom.cartSidebar.classList.add('translate-x-full');
        dom.cartOverlay.classList.add('hidden');
    };
}

// Export dom for other modules if needed
export { dom as cartDom };