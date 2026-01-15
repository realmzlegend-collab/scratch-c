const express = require('express');
const path = require('path');
const { connect } = require('./lib/mongoose');
const models = require('./models'); // ensures models are registered (idempotent)

const app = express();
app.use(express.json());

// API routes
app.get('/health', (req, res) => res.send('ok'));

app.get('/users', async (req, res) => {
  try {
    const users = await models.User.find().lean();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

// Serve frontend static files (make sure your built frontend is in ./frontend and has index.html)
const frontendPath = path.join(__dirname, 'frontend');
app.use(express.static(frontendPath));

// Serve index.html for all non-API routes so client-side routing works
app.get('*', (req, res) => {
  // If the request is for an API route, skip and let it 404 normally
  if (req.path.startsWith('/api') || req.path.startsWith('/users') || req.path === '/health') {
    return res.status(404).send('Not Found');
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const port = process.env.PORT || 3000;

async function start() {
  try {
    await connect(); // uses cached connection; safe to call multiple times
    app.listen(port, () => console.log(`Listening on ${port}`));
  } catch (err) {
    console.error('Failed to start', err);
    process.exit(1);
  }
}

start();
