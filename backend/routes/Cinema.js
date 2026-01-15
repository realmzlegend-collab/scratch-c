const express = require('express');
const router = express.Router();
const Cinema = require('../models/Cinema');
const auth = require('../middleware/auth');

// Get all movies
router.get('/movies', auth, async (req, res) => {
    try {
        const movies = await Cinema.find().sort({ votes: -1 });
        const userVotes = req.user.votedMovies || [];
        
        res.json({ movies, userVotes });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single movie
router.get('/movie/:id', auth, async (req, res) => {
    try {
        const movie = await Cinema.findById(req.params.id);
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found' });
        }
        res.json(movie);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Vote for movie
router.post('/vote', auth, async (req, res) => {
    try {
        const { movieId } = req.body;
        
        // Find movie
        const movie = await Cinema.findById(movieId);
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found' });
        }
        
        // Check if user already voted
        const alreadyVoted = movie.voters.some(voter => 
            voter.userId.toString() === req.user.id
        );
        
        if (alreadyVoted) {
            return res.status(400).json({ message: 'Already voted for this movie' });
        }
        
        // Add vote
        movie.votes += 1;
        movie.voters.push({
            userId: req.user.id,
            votedAt: new Date()
        });
        
        await movie.save();
        
        // Add to user's voted movies
        req.user.votedMovies = req.user.votedMovies || [];
        if (!req.user.votedMovies.includes(movieId)) {
            req.user.votedMovies.push(movieId);
            await req.user.save();
        }
        
        res.json({ message: 'Vote recorded', votes: movie.votes });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add comment
router.post('/comment', auth, async (req, res) => {
    try {
        const { movieId, text } = req.body;
        
        const movie = await Cinema.findById(movieId);
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found' });
        }
        
        const comment = {
            userId: req.user.id,
            text,
            likes: 0,
            dislikes: 0,
            createdAt: new Date()
        };
        
        movie.comments.push(comment);
        await movie.save();
        
        res.json({ message: 'Comment added', comment });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get comments for movie
router.get('/comments/:movieId', auth, async (req, res) => {
    try {
        const movie = await Cinema.findById(req.params.movieId)
            .populate('comments.userId', 'username');
        
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found' });
        }
        
        res.json(movie.comments);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Like movie
router.post('/like', auth, async (req, res) => {
    try {
        const { movieId } = req.body;
        
        // Here you can implement liking logic
        // For now, just return success
        res.json({ message: 'Movie liked' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add to wishlist
router.post('/wishlist', auth, async (req, res) => {
    try {
        const { movieId } = req.body;
        
        // Add to user's wishlist
        req.user.wishlist = req.user.wishlist || [];
        if (!req.user.wishlist.some(item => item.movieId === movieId)) {
            req.user.wishlist.push({ movieId, addedAt: new Date() });
            await req.user.save();
        }
        
        res.json({ message: 'Added to wishlist' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Add new movie
router.post('/admin/add', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const movie = new Cinema({
            ...req.body,
            addedBy: req.user.id
        });
        
        await movie.save();
        res.json({ message: 'Movie added', movie });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;