const express = require('express');
const path = require('path');
const fs = require('fs');
const { connect } = require('./lib/mongoose');
const models = require('./models'); // ensures models are registered (idempotent)

const app = express();
app.use(express.json());

// --- debug logs to confirm which file is running ---
console.log('Starting server.js');
console.log('__dirname =', __dirname);

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

// Serve frontend static files
const frontendPath = path.join(__dirname, 'frontend');
console.log('Serving frontendPath =', frontendPath);

// helpful check: does index.html exist where we expect it?
const indexPath = path.join(frontendPath, 'index.html');
console.log('index.html exists =', fs.existsSync(indexPath));

// Serve static files (must be before wildcard that handles client-side routing)
app.use(express.static(frontendPath));

// Explicit root route — this will return index.html for GET /
app.get('/', (req, res) => {
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  } else {
    return res.status(404).send('index.html not found on server');
  }
});

// fallback for client-side routing (leave API routes untouched)
app.get('*', (req, res) => {
  // If request is for an API route, respond 404 so API behavior remains clear
  if (req.path.startsWith('/api') || req.path.startsWith('/users') || req.path === '/health') {
    return res.status(404).send('Not Found');
  }
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  } else {
    return res.status(404).send('index.html not found on server');
  }
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
