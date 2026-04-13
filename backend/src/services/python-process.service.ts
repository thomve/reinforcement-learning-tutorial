import { ChildProcess, spawn } from 'child_process';
import * as readline from 'readline';
import * as path from 'path';
import * as os from 'os';

export type MessageHandler = (msg: Record<string, unknown>) => void;
export type ErrorHandler = (err: Error) => void;
export type CloseHandler = (code: number | null) => void;

const PYTHON_ROOT = path.resolve(__dirname, '../../../python');

function resolvePython(): string {
  // Allow override via environment variable
  if (process.env.PYTHON_EXECUTABLE) {
    return process.env.PYTHON_EXECUTABLE;
  }
  // Try common venv paths
  const venvPaths =
    os.platform() === 'win32'
      ? [
          path.join(PYTHON_ROOT, '../.venv/Scripts/python.exe'),
          path.join(PYTHON_ROOT, '../venv/Scripts/python.exe'),
          'python',
        ]
      : [
          path.join(PYTHON_ROOT, '../.venv/bin/python'),
          path.join(PYTHON_ROOT, '../venv/bin/python'),
          'python3',
          'python',
        ];

  // Return first candidate (spawn will fail with ENOENT if not found)
  return venvPaths[0];
}

export class PythonProcess {
  private proc: ChildProcess | null = null;
  private onMessage: MessageHandler;
  private onError: ErrorHandler;
  private onClose: CloseHandler;

  constructor(opts: {
    onMessage: MessageHandler;
    onError: ErrorHandler;
    onClose: CloseHandler;
  }) {
    this.onMessage = opts.onMessage;
    this.onError = opts.onError;
    this.onClose = opts.onClose;
  }

  start(config: Record<string, unknown>): void {
    const pythonExe = resolvePython();

    this.proc = spawn(pythonExe, ['main.py'], {
      cwd: PYTHON_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    // Write config as first stdin line
    const configJson = JSON.stringify(config) + '\n';
    this.proc.stdin!.write(configJson);

    // Parse stdout JSON-Lines
    const rl = readline.createInterface({ input: this.proc.stdout! });
    rl.on('line', (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const msg = JSON.parse(trimmed) as Record<string, unknown>;
        this.onMessage(msg);
      } catch {
        // Non-JSON output (e.g. debug prints) — log to stderr and ignore
        process.stderr.write(`[python stdout non-json] ${trimmed}\n`);
      }
    });

    // Forward stderr as error events
    const errRl = readline.createInterface({ input: this.proc.stderr! });
    errRl.on('line', (line) => {
      if (line.trim()) {
        process.stderr.write(`[python stderr] ${line}\n`);
      }
    });

    this.proc.on('error', (err) => {
      this.onError(err);
    });

    this.proc.on('close', (code) => {
      this.proc = null;
      this.onClose(code);
    });
  }

  sendControl(command: Record<string, unknown>): void {
    if (this.proc?.stdin?.writable) {
      this.proc.stdin.write(JSON.stringify(command) + '\n');
    }
  }

  stop(): void {
    if (!this.proc) return;
    this.sendControl({ type: 'stop' });

    // Grace period then force kill
    const killTimer = setTimeout(() => {
      if (this.proc) {
        this.proc.kill('SIGKILL');
      }
    }, 5000);

    this.proc.once('close', () => clearTimeout(killTimer));
  }

  isRunning(): boolean {
    return this.proc !== null && !this.proc.killed;
  }
}
