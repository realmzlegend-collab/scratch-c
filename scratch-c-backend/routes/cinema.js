const express = require('express');
const router = express.Router();
const cinemaController = require('../controllers/cinemaController');
const { auth } = require('../middleware/auth');

// Public routes
router.get('/now-playing', cinemaController.getNowPlaying);
router.get('/voting', cinemaController.getVotingMovies);

// Protected routes
router.post('/vote/:movieId', auth, cinemaController.voteForMovie);
router.post('/:movieId/comments', auth, cinemaController.addComment);
router.get('/:movieId/comments', cinemaController.getComments);

module.exports = router;
