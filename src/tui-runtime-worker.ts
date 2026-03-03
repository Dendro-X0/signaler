import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { parentPort } from "node:worker_threads";

type OutputKind = "stdout" | "stderr";

interface RuntimeRunMessage {
  readonly type: "run";
  readonly runId: number;
  readonly command: string;
  readonly fixedArgs: readonly string[];
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: Record<string, string>;
}

interface RuntimeStopMessage {
  readonly type: "stop";
  readonly runId?: number;
}

interface RuntimeShutdownMessage {
  readonly type: "shutdown";
}

type RuntimeInputMessage = RuntimeRunMessage | RuntimeStopMessage | RuntimeShutdownMessage;

interface RuntimeStartedMessage {
  readonly type: "started";
  readonly runId: number;
  readonly pid: number;
}

interface RuntimeLineMessage {
  readonly type: "line";
  readonly runId: number;
  readonly stream: OutputKind;
  readonly line: string;
}

interface RuntimeExitMessage {
  readonly type: "exit";
  readonly runId: number;
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
}

interface RuntimeErrorMessage {
  readonly type: "error";
  readonly runId?: number;
  readonly message: string;
}

type RuntimeOutputMessage = RuntimeStartedMessage | RuntimeLineMessage | RuntimeExitMessage | RuntimeErrorMessage;

let activeChild: ChildProcessByStdio<null, Readable, Readable> | undefined;
let activeRunId: number | undefined;
let stdoutRemainder = "";
let stderrRemainder = "";

function emit(msg: RuntimeOutputMessage): void {
  parentPort?.postMessage(msg);
}

function resetBuffers(): void {
  stdoutRemainder = "";
  stderrRemainder = "";
}

function flushRemainder(stream: OutputKind): void {
  const remainder = stream === "stdout" ? stdoutRemainder : stderrRemainder;
  const line = remainder.trim();
  if (!line || typeof activeRunId !== "number") return;
  emit({ type: "line", runId: activeRunId, stream, line });
  if (stream === "stdout") stdoutRemainder = "";
  else stderrRemainder = "";
}

function processChunk(stream: OutputKind, raw: string): void {
  if (typeof activeRunId !== "number") return;
  const merged = (stream === "stdout" ? stdoutRemainder : stderrRemainder) + raw;
  const lines = merged.split(/\r?\n/g);
  const complete = lines.slice(0, -1);
  const remainder = lines[lines.length - 1] ?? "";
  for (const line of complete) {
    emit({ type: "line", runId: activeRunId, stream, line });
  }
  if (stream === "stdout") stdoutRemainder = remainder;
  else stderrRemainder = remainder;
}

function stopActive(runId?: number): void {
  if (!activeChild || typeof activeRunId !== "number") return;
  if (typeof runId === "number" && runId !== activeRunId) return;
  try {
    activeChild.kill("SIGTERM");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    emit({ type: "error", runId: activeRunId, message: `Failed to stop process: ${message}` });
  }
}

function startRun(message: RuntimeRunMessage): void {
  if (activeChild) {
    emit({ type: "error", runId: message.runId, message: "Runtime is busy." });
    return;
  }
  const commandArgs = [...message.fixedArgs, ...message.args];
  resetBuffers();
  try {
    const child = spawn(message.command, commandArgs, {
      cwd: message.cwd,
      env: message.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    activeChild = child;
    activeRunId = message.runId;
    emit({ type: "started", runId: message.runId, pid: child.pid ?? -1 });

    child.stdout.on("data", (chunk: Buffer) => {
      processChunk("stdout", chunk.toString("utf8"));
    });
    child.stderr.on("data", (chunk: Buffer) => {
      processChunk("stderr", chunk.toString("utf8"));
    });

    child.on("error", (err: Error) => {
      const runId = activeRunId;
      emit({ type: "error", runId, message: err.message });
    });

    child.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
      const runId = activeRunId;
      flushRemainder("stdout");
      flushRemainder("stderr");
      activeChild = undefined;
      activeRunId = undefined;
      resetBuffers();
      if (typeof runId === "number") emit({ type: "exit", runId, code, signal });
    });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : String(err);
    activeChild = undefined;
    activeRunId = undefined;
    resetBuffers();
    emit({ type: "error", runId: message.runId, message: messageText });
  }
}

parentPort?.on("message", (message: RuntimeInputMessage) => {
  if (message.type === "run") {
    startRun(message);
    return;
  }
  if (message.type === "stop") {
    stopActive(message.runId);
    return;
  }
  if (message.type === "shutdown") {
    stopActive();
    process.exit(0);
  }
});

process.on("exit", () => {
  if (activeChild) {
    try {
      activeChild.kill("SIGTERM");
    } catch {
      return;
    }
  }
});
