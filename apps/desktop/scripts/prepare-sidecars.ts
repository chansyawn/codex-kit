import { execFileSync, spawnSync } from "node:child_process";
import { chmod, cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workspaceRoot = resolve(desktopRoot, "../..");
const tauriRoot = join(desktopRoot, "src-tauri");
const binariesRoot = join(tauriRoot, "binaries");
const stagingRoot = join(desktopRoot, "dist-pkg");
const runnerEntrypoint = "runner/runtime-sidecar.mjs";

const pkgTargetByRustTarget: Record<string, string> = {
  "aarch64-apple-darwin": "node24-macos-arm64",
  "x86_64-apple-darwin": "node24-macos-x64",
  "x86_64-pc-windows-msvc": "node24-win-x64",
  "aarch64-pc-windows-msvc": "node24-win-arm64",
  "x86_64-unknown-linux-gnu": "node24-linux-x64",
  "aarch64-unknown-linux-gnu": "node24-linux-arm64",
};

await main();

async function main(): Promise<void> {
  const runtimeRoot = join(workspaceRoot, "apps/runtime");

  run("vp", ["build", "--mode", "client"], runtimeRoot);
  run("vp", ["build", "--mode", "server"], runtimeRoot);
  run("vp", ["pack"], desktopRoot);

  await stagePackageInput();
  await preparePkgSidecar();
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
  await writePackageManifest();
}

async function preparePkgSidecar(): Promise<void> {
  const targetTriple = getTargetTriple();
  const pkgTarget = pkgTargetByRustTarget[targetTriple];

  if (!pkgTarget) {
    throw new Error(`No @yao-pkg/pkg target is configured for ${targetTriple}.`);
  }

  await mkdir(binariesRoot, { recursive: true });

  const sidecarPath = join(
    binariesRoot,
    `codexkit-runtime-${targetTriple}${executableExtension(targetTriple)}`,
  );
  await rm(sidecarPath, { force: true });

  run("vp", ["exec", "pkg", stagingRoot, "--sea", "--targets", pkgTarget, "--output", sidecarPath]);

  if (process.platform !== "win32") {
    await chmod(sidecarPath, 0o755);
  }
}

async function writePackageManifest(): Promise<void> {
  const manifest = {
    name: "codexkit-runtime-sidecar",
    version: "0.0.0",
    private: true,
    type: "module",
    bin: runnerEntrypoint,
    pkg: {
      assets: ["client/**/*", "server/**/*"],
      sea: true,
      seaConfig: {
        useSnapshot: false,
      },
    },
  };

  await writeFile(join(stagingRoot, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

function getTargetTriple(): string {
  return execFileSync("rustc", ["--print", "host-tuple"], {
    encoding: "utf8",
  }).trim();
}

function executableExtension(targetTriple: string): string {
  return targetTriple.includes("windows") ? ".exe" : "";
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
