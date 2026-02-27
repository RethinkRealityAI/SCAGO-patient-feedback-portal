#!/usr/bin/env node
/**
 * Dev script: stop process on port 9002, clear .next cache, then start Next.js dev server.
 * Uses port-based kill to avoid terminating this script.
 */
const http = require('http');
const { execSync, spawn } = require('child_process');
const { rmSync, existsSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
const PORT = 9002;
const selfPid = process.pid.toString();

function killProcessOnPort() {
  try {
    if (process.platform === 'win32') {
      const out = execSync('netstat -ano', { encoding: 'utf8', windowsHide: true });
      const pids = new Set();
      for (const line of out.split('\n')) {
        if (line.includes(`:${PORT}`) && line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && /^\d+$/.test(pid) && pid !== selfPid) pids.add(pid);
        }
      }
      for (const pid of pids) {
        execSync(`taskkill /F /PID ${pid} 2>nul`, { stdio: 'ignore', windowsHide: true });
      }
      if (pids.size > 0) console.log('Stopped process on port', PORT);
    } else {
      execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
      console.log('Stopped process on port', PORT);
    }
  } catch (_) {
    // Ignore
  }
}

killProcessOnPort();

// Clear .next cache (best-effort; should never block startup)
function clearNextCache() {
  const nextDir = join(root, '.next');
  if (!existsSync(nextDir)) return;

  try {
    rmSync(nextDir, {
      recursive: true,
      force: true,
      maxRetries: 8,
      retryDelay: 250,
    });
    console.log('Cleared .next cache');
    return;
  } catch (err) {
    const cacheDir = join(nextDir, 'cache');
    try {
      if (existsSync(cacheDir)) {
        rmSync(cacheDir, {
          recursive: true,
          force: true,
          maxRetries: 8,
          retryDelay: 250,
        });
        console.log('Cleared .next/cache');
        return;
      }
    } catch (_) {
      // Fall through to warning below.
    }

    const message = err && err.message ? err.message : String(err);
    console.warn(`Cache clear warning: ${message}. Continuing startup.`);
  }
}
clearNextCache();

function warmUpInitialBuild(attempt = 1) {
  const maxAttempts = 20;
  const warmupUrl = `http://localhost:${PORT}/`;

  const req = http.get(warmupUrl, (res) => {
    const status = res.statusCode || 0;
    res.resume();

    if (status >= 500 && attempt < maxAttempts) {
      setTimeout(() => warmUpInitialBuild(attempt + 1), 1500);
      return;
    }

    console.log(`Warm-up request completed (${status || 'no-status'})`);
  });

  req.setTimeout(120000, () => {
    req.destroy(new Error('warmup-timeout'));
  });

  req.on('error', (err) => {
    if (attempt >= maxAttempts) {
      console.log(`Warm-up skipped after ${attempt} attempts (${err.message})`);
      return;
    }
    setTimeout(() => warmUpInitialBuild(attempt + 1), 1500);
  });
}

// Start Next.js dev server
const child = spawn('npx', ['next', 'dev', '-p', '9002'], {
  stdio: 'inherit',
  shell: true,
  cwd: root,
});
setTimeout(() => warmUpInitialBuild(), 1000);
child.on('exit', (code) => process.exit(code ?? 0));
