// ====== ADMIN PORTAL JAVASCRIPT (USER MANAGEMENT ONLY) ======
const API_URL = '/api';
let adminToken = localStorage.getItem('smartSpendAdminToken') || null;
let adminUsername = localStorage.getItem('smartSpendAdminUser') || 'Admin';

let cachedUsersList = [];

// DOM Elements
const adminLoginPage = document.getElementById('admin-login-page');
const adminLayoutWrapper = document.getElementById('admin-layout-wrapper');
const adminLoginForm = document.getElementById('admin-login-form');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const adminRefreshBtn = document.getElementById('admin-refresh-btn');
const adminThemeToggle = document.getElementById('admin-theme-toggle');

// Search & Table
const searchUsersInput = document.getElementById('admin-search-users');
const tableBodyUsers = document.getElementById('table-body-users');

// Edit Modal Elements
const editUserModal = document.getElementById('edit-user-modal');
const editUserForm = document.getElementById('edit-user-form');
const closeEditModalBtn = document.getElementById('close-edit-modal');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editUserIdInput = document.getElementById('edit-user-id');
const editUsernameInput = document.getElementById('edit-username');
const editEmailInput = document.getElementById('edit-email');
const editRoleSelect = document.getElementById('edit-role');
const editPasswordInput = document.getElementById('edit-password');

// Initialization
function initAdmin() {
    // Theme setup
    const savedTheme = localStorage.getItem("smartSpendTheme") || "light-mode";
    document.body.className = `admin-portal-body ${savedTheme}`;
    updateThemeIcon();

    // Auth Listeners
    if (adminLoginForm) adminLoginForm.addEventListener('submit', handleAdminLogin);
    if (adminLogoutBtn) adminLogoutBtn.addEventListener('click', handleAdminLogout);
    if (adminRefreshBtn) adminRefreshBtn.addEventListener('click', () => fetchAdminUsers(true));
    if (adminThemeToggle) adminThemeToggle.addEventListener('click', toggleTheme);

    // Search Listener
    if (searchUsersInput) {
        searchUsersInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = cachedUsersList.filter(u => 
                (u.username && u.username.toLowerCase().includes(query)) ||
                (u.email && u.email.toLowerCase().includes(query))
            );
            renderUsersTable(filtered);
        });
    }

    // Modal Listeners
    if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeEditUserModal);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditUserModal);
    if (editUserForm) editUserForm.addEventListener('submit', handleEditUserSubmit);

    // Password Visibility Toggle Listener
    document.querySelectorAll('.toggle-password-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const input = btn.previousElementSibling;
            if (!input) return;
            const isPassword = input.getAttribute('type') === 'password';
            input.setAttribute('type', isPassword ? 'text' : 'password');
            const icon = btn.querySelector('i');
            if (icon) icon.className = isPassword ? 'ph ph-eye-slash' : 'ph ph-eye';
        });
    });

    checkAdminAuth();
}

function checkAdminAuth() {
    if (adminToken) {
        if (adminLoginPage) adminLoginPage.style.display = 'none';
        if (adminLayoutWrapper) adminLayoutWrapper.style.display = 'flex';

        const adminNameEl = document.getElementById('admin-user-name');
        const adminAvatar = document.getElementById('admin-avatar');
        if (adminNameEl) adminNameEl.textContent = adminUsername;
        if (adminAvatar) adminAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(adminUsername)}&background=8b5cf6&color=fff`;

        fetchAdminUsers();
    } else {
        if (adminLoginPage) adminLoginPage.style.display = 'block';
        if (adminLayoutWrapper) adminLayoutWrapper.style.display = 'none';
    }
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    try {
        const res = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await res.json();

        if (res.ok) {
            adminToken = result.token;
            adminUsername = result.username;
            localStorage.setItem('smartSpendAdminToken', adminToken);
            localStorage.setItem('smartSpendAdminUser', adminUsername);
            showToast('Authenticated as Admin!');
            checkAdminAuth();
        } else {
            showToast(result.message || 'Admin authentication failed', 'error');
        }
    } catch (err) {
        showToast('Connection error during admin login', 'error');
    }
}

function handleAdminLogout() {
    adminToken = null;
    adminUsername = 'Admin';
    localStorage.removeItem('smartSpendAdminToken');
    localStorage.removeItem('smartSpendAdminUser');
    showToast('Admin session logged out.');
    checkAdminAuth();
}

// Fetch Users List
async function fetchAdminUsers(isManual = false) {
    if (!adminToken) return;
    if (adminRefreshBtn) adminRefreshBtn.disabled = true;
    try {
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (res.status === 401 || res.status === 403) return handleAdminLogout();

        if (res.ok) {
            cachedUsersList = await res.json();
            renderUsersTable(cachedUsersList);
            if (isManual) {
                showToast('Users list refreshed');
            }
        }
    } catch (err) {
        console.error('Error fetching users list:', err);
        showToast('Error loading users list', 'error');
    } finally {
        if (adminRefreshBtn) adminRefreshBtn.disabled = false;
    }
}

// Render Users Table
function renderUsersTable(users) {
    if (!tableBodyUsers) return;

    tableBodyUsers.innerHTML = '';
    if (!users || users.length === 0) {
        tableBodyUsers.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 24px;">No users found.</td></tr>';
        return;
    }

    users.forEach(u => {
        const joinedDate = u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A';
        const roleBadge = u.role === 'admin' 
            ? '<span class="badge-role-admin">Admin</span>' 
            : '<span class="badge-role-user">User</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${u.id}</td>
            <td style="font-weight: 600;">${escapeHtml(u.username)}</td>
            <td style="color: var(--text-secondary);">${escapeHtml(u.email || 'N/A')}</td>
            <td>${roleBadge}</td>
            <td>${joinedDate}</td>
            <td style="text-align: right;">
                <div class="admin-actions-cell">
                    <button class="btn-edit-sm" onclick="openEditUserModal(${u.id})">
                        <i class="ph ph-pencil-simple"></i> Edit / Modify
                    </button>
                    <button class="btn-danger-sm" onclick="deleteUser(${u.id}, '${escapeHtml(u.username)}')">
                        <i class="ph ph-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        tableBodyUsers.appendChild(tr);
    });
}

// Open Edit Modal
function openEditUserModal(userId) {
    const user = cachedUsersList.find(u => u.id === userId);
    if (!user) return;

    editUserIdInput.value = user.id;
    editUsernameInput.value = user.username || '';
    editEmailInput.value = user.email || '';
    editRoleSelect.value = user.role || 'user';
    editPasswordInput.value = '';

    editUserModal.style.display = 'flex';
}

function closeEditUserModal() {
    editUserModal.style.display = 'none';
}

// Submit Edit User Form
async function handleEditUserSubmit(e) {
    e.preventDefault();
    const userId = editUserIdInput.value;
    const username = editUsernameInput.value.trim();
    const email = editEmailInput.value.trim();
    const role = editRoleSelect.value;
    const password = editPasswordInput.value;

    try {
        const res = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, role, password })
        });
        const result = await res.json();

        if (res.ok) {
            showToast(result.message || 'User details updated successfully!');
            closeEditUserModal();
            fetchAdminUsers();
        } else {
            showToast(result.message || 'Failed to update user', 'error');
        }
    } catch (err) {
        showToast('Error updating user details', 'error');
    }
}

// Delete User
async function deleteUser(userId, username) {
    if (!confirm(`Are you sure you want to delete user "${username}"? All associated transactions and budgets will be permanently deleted!`)) return;

    try {
        const res = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const result = await res.json();
        if (res.ok) {
            showToast(result.message || 'User deleted successfully.');
            fetchAdminUsers();
        } else {
            showToast(result.message || 'Failed to delete user', 'error');
        }
    } catch (err) {
        showToast('Error deleting user', 'error');
    }
}

// Helpers
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="ph ph-${type === 'error' ? 'warning-circle' : 'check-circle'}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function toggleTheme() {
    const isDark = document.body.classList.contains("dark-mode");
    const newTheme = isDark ? "light-mode" : "dark-mode";
    document.body.className = `admin-portal-body ${newTheme}`;
    localStorage.setItem("smartSpendTheme", newTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    if (!adminThemeToggle) return;
    const isDark = document.body.classList.contains("dark-mode");
    adminThemeToggle.innerHTML = isDark ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

document.addEventListener('DOMContentLoaded', initAdmin);
