class Auth {
    constructor() {
        this.baseUrl = 'http://localhost:5000/api';
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user')) || null;
        
        this.initializeEventListeners();
        this.updateUI();
    }
    
    initializeEventListeners() {
        // Login button
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        
        if (loginBtn) loginBtn.addEventListener('click', () => this.showLoginModal());
        if (signupBtn) signupBtn.addEventListener('click', () => this.showSignupModal());
        
        // Modal close buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.hideAllModals());
        });
        
        // Form submissions
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
        
        // Switch between login and signup
        const showSignup = document.getElementById('showSignup');
        const showLogin = document.getElementById('showLogin');
        
        if (showSignup) showSignup.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideAllModals();
            this.showSignupModal();
        });
        
        if (showLogin) showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideAllModals();
            this.showLoginModal();
        });
    }
    
    showLoginModal() {
        this.hideAllModals();
        document.getElementById('loginModal').style.display = 'flex';
    }
    
    showSignupModal() {
        this.hideAllModals();
        document.getElementById('signupModal').style.display = 'flex';
    }
    
    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await fetch(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.token = data.token;
                this.user = data.user;
                
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                this.hideAllModals();
                this.updateUI();
                this.showSuccess('Login successful!');
                
                // Redirect to dashboard
                window.location.href = '/dashboard.html';
            } else {
                this.showError(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Network error. Please try again.');
        }
    }
    
    async handleSignup(e) {
        e.preventDefault();
        
        const username = document.getElementById('signupUsername').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const referralCode = document.getElementById('referralCode').value;
        
        try {
            const response = await fetch(`${this.baseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    username, 
                    email, 
                    password,
                    referralCode 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.token = data.token;
                this.user = data.user;
                
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                this.hideAllModals();
                this.updateUI();
                this.showSuccess('Account created successfully!');
                
                // Redirect to dashboard
                window.location.href = '/dashboard.html';
            } else {
                this.showError(data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showError('Network error. Please try again.');
        }
    }
    
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = null;
        this.updateUI();
        window.location.href = '/';
    }
    
    updateUI() {
        const balanceElement = document.getElementById('user-balance');
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        
        if (this.user) {
            // User is logged in
            if (balanceElement) {
                balanceElement.textContent = `₦${this.user.balance.toLocaleString()}`;
            }
            
            if (loginBtn) {
                loginBtn.textContent = 'Dashboard';
                loginBtn.onclick = () => window.location.href = '/dashboard.html';
            }
            
            if (signupBtn) {
                signupBtn.textContent = 'Logout';
                signupBtn.onclick = () => this.logout();
            }
        } else {
            // User is not logged in
            if (balanceElement) {
                balanceElement.textContent = '₦0.00';
            }
            
            if (loginBtn) {
                loginBtn.textContent = 'Login';
                loginBtn.onclick = () => this.showLoginModal();
            }
            
            if (signupBtn) {
                signupBtn.textContent = 'Sign Up Free';
                signupBtn.onclick = () => this.showSignupModal();
            }
        }
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        if (type === 'success') {
            notification.style.backgroundColor = '#10B981';
        } else {
            notification.style.backgroundColor = '#EF4444';
        }
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token && !!this.user;
    }
    
    // Get auth headers for API calls
    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.auth = new Auth();
});

// Add CSS for notifications
const notificationStyles = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);
