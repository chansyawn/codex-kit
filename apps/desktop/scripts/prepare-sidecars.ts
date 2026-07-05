import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, cp, mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workspaceRoot = resolve(desktopRoot, "../..");
const tauriRoot = join(desktopRoot, "src-tauri");
const binariesRoot = join(tauriRoot, "binaries");
const stagingRoot = join(desktopRoot, "dist-pkg");
const staleResourcesRoot = join(tauriRoot, "resources", "codexkit");
const staleNodeSidecarPrefix = join(binariesRoot, "node-");

type PkgTarget = {
  executableExtension: string;
  pkgTarget: string;
};

const pkgTargetByRustTarget = new Map<string, PkgTarget>([
  ["aarch64-apple-darwin", { executableExtension: "", pkgTarget: "node24-macos-arm64" }],
  ["x86_64-apple-darwin", { executableExtension: "", pkgTarget: "node24-macos-x64" }],
  ["x86_64-pc-windows-msvc", { executableExtension: ".exe", pkgTarget: "node24-win-x64" }],
  ["aarch64-pc-windows-msvc", { executableExtension: ".exe", pkgTarget: "node24-win-arm64" }],
  ["x86_64-unknown-linux-gnu", { executableExtension: "", pkgTarget: "node24-linux-x64" }],
  ["aarch64-unknown-linux-gnu", { executableExtension: "", pkgTarget: "node24-linux-arm64" }],
]);

await main();

async function main(): Promise<void> {
  const runtimeRoot = join(workspaceRoot, "apps/runtime");

  run("vp", ["build", "--mode", "client"], runtimeRoot);
  run("vp", ["build", "--mode", "server"], runtimeRoot);
  run("vp", ["pack"], desktopRoot);

  await stagePackageInput();
  await preparePkgSidecar();
  await removeStaleRuntimeResources();
}

async function stagePackageInput(): Promise<void> {
  await rm(stagingRoot, { force: true, recursive: true });
  await mkdir(stagingRoot, { recursive: true });
  await cp(join(workspaceRoot, "apps/runtime/dist/server"), join(stagingRoot, "server"), {
    recursive: true,
  });
  await cp(join(workspaceRoot, "apps/runtime/dist/client"), join(stagingRoot, "client"), {
    recursive: true,
  });
  await cp(join(desktopRoot, "dist-node"), join(stagingRoot, "runner"), { recursive: true });
}

async function preparePkgSidecar(): Promise<void> {
  const targetTriple = getTargetTriple();
  const target = pkgTargetByRustTarget.get(targetTriple);

  if (!target) {
    throw new Error(`No @yao-pkg/pkg target is configured for ${targetTriple}.`);
  }

  await mkdir(binariesRoot, { recursive: true });

  const sidecarPath = join(
    binariesRoot,
    `codexkit-runtime-${targetTriple}${target.executableExtension}`,
  );
  await rm(sidecarPath, { force: true });

  run("vp", [
    "exec",
    "pkg",
    findRunnerEntrypoint(),
    "--config",
    "pkg.config.cjs",
    "--targets",
    target.pkgTarget,
    "--output",
    sidecarPath,
  ]);

  if (process.platform !== "win32") {
    await chmod(sidecarPath, 0o755);
  }
}

async function removeStaleRuntimeResources(): Promise<void> {
  await rm(staleResourcesRoot, { force: true, recursive: true });

  for (const targetTriple of pkgTargetByRustTarget.keys()) {
    await rm(`${staleNodeSidecarPrefix}${targetTriple}`, { force: true });
    await rm(`${staleNodeSidecarPrefix}${targetTriple}.exe`, { force: true });
  }
}

function findRunnerEntrypoint(): string {
  const candidates = [
    join(stagingRoot, "runner", "runtime-sidecar.cjs"),
    join(stagingRoot, "runner", "runtime-sidecar.js"),
    join(stagingRoot, "runner", "runtime-sidecar.mjs"),
  ];
  const runnerPath = candidates.find(existsSync);

  if (!runnerPath) {
    throw new Error("Unable to find the built CodexKit runtime sidecar entrypoint.");
  }

  return runnerPath;
}

function getTargetTriple(): string {
  return execFileSync("rustc", ["--print", "host-tuple"], {
    encoding: "utf8",
  }).trim();
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
