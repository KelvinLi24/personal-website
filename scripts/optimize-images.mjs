import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = path.resolve(import.meta.dirname, '..');
const SOURCE_ROOT = path.resolve(projectRoot, process.env.IMAGE_SOURCE_DIR || 'source-images');
const OUTPUT_ROOT = path.resolve(projectRoot, process.env.IMAGE_OUTPUT_DIR || 'assets');
const INPUT_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.tif', '.tiff']);
const VARIANT_WIDTHS = [640, 1280];
const WEBP_QUALITY = 78;

const posix = (value) => value.split(path.sep).join('/');

async function exists(target) {
  try { await fs.access(target); return true; } catch { return false; }
}

async function listDirectories(root, relative = '') {
  const current = path.join(root, relative);
  if (!(await exists(current))) return [];
  const entries = await fs.readdir(current, { withFileTypes: true });
  const result = [relative];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    result.push(...await listDirectories(root, path.join(relative, entry.name)));
  }
  return result;
}

async function cleanGeneratedGallery(outputDir) {
  if (!(await exists(outputDir))) return;
  const entries = await fs.readdir(outputDir, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    if (!entry.isFile()) return;
    if (entry.name === 'images.json' || /^\d+-\d+\.webp$/i.test(entry.name)) {
      await fs.rm(path.join(outputDir, entry.name), { force: true });
    }
  }));
}

function orientedWidth(metadata) {
  const width = Number(metadata.width) || 0;
  const height = Number(metadata.height) || 0;
  return metadata.orientation >= 5 && metadata.orientation <= 8 ? height : width;
}

function chooseWidths(width) {
  const safeWidth = Math.max(1, Math.round(width || 1280));
  const widths = VARIANT_WIDTHS.filter((candidate) => candidate < safeWidth);
  widths.push(Math.min(safeWidth, VARIANT_WIDTHS.at(-1)));
  return [...new Set(widths)].sort((a, b) => a - b);
}

async function processImage(inputPath, outputDir, id) {
  const metadata = await sharp(inputPath, { failOn: 'none' }).metadata();
  const widths = chooseWidths(orientedWidth(metadata));
  const sources = [];
  let displayWidth = 0;
  let displayHeight = 0;

  for (const targetWidth of widths) {
    const filename = `${id}-${targetWidth}.webp`;
    const outputPath = path.join(outputDir, filename);
    const info = await sharp(inputPath, { failOn: 'none', animated: false })
      .autoOrient()
      .resize({ width: targetWidth, withoutEnlargement: true, fit: 'inside' })
      .webp({ quality: WEBP_QUALITY, effort: 4, smartSubsample: true })
      .toFile(outputPath);

    const actualWidth = Number(info.width) || targetWidth;
    sources.push({ width: actualWidth, src: filename });
    if (actualWidth >= displayWidth) {
      displayWidth = actualWidth;
      displayHeight = Number(info.height) || 0;
    }
  }

  const lqip = await sharp(inputPath, { failOn: 'none', animated: false })
    .autoOrient()
    .resize({ width: 40, withoutEnlargement: true, fit: 'inside' })
    .blur(0.55)
    .webp({ quality: 34, effort: 2 })
    .toBuffer();

  return {
    id,
    width: displayWidth,
    height: displayHeight,
    placeholder: `data:image/webp;base64,${lqip.toString('base64')}`,
    sources,
    fallback: sources.at(-1)?.src || ''
  };
}

async function buildGallery(relativeDir) {
  if (!relativeDir) return { relativeDir, images: [] };
  const sourceDir = path.join(SOURCE_ROOT, relativeDir);
  const outputDir = path.join(OUTPUT_ROOT, relativeDir);
  await fs.mkdir(outputDir, { recursive: true });
  await cleanGeneratedGallery(outputDir);

  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  const numbered = entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const ext = path.extname(entry.name).toLowerCase();
      const match = path.basename(entry.name, ext).match(/^(\d+)$/);
      return match && INPUT_EXTENSIONS.has(ext)
        ? { id: Number(match[1]), name: entry.name }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.id - b.id);

  const images = [];
  for (const file of numbered) {
    const inputPath = path.join(sourceDir, file.name);
    try {
      images.push(await processImage(inputPath, outputDir, file.id));
      console.log(`✓ ${posix(path.join(relativeDir, file.name))}`);
    } catch (error) {
      console.error(`✗ ${posix(path.join(relativeDir, file.name))}: ${error.message}`);
      process.exitCode = 1;
    }
  }

  const manifest = {
    version: 1,
    strategy: 'responsive-webp-lqip',
    images
  };
  await fs.writeFile(path.join(outputDir, 'images.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { relativeDir, images };
}

await fs.mkdir(SOURCE_ROOT, { recursive: true });
await fs.mkdir(OUTPUT_ROOT, { recursive: true });
const discoveredDirectories = (await listDirectories(SOURCE_ROOT)).filter(Boolean);
const directories = [];
for (const relativeDir of discoveredDirectories) {
  const entries = await fs.readdir(path.join(SOURCE_ROOT, relativeDir), { withFileTypes: true });
  if (!entries.some((entry) => entry.isDirectory())) directories.push(relativeDir);
}

let imageCount = 0;
for (const relativeDir of directories) {
  const result = await buildGallery(relativeDir);
  imageCount += result.images.length;
}

console.log(`\nImage build complete: ${imageCount} image${imageCount === 1 ? '' : 's'} optimized across ${directories.length} gallery folder${directories.length === 1 ? '' : 's'}.`);
