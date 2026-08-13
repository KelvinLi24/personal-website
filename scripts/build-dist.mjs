import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const galleryRoots = new Set(['featured', 'projects', 'teaching-volunteering', 'yunnan-service-learning', 'newspaper']);

async function exists(target) {
  try { await fs.access(target); return true; } catch { return false; }
}

async function copyFileIfPresent(name) {
  const source = path.join(root, name);
  if (!(await exists(source))) return;
  await fs.copyFile(source, path.join(dist, name));
}

async function copyAssets(sourceDir, destinationDir, relative = '') {
  if (!(await exists(sourceDir))) return;
  await fs.mkdir(destinationDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const source = path.join(sourceDir, entry.name);
    const destination = path.join(destinationDir, entry.name);
    const rel = relative ? path.join(relative, entry.name) : entry.name;
    if (entry.isDirectory()) {
      await copyAssets(source, destination, rel);
      continue;
    }
    if (!entry.isFile()) continue;

    const parts = rel.split(path.sep);
    const withinGallery = galleryRoots.has(parts[0]);
    if (withinGallery) {
      const keep = entry.name === 'images.json' || /^\d+-\d+\.webp$/i.test(entry.name);
      if (!keep) continue;
    } else if (/\.md$/i.test(entry.name)) {
      continue;
    }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
  }
}

await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });
for (const file of ['index.html', 'style.css', 'script.js', 'CNAME', 'robots.txt', 'sitemap.xml']) {
  await copyFileIfPresent(file);
}
await copyAssets(path.join(root, 'assets'), path.join(dist, 'assets'));
await fs.writeFile(path.join(dist, '.nojekyll'), '', 'utf8');
console.log('GitHub Pages build ready in dist/.');
