import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { VERSION } from '../index.js';
import { classifyDoctorState, isRecoveredDocumentName } from '../commands/doctor.js';
import { createInspectCommand } from '../commands/inspect.js';
import { collectRecoveryEvidence, planRecovery } from '../commands/recover.js';
import { IllustratorError } from '../contracts/errors.js';
import {
  failureResult,
  serializeResult,
  successResult,
  type CommandResult,
} from '../contracts/result.js';
import { createBackup } from '../safety/backup.js';
import { fingerprintFile } from '../safety/backup.js';
import { assertSaveAllowed, createTransactionManifest, type DocumentRole } from '../safety/manifest.js';
import { buildDoctorAppleScript } from '../platform/macos.js';
import { buildComparisonInvocations } from '../render/compare.js';
import { documentBoundsToPixels } from '../render/crop.js';
import { buildCropInvocation, chooseRenderer, renderAi, type ProcessInvocation } from '../render/render.js';
import { writeAppleScript } from '../runner/apple-script.js';
import {
  acquireDocumentLock,
  markDocumentLockAmbiguous,
  releaseDocumentLock,
} from '../runner/document-lock.js';
import { SerializedIllustratorExecutor } from '../runner/executor.js';
import { buildJsx } from '../runner/jsx-builder.js';
import {
  cleanupTransaction,
  createTransactionFiles,
  readJsonResult,
  writeJsx,
  writeParams,
  writeTransactionMarker,
  type TransactionFiles,
} from '../runner/temp-files.js';
import { COMMANDS, parseArguments, type CommandName, type ParsedArguments } from './arguments.js';

export type CommandHandler = (arguments_: ParsedArguments) => Promise<CommandResult>;
export type CommandHandlers = Record<CommandName, CommandHandler>;

export interface CliOutput {
  exitCode: number;
  stdout: string;
}

export interface RuntimeDependencies {
  runProcess: (invocation: ProcessInvocation) => Promise<{ stdout: string }>;
  executableAvailable: (name: string) => Promise<boolean>;
}

function systemProcess(invocation: ProcessInvocation): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    execFile(invocation.executable, invocation.args, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${error.message}${stderr ? `: ${stderr.trim()}` : ''}`));
        return;
      }
      resolve({ stdout });
    });
  });
}

const defaultRuntime: RuntimeDependencies = {
  runProcess: systemProcess,
  executableAvailable: async (name) => {
    try {
      await systemProcess({ executable: 'which', args: [name] });
      return true;
    } catch {
      return false;
    }
  },
};

const illustratorExecutor = new SerializedIllustratorExecutor();

const HELP = `illustrator-ai ${VERSION}

Usage:
  illustrator-ai doctor
  illustrator-ai inspect /absolute/path/document.ai [--detail full]
  illustrator-ai backup /absolute/path/document.ai
  illustrator-ai run /absolute/path/document.ai --script /absolute/path/edit.jsx
  illustrator-ai save /absolute/path/document.ai
  illustrator-ai render /absolute/path/document.ai [--output preview.png]
  illustrator-ai crop /absolute/path/document.ai [options]
  illustrator-ai compare /absolute/path/before.png /absolute/path/after.png
  illustrator-ai verify /absolute/path/document.ai
  illustrator-ai recover

All command results are emitted as one JSON object on stdout.
`;

function stringOption(arguments_: ParsedArguments, name: string): string | undefined {
  const value = arguments_.options[name];
  return typeof value === 'string' ? value : undefined;
}

function numberOption(arguments_: ParsedArguments, name: string, fallback: number): number {
  const raw = stringOption(arguments_, name);
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`--${name} must be greater than zero.`);
  return value;
}

function documentIdentity(path: string): { path: string; name: string } {
  return { path, name: basename(path) };
}

function shouldKeepMutationLock(error: unknown): boolean {
  return error instanceof IllustratorError && error.code === 'MUTATION_TIMEOUT_AMBIGUOUS';
}

async function runIllustratorTransaction(input: {
  targetPath: string;
  command: string;
  mutation: boolean;
  timeoutMs: number;
  build: (files: TransactionFiles) => Promise<{ params: unknown; jsx: string }>;
  runtime: RuntimeDependencies;
}): Promise<{ runId: string; value: unknown; transactionPath: string }> {
  const files = await createTransactionFiles();
  // Only a failed mutation is ambiguous evidence worth keeping. Preserving every
  // failure filled the temp directory with read-only debris that recovery then
  // reported as unresolved mutations forever.
  let preserve = false;
  try {
    await writeTransactionMarker(files, {
      documentPath: input.targetPath, command: input.command, mutation: input.mutation,
    });
    const command = await input.build(files);
    await writeParams(files, command.params);
    await writeJsx(files, command.jsx);
    await writeAppleScript(files, {
      timeoutSeconds: Math.max(1, Math.ceil(input.timeoutMs / 1000)),
      activate: false,
    });
    const value = await illustratorExecutor.execute({
      mutation: input.mutation,
      timeoutMs: input.timeoutMs,
      operation: async () => {
        await input.runtime.runProcess({ executable: 'osascript', args: [files.runnerPath] });
        const result = await readJsonResult(files);
        if (typeof result === 'object' && result !== null && 'error' in result) {
          throw new Error(String((result as { message?: unknown }).message ?? 'ExtendScript failed.'));
        }
        return result;
      },
    });
    return { runId: files.id, value, transactionPath: files.directory };
  } catch (error) {
    preserve = input.mutation;
    throw error;
  } finally {
    await cleanupTransaction(files, { preserve });
  }
}

function parseDoctorOutput(stdout: string): Array<{ name: string; path: string }> {
  return stdout.trim().split(/\r?\n/).slice(1).filter(Boolean).map((line) => {
    const separator = line.indexOf('\t');
    return separator < 0
      ? { name: line, path: '' }
      : { name: line.slice(0, separator), path: line.slice(separator + 1) };
  });
}

export function createDefaultHandlers(runtime: RuntimeDependencies = defaultRuntime): CommandHandlers {
  const inspect: CommandHandler = async (arguments_) => {
    const targetPath = arguments_.positionals[0]!;
    const detail = stringOption(arguments_, 'detail') === 'full' ? 'full' : 'compact';
    // Opening a large production file (25MB+) inside the JSX takes well over a
    // minute on its own; 60s produced false ILLUSTRATOR_UNRESPONSIVE reports.
    const timeoutMs = numberOption(arguments_, 'timeout', 180) * 1000;
    const executed = await runIllustratorTransaction({
      targetPath,
      command: 'inspect',
      mutation: false,
      timeoutMs,
      runtime,
      build: async (files) => createInspectCommand({
        targetPath,
        targetName: basename(targetPath),
        detail,
        maxStyleCharacters: numberOption(arguments_, 'maxStyleCharacters', 1000),
        paramsPath: files.paramsPath,
        resultPath: files.resultPath,
      }),
    });
    return successResult({
      command: arguments_.command,
      runId: executed.runId,
      document: documentIdentity(targetPath),
      data: executed.value,
    });
  };

  const handlers = {} as CommandHandlers;

  handlers.doctor = async (arguments_) => {
    const timeoutSeconds = numberOption(arguments_, 'timeout', 10);
    let processRunning = false;
    try {
      await runtime.runProcess({ executable: 'pgrep', args: ['-f', 'Adobe Illustrator'] });
      processRunning = true;
    } catch {
      // pgrep uses a non-zero status when no matching process exists.
    }
    let responsive = false;
    let documents: Array<{ name: string; path: string }> = [];
    if (processRunning) {
      try {
        const probe = await runtime.runProcess({
          executable: 'osascript',
          args: ['-e', buildDoctorAppleScript(timeoutSeconds)],
        });
        responsive = true;
        documents = parseDoctorOutput(probe.stdout);
      } catch {
        responsive = false;
      }
    }
    const targetPath = arguments_.positionals[0];
    const state = classifyDoctorState({
      processRunning,
      responsive,
      documents,
      ...(targetPath ? { targetPath } : {}),
    });
    return successResult({ command: 'doctor', runId: randomUUID(), data: { state, documents } });
  };

  handlers.inspect = inspect;

  handlers.backup = async ({ positionals }) => {
    const evidence = await createBackup(positionals[0]!);
    return successResult({
      command: 'backup',
      runId: randomUUID(),
      document: { path: positionals[0]!, name: positionals[0]!.split('/').pop()! },
      data: evidence,
      artifacts: [{ kind: 'backup', path: evidence.path, sha256: evidence.backupSha256 }],
    });
  };

  handlers.run = async (arguments_) => {
    const targetPath = arguments_.positionals[0]!;
    const scriptPath = stringOption(arguments_, 'script')!;
    const timeoutMs = numberOption(arguments_, 'timeout', 180) * 1000;
    const runId = randomUUID();
    const lock = await acquireDocumentLock({
      rootDir: join(tmpdir(), 'illustrator-ai-locks'), documentPath: targetPath, runId, command: 'run',
    });
    let releaseLock = true;
    try {
      const backup = await createBackup(targetPath);
      const commandSource = `${await readFile(scriptPath, 'utf8')}\nwriteResultFile(RESULT_PATH, { ok: true, applied: true });`;
      const executed = await runIllustratorTransaction({
        targetPath,
        command: 'run',
        mutation: true,
        timeoutMs,
        runtime,
        build: async (files) => ({
          params: { targetPath },
          jsx: await buildJsx({
            commandSource,
            paramsPath: files.paramsPath,
            resultPath: files.resultPath,
            targetPath,
            targetName: basename(targetPath),
          }),
        }),
      });
      return successResult({
        command: 'run', runId: executed.runId, document: documentIdentity(targetPath),
        data: executed.value,
        artifacts: [{ kind: 'backup', path: backup.path, sha256: backup.backupSha256 }],
      });
    } catch (error) {
      releaseLock = !shouldKeepMutationLock(error);
      if (!releaseLock) await markDocumentLockAmbiguous(lock);
      throw error;
    } finally {
      if (releaseLock) await releaseDocumentLock(lock, runId);
    }
  };

  handlers.save = async (arguments_) => {
    const targetPath = arguments_.positionals[0]!;
    const timeoutMs = numberOption(arguments_, 'timeout', 180) * 1000;
    const runId = randomUUID();
    const targetRole = (stringOption(arguments_, 'role') ?? 'working') as DocumentRole;
    const lock = await acquireDocumentLock({
      rootDir: join(tmpdir(), 'illustrator-ai-locks'), documentPath: targetPath, runId, command: 'save',
    });
    let releaseLock = true;
    try {
      const fingerprint = await fingerprintFile(targetPath);
      const manifest = createTransactionManifest({
        runId, targetPath, targetRole, targetFingerprint: fingerprint,
        reviewRound: Number(stringOption(arguments_, 'reviewRound') ?? '1'),
      });
      if (targetRole === 'reference') assertSaveAllowed(manifest, targetPath);
      const backup = targetRole === 'working' ? await createBackup(targetPath) : undefined;
      if (backup) manifest.backup = backup;
      assertSaveAllowed(manifest, targetPath);
      const commandSource = await readFile(new URL('../jsx/commands/save.jsx', import.meta.url), 'utf8');
      const executed = await runIllustratorTransaction({
        targetPath, command: 'save', mutation: true, timeoutMs, runtime,
        build: async (files) => ({
          params: { destinationPath: targetPath },
          jsx: await buildJsx({ commandSource, paramsPath: files.paramsPath, resultPath: files.resultPath,
            targetPath, targetName: basename(targetPath) }),
        }),
      });
      return successResult({
        command: 'save', runId: executed.runId, document: documentIdentity(targetPath),
        data: executed.value,
        artifacts: backup ? [{ kind: 'backup', path: backup.path, sha256: backup.backupSha256 }] : [],
      });
    } catch (error) {
      releaseLock = !shouldKeepMutationLock(error);
      if (!releaseLock) await markDocumentLockAmbiguous(lock);
      throw error;
    } finally {
      if (releaseLock) await releaseDocumentLock(lock, runId);
    }
  };

  handlers.render = async (arguments_) => {
    const inputPath = arguments_.positionals[0]!;
    const outputPath = stringOption(arguments_, 'output')
      ?? join(dirname(inputPath), `${basename(inputPath, extname(inputPath))}-preview.png`);
    const available = new Set<string>();
    for (const executable of ['pdftoppm', 'sips']) {
      if (await runtime.executableAvailable(executable)) available.add(executable);
    }
    const rendered = await renderAi({ inputPath, outputPath, dpi: numberOption(arguments_, 'dpi', 144),
      renderer: chooseRenderer(available), run: async (invocation) => { await runtime.runProcess(invocation); } });
    return successResult({ command: 'render', runId: randomUUID(), document: documentIdentity(inputPath),
      data: rendered, artifacts: [{ kind: 'render', path: rendered.path }] });
  };

  handlers.crop = async (arguments_) => {
    const inputPath = arguments_.positionals[0]!;
    const outputPath = stringOption(arguments_, 'output');
    const rawBounds = stringOption(arguments_, 'bounds');
    if (!outputPath || !rawBounds) throw new Error('crop requires --output and --bounds left,top,right,bottom.');
    const bounds = rawBounds.split(',').map(Number);
    const rectangle = documentBoundsToPixels({
      artboardTop: Number(stringOption(arguments_, 'artboardTop') ?? '0'),
      artboardLeft: Number(stringOption(arguments_, 'artboardLeft') ?? '0'),
      dpi: numberOption(arguments_, 'dpi', 144), bounds,
      paddingPt: Number(stringOption(arguments_, 'padding') ?? '0'),
      imageWidth: numberOption(arguments_, 'imageWidth', 10000),
      imageHeight: numberOption(arguments_, 'imageHeight', 10000),
    });
    await runtime.runProcess(buildCropInvocation({ executable: 'ffmpeg', inputPath, outputPath,
      rectangle, upscale: numberOption(arguments_, 'upscale', 1) }));
    return successResult({ command: 'crop', runId: randomUUID(), data: { path: outputPath, rectangle },
      artifacts: [{ kind: 'crop', path: outputPath }] });
  };

  handlers.compare = async (arguments_) => {
    const beforePath = arguments_.positionals[0]!;
    const afterPath = arguments_.positionals[1];
    if (!afterPath) throw new Error('compare requires absolute before and after image paths.');
    const outputDirectory = stringOption(arguments_, 'outputDir') ?? dirname(afterPath);
    const overlayPath = join(outputDirectory, 'overlay.png');
    const differencePath = join(outputDirectory, 'difference.png');
    for (const invocation of buildComparisonInvocations({ beforePath, afterPath, overlayPath, differencePath })) {
      await runtime.runProcess(invocation);
    }
    return successResult({ command: 'compare', runId: randomUUID(), data: { overlayPath, differencePath },
      artifacts: [{ kind: 'overlay', path: overlayPath }, { kind: 'difference', path: differencePath }] });
  };

  handlers.verify = async (arguments_) => inspect({
    ...arguments_, command: 'verify', options: { ...arguments_.options, detail: 'full' },
  });

  handlers.recover = async (arguments_) => {
    const doctor = await handlers.doctor({ command: 'doctor', positionals: [], options: {} });
    const doctorData = doctor.ok && typeof doctor.data === 'object' && doctor.data !== null
      ? doctor.data as { state?: unknown; documents?: unknown }
      : {};
    const state = doctorData.state === undefined ? 'MODAL_OR_UNRESPONSIVE' : String(doctorData.state);
    const documents = Array.isArray(doctorData.documents)
      ? doctorData.documents.filter((document): document is { name: string; path: string } => (
          typeof document === 'object'
          && document !== null
          && typeof (document as { name?: unknown }).name === 'string'
          && typeof (document as { path?: unknown }).path === 'string'
        ))
      : [];
    const recoveredDocuments = documents
      .filter((document) => isRecoveredDocumentName(document.name))
      .map((document) => document.path || document.name);
    const scope = arguments_.positionals[0];
    const evidence = await collectRecoveryEvidence(scope ? { documentPath: scope } : {});
    const plan = planRecovery({
      doctorState: state as Parameters<typeof planRecovery>[0]['doctorState'],
      ambiguousTransactions: evidence.ambiguousTransactions,
      ambiguousLocks: evidence.ambiguousLocks,
      recoveredDocuments,
    });
    return successResult({
      command: 'recover',
      runId: randomUUID(),
      data: { state, recoveredDocuments, ...evidence, plan },
    });
  };
  return handlers;
}

function argumentError(command: string, error: unknown): CommandResult {
  const message = error instanceof Error ? error.message : String(error);
  return failureResult({
    command,
    runId: randomUUID(),
    error: new IllustratorError({
      code: 'INVALID_ARGUMENT',
      message,
      recoverable: true,
      nextAction: 'Run illustrator-ai help and correct the command arguments.',
      safeToRetry: true,
    }),
  });
}

function executionError(command: CommandName, error: unknown): CommandResult {
  const normalized = error instanceof IllustratorError
    ? error
    : new IllustratorError({
        code: 'EXECUTION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        recoverable: true,
        nextAction: 'Run illustrator-ai doctor and inspect preserved transaction evidence.',
      });
  return failureResult({ command, runId: randomUUID(), error: normalized });
}

export async function runCli(
  argv: string[],
  handlers: CommandHandlers = createDefaultHandlers(),
): Promise<CliOutput> {
  if (argv.length === 0 || argv[0] === 'help' || argv[0] === '--help' || argv[0] === '-h') {
    return { exitCode: 0, stdout: HELP };
  }
  if (argv[0] === 'version' || argv[0] === '--version' || argv[0] === '-v') {
    return { exitCode: 0, stdout: `${VERSION}\n` };
  }

  let parsed: ParsedArguments;
  try {
    parsed = parseArguments(argv);
  } catch (error) {
    return { exitCode: 2, stdout: `${serializeResult(argumentError(argv[0] ?? 'unknown', error))}\n` };
  }

  try {
    const result = await handlers[parsed.command](parsed);
    return { exitCode: result.ok ? 0 : 1, stdout: `${serializeResult(result)}\n` };
  } catch (error) {
    const result = executionError(parsed.command, error);
    return { exitCode: 1, stdout: `${serializeResult(result)}\n` };
  }
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const result = await runCli(argv);
  process.stdout.write(result.stdout);
  process.exitCode = result.exitCode;
}
