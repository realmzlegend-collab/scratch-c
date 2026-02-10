class SpinWheel {
    constructor() {
        this.wheel = document.getElementById('spinWheel');
        this.spinBtn = document.getElementById('spinBtn');
        this.isSpinning = false;
        this.prizes = [
            { text: '₦10 Credits', value: 10, color: '#FF6B6B' },
            { text: 'Try Again', value: 0, color: '#4ECDC4' },
            { text: '₦50 Credits', value: 50, color: '#FFD166' },
            { text: 'Badge', value: 'badge', color: '#06D6A0' },
            { text: '₦100 Credits', value: 100, color: '#118AB2' },
            { text: '₦20 Credits', value: 20, color: '#EF476F' },
            { text: 'Free Spin', value: 'spin', color: '#FFD166' },
            { text: '₦500 Credits', value: 500, color: '#073B4C' }
        ];
        
        this.initializeWheel();
        this.attachEventListeners();
    }
    
    initializeWheel() {
        if (!this.wheel) return;
        
        this.wheel.innerHTML = '';
        const segmentAngle = 360 / this.prizes.length;
        
        this.prizes.forEach((prize, index) => {
            const segment = document.createElement('div');
            segment.className = 'wheel-segment';
            
            // Calculate rotation
            const rotation = segmentAngle * index;
            
            segment.style.cssText = `
                position: absolute;
                width: 50%;
                height: 50%;
                transform-origin: 100% 100%;
                transform: rotate(${rotation}deg);
                background-color: ${prize.color};
                clip-path: polygon(0 0, 100% 0, 100% 100%);
            `;
            
            // Add prize text
            const text = document.createElement('div');
            text.className = 'prize-text';
            text.textContent = prize.text;
            
            text.style.cssText = `
                position: absolute;
                top: 50%;
                right: 10%;
                transform: rotate(${rotation + segmentAngle/2}deg);
                transform-origin: 0 0;
                color: white;
                font-weight: bold;
                text-align: center;
                font-size: 14px;
                width: 80px;
            `;
            
            segment.appendChild(text);
            this.wheel.appendChild(segment);
        });
        
        // Add center circle
        const center = document.createElement('div');
        center.className = 'wheel-center';
        center.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 40px;
            background-color: white;
            border-radius: 50%;
            border: 3px solid var(--primary-color);
            z-index: 10;
        `;
        this.wheel.appendChild(center);
    }
    
    attachEventListeners() {
        if (this.spinBtn) {
            this.spinBtn.addEventListener('click', () => this.spin());
        }
    }
    
    async spin() {
        if (this.isSpinning) return;
        
        this.isSpinning = true;
        this.spinBtn.disabled = true;
        
        // Random rotation (5-10 full rotations plus segment offset)
        const fullRotations = 5 + Math.floor(Math.random() * 5);
        const segmentAngle = 360 / this.prizes.length;
        const winningSegment = Math.floor(Math.random() * this.prizes.length);
        const offset = winningSegment * segmentAngle;
        
        const totalRotation = (fullRotations * 360) + offset;
        
        // Animate the spin
        this.wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.83, 0.67)';
        this.wheel.style.transform = `rotate(${totalRotation}deg)`;
        
        // After spin completes
        setTimeout(() => {
            this.isSpinning = false;
            this.spinBtn.disabled = false;
            
            const prize = this.prizes[winningSegment];
            this.showPrizeResult(prize);
            
            // Send to backend if user is logged in
            if (window.auth && window.auth.isAuthenticated()) {
                this.saveSpinResult(prize);
            }
        }, 4000);
    }
    
    showPrizeResult(prize) {
        let message = '';
        
        if (prize.value === 0) {
            message = 'Better luck next time!';
        } else if (prize.value === 'badge') {
            message = 'Congratulations! You won a special badge!';
        } else if (prize.value === 'spin') {
            message = 'You won a free spin!';
        } else {
            message = `Congratulations! You won ₦${prize.value} credits!`;
        }
        
        // Show notification
        if (window.auth) {
            window.auth.showSuccess(message);
        } else {
            alert(message);
        }
    }
    
    async saveSpinResult(prize) {
        try {
            const response = await fetch(`${window.auth.baseUrl}/earning/spin`, {
                method: 'POST',
                headers: window.auth.getAuthHeaders(),
                body: JSON.stringify({
                    prize: prize.value,
                    type: 'spin_wheel'
                })
            });
            
            const data = await response.json();
            if (data.success) {
                // Update balance display
                window.auth.fetchUserBalance();
            }
        } catch (error) {
            console.error('Error saving spin result:', error);
        }
    }
}

// Initialize spin wheel
document.addEventListener('DOMContentLoaded', () => {
    window.spinWheel = new SpinWheel();
});
