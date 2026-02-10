class ScratchCApp {
    constructor() {
        this.initializeApp();
    }
    
    initializeApp() {
        // Hide loading spinner
        window.addEventListener('load', () => {
            setTimeout(() => {
                const spinner = document.getElementById('loading-spinner');
                if (spinner) {
                    spinner.style.display = 'none';
                }
            }, 1000);
        });
        
        // Mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const navMenu = document.getElementById('navMenu');
        
        if (menuToggle && navMenu) {
            menuToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                    navMenu.classList.remove('active');
                }
            });
        }
        
        // Start earning button
        const startEarningBtn = document.getElementById('startEarningBtn');
        if (startEarningBtn) {
            startEarningBtn.addEventListener('click', () => {
                if (window.auth && window.auth.isAuthenticated()) {
                    window.location.href = '/dashboard.html';
                } else {
                    window.auth.showSignupModal();
                }
            });
        }
        
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80,
                        behavior: 'smooth'
                    });
                    
                    // Close mobile menu if open
                    if (navMenu) navMenu.classList.remove('active');
                }
            });
        });
        
        // Update active nav link on scroll
        window.addEventListener('scroll', this.updateActiveNavLink.bind(this));
        
        // Initialize charts if needed
        this.initializeCharts();
    }
    
    updateActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const scrollPos = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
    
    initializeCharts() {
        // Initialize any charts if needed
        // This is a placeholder for future chart implementations
    }
    
    // Fetch user balance from API
    async fetchUserBalance() {
        if (!window.auth || !window.auth.isAuthenticated()) return;
        
        try {
            const response = await fetch(`${window.auth.baseUrl}/user/balance`, {
                headers: window.auth.getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.balance !== undefined) {
                    const balanceElement = document.getElementById('user-balance');
                    if (balanceElement) {
                        balanceElement.textContent = `₦${data.balance.toLocaleString()}`;
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.scratchApp = new ScratchCApp();
});
