/**
 * Root server that serves frontend from ./frontend and exposes API routes.
 *
 * Replace or add this file at the repository root, commit, and push.
 * Render start command: `npm start` (or `node server.js`)
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// Try to load DB connect + models if present, but don't crash if they are missing.
// This keeps the site serving even if DB isn't configured yet.
let connect = null;
let models = null;
try {
  // lib/mongoose should export { connect, mongoose } or at least connect
  ({ connect } = require('./lib/mongoose'));
} catch (err) {
  console.warn('lib/mongoose not found or failed to load. Continuing without DB. Error:', err.message);
}

try {
  models = require('./models');
} catch (err) {
  console.warn('models index not found or failed to load. /users route will return empty array. Error:', err.message);
}

// --- Debug logs to help Render logs show what's happening ---
console.log('Starting root server.js');
console.log('__dirname =', __dirname);

// Serve static files from the frontend folder located at repository root ./frontend
const frontendPath = path.join(__dirname, 'frontend');
const indexPath = path.join(frontendPath, 'index.html');

console.log('frontendPath =', frontendPath);
console.log('index.html exists =', fs.existsSync(indexPath));

// Serve all files inside ./frontend
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
} else {
  console.warn(`Warning: frontend directory not found at ${frontendPath}. Static files will not be served.`);
}

// Health check
app.get('/health', (req, res) => res.send('ok'));

// Example API route: /users
app.get('/users', async (req, res) => {
  if (models && models.User) {
    try {
      const users = await models.User.find().lean();
      return res.json(users);
    } catch (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: 'internal' });
    }
  }
  // Fallback if models not available
  return res.json([]);
});

// Serve index.html for root
app.get('/', (req, res) => {
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(404).send('index.html not found on server');
});

// Fallback for client-side routing: serve index.html for any non-API GET
app.get('*', (req, res) => {
  // keep API routes distinct
  const isApi = req.path.startsWith('/api') || req.path.startsWith('/users') || req.path === '/health';
  if (isApi) {
    return res.status(404).send('Not Found');
  }
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(404).send('index.html not found on server');
});

const port = process.env.PORT || 3000;

async function start() {
  try {
    // Connect to DB if connect function is available (safe to call even if not configured)
    if (typeof connect === 'function') {
      try {
        await connect();
        console.log('DB connect() completed (if configured).');
      } catch (err) {
        console.warn('DB connect() failed (continuing). Error:', err.message);
      }
    } else {
      console.log('No DB connect() function available; skipping DB connection.');
    }

    app.listen(port, () => console.log(`Listening on ${port}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
