import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CommandRunner = (command: string, args: string[]) => Promise<void>;
export type DeeplinkOpener = (href: string) => Promise<void>;

export function normalizeCodexDeeplinkHref(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const href = value.trim();

  if (!href) return undefined;

  try {
    const url = new URL(href);

    return url.protocol === "codex:" ? href : undefined;
  } catch {
    return undefined;
  }
}

export function createSystemDeeplinkOpener(
  runCommand: CommandRunner = runExecFile,
): DeeplinkOpener {
  return async (href) => {
    await runCommand("open", [href]);
  };
}

export const openSystemDeeplink = createSystemDeeplinkOpener();

async function runExecFile(command: string, args: string[]): Promise<void> {
  await execFileAsync(command, args);
}
