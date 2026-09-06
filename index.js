// ====== GLOBAL VARIABLES ======
let data = { transactions: [] };
let budgets = {
    "Food": 5000,
    "Transport": 3000,
    "Shopping": 4000,
    "Bills": 2000,
    "Entertainment": 1500
};
let overviewChartInstance = null;
const API_URL = '/api';
let authToken = localStorage.getItem('smartSpendToken') || null;
let currentUsername = localStorage.getItem('smartSpendUser') || 'User';
let currentUserRole = localStorage.getItem('smartSpendRole') || 'user';
let adminUsersList = [];

// ====== DOM ELEMENTS ======
const monthInput = document.getElementById("month");
const themeToggle = document.getElementById("theme-toggle");
const body = document.body;

// Auth Elements
const loginPage = document.getElementById("login-page");
const registerPage = document.getElementById("register-page");
const resetPasswordPage = document.getElementById("reset-password-page");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const resetPasswordForm = document.getElementById("reset-password-form");
const logoutBtn = document.getElementById("logout-btn");

// Links and Close Buttons
const linkToRegister = document.getElementById("link-to-register");
const linkToLogin = document.getElementById("link-to-login");
const linkToReset = document.getElementById("link-to-reset");
const closeLoginBtn = document.getElementById("close-login-btn");
const closeRegisterBtn = document.getElementById("close-register-btn");
const closeResetBtn = document.getElementById("close-reset-btn");
const resetLinkToLogin = document.getElementById("reset-link-to-login");

// Landing Page Elements
const landingPage = document.getElementById("landing-page");
const appLayout = document.getElementById("app-layout");
const landingLoginBtn = document.getElementById("landing-login-btn");
const landingRegisterBtn = document.getElementById("landing-register-btn");
const landingCtaBtn = document.getElementById("landing-cta-btn");

// Summary Elements
const balanceEl = document.getElementById("total-balance");
const incomeEl = document.getElementById("total-income");
const expenseEl = document.getElementById("total-expense");
const savingsEl = document.getElementById("total-savings");

// Modal Elements
const modalOverlay = document.getElementById("transaction-modal");
const openModalBtn = document.getElementById("open-transaction-modal");
const closeModalBtn = document.getElementById("close-modal");
const txForm = document.getElementById("transaction-form");
const txIdInput = document.getElementById("tx-id");
const modalTitle = document.getElementById("modal-title");

// Lists & Filters
const transactionListEl = document.getElementById("transaction-list");
const categoriesListEl = document.getElementById("categories-list");
const budgetListEl = document.getElementById("budget-list");
const searchTxInput = document.getElementById("search-tx");
const filterTypeSelect = document.getElementById("filter-type");

// Mobile Nav
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileNav = document.getElementById("mobile-nav");

// ====== INITIALIZATION ======
function init() {
    // Theme setup
    const savedTheme = localStorage.getItem("smartSpendTheme") || "light-mode";
    body.className = savedTheme;
    updateThemeIcon();

    // Default Date
    const today = new Date();
    monthInput.value = today.toISOString().slice(0, 7);
    document.getElementById("tx-date").value = today.toISOString().slice(0, 10);

    // Event Listeners
    monthInput.addEventListener("change", refreshDashboard);
    themeToggle.addEventListener("click", toggleTheme);
    
    // Modal
    openModalBtn.addEventListener("click", () => openModal());
    closeModalBtn.addEventListener("click", closeModal);
    txForm.addEventListener("submit", handleTransactionSubmit);
    
    // Filters
    searchTxInput.addEventListener("input", renderTransactions);
    filterTypeSelect.addEventListener("change", renderTransactions);

    // Mobile Menu
    mobileMenuBtn.addEventListener("click", () => {
        mobileNav.classList.toggle("open");
    });

    // Landing Page Listeners
    landingLoginBtn.addEventListener('click', () => {
        showAuthPage('login');
    });
    landingRegisterBtn.addEventListener('click', () => {
        showAuthPage('register');
    });
    landingCtaBtn.addEventListener('click', () => {
        showAuthPage('register');
    });

    // Password Visibility Toggle Listener
    document.querySelectorAll('.toggle-password-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const input = btn.previousElementSibling;
            if (!input) return;
            const isPassword = input.getAttribute('type') === 'password';
            input.setAttribute('type', isPassword ? 'text' : 'password');
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isPassword ? 'ph ph-eye-slash' : 'ph ph-eye';
            }
        });
    });

    // Auth Listeners
    linkToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthPage('register');
    });
    linkToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthPage('login');
    });
    if (linkToReset) {
        linkToReset.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthPage('reset');
        });
    }
    if (resetLinkToLogin) {
        resetLinkToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthPage('login');
        });
    }
    
    closeLoginBtn.addEventListener('click', () => {
        loginPage.classList.remove('active');
        landingPage.classList.add('active');
    });
    closeRegisterBtn.addEventListener('click', () => {
        registerPage.classList.remove('active');
        landingPage.classList.add('active');
    });
    if (closeResetBtn) {
        closeResetBtn.addEventListener('click', () => {
            if (resetPasswordPage) resetPasswordPage.classList.remove('active');
            landingPage.classList.add('active');
        });
    }

    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', handleResetPassword);
    }
    logoutBtn.addEventListener('click', handleLogout);

    // Admin Layout Listeners
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    const adminRefreshBtn = document.getElementById('admin-refresh-btn');
    const adminThemeToggle = document.getElementById('admin-theme-toggle');
    const adminSearchUsers = document.getElementById('admin-search-users');
    const closeEditModalBtn = document.getElementById('close-edit-user-modal');
    const editUserForm = document.getElementById('edit-user-form');

    if (adminLogoutBtn) adminLogoutBtn.addEventListener('click', handleLogout);
    if (adminRefreshBtn) adminRefreshBtn.addEventListener('click', () => fetchAdminUsers(true));
    if (adminThemeToggle) adminThemeToggle.addEventListener('click', toggleTheme);
    if (adminSearchUsers) {
        adminSearchUsers.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = adminUsersList.filter(u => 
                (u.username && u.username.toLowerCase().includes(query)) ||
                (u.email && u.email.toLowerCase().includes(query))
            );
            renderAdminUsersTable(filtered);
        });
    }

    if (closeEditModalBtn) {
        closeEditModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('edit-user-modal');
            if (modal) modal.classList.remove('active');
        });
    }

    if (editUserForm) {
        editUserForm.addEventListener('submit', handleEditUserSubmit);
    }

    checkAuth();
}

// ====== AUTHENTICATION ======
function showAuthPage(page) {
    landingPage.classList.remove('active');
    appLayout.style.display = 'none';
    
    if (page === 'login') {
        loginPage.classList.add('active');
        registerPage.classList.remove('active');
        if (resetPasswordPage) resetPasswordPage.classList.remove('active');
    } else if (page === 'register') {
        registerPage.classList.add('active');
        loginPage.classList.remove('active');
        if (resetPasswordPage) resetPasswordPage.classList.remove('active');
    } else if (page === 'reset') {
        if (resetPasswordPage) resetPasswordPage.classList.add('active');
        loginPage.classList.remove('active');
        registerPage.classList.remove('active');
    }
}

function checkAuth() {
    const adminLayout = document.getElementById('admin-app-layout');

    if (authToken) {
        loginPage.classList.remove('active');
        registerPage.classList.remove('active');
        if (resetPasswordPage) resetPasswordPage.classList.remove('active');
        landingPage.classList.remove('active');

        if (currentUserRole === 'admin') {
            if (appLayout) appLayout.style.display = 'none';
            if (adminLayout) adminLayout.style.display = 'flex';

            const adminNameEl = document.getElementById('admin-user-name');
            const adminAvatar = document.getElementById('admin-avatar');
            if (adminNameEl) adminNameEl.textContent = currentUsername;
            if (adminAvatar) adminAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUsername)}&background=8b5cf6&color=fff`;

            fetchAdminUsers();
        } else {
            if (adminLayout) adminLayout.style.display = 'none';
            if (appLayout) appLayout.style.display = 'flex';

            const navUsername = document.getElementById('nav-username');
            const navAvatar = document.getElementById('nav-avatar');
            if (navUsername) navUsername.textContent = currentUsername;
            if (navAvatar) navAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUsername)}&background=0D8ABC&color=fff`;

            fetchData();
        }
    } else {
        landingPage.classList.add('active');
        if (appLayout) appLayout.style.display = 'none';
        if (adminLayout) adminLayout.style.display = 'none';
    }
}

function validatePasswordFrontend(password) {
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const isMinLength = password.length >= 6;
    return isMinLength && hasUppercase && hasNumber;
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await res.json();
        
        if (res.ok) {
            authToken = result.token;
            currentUsername = result.username;
            currentUserRole = result.role || 'user';
            localStorage.setItem('smartSpendToken', authToken);
            localStorage.setItem('smartSpendUser', currentUsername);
            localStorage.setItem('smartSpendRole', currentUserRole);
            showToast('Logged in successfully');
            checkAuth();
        } else {
            showToast(result.error ? `${result.message}: ${result.error}` : (result.message || 'Login failed'), 'error');
        }
    } catch (err) {
        showToast('Login failed: Network error', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    if (!validatePasswordFrontend(password)) {
        showToast("Password must be at least 6 characters with 1 uppercase letter (A-Z) and 1 number (0-9).", "error");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const result = await res.json();
        
        if (res.ok) {
            authToken = result.token;
            currentUsername = result.username;
            currentUserRole = result.role || 'user';
            localStorage.setItem('smartSpendToken', authToken);
            localStorage.setItem('smartSpendUser', currentUsername);
            localStorage.setItem('smartSpendRole', currentUserRole);
            showToast('Account created successfully!');
            checkAuth();
        } else {
            showToast(result.error ? `${result.message}: ${result.error}` : (result.message || 'Registration failed'), 'error');
        }
    } catch (err) {
        showToast('Registration failed: Network error', 'error');
    }
}

async function handleResetPassword(e) {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    const newPassword = document.getElementById('reset-password').value;
    
    if (!validatePasswordFrontend(newPassword)) {
        showToast("New password must be at least 6 characters with 1 uppercase letter (A-Z) and 1 number (0-9).", "error");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, newPassword })
        });
        const result = await res.json();
        
        if (res.ok) {
            showToast(result.message || 'Password reset successfully!');
            showAuthPage('login');
        } else {
            showToast(result.error ? `${result.message}: ${result.error}` : (result.message || 'Password reset failed'), 'error');
        }
    } catch (err) {
        showToast('Password reset failed: Network error', 'error');
    }
}

function handleLogout() {
    authToken = null;
    currentUsername = 'User';
    currentUserRole = 'user';
    localStorage.removeItem('smartSpendToken');
    localStorage.removeItem('smartSpendUser');
    localStorage.removeItem('smartSpendRole');
    data.transactions = [];
    switchWorkspaceTab('user');
    checkAuth();
}

// ====== DATA FETCHING ======
async function fetchData() {
    try {
        const [txRes, budgetRes] = await Promise.all([
            fetch(`${API_URL}/transactions`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }),
            fetch(`${API_URL}/budgets`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
        ]);

        if (txRes.status === 401 || budgetRes.status === 401) return handleLogout();

        const txs = await txRes.json();
        const budgetData = await budgetRes.json();

        data.transactions = txs;
        
        if (budgetData.length > 0) {
            budgets = {};
            budgetData.forEach(b => {
                budgets[b.category] = Number(b.limit_amount);
            });
        }

        refreshDashboard();
    } catch (err) {
        showToast('Failed to fetch data', 'error');
    }
}

// ====== THEME & TOASTS ======
function toggleTheme() {
    if (body.classList.contains("dark-mode")) {
        body.classList.remove("dark-mode");
        body.classList.add("light-mode");
        localStorage.setItem("smartSpendTheme", "light-mode");
    } else {
        body.classList.remove("light-mode");
        body.classList.add("dark-mode");
        localStorage.setItem("smartSpendTheme", "dark-mode");
    }
    updateThemeIcon();
    renderChart();
}

function updateThemeIcon() {
    const icon = themeToggle.querySelector("i");
    if (body.classList.contains("dark-mode")) {
        icon.className = "ph ph-sun";
    } else {
        icon.className = "ph ph-moon";
    }
}

function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    const iconClass = type === 'success' ? 'ph-check-circle' : 'ph-warning-circle';
    toast.innerHTML = `<i class="ph ${iconClass}"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ====== UTILS ======
function formatCurrency(amount) {
    return "₹" + Number(amount).toLocaleString('en-IN');
}

function getIconForCategory(category) {
    const icons = {
        "Food": "ph-hamburger",
        "Transport": "ph-car",
        "Shopping": "ph-shopping-bag",
        "Bills": "ph-receipt",
        "Entertainment": "ph-popcorn",
        "Salary": "ph-money",
        "General": "ph-coins"
    };
    return icons[category] || "ph-coins";
}

// ====== DASHBOARD REFRESH ======
function refreshDashboard() {
    calculateSummaries();
    renderTransactions();
    renderCategoriesAndBudgets();
    renderChart();
}

// Get transactions filtered by selected month
function getCurrentMonthTransactions() {
    const key = monthInput.value; // YYYY-MM
    return data.transactions.filter(t => {
        // Handle dates properly, date from DB might be ISO string
        const tDate = new Date(t.date);
        const yyyy = tDate.getFullYear();
        const mm = String(tDate.getMonth() + 1).padStart(2, '0');
        return `${yyyy}-${mm}` === key;
    });
}

function calculateSummaries() {
    const txs = getCurrentMonthTransactions();
    
    let inc = 0;
    let exp = 0;
    
    txs.forEach(t => {
        const amt = Number(t.amount);
        if (amt > 0) inc += amt;
        else exp += Math.abs(amt);
    });
    
    const bal = inc - exp;
    
    incomeEl.innerText = formatCurrency(inc);
    expenseEl.innerText = formatCurrency(exp);
    balanceEl.innerText = formatCurrency(bal);
    
    savingsEl.innerText = formatCurrency(bal > 0 ? bal : 0);
}

// ====== TRANSACTIONS ======
function renderTransactions() {
    let txs = getCurrentMonthTransactions();
    
    const searchTerm = searchTxInput.value.toLowerCase();
    const filterType = filterTypeSelect.value;
    
    if (searchTerm) {
        txs = txs.filter(t => t.description.toLowerCase().includes(searchTerm) || t.category.toLowerCase().includes(searchTerm));
    }
    
    if (filterType === 'income') txs = txs.filter(t => Number(t.amount) > 0);
    else if (filterType === 'expense') txs = txs.filter(t => Number(t.amount) < 0);
    
    transactionListEl.innerHTML = '';
    
    if (txs.length === 0) {
        transactionListEl.innerHTML = `
            <div class="empty-state">
                <i class="ph ph-receipt"></i>
                <p>No transactions found.</p>
                <p style="font-size: 12px; margin-top:4px;">Add your first transaction to see it here.</p>
            </div>
        `;
        return;
    }
    
    txs.forEach(t => {
        const amt = Number(t.amount);
        const isIncome = amt > 0;
        const typeClass = isIncome ? 'inc' : 'exp';
        const sign = isIncome ? '+' : '-';
        const amountAbs = Math.abs(amt);
        
        const dateObj = new Date(t.date);
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const catIcon = getIconForCategory(t.category);
        
        const el = document.createElement('div');
        el.className = 'tx-item';
        el.innerHTML = `
            <div class="tx-icon ${isIncome ? 'income' : 'expense'}">
                <i class="ph ${catIcon}"></i>
            </div>
            <div class="tx-details">
                <div class="tx-title">${t.description}</div>
                <div class="tx-meta">
                    <span>${t.category}</span> • <span>${dateStr}</span>
                </div>
            </div>
            <div class="tx-amount ${typeClass}">
                ${sign}${formatCurrency(amountAbs)}
            </div>
            <div class="tx-actions">
                <button class="btn-icon" onclick="editTransaction(${t.id})"><i class="ph ph-pencil-simple"></i></button>
                <button class="btn-icon" style="color:var(--color-expense)" onclick="deleteTransaction(${t.id})"><i class="ph ph-trash"></i></button>
            </div>
        `;
        transactionListEl.appendChild(el);
    });
}

// ====== MODAL & CRUD ======
function openModal(tx = null) {
    txForm.reset();
    txIdInput.value = '';
    
    if (tx) {
        modalTitle.innerText = "Edit Transaction";
        txIdInput.value = tx.id;
        document.getElementById("tx-amount").value = Math.abs(Number(tx.amount));
        const d = new Date(tx.date);
        document.getElementById("tx-date").value = d.toISOString().slice(0, 10);
        document.getElementById("tx-desc").value = tx.description;
        document.getElementById("tx-category").value = tx.category || 'General';
        document.getElementById("tx-payment").value = tx.payment_method || 'Cash';
        document.getElementById("tx-notes").value = tx.notes || '';
        
        const amt = Number(tx.amount);
        const typeRadios = document.getElementsByName('tx-type');
        typeRadios.forEach(r => {
            if ((amt > 0 && r.value === 'income') || (amt < 0 && r.value === 'expense')) r.checked = true;
        });
    } else {
        modalTitle.innerText = "Add Transaction";
        document.getElementById("tx-date").value = new Date().toISOString().slice(0, 10);
    }
    
    modalOverlay.classList.add('active');
}

function closeModal() { modalOverlay.classList.remove('active'); }

async function handleTransactionSubmit(e) {
    e.preventDefault();
    const id = txIdInput.value;
    const type = document.querySelector('input[name="tx-type"]:checked').value;
    
    const amountVal = Number(document.getElementById("tx-amount").value);
    if (isNaN(amountVal) || amountVal <= 0) {
        showToast("Please enter a valid amount", "error");
        return;
    }
    
    const finalAmount = type === 'income' ? amountVal : -amountVal;
    const txObj = {
        date: document.getElementById("tx-date").value,
        description: document.getElementById("tx-desc").value,
        amount: finalAmount,
        category: document.getElementById("tx-category").value,
        payment_method: document.getElementById("tx-payment").value,
        notes: document.getElementById("tx-notes").value
    };
    
    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/transactions/${id}` : `${API_URL}/transactions`;

        const res = await fetch(url, {
            method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(txObj)
        });

        if (res.ok) {
            showToast(`Transaction ${id ? 'updated' : 'added'} successfully`);
            closeModal();
            fetchData();
        } else if (res.status === 401) {
            showToast("Session expired or invalid user. Please log in again.", "error");
            handleLogout();
        } else {
            showToast("Failed to save transaction", "error");
        }
    } catch (error) {
        showToast("Network Error", "error");
    }
}

window.editTransaction = function(id) {
    const tx = data.transactions.find(t => t.id == id);
    if (tx) openModal(tx);
};

window.deleteTransaction = async function(id) {
    if (confirm("Are you sure you want to delete this transaction?")) {
        try {
            const res = await fetch(`${API_URL}/transactions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                showToast("Transaction deleted");
                fetchData();
            } else {
                showToast("Failed to delete", "error");
            }
        } catch(error) {
            showToast("Network Error", "error");
        }
    }
};

// ====== CATEGORIES & BUDGETS ======
function renderCategoriesAndBudgets() {
    const txs = getCurrentMonthTransactions();
    const catTotals = {};
    let totalExpense = 0;
    
    txs.forEach(t => {
        const amt = Number(t.amount);
        if (amt < 0) {
            const cat = t.category || "General";
            catTotals[cat] = (catTotals[cat] || 0) + Math.abs(amt);
            totalExpense += Math.abs(amt);
        }
    });
    
    categoriesListEl.innerHTML = '';
    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    
    if (sortedCats.length === 0) {
        categoriesListEl.innerHTML = '<p class="empty-state" style="padding:10px">No expenses yet.</p>';
    } else {
        sortedCats.forEach(([cat, amount]) => {
            const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
            categoriesListEl.innerHTML += `
                <div class="category-item">
                    <div class="cat-header"><span>${cat}</span><span>${formatCurrency(amount)}</span></div>
                    <div class="progress-bar"><div class="progress-fill" style="width: ${percentage}%"></div></div>
                </div>
            `;
        });
    }
    
    budgetListEl.innerHTML = '';
    Object.entries(budgets).forEach(([cat, limit]) => {
        const spent = catTotals[cat] || 0;
        const percentage = Math.min((spent / limit) * 100, 100);
        const isWarning = percentage > 85;
        const colorClass = isWarning ? 'background-color: var(--color-expense)' : '';
        
        budgetListEl.innerHTML += `
            <div class="budget-item">
                <div class="cat-header"><span>${cat}</span><span style="font-size:12px">${Math.round(percentage)}% used</span></div>
                <div class="progress-bar"><div class="progress-fill" style="width: ${percentage}%; ${colorClass}"></div></div>
                <div class="budget-meta"><span>${formatCurrency(spent)} spent</span><span>${formatCurrency(limit)} limit</span></div>
            </div>
        `;
    });
}

// ====== CHARTS ======
function renderChart() {
    const txs = getCurrentMonthTransactions();
    const days = {};
    
    txs.forEach(t => {
        const amt = Number(t.amount);
        const dateObj = new Date(t.date);
        const day = String(dateObj.getDate()).padStart(2, '0');
        
        if (!days[day]) days[day] = { inc: 0, exp: 0 };
        
        if (amt > 0) days[day].inc += amt;
        else days[day].exp += Math.abs(amt);
    });
    
    const sortedDays = Object.keys(days).sort();
    const labels = sortedDays.map(d => {
        const dObj = new Date(monthInput.value + '-' + d);
        return `${d} ${dObj.toLocaleString('default', {month:'short'})}`;
    });
    const incomeData = sortedDays.map(d => days[d].inc);
    const expenseData = sortedDays.map(d => days[d].exp);
    
    const isDark = body.classList.contains("dark-mode");
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "#334155" : "#e2e8f0";

    if (overviewChartInstance) overviewChartInstance.destroy();
    
    const ctx = document.getElementById('overviewChart');
    if (!ctx) return;

    overviewChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Income', data: incomeData, backgroundColor: '#10b981', borderRadius: 4 },
                { label: 'Expense', data: expenseData, backgroundColor: '#ef4444', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { color: textColor } } },
            scales: {
                y: { grid: { color: gridColor }, ticks: { color: textColor } },
                x: { grid: { display: false }, ticks: { color: textColor } }
            }
        }
    });
}

// ====== ADMIN MODULE FUNCTIONS ======
function switchWorkspaceTab(tab) {
    const userView = document.getElementById('user-dashboard-view');
    const adminView = document.getElementById('admin-dashboard-view');
    const navTabUser = document.getElementById('nav-tab-user');
    const navTabAdmin = document.getElementById('nav-tab-admin');
    const mobileNavUser = document.getElementById('mobile-nav-user');
    const mobileNavAdmin = document.getElementById('mobile-nav-admin');

    if (tab === 'admin' && currentUserRole === 'admin') {
        if (userView) userView.style.display = 'none';
        if (adminView) adminView.style.display = 'block';
        if (navTabUser) navTabUser.classList.remove('active');
        if (navTabAdmin) navTabAdmin.classList.add('active');
        if (mobileNavUser) mobileNavUser.classList.remove('active');
        if (mobileNavAdmin) mobileNavAdmin.classList.add('active');
        loadAdminData();
    } else {
        if (userView) userView.style.display = 'block';
        if (adminView) adminView.style.display = 'none';
        if (navTabUser) navTabUser.classList.add('active');
        if (navTabAdmin) navTabAdmin.classList.remove('active');
        if (mobileNavUser) mobileNavUser.classList.add('active');
        if (mobileNavAdmin) mobileNavAdmin.classList.remove('active');
    }
}

async function fetchAdminUsers(isManual = false) {
    if (currentUserRole !== 'admin') return;

    const refreshBtn = document.getElementById('admin-refresh-btn');
    if (refreshBtn) refreshBtn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.status === 401 || res.status === 403) return handleLogout();

        if (res.ok) {
            adminUsersList = await res.json();
            renderAdminUsersTable(adminUsersList);
            if (isManual) {
                showToast('Users list refreshed');
            }
        }
    } catch (err) {
        console.error('Error fetching users list:', err);
        showToast('Error loading users list', 'error');
    } finally {
        if (refreshBtn) refreshBtn.disabled = false;
    }
}

function renderAdminUsersTable(users) {
    const tbody = document.getElementById('table-body-users');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 24px;">No users found.</td></tr>';
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
        tbody.appendChild(tr);
    });
}

function openEditUserModal(userId) {
    const user = adminUsersList.find(u => u.id === userId);
    if (!user) return;

    const modal = document.getElementById('edit-user-modal');
    if (!modal) return;

    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-name').value = user.username || '';
    document.getElementById('edit-user-email').value = user.email || '';
    document.getElementById('edit-user-role').value = user.role || 'user';

    modal.classList.add('active');
}

async function handleEditUserSubmit(e) {
    e.preventDefault();
    const userId = document.getElementById('edit-user-id').value;
    const username = document.getElementById('edit-user-name').value.trim();
    const email = document.getElementById('edit-user-email').value.trim();
    const role = document.getElementById('edit-user-role').value;

    try {
        const res = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, role })
        });
        const result = await res.json();

        if (res.ok) {
            showToast(result.message || 'User details updated successfully!');
            const modal = document.getElementById('edit-user-modal');
            if (modal) modal.classList.remove('active');
            fetchAdminUsers();
        } else {
            showToast(result.message || 'Failed to update user', 'error');
        }
    } catch (err) {
        showToast('Error updating user details', 'error');
    }
}

async function deleteUser(userId, username) {
    if (!confirm(`Are you sure you want to delete user "${username}"? All associated transactions will be deleted!`)) return;

    try {
        const res = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
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

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

document.addEventListener("DOMContentLoaded", init);