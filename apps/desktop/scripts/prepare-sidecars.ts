import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, chmod, copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const NODE_VERSION = "24.18.0";
const desktopRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workspaceRoot = resolve(desktopRoot, "../..");
const tauriRoot = join(desktopRoot, "src-tauri");
const binariesRoot = join(tauriRoot, "binaries");
const resourcesRoot = join(tauriRoot, "resources", "codexkit");
const cacheRoot = join(desktopRoot, ".cache", "sidecars");

type NodeAsset = {
  archivePath: string;
  executablePath: string;
  filename: string;
  sidecarExtension: string;
};

const assetByTarget = new Map<string, NodeAsset>([
  [
    "aarch64-apple-darwin",
    {
      archivePath: "node-v24.18.0-darwin-arm64/bin/node",
      executablePath: "node-v24.18.0-darwin-arm64/bin/node",
      filename: "node-v24.18.0-darwin-arm64.tar.gz",
      sidecarExtension: "",
    },
  ],
  [
    "x86_64-apple-darwin",
    {
      archivePath: "node-v24.18.0-darwin-x64/bin/node",
      executablePath: "node-v24.18.0-darwin-x64/bin/node",
      filename: "node-v24.18.0-darwin-x64.tar.gz",
      sidecarExtension: "",
    },
  ],
  [
    "x86_64-pc-windows-msvc",
    {
      archivePath: "node-v24.18.0-win-x64/node.exe",
      executablePath: "node-v24.18.0-win-x64/node.exe",
      filename: "node-v24.18.0-win-x64.zip",
      sidecarExtension: ".exe",
    },
  ],
  [
    "aarch64-pc-windows-msvc",
    {
      archivePath: "node-v24.18.0-win-arm64/node.exe",
      executablePath: "node-v24.18.0-win-arm64/node.exe",
      filename: "node-v24.18.0-win-arm64.zip",
      sidecarExtension: ".exe",
    },
  ],
  [
    "x86_64-unknown-linux-gnu",
    {
      archivePath: "node-v24.18.0-linux-x64/bin/node",
      executablePath: "node-v24.18.0-linux-x64/bin/node",
      filename: "node-v24.18.0-linux-x64.tar.xz",
      sidecarExtension: "",
    },
  ],
  [
    "aarch64-unknown-linux-gnu",
    {
      archivePath: "node-v24.18.0-linux-arm64/bin/node",
      executablePath: "node-v24.18.0-linux-arm64/bin/node",
      filename: "node-v24.18.0-linux-arm64.tar.xz",
      sidecarExtension: "",
    },
  ],
]);

await main();

async function main(): Promise<void> {
  const runtimeRoot = join(workspaceRoot, "apps/runtime");

  run("vp", ["build", "--mode", "client"], runtimeRoot);
  run("vp", ["build", "--mode", "server"], runtimeRoot);
  run("vp", ["pack"], desktopRoot);
  await copyRuntimeResources();
  await prepareNodeSidecar();
}

async function copyRuntimeResources(): Promise<void> {
  await rm(resourcesRoot, { force: true, recursive: true });
  await mkdir(resourcesRoot, { recursive: true });
  await cp(join(workspaceRoot, "apps/runtime/dist/server"), join(resourcesRoot, "server"), {
    recursive: true,
  });
  await cp(join(workspaceRoot, "apps/runtime/dist/client"), join(resourcesRoot, "client"), {
    recursive: true,
  });
  await cp(join(desktopRoot, "dist-node"), join(resourcesRoot, "runner"), { recursive: true });
}

async function prepareNodeSidecar(): Promise<void> {
  const targetTriple = getTargetTriple();
  const asset = assetByTarget.get(targetTriple);

  if (!asset) {
    throw new Error(`No bundled Node.js sidecar asset is configured for ${targetTriple}.`);
  }

  const sidecarPath = join(binariesRoot, `node-${targetTriple}${asset.sidecarExtension}`);

  if (await exists(sidecarPath)) {
    return;
  }

  await mkdir(binariesRoot, { recursive: true });
  await mkdir(cacheRoot, { recursive: true });

  const archivePath = join(cacheRoot, asset.filename);
  await downloadAndVerify(asset.filename, archivePath);

  const extractRoot = join(cacheRoot, basename(asset.filename).replace(/\.tar\..+|\.zip$/u, ""));
  await rm(extractRoot, { force: true, recursive: true });
  await mkdir(extractRoot, { recursive: true });
  await extractArchive(archivePath, extractRoot, asset);
  await copyFile(join(extractRoot, asset.executablePath), sidecarPath);

  if (process.platform !== "win32") {
    await chmod(sidecarPath, 0o755);
  }
}

async function downloadAndVerify(filename: string, destination: string): Promise<void> {
  if (!(await exists(destination))) {
    await downloadFile(nodeDownloadUrl(filename), destination);
  }

  const checksumText = await downloadText(nodeDownloadUrl("SHASUMS256.txt"));
  const expected = parseChecksum(checksumText, filename);
  const actual = createHash("sha256")
    .update(await readFile(destination))
    .digest("hex");

  if (actual !== expected) {
    await rm(destination, { force: true });
    throw new Error(`Checksum mismatch for ${filename}.`);
  }
}

async function downloadFile(url: string, destination: string): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  await writeFile(destination, new Uint8Array(await response.arrayBuffer()));
}

async function downloadText(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function parseChecksum(checksumText: string, filename: string): string {
  for (const line of checksumText.split("\n")) {
    const [checksum, lineFilename] = line.trim().split(/\s+/u);

    if (lineFilename === filename && checksum) {
      return checksum;
    }
  }

  throw new Error(`Unable to find checksum for ${filename}.`);
}

async function extractArchive(
  archivePath: string,
  extractRoot: string,
  asset: NodeAsset,
): Promise<void> {
  if (asset.filename.endsWith(".zip")) {
    if (process.platform === "win32") {
      run("powershell", [
        "-NoProfile",
        "-Command",
        `Expand-Archive -Force ${JSON.stringify(archivePath)} ${JSON.stringify(extractRoot)}`,
      ]);
      return;
    }

    run("unzip", ["-q", archivePath, asset.archivePath, "-d", extractRoot]);
    return;
  }

  run("tar", ["-xf", archivePath, "-C", extractRoot, asset.archivePath]);
}

function getTargetTriple(): string {
  return execFileSync("rustc", ["--print", "host-tuple"], {
    encoding: "utf8",
  }).trim();
}

function nodeDownloadUrl(filename: string): string {
  return `https://nodejs.org/dist/v${NODE_VERSION}/${filename}`;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function run(command: string, args: string[], cwd = desktopRoot): void {
  const executable = process.platform === "win32" && command === "vp" ? "vp.cmd" : command;
  const result = spawnSync(executable, args, {
    cwd,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}.`);
  }
}
