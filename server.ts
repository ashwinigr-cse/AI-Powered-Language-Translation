import {ChildProcess, execFile, spawn} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import express from 'express';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 8001);
const LT_HOST = '127.0.0.1';
const LT_PORT = 5000;
const LT_VENV_DIR = '/opt/lt-venv';
const LT_BIN = `${LT_VENV_DIR}/bin/libretranslate`;

let backendProcess: ChildProcess | null = null;
let ltProcess: ChildProcess | null = null;
let bootPromise: Promise<boolean> | null = null;
let ltBootPromise: Promise<boolean> | null = null;
let ltInstallPromise: Promise<boolean> | null = null;

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

function checkHttpOk(host: string, port: number, urlPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: host,
        port,
        path: urlPath,
        timeout: 1000,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function checkBackendHealth(): Promise<boolean> {
  return checkHttpOk(BACKEND_HOST, BACKEND_PORT, '/api/health');
}

async function ensureBackendVenv(backendDir: string): Promise<string> {
  const venvDir = path.join(backendDir, '.venv');
  const venvPython = path.join(venvDir, 'bin', 'python');
  const venvUvicorn = path.join(venvDir, 'bin', 'uvicorn');

  if (fs.existsSync(venvPython) && fs.existsSync(venvUvicorn)) {
    return venvPython;
  }

  console.log('[LinguaAI] Bootstrapping Python virtual environment for FastAPI...');
  try {
    await execFileAsync('python3', ['-m', 'venv', '--without-pip', venvDir]);
    await execFileAsync('curl', ['-sS', 'https://bootstrap.pypa.io/get-pip.py', '-o', '/tmp/get-pip.py']);
    await execFileAsync(venvPython, ['/tmp/get-pip.py']);
    await execFileAsync(venvPython, [
      '-m',
      'pip',
      'install',
      '-r',
      path.join(backendDir, 'requirements.txt'),
    ]);
    return venvPython;
  } catch (err) {
    console.error('[LinguaAI] Failed to bootstrap Python venv:', err);
    return fs.existsSync(venvPython) ? venvPython : 'python3';
  }
}

function usesLocalLibreTranslate(backendDir: string): boolean {
  try {
    const envPath = path.join(backendDir, '.env');
    if (!fs.existsSync(envPath)) return false;
    const raw = fs.readFileSync(envPath, 'utf8');
    return /LIBRETRANSLATE_URL\s*=\s*http:\/\/(127\.0\.0\.1|localhost):5000\b/.test(raw);
  } catch {
    return false;
  }
}

function bootstrapLibreTranslateAsync(backendDir: string): Promise<boolean> {
  if (fs.existsSync(LT_BIN)) {
    return Promise.resolve(true);
  }
  if (!usesLocalLibreTranslate(backendDir)) {
    return Promise.resolve(false);
  }
  if (ltInstallPromise) {
    return ltInstallPromise;
  }

  ltInstallPromise = (async () => {
    try {
      console.log('[LinguaAI] Bootstrapping self-hosted LibreTranslate in background...');
      const script = [
        `curl -sS https://bootstrap.pypa.io/get-pip.py -o /tmp/lt-get-pip.py`,
        `python3 -m venv --without-pip ${LT_VENV_DIR}`,
        `${LT_VENV_DIR}/bin/python /tmp/lt-get-pip.py`,
        `rm -f /tmp/lt-get-pip.py`,
        `${LT_VENV_DIR}/bin/pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu`,
        `${LT_VENV_DIR}/bin/pip install --no-cache-dir libretranslate`,
        `${LT_VENV_DIR}/bin/python -c "import gc, os, argostranslate.package as p; p.update_package_index(); inst = {(x.from_code, x.to_code) for x in p.get_installed_packages()}; w = {'en','hi','es','fr','de'}; pkgs = [x for x in p.get_available_packages() if x.from_code in w and x.to_code in w and (x.from_code=='en' or x.to_code=='en') and (x.from_code, x.to_code) not in inst]; [ (lambda path: (p.install_from_path(path), os.path.exists(path) and os.remove(path), gc.collect()))(pkg.download()) for pkg in pkgs ]"`,
      ].join(' && ');
      await execFileAsync('bash', ['-lc', script], {timeout: 600000});
      console.log('[LinguaAI] Self-hosted LibreTranslate bootstrap complete.');
      return fs.existsSync(LT_BIN);
    } catch (err) {
      console.error('[LinguaAI] Failed to bootstrap self-hosted LibreTranslate:', err);
      return false;
    } finally {
      ltInstallPromise = null;
    }
  })();

  return ltInstallPromise;
}

function ensureLibreTranslateRunning(): Promise<boolean> {
  const backendDir = path.join(__dirname, 'backend');
  if (!fs.existsSync(LT_BIN)) {
    void bootstrapLibreTranslateAsync(backendDir).then((ok) => {
      if (ok) {
        void ensureLibreTranslateRunning();
      }
    });
    return Promise.resolve(false);
  }
  if (ltBootPromise) {
    return ltBootPromise;
  }

  ltBootPromise = (async () => {
    try {
      if (await checkHttpOk(LT_HOST, LT_PORT, '/languages')) {
        return true;
      }

      if (!ltProcess) {
        console.log(`[LinguaAI] Starting local LibreTranslate on ${LT_HOST}:${LT_PORT}...`);
        ltProcess = spawn(
          LT_BIN,
          [
            '--host',
            LT_HOST,
            '--port',
            String(LT_PORT),
            '--disable-web-ui',
            '--disable-files-translation',
            '--load-only',
            'en,hi,es,fr,de',
          ],
          {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {...process.env},
          },
        );
        ltProcess.stdout?.on('data', (chunk: Buffer) => {
          process.stdout.write(`[LibreTranslate] ${chunk.toString()}`);
        });
        ltProcess.stderr?.on('data', (chunk: Buffer) => {
          process.stderr.write(`[LibreTranslate] ${chunk.toString()}`);
        });
        ltProcess.on('exit', (code) => {
          console.log(`[LibreTranslate] Process exited with code ${code ?? 'unknown'}`);
          ltProcess = null;
        });
      }

      const deadline = Date.now() + 25000;
      while (Date.now() < deadline) {
        if (await checkHttpOk(LT_HOST, LT_PORT, '/languages')) {
          console.log(`[LinguaAI] Local LibreTranslate ready on http://${LT_HOST}:${LT_PORT}`);
          return true;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      return false;
    } finally {
      ltBootPromise = null;
    }
  })();

  return ltBootPromise;
}

function ensureFastApiRunning(): Promise<boolean> {
  if (bootPromise) {
    return bootPromise;
  }

  bootPromise = (async () => {
    try {
      void ensureLibreTranslateRunning();

      if (await checkBackendHealth()) {
        return true;
      }

      const backendDir = path.join(__dirname, 'backend');
      const pythonBin = await ensureBackendVenv(backendDir);

      if (!backendProcess) {
        console.log(
          `[LinguaAI] Starting FastAPI backend on ${BACKEND_HOST}:${BACKEND_PORT} using ${pythonBin}...`,
        );
        backendProcess = spawn(
          pythonBin,
          [
            '-m',
            'uvicorn',
            'app.main:app',
            '--host',
            BACKEND_HOST,
            '--port',
            String(BACKEND_PORT),
          ],
          {
            cwd: backendDir,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {...process.env},
          },
        );

        backendProcess.stdout?.on('data', (chunk: Buffer) => {
          process.stdout.write(`[FastAPI] ${chunk.toString()}`);
        });
        backendProcess.stderr?.on('data', (chunk: Buffer) => {
          process.stderr.write(`[FastAPI] ${chunk.toString()}`);
        });
        backendProcess.on('exit', (code) => {
          console.log(`[FastAPI] Process exited with code ${code ?? 'unknown'}`);
          backendProcess = null;
        });
      }

      const deadline = Date.now() + 12000;
      while (Date.now() < deadline) {
        if (await checkBackendHealth()) {
          console.log(`[LinguaAI] FastAPI backend ready on http://${BACKEND_HOST}:${BACKEND_PORT}`);
          return true;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      console.warn('[LinguaAI] FastAPI backend did not become healthy within 12s.');
      return false;
    } finally {
      bootPromise = null;
    }
  })();

  return bootPromise;
}

function sanitizeHeaders(
  headers: http.IncomingHttpHeaders,
  extra: Record<string, string> = {},
): Record<string, string | string[]> {
  const clean: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined && !HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      clean[key] = value;
    }
  }
  return {...clean, ...extra};
}

async function proxyApiRequest(req: express.Request, res: express.Response): Promise<void> {
  if (!(await checkBackendHealth())) {
    await ensureFastApiRunning();
  }
  if (fs.existsSync(LT_BIN) && !(await checkHttpOk(LT_HOST, LT_PORT, '/languages'))) {
    await ensureLibreTranslateRunning();
  }

  const targetReq = http.request(
    {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: req.originalUrl,
      method: req.method,
      headers: sanitizeHeaders(req.headers, {
        host: `${BACKEND_HOST}:${BACKEND_PORT}`,
      }),
      timeout: 35000,
    },
    (targetRes) => {
      res.status(targetRes.statusCode || 424);
      for (const [key, value] of Object.entries(targetRes.headers)) {
        if (value !== undefined && !HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      }
      targetRes.pipe(res);
    },
  );

  targetReq.on('timeout', () => {
    targetReq.destroy();
    if (!res.headersSent) {
      res.status(424).json({
        error_code: 'PROXY_TIMEOUT',
        message: 'Timed out waiting for the FastAPI backend response.',
      });
    }
  });

  targetReq.on('error', (err) => {
    if (!res.headersSent) {
      res.status(424).json({
        error_code: 'BACKEND_UNREACHABLE',
        message: `FastAPI backend is unreachable on http://${BACKEND_HOST}:${BACKEND_PORT} (${err.message}).`,
        hint: `Ensure Python FastAPI dependencies are installed in backend/ and running on port ${BACKEND_PORT}.`,
      });
    }
  });

  req.pipe(targetReq);
}

async function startServer(): Promise<void> {
  void ensureLibreTranslateRunning();
  void ensureFastApiRunning();

  const app = express();

  app.use('/api', (req, res) => {
    void proxyApiRequest(req, res);
  });

  if (process.env.NODE_ENV !== 'production') {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LinguaAI] Web server listening on http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    if (backendProcess) {
      backendProcess.kill('SIGTERM');
    }
    if (ltProcess) {
      ltProcess.kill('SIGTERM');
    }
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('[LinguaAI] Failed to start server:', err);
  process.exit(1);
});
