// Configuration
const API_BASE = 'http://localhost:8080/api';
let authToken = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let selectedFile = null;
let selectedImageId = null;
let uploadedImages = [];
let processedImages = [];

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    if (authToken && currentUser) {
        showAuthenticatedUI();
        showPage('dashboard');
        loadFromServer();
    } else {
        showPage('home');
    }
}

function setupEventListeners() {
    // File upload drag & drop
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('click', () => document.getElementById('fileInput').click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files[0]);
            }
        });
    }

    // File input change
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });
    }
}

// Navigation
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
    }

    // Update nav links
    document.querySelectorAll('.nav-links a').forEach(link => link.classList.remove('active'));
    const navLink = document.querySelector(`.nav-links a[href="#${page}"]`);
    if (navLink) navLink.classList.add('active');
}

function showAuthenticatedUI() {
    document.getElementById('navAuth').style.display = 'none';
    document.getElementById('navUser').style.display = 'flex';
    document.getElementById('userDisplayName').innerHTML = `<i class="fas fa-user-circle"></i> ${currentUser.username || currentUser.email}`;
    
    // Update sidebar
    document.getElementById('sidebarUserName').textContent = currentUser.username || 'User';
    document.getElementById('sidebarUserEmail').textContent = currentUser.email || '';
}

function showUnauthenticatedUI() {
    document.getElementById('navAuth').style.display = 'flex';
    document.getElementById('navUser').style.display = 'none';
}

// Auth
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    
    btn.innerHTML = '<span class="spinner"></span> Signing In...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        authToken = data.token;
        currentUser = data.user || { email };
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(currentUser));

        showToast('Login successful! Welcome back.', 'success');
        showAuthenticatedUI();
        showPage('dashboard');
        loadFromServer();
        
        document.getElementById('loginForm').reset();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        btn.disabled = false;
    }
}

async function handleSignup(event) {
    event.preventDefault();
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;
    const btn = document.getElementById('signupBtn');

    if (password !== confirm) {
        showToast('Passwords do not match!', 'error');
        return;
    }

    if (password.length < 8) {
        showToast('Password must be at least 8 characters!', 'error');
        return;
    }

    btn.innerHTML = '<span class="spinner"></span> Creating Account...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Signup failed');
        }

        showToast('Account created successfully! Please sign in.', 'success');
        showPage('login');
        document.getElementById('signupForm').reset();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        btn.disabled = false;
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    selectedFile = null;
    selectedImageId = null;
    uploadedImages = [];
    processedImages = [];
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('uploadedImages');
    localStorage.removeItem('processedImages');
    
    showUnauthenticatedUI();
    showPage('home');
    showToast('Logged out successfully.', 'success');
}

// Dashboard Tabs
function switchDashboardTab(tab, element) {
    document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    if (element) element.classList.add('active');
    
    if (tab === 'gallery') loadFromServer();
    if (tab === 'process') loadFromServer();
}

// Load data from server
async function loadFromServer() {
    if (!authToken) return;
    try {
        const response = await fetch(`${API_BASE}/images`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            const data = await response.json();
            uploadedImages = data.images || [];
            loadProcessImages();
            loadGalleryImages();
        }
    } catch (err) {
        console.error('Failed to load images:', err);
    }
}

// File Upload
function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file!', 'error');
        return;
    }

    selectedFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('imagePreview').src = e.target.result;
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = formatFileSize(file.size);
        document.getElementById('uploadArea').style.display = 'none';
        document.getElementById('uploadPreview').style.display = 'block';
        document.getElementById('uploadStatus').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function resetUpload() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('uploadArea').style.display = 'block';
    document.getElementById('uploadPreview').style.display = 'none';
    document.getElementById('uploadStatus').style.display = 'none';
}

async function uploadImage() {
    if (!selectedFile) return;
    
    const btn = document.getElementById('uploadBtn');
    btn.innerHTML = '<span class="spinner"></span> Uploading...';
    btn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('image', selectedFile);

        const response = await fetch(`${API_BASE}/images/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }

        const statusDiv = document.getElementById('uploadStatus');
        statusDiv.className = 'status-message success';
        statusDiv.innerHTML = `<i class="fas fa-check-circle"></i> Image uploaded successfully!`;
        statusDiv.style.display = 'block';

        await loadFromServer();
        setTimeout(resetUpload, 2000);
        showToast('Image uploaded successfully!', 'success');
    } catch (error) {
        const statusDiv = document.getElementById('uploadStatus');
        statusDiv.className = 'status-message error';
        statusDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${error.message}`;
        statusDiv.style.display = 'block';
        showToast(error.message, 'error');
    } finally {
        btn.innerHTML = '<i class="fas fa-upload"></i> Upload';
        btn.disabled = false;
    }
}

// Process Images
function loadProcessImages() {
    const list = document.getElementById('imageList');
    
    if (uploadedImages.length === 0) {
        list.innerHTML = '<p class="text-muted">No images uploaded yet</p>';
        return;
    }

    list.innerHTML = uploadedImages.map(img => `
        <div class="image-item" onclick="selectImage('${img.id}')" data-id="${img.id}">
            <img src="${API_BASE.replace('/api', '')}${img.url}" alt="${img.file_name}">
            <div class="image-item-info">
                <div class="image-item-name">${img.file_name}</div>
                <div class="image-item-date">${formatDate(img.created_at)}</div>
            </div>
        </div>
    `).join('');
}

function getAllImages() {
    return uploadedImages;
}

function selectImage(id) {
    selectedImageId = id;
    
    // Update active state
    document.querySelectorAll('.image-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === id);
    });

    const image = uploadedImages.find(img => img.id === id);
    
    if (image) {
        const preview = document.getElementById('editorPreview');
        const imgUrl = `${API_BASE.replace('/api', '')}${image.url}`;
        preview.innerHTML = `<img src="${imgUrl}" alt="${image.file_name}" id="currentEditImage">`;
        document.getElementById('editorControls').style.display = 'block';
    }
}

function getCurrentImageUrl() {
    const img = document.getElementById('currentEditImage');
    return img ? img.src : null;
}

async function applyFilter(filterType) {
    const imageUrl = getCurrentImageUrl();
    if (!imageUrl) {
        showToast('Please select an image first!', 'error');
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        switch (filterType) {
            case 'grayscale':
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    data[i] = data[i + 1] = data[i + 2] = avg;
                }
                break;
            case 'sepia':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                    data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                    data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                }
                break;
            case 'blur':
                applyKernel(ctx, canvas.width, canvas.height, [
                    1/9, 1/9, 1/9,
                    1/9, 1/9, 1/9,
                    1/9, 1/9, 1/9
                ]);
                showToast('Blur applied!', 'success');
                return;
            case 'brightness':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] + 40);
                    data[i + 1] = Math.min(255, data[i + 1] + 40);
                    data[i + 2] = Math.min(255, data[i + 2] + 40);
                }
                break;
            case 'contrast':
                const contrastFactor = 1.5;
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, Math.max(0, ((data[i] / 255 - 0.5) * contrastFactor + 0.5) * 255));
                    data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] / 255 - 0.5) * contrastFactor + 0.5) * 255));
                    data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] / 255 - 0.5) * contrastFactor + 0.5) * 255));
                }
                break;
            case 'sharpen':
                applyKernel(ctx, canvas.width, canvas.height, [
                    0, -1, 0,
                    -1, 5, -1,
                    0, -1, 0
                ]);
                showToast('Sharpened!', 'success');
                return;
        }

        ctx.putImageData(imageData, 0, 0);
        const newUrl = canvas.toDataURL('image/png');
        document.getElementById('currentEditImage').src = newUrl;

        showToast(`${filterType.charAt(0).toUpperCase() + filterType.slice(1)} filter applied!`, 'success');
    };
}

function applyKernel(ctx, width, height, kernel) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const output = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let r = 0, g = 0, b = 0;
            let ki = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = ((y + ky) * width + (x + kx)) * 4;
                    r += data[idx] * kernel[ki];
                    g += data[idx + 1] * kernel[ki];
                    b += data[idx + 2] * kernel[ki];
                    ki++;
                }
            }

            const idx = (y * width + x) * 4;
            output[idx] = Math.min(255, Math.max(0, r));
            output[idx + 1] = Math.min(255, Math.max(0, g));
            output[idx + 2] = Math.min(255, Math.max(0, b));
            output[idx + 3] = data[idx + 3];
        }
    }

    ctx.putImageData(new ImageData(output, width, height), 0, 0);
}

function rotateImage(direction) {
    const imageUrl = getCurrentImageUrl();
    if (!imageUrl) {
        showToast('Please select an image first!', 'error');
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
        if (direction === 'left') {
            canvas.width = img.height;
            canvas.height = img.width;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
        } else {
            canvas.width = img.height;
            canvas.height = img.width;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
        }

        const newUrl = canvas.toDataURL('image/png');
        document.getElementById('currentEditImage').src = newUrl;
        showToast(`Rotated ${direction}!`, 'success');
    };
}

function flipImage(direction) {
    const imageUrl = getCurrentImageUrl();
    if (!imageUrl) {
        showToast('Please select an image first!', 'error');
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        if (direction === 'horizontal') {
            ctx.scale(-1, 1);
            ctx.drawImage(img, -img.width, 0);
        } else {
            ctx.scale(1, -1);
            ctx.drawImage(img, 0, -img.height);
        }

        const newUrl = canvas.toDataURL('image/png');
        document.getElementById('currentEditImage').src = newUrl;
        showToast(`Flipped ${direction}!`, 'success');
    };
}

function cropImage(ratio) {
    const imageUrl = getCurrentImageUrl();
    if (!imageUrl) {
        showToast('Please select an image first!', 'error');
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
        let width, height, sx, sy;
        
        if (ratio === 'square' || ratio === '1:1') {
            const size = Math.min(img.width, img.height);
            width = size;
            height = size;
            sx = (img.width - size) / 2;
            sy = (img.height - size) / 2;
        } else if (ratio === '16:9') {
            height = img.height;
            width = height * 16 / 9;
            if (width > img.width) {
                width = img.width;
                height = width * 9 / 16;
            }
            sx = (img.width - width) / 2;
            sy = (img.height - height) / 2;
        } else if (ratio === '4:3') {
            height = img.height;
            width = height * 4 / 3;
            if (width > img.width) {
                width = img.width;
                height = width * 3 / 4;
            }
            sx = (img.width - width) / 2;
            sy = (img.height - height) / 2;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, sx, sy, width, height, 0, 0, width, height);

        const newUrl = canvas.toDataURL('image/png');
        document.getElementById('currentEditImage').src = newUrl;
        showToast(`Cropped to ${ratio}!`, 'success');
    };
}

function convertFormat() {
    const imageUrl = getCurrentImageUrl();
    if (!imageUrl) {
        showToast('Please select an image first!', 'error');
        return;
    }

    const format = document.getElementById('formatSelect').value;
    const mimeType = `image/${format === 'jpeg' ? 'jpeg' : format}`;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const newUrl = canvas.toDataURL(mimeType, 0.9);
        document.getElementById('currentEditImage').src = newUrl;
        showToast(`Converted to ${format.toUpperCase()}!`, 'success');
    };
}

// Gallery
function loadGalleryImages() {
    const grid = document.getElementById('galleryGrid');
    
    if (uploadedImages.length === 0) {
        grid.innerHTML = '<p class="text-muted">No images uploaded yet</p>';
        return;
    }

    grid.innerHTML = uploadedImages.map(img => `
        <div class="gallery-item">
            <img src="${API_BASE.replace('/api', '')}${img.url}" alt="${img.file_name}" onclick="previewImage('${img.id}')">
            <div class="gallery-item-info">
                <div class="gallery-item-name" title="${img.file_name}">${img.file_name}</div>
                <div class="gallery-item-meta">
                    <span class="gallery-item-size">${formatFileSize(img.file_size)}</span>
                    <div class="gallery-item-actions">
                        <button class="btn btn-sm btn-primary" onclick="downloadImage('${img.id}')">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteImage('${img.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function downloadImage(id) {
    const image = uploadedImages.find(img => img.id === id);
    
    if (image) {
        const a = document.createElement('a');
        a.href = `${API_BASE.replace('/api', '')}${image.url}`;
        a.download = image.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Image downloaded!', 'success');
    }
}

async function deleteImage(id) {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/images/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete');
        }

        await loadFromServer();
        showToast('Image deleted.', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function previewImage(id) {
    const image = uploadedImages.find(img => img.id === id);
    
    if (image) {
        window.open(`${API_BASE.replace('/api', '')}${image.url}`, '_blank');
    }
}

// Utility Functions
function formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}