#!/usr/bin/env node

/**
 * Unified Development Server Runner for Voice Vocabulary Platform.
 * Launches both FastAPI backend (port 8000) and Next.js frontend (port 3000)
 * concurrently with automatic port cleanup and graceful shutdown.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');
const WEB_DIR = path.join(ROOT_DIR, 'apps', 'web');
const VENV_PYTHON = path.join(ROOT_DIR, '.venv', 'bin', 'python');

console.log('\x1b[36m%s\x1b[0m', '=======================================================');
console.log('\x1b[36m%s\x1b[0m', '   Starting Language-AI Full Stack Development Server  ');
console.log('\x1b[36m%s\x1b[0m', '=======================================================');

// 1. Clean up ports 8000 and 3000 if previously occupied
try {
  execSync('fuser -k 8000/tcp 2>/dev/null || true');
  execSync('fuser -k 3000/tcp 2>/dev/null || true');
} catch (e) {
  // Ignore
}

// 2. Validate Python virtual environment
let pythonExec = 'python3';
if (fs.existsSync(VENV_PYTHON)) {
  pythonExec = VENV_PYTHON;
  console.log(`\x1b[32m✔ Virtual Environment detected:\x1b[0m ${pythonExec}`);
} else {
  console.warn(`\x1b[33m⚠ .venv not found at ${VENV_PYTHON}, falling back to system python3\x1b[0m`);
}

// 3. Start Backend (FastAPI on Port 8000)
console.log('\x1b[34m[Backend]\x1b[0m Starting FastAPI on http://localhost:8000 ...');
const backend = spawn(
  pythonExec,
  ['-m', 'uvicorn', 'apps.api.app.main:app', '--host', '0.0.0.0', '--port', '8000', '--reload'],
  {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      PYTHONPATH: ROOT_DIR + (process.env.PYTHONPATH ? ':' + process.env.PYTHONPATH : ''),
    },
    stdio: 'inherit',
  }
);

backend.on('error', (err) => {
  console.error('\x1b[31m[Backend Error]\x1b[0m Failed to start backend:', err.message);
});

// 4. Start Frontend (Next.js on Port 3000)
console.log('\x1b[35m[Frontend]\x1b[0m Starting Next.js on http://localhost:3000 ...');
const frontend = spawn(
  'npx',
  ['next', 'dev', '-p', '3000'],
  {
    cwd: WEB_DIR,
    env: {
      ...process.env,
    },
    stdio: 'inherit',
  }
);

frontend.on('error', (err) => {
  console.error('\x1b[31m[Frontend Error]\x1b[0m Failed to start frontend:', err.message);
});

// 5. Handle Graceful Exit
function cleanup() {
  console.log('\n\x1b[33mShutting down all services gracefully...\x1b[0m');
  try {
    if (backend && !backend.killed) backend.kill('SIGTERM');
  } catch {}
  try {
    if (frontend && !frontend.killed) frontend.kill('SIGTERM');
  } catch {}
  try {
    execSync('fuser -k 8000/tcp 2>/dev/null || true');
    execSync('fuser -k 3000/tcp 2>/dev/null || true');
  } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Forward child exit to cleanup only if fatal
let isCleaningUp = false;
backend.on('exit', (code, signal) => {
  if (isCleaningUp) return;
  console.log(`[Backend] Process exited with code ${code}, signal ${signal}`);
  if (code !== 0 && code !== null) {
    cleanup();
  }
});
frontend.on('exit', (code, signal) => {
  if (isCleaningUp) return;
  console.log(`[Frontend] Process exited with code ${code}, signal ${signal}`);
  if (code !== 0 && code !== null) {
    cleanup();
  }
});

// Keep supervisor event loop alive indefinitely
setInterval(() => {}, 1000 * 60 * 60);
