const fs = require("fs/promises");
const path = require("path");

const SOURCE_DIR = path.resolve(__dirname, "charts-type");
const DEST_DIR = path.resolve(__dirname, "echarts");
const SUPER_BASE = path.resolve(__dirname, "super-base-charts/schema.json");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function moveFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
  console.log(`✅ Copied: ${src} → ${dest}`);
}

function getChartTypeName(folderName) {
  return folderName.replace(/-charts?$/, "");
}

function extractVariationName(filename) {
  return filename.replace(/\.json$/, "");
}

async function processChartType(chartFolder) {
  const chartPath = path.join(SOURCE_DIR, chartFolder);
  const chartType = getChartTypeName(chartFolder);
  const destChartPath = path.join(DEST_DIR, chartType);
  await ensureDir(destChartPath);

  // Copy schema.json
  const schemaPath = path.join(chartPath, "type-base/schema.json");
  try {
    await moveFile(schemaPath, path.join(destChartPath, "schema.json"));
  } catch (e) {
    console.warn(`⚠️ No schema for ${chartType}`);
  }

  // Copy variations (variation or variations)
  const variationDirs = ["variation", "variations"];
  let variationPath = null;

  for (const dir of variationDirs) {
    const possiblePath = path.join(chartPath, dir);
    try {
      const stats = await fs.lstat(possiblePath);
      if (stats.isDirectory()) {
        variationPath = possiblePath;
        break;
      }
    } catch {}
  }

  if (variationPath) {
    const files = await fs.readdir(variationPath);
    for (const file of files) {
      const fullSrc = path.join(variationPath, file);
      const variationName = extractVariationName(file);
      const isBasic = file.toLowerCase().includes("basic");

      if (isBasic) {
        await moveFile(fullSrc, path.join(destChartPath, "basic.json"));
      } else {
        const destFolder = path.join(destChartPath, variationName);
        await moveFile(fullSrc, path.join(destFolder, "example.json"));
      }
    }
  }

  // Optional: Copy from examples/
  const examplesPath = path.join(chartPath, "examples");
  try {
    const exampleFiles = await fs.readdir(examplesPath);
    for (const file of exampleFiles) {
      const fullSrc = path.join(examplesPath, file);
      const variationName = extractVariationName(file);
      const isBasic = file.toLowerCase().includes("basic");

      if (isBasic) {
        await moveFile(fullSrc, path.join(destChartPath, "basic.json"));
      } else {
        const destFolder = path.join(destChartPath, variationName);
        await moveFile(fullSrc, path.join(destFolder, "example.json"));
      }
    }
  } catch {}
}

async function main() {
  // Step 1: Copy base
  await moveFile(SUPER_BASE, path.join(DEST_DIR, "base", "base.json"));

  // Step 2: Read all chart types
  const chartFolders = await fs.readdir(SOURCE_DIR);

  for (const folder of chartFolders) {
    const fullPath = path.join(SOURCE_DIR, folder);
    const stats = await fs.lstat(fullPath);
    if (stats.isDirectory()) {
      await processChartType(folder);
    }
  }

  console.log("🎉 Done organizing ECharts files!");
}

main().catch(console.error);
