const express = require('express');
const { auth } = require('../middleware/auth');
const Movie = require('../models/Movie');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

// @route   GET /api/cinema/now-playing
// @desc    Get currently playing movie
router.get('/now-playing', auth, async (req, res) => {
    try {
        const movie = await Movie.findOne({ status: 'playing' })
            .populate('addedBy', 'username');

        if (!movie) {
            return res.json({
                success: true,
                movie: null,
                message: 'No movie currently playing'
            });
        }

        res.json({
            success: true,
            movie: {
                id: movie._id,
                title: movie.title,
                description: movie.description,
                thumbnail: movie.thumbnail,
                googleDriveLink: movie.googleDriveLink,
                scheduledTime: movie.scheduledTime,
                voteCount: movie.voteCount,
                addedBy: movie.addedBy.username
            }
        });
    } catch (error) {
        console.error('Get now playing error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   GET /api/cinema/voting
// @desc    Get movies for voting
router.get('/voting', auth, async (req, res) => {
    try {
        const movies = await Movie.find({ status: 'voting' })
            .sort({ voteCount: -1 })
            .populate('addedBy', 'username');

        res.json({
            success: true,
            movies: movies.map(movie => ({
                id: movie._id,
                title: movie.title,
                description: movie.description,
                thumbnail: movie.thumbnail,
                voteCount: movie.voteCount,
                addedBy: movie.addedBy.username,
                createdAt: movie.createdAt
            }))
        });
    } catch (error) {
        console.error('Get voting movies error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   POST /api/cinema/vote/:movieId
// @desc    Vote for a movie
router.post('/vote/:movieId', auth, async (req, res) => {
    try {
        const { movieId } = req.params;
        const user = req.user;

        const movie = await Movie.findById(movieId);
        if (!movie) {
            return res.status(404).json({
                success: false,
                error: 'Movie not found'
            });
        }

        // Check if user already voted
        if (movie.votedBy?.includes(user._id)) {
            return res.status(400).json({
                success: false,
                error: 'You have already voted for this movie'
            });
        }

        // Add vote
        movie.voteCount = (movie.voteCount || 0) + 1;
        if (!movie.votedBy) movie.votedBy = [];
        movie.votedBy.push(user._id);

        await movie.save();

        // Give user credit for voting
        await user.updateBalance(1, 'add'); // 1 credit for voting
        user.moviesWatched = (user.moviesWatched || 0) + 1;
        await user.save();

        // Record transaction
        const transaction = new Transaction({
            userId: user._id,
            type: 'voting_reward',
            amount: 1,
            description: `Voted for "${movie.title}"`,
            movieId: movie._id
        });
        await transaction.save();

        res.json({
            success: true,
            message: 'Vote recorded! You earned 1 credit.',
            voteCount: movie.voteCount
        });
    } catch (error) {
        console.error('Vote movie error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// @route   POST /api/cinema/watch/:movieId
// @desc    Watch a movie and earn credits
router.post('/watch/:movieId', auth, async (req, res) => {
    try {
        const { movieId } = req.params;
        const user = req.user;
        const { watchTime } = req.body; // in minutes

        const movie = await Movie.findById(movieId);
        if (!movie) {
            return res.status(404).json({
                success: false,
                error: 'Movie not found'
            });
        }

        // Calculate earnings (2 credits per minute of watch time)
        const earnings = watchTime * 2;

        // Update user balance and stats
        await user.updateBalance(earnings, 'add');
        user.moviesWatched = (user.moviesWatched || 0) + 1;
        await user.save();

        // Update movie stats
        movie.watchCount = (movie.watchCount || 0) + 1;
        movie.totalWatchTime = (movie.totalWatchTime || 0) + watchTime;
        await movie.save();

        // Record transaction
        const transaction = new Transaction({
            userId: user._id,
            type: 'watching_earnings',
            amount: earnings,
            description: `Watched "${movie.title}" for ${watchTime} minutes`,
            movieId: movie._id
        });
        await transaction.save();

        res.json({
            success: true,
            message: `You earned ${earnings} credits for watching!`,
            earnings,
            newBalance: user.balance
        });
    } catch (error) {
        console.error('Watch movie error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

module.exports = router;
