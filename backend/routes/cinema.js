const express = require('express');
const Movie = require('../models/Movie');
const auth = require('../middleware/auth');
const router = express.Router();

// Get now playing movie
router.get('/now-playing', auth, async (req, res) => {
  try {
    const movie = await Movie.findOne({ isPlaying: true });
    res.json({ movie });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch now playing movie' });
  }
});

// Get voting movies
router.get('/voting', auth, async (req, res) => {
  try {
    const movies = await Movie.find({ category: 'voting' }).sort({ voteCount: -1 });
    res.json({ movies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch voting movies' });
  }
});

// Vote for movie
router.post('/vote/:movieId', auth, async (req, res) => {
  try {
    const { movieId } = req.params;
    
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    // Check if user already voted
    if (movie.votedBy.includes(req.user._id)) {
      return res.status(400).json({ error: 'Already voted for this movie' });
    }
    
    movie.voteCount += 1;
    movie.votedBy.push(req.user._id);
    await movie.save();
    
    res.json({ success: true, voteCount: movie.voteCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Add comment to movie
router.post('/:movieId/comments', auth, async (req, res) => {
  try {
    const { movieId } = req.params;
    const { comment } = req.body;
    
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    movie.comments.push({
      userId: req.user._id,
      comment
    });
    
    await movie.save();
    
    // Populate user info in response
    const updatedMovie = await Movie.findById(movieId)
      .populate('comments.userId', 'username');
    
    res.json({ 
      success: true, 
      comments: updatedMovie.comments 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get comments
router.get('/:movieId/comments', auth, async (req, res) => {
  try {
    const { movieId } = req.params;
    
    const movie = await Movie.findById(movieId)
      .populate('comments.userId', 'username')
      .select('comments');
    
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    res.json({ comments: movie.comments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

module.exports = router;
