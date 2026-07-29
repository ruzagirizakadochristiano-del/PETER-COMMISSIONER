// ====== HELPERS & NOTIFICATIONS ======
export const loader = document.getElementById('globalLoader');
export function showLoader() { if (loader) loader.classList.remove('hidden'); }
export function hideLoader() { if (loader) loader.classList.add('hidden'); }

export function showMessage(msg, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    const notif = document.createElement('div');
    notif.className = `fixed top-20 right-4 z-50 px-4 py-2 rounded shadow-lg ${type === 'success' ? 'bg-green-900 text-green-300 border-l-4 border-green-500' : type === 'error' ? 'bg-red-900 text-red-300 border-l-4 border-red-500' : 'bg-gray-800 text-yellow-500 border-l-4 border-yellow-500'}`;
    notif.innerHTML = `<span class="font-bold">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span> ${escapeHtml(msg)}`;
    container.appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
}

export function escapeHtml(s) { if (!s) return ''; return s.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }

export function getFriendlyError(code) {
    const map = { 'auth/email-already-in-use': 'Email already registered.','auth/invalid-email':'Invalid email.','auth/weak-password':'Password must be 6+ chars.','auth/wrong-password':'Incorrect password.','auth/user-not-found':'No account. Register first.','auth/too-many-requests':'Too many attempts.' };
    return map[code] || `Error: ${code}`;
}

// ImageBB upload
export const IMGBB_API_KEY = "4fa8b99e2ba50cfe70cc9f69257055bb";

export async function uploadImageToImgBB(file) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', IMGBB_API_KEY);
    const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
    const data = await response.json();
    if (data.success) return data.data.url;
    else throw new Error('Image upload failed: ' + (data.error?.message || 'Unknown error'));
}

export async function uploadMultipleImages(files) {
    const urls = [];
    for (const file of files) {
        try {
            const url = await uploadImageToImgBB(file);
            urls.push(url);
            showMessage(`Uploaded: ${file.name}`, 'success');
        } catch (error) {
            showMessage(`Failed to upload ${file.name}: ${error.message}`, 'error');
        }
    }
    return urls;
}