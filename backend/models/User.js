const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    balance: { 
        type: Number, 
        default: 50 
    },
    status: { 
        type: String, 
        enum: ['active', 'suspended'], 
        default: 'active' 
    },
    isAdmin: { 
        type: Boolean, 
        default: false 
    },
    telegramId: { 
        type: String, 
        unique: true, 
        sparse: true 
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
