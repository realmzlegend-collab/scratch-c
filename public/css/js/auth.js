class Auth {
    static isAuthenticated() {
        const token = localStorage.getItem('token');
        return !!token;
    }

    static getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    static async validateToken() {
        const token = localStorage.getItem('token');
        if (!token) return false;

        try {
            const response = await fetch('/api/auth/validate', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    static logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }

    static requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/';
            return false;
        }
        return true;
    }
}
