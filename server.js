// Improved server.js — automatic clean-path -> .html routing + static serving
// Replace your existing server.js with this (or merge changes). This will:
// - Serve static files from ./frontend and repo root
// - Automatically create routes like /reading -> reading.html when the .html file exists
// - Keep API routes and health check behaviour intact
// - Fall back to front-end index.html for client-side routing (if desired)

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

console.log('Starting improved server.js');
console.log('__dirname =', __dirname);

const rootPath = path.join(__dirname); // repo root
const frontendPath = path.join(__dirname, 'frontend');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS helper (only enable if needed)
try {
  const cors = require('cors');
  app.use(cors());
} catch (err) {
  console.log('cors module not installed — skipping CORS middleware (install cors if needed)');
}

// Serve static files from frontend first, then repo root.
// Using the "extensions" option lets requests like "/reading" resolve to "reading.html" automatically
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath, { extensions: ['html'] }));
  console.log('Serving static files from frontend:', frontendPath);
} else {
  console.warn(`frontend directory not found at ${frontendPath}`);
}

app.use(express.static(rootPath, { extensions: ['html'] }));
console.log('Serving static files from repo root:', rootPath);

// Health route
app.get('/health', (req, res) => res.send('ok'));

// Example API route(s) placeholder (keep your existing APIs intact)
// If you already have API routes defined, keep/merge them here
// app.use('/api', apiRouter);

// Utility: collect .html files in a directory (non-recursive for top-level, but includes frontend folder recursively)
function collectHtmlFiles(startDir, recursive = true) {
  const files = [];
  if (!fs.existsSync(startDir)) return files;

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        // ignore node_modules and .git
        if (ent.name === 'node_modules' || ent.name === '.git') continue;
        if (recursive) walk(full);
        continue;
      }
      if (ent.isFj
          ile() && ent.name.toLowerCase().endsWith('.html')) {
        files.push(full);
      }
    }
  }

  walk(startDir);
  return files;
}

// Build map of "clean" routes -> html file
const routeMap = new Map();

// Collect from frontend and root (frontend first so duplicates prefer frontend)
const frontFiles = collectHtmlFiles(frontendPath);
const rootFiles = collectHtmlFiles(rootPath);

// Helper to register a file into routeMap
function registerHtmlFile(filePath) {
  const base = path.basename(filePath); // e.g., reading.html or index.html
  const name = base.replace(/\.html$/i, '');
  const route = name === 'index' ? '/' : `/${name}`;

  // Prefer earlier registration (frontend has been iterated first)
  if (!routeMap.has(route)) {
    routeMap.set(route, filePath);
  }
}

// Register frontend files first, then root files
for (const f of frontFiles) registerHtmlFile(f);
for (const f of rootFiles) registerHtmlFile(f);

// Create explicit routes so clean paths always return the intended html file
for (const [route, filePath] of routeMap.entries()) {
  app.get(route, (req, res) => {
    // Security: ensure file exists before sending
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    return res.status(404).send('Page not found');
  });
  console.log(`Route registered: ${route} -> ${filePath}`);
}

// If you have specific API endpoints already defined in your original server.js,
// make sure to re-add them above. Below is a safe fallback route behavior:
app.get('*', (req, res) => {
  // Keep API routes distinct — return 404 for unknown API paths
  const isApi = req.path.startsWith('/api') || req.path.startsWith('/users') || req.path === '/health';
  if (isApi) {
    return res.status(404).send('Not Found');
  }

  // If a static file already matched via express.static, it would have been served earlier.
  // Here: fallback to frontend index.html (if present) to support client-side routing,
  // otherwise fall back to root index.html, otherwise 404.
  const frontendIndex = path.join(frontendPath, 'index.html');
  const rootIndex = path.join(rootPath, 'index.html');

  if (fs.existsSync(frontendIndex)) {
    return res.sendFile(frontendIndex);
  }
  if (fs.existsSync(rootIndex)) {
    return res.sendFile(rootIndex);
  }

  return res.status(404).send('index.html not found on server');
});

// Example: keep your DB connect logic if present in original file
// If you had a connect function previously, this preserves behavior
const port = process.env.PORT || 3000;

async function start() {
  try {
    // Attempt to call connect() if available (original file did this)
    if (typeof connect === 'function') {
      try {
        await connect();
        console.log('DB connect() completed (if configured).');
      } catch (err) {
        console.warn('DB connect() failed (continuing). Error:', err && err.message);
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
