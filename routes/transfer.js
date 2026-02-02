const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

// @route   POST /api/transfer/transfer
// @desc    Transfer credits to another user
router.post('/transfer', auth, async (req, res) => {
    try {
        const { receiverUsername, amount, description } = req.body;
        const sender = req.user;

        // Validation
        if (!receiverUsername || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Receiver username and amount are required'
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be positive'
            });
        }

        if (amount < 10) {
            return res.status(400).json({
                success: false,
                error: 'Minimum transfer amount is ₦10'
            });
        }

        if (amount > 50000) {
            return res.status(400).json({
                success: false,
                error: 'Maximum transfer amount is ₦50,000'
            });
        }

        // Check if sender has enough balance
        if (sender.balance < amount) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient balance'
            });
        }

        // Find receiver
        const receiver = await User.findOne({ username: receiverUsername });
        if (!receiver) {
            return res.status(404).json({
                success: false,
                error: 'Receiver not found'
            });
        }

        if (sender._id.toString() === receiver._id.toString()) {
            return res.status(400).json({
                success: false,
                error: 'Cannot transfer to yourself'
            });
        }

        // Calculate platform fee (2%)
        const platformFee = amount * 0.02;
        const transferAmount = amount - platformFee;

        // Update balances
        sender.balance -= amount;
        sender.totalSpent += amount;
        await sender.save();

        receiver.balance += transferAmount;
        receiver.totalEarned += transferAmount;
        await receiver.save();

        // Record transactions
        const senderTransaction = new Transaction({
            userId: sender._id,
            type: 'transfer',
            amount: -amount,
            description: description || `Transfer to ${receiver.username}`,
            receiverId: receiver._id
        });

        const receiverTransaction = new Transaction({
            userId: receiver._id,
            type: 'transfer',
            amount: transferAmount,
            description: description || `Transfer from ${sender.username}`,
            senderId: sender._id
        });

        const platformTransaction = new Transaction({
            userId: sender._id,
            type: 'platform_fee',
            amount: platformFee,
            description: `Platform fee for transfer to ${receiver.username}`
        });

        await Promise.all([
            senderTransaction.save(),
            receiverTransaction.save(),
            platformTransaction.save()
        ]);

        res.json({
            success: true,
            message: `Transfer successful! ${transferAmount.toLocaleString()} sent to ${receiver.username}`,
            amount: transferAmount,
            fee: platformFee,
            receiver: {
                username: receiver.username,
                balance: receiver.balance
            },
            sender: {
                balance: sender.balance
            }
        });
    } catch (error) {
        console.error('Transfer error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Transfer failed' 
        });
    }
});

module.exports = router;
