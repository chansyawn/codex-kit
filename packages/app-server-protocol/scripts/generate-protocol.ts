import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const packageRoot = resolve(import.meta.dirname, "..");
const generatedRoot = join(packageRoot, "src", "generated");
const schemasRoot = join(packageRoot, "schemas");
const isCheck = process.argv.includes("--check");
const codexBin = readCodexBin();

type GenerateTargets = {
  schemas: string;
  ts: string;
};

async function main(): Promise<void> {
  if (isCheck) {
    await checkGeneratedProtocol();
    return;
  }

  await generateProtocol({
    schemas: schemasRoot,
    ts: generatedRoot,
  });
}

async function checkGeneratedProtocol(): Promise<void> {
  const tempRoot = await mkdtemp(join(tmpdir(), "codexkit-app-server-protocol-"));
  const tempTargets = {
    schemas: join(tempRoot, "schemas"),
    ts: join(tempRoot, "src", "generated"),
  };

  try {
    await generateProtocol(tempTargets);
    await diffDirectories(generatedRoot, tempTargets.ts, "TypeScript bindings");
    await compareJsonDirectories(schemasRoot, tempTargets.schemas);
  } finally {
    await rm(tempRoot, { force: true, recursive: true });
  }
}

async function generateProtocol(targets: GenerateTargets): Promise<void> {
  await rm(targets.ts, { force: true, recursive: true });
  await rm(targets.schemas, { force: true, recursive: true });

  const version = await readCodexVersion();
  console.log(`Generating app-server protocol with ${codexBin} (${version})`);

  await run(codexBin, ["app-server", "generate-ts", "--experimental", "--out", targets.ts]);
  await run(codexBin, [
    "app-server",
    "generate-json-schema",
    "--experimental",
    "--out",
    targets.schemas,
  ]);
}

function readCodexBin(): string {
  const value = process.env.CODEX_BIN?.trim();

  if (!value) {
    throw new Error(
      "CODEX_BIN is required. Example: CODEX_BIN=/absolute/path/to/codex vp run @codexkit/app-server-protocol#generate",
    );
  }

  return value;
}

async function readCodexVersion(): Promise<string> {
  const { stdout } = await execFileAsync(codexBin, ["--version"], {
    cwd: packageRoot,
    maxBuffer: 1024 * 1024,
  });

  return stdout.trim();
}

async function diffDirectories(expected: string, actual: string, label: string): Promise<void> {
  try {
    await run("diff", ["-ru", expected, actual]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${label} are out of date. Run vp run @codexkit/app-server-protocol#generate.\n${message}`,
    );
  }
}

async function compareJsonDirectories(expected: string, actual: string): Promise<void> {
  const [expectedFiles, actualFiles] = await Promise.all([
    listRelativeFiles(expected),
    listRelativeFiles(actual),
  ]);
  const expectedSet = new Set(expectedFiles);
  const actualSet = new Set(actualFiles);

  for (const file of expectedFiles) {
    if (!actualSet.has(file)) {
      throw new Error(`JSON Schema are out of date. Missing generated file: ${file}`);
    }
  }

  for (const file of actualFiles) {
    if (!expectedSet.has(file)) {
      throw new Error(`JSON Schema are out of date. Unexpected generated file: ${file}`);
    }
  }

  for (const file of expectedFiles) {
    const [expectedJson, actualJson] = await Promise.all([
      readJsonFile(join(expected, file)),
      readJsonFile(join(actual, file)),
    ]);

    if (stableStringify(expectedJson) !== stableStringify(actualJson)) {
      throw new Error(
        `JSON Schema are out of date. Run vp run @codexkit/app-server-protocol#generate. Changed file: ${file}`,
      );
    }
  }
}

async function listRelativeFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  await collectRelativeFiles(root, "", files);

  return files.sort((left, right) => left.localeCompare(right));
}

async function collectRelativeFiles(
  root: string,
  relativeDir: string,
  files: string[],
): Promise<void> {
  const absoluteDir = join(root, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = relativeDir ? join(relativeDir, entry.name) : entry.name;

    if (entry.isDirectory()) {
      await collectRelativeFiles(root, relativePath, files);
      continue;
    }

    if (entry.isFile()) files.push(relativePath);
  }
}

async function readJsonFile(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (!isJsonObject(value)) return value;

  const sorted: Record<string, unknown> = {};

  for (const key of Object.keys(value).sort((left, right) => left.localeCompare(right))) {
    sorted[key] = sortJsonValue(value[key]);
  }

  return sorted;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function run(command: string, args: string[]): Promise<void> {
  try {
    await execFileAsync(command, args, {
      cwd: packageRoot,
      maxBuffer: 1024 * 1024 * 64,
    });
  } catch (error) {
    if (isExecError(error)) {
      const output = [error.stdout, error.stderr].filter(Boolean).join("\n");
      throw new Error(`${command} ${args.join(" ")} failed.\n${output}`);
    }

    throw error;
  }
}

function isExecError(error: unknown): error is Error & {
  stderr?: string;
  stdout?: string;
} {
  return error instanceof Error;
}

await main();
