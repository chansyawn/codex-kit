import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

interface LinguiCatalogConfig {
  path: string;
}

interface LinguiConfig {
  catalogs: LinguiCatalogConfig[];
  locales: string[];
  pseudoLocale: string;
  sourceLocale: string;
}

interface CatalogMessage {
  obsolete?: boolean;
  translation: string;
}

interface PoFormatter {
  parse(content: string): Record<string, CatalogMessage>;
}

interface MissingTranslation {
  id: string;
  locale: string;
  path: string;
}

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const rootRequire = createRequire(pathToFileURL(path.join(repositoryRoot, "package.json")));
const { formatter } = rootRequire("@lingui/format-po") as {
  formatter: () => PoFormatter;
};
const poFormatter = formatter();
const linguiCliPath = path.join(path.dirname(rootRequire.resolve("@lingui/cli")), "lingui.js");

function runLingui(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [linguiCliPath, ...args], {
      cwd: repositoryRoot,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`lingui ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function readLinguiConfig(): Promise<LinguiConfig> {
  const configPath = path.join(repositoryRoot, "lingui.config.ts");
  const configModule = (await import(pathToFileURL(configPath).href)) as {
    default: LinguiConfig;
  };

  return configModule.default;
}

function readShippedLocales(linguiConfig: LinguiConfig): string[] {
  return linguiConfig.locales
    .filter(
      (locale) => locale !== linguiConfig.sourceLocale && locale !== linguiConfig.pseudoLocale,
    )
    .sort();
}

function resolveCatalogPath(catalogPath: string, locale: string): string {
  return path.normalize(
    `${catalogPath
      .replace("<rootDir>/", "")
      .replace("<rootDir>", "")
      .replace("{locale}", locale)}.po`,
  );
}

function getCatalogPaths(linguiConfig: LinguiConfig, locale: string): string[] {
  return linguiConfig.catalogs.map((catalog) => resolveCatalogPath(catalog.path, locale));
}

async function readCatalog(relativePath: string): Promise<[string, string]> {
  return [relativePath, await readFile(path.join(repositoryRoot, relativePath), "utf8")];
}

async function readCatalogSnapshot(linguiConfig: LinguiConfig): Promise<Map<string, string>> {
  const catalogPaths = linguiConfig.locales.flatMap((locale) =>
    getCatalogPaths(linguiConfig, locale),
  );

  return new Map(await Promise.all(catalogPaths.map((catalogPath) => readCatalog(catalogPath))));
}

function findChangedCatalogs(before: Map<string, string>, after: Map<string, string>): string[] {
  const paths = new Set([...before.keys(), ...after.keys()]);

  return [...paths]
    .filter((catalogPath) => before.get(catalogPath) !== after.get(catalogPath))
    .sort((left, right) => left.localeCompare(right));
}

async function findMissingTranslations(linguiConfig: LinguiConfig): Promise<MissingTranslation[]> {
  const missingTranslations: MissingTranslation[] = [];

  for (const locale of readShippedLocales(linguiConfig)) {
    for (const relativePath of getCatalogPaths(linguiConfig, locale)) {
      const catalog = poFormatter.parse(
        await readFile(path.join(repositoryRoot, relativePath), "utf8"),
      );

      for (const [id, message] of Object.entries(catalog)) {
        if (!message.obsolete && message.translation.trim() === "") {
          missingTranslations.push({ id, locale, path: relativePath });
        }
      }
    }
  }

  return missingTranslations;
}

const linguiConfig = await readLinguiConfig();
const beforeExtract = await readCatalogSnapshot(linguiConfig);

await runLingui(["extract", "--overwrite", "--clean"]);

const changedCatalogs = findChangedCatalogs(beforeExtract, await readCatalogSnapshot(linguiConfig));
const missingTranslations = await findMissingTranslations(linguiConfig);

if (changedCatalogs.length > 0) {
  console.error("i18n catalogs are not current. Run `vp run i18n:extract` and commit the updates:");

  for (const catalogPath of changedCatalogs) {
    console.error(`- ${catalogPath}`);
  }
}

if (missingTranslations.length > 0) {
  console.error("Missing i18n translations:");

  for (const { id, locale, path: catalogPath } of missingTranslations) {
    console.error(`- ${catalogPath} (${locale}): ${id}`);
  }
}

if (changedCatalogs.length > 0 || missingTranslations.length > 0) {
  process.exitCode = 1;
}
