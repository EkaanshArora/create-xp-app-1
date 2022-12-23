import {
  existsSync,
  readdirSync,
  statSync,
  unlinkSync,
  rmdirSync,
  mkdirSync,
  writeFileSync,
} from "fs";
import { resolve, relative, basename, dirname } from "path";

const routesPath = "packages/app/routes";
const outPaths = ["apps/next/pages", "apps/expo/app"];
const autoMessage = `/** This file is auto-generated by \`scripts/sync-routes.ts\` */`;

const prefixesToIgnore = /(^_)/;
const protectedFolders = ["api"];
const extensionsToInclude = /.(tsx|ts|js|jsx)$/;

const routesDir = resolve(__dirname, "../", routesPath);
const pagesDirs = outPaths.map((outPath) => resolve(__dirname, "../", outPath));

// delete all previously auto-generated files and empty folders recursively
pagesDirs.forEach((pagesDir) => {
  const deleteFile = (filePath: string) => {
    if (prefixesToIgnore.test(basename(filePath))) return;
    if (!extensionsToInclude.test(basename(filePath))) return;
    if (!existsSync(filePath)) return;
    unlinkSync(filePath);
  };

  const deleteEmptyFolder = (folderPath: string) => {
    if (prefixesToIgnore.test(basename(folderPath))) return;
    if (readdirSync(folderPath).length === 0) {
      if (existsSync(folderPath)) rmdirSync(folderPath);
    }
  };

  const deleteRecursive = (dirPath: string) => {
    const files = readdirSync(dirPath);
    files.forEach((file) => {
      const filePath = resolve(dirPath, file);
      if (!existsSync(filePath)) return;
      if (statSync(filePath).isDirectory()) {
        deleteRecursive(filePath);
      } else {
        deleteFile(filePath);
      }
    });
    deleteEmptyFolder(dirPath);
  };

  deleteRecursive(pagesDir);
});

function generateFileContent(relativePath: string, fileName: string) {
  return [
    autoMessage,
    `export { default } from "@acme/app/routes/${relativePath}/${fileName}";`,
  ].join("\n");
}

function syncRoutes(dir: string, outDirs: string[]) {
  const routes = readdirSync(dir);
  routes.forEach((file) => {
    const filePath = resolve(dir, file);

    if (!existsSync(filePath)) return;
    if (statSync(filePath).isDirectory()) {
      if (protectedFolders.includes(file)) return;
      syncRoutes(
        filePath,
        outDirs.map((outDir) => resolve(outDir, file)),
      );
    } else {
      const relativePath = relative(routesDir, dir);
      const outputPaths = outDirs.map((outDir) => resolve(outDir, file));
      const fileContent = generateFileContent(relativePath, file);

      // Write the file to each output directory and create all necessary folders
      outputPaths.forEach((outputPath) => {
        const outputDir = dirname(outputPath);
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }
        writeFileSync(outputPath, fileContent, { encoding: "utf8" });
      });
    }
  });
}

syncRoutes(routesDir, pagesDirs);
