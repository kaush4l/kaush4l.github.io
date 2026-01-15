import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const srcDir = path.join(root, 'node_modules', 'onnxruntime-web', 'dist');
const destDir = path.join(root, 'public', 'onnxruntime');

function shouldCopy(fileName) {
  if (fileName.endsWith('.map')) return false;
  if (fileName.startsWith('ort.node')) return false;
  return (
    fileName.startsWith('ort') &&
    (fileName.endsWith('.mjs') || fileName.endsWith('.js') || fileName.endsWith('.wasm'))
  );
}

async function main() {
  try {
    const entries = await fs.readdir(srcDir);
    const toCopy = entries.filter(shouldCopy);

    if (toCopy.length === 0) {
      throw new Error(`No ORT runtime assets found in ${srcDir}`);
    }

    await fs.mkdir(destDir, { recursive: true });

    await Promise.all(
      toCopy.map(async (fileName) => {
        const from = path.join(srcDir, fileName);
        const to = path.join(destDir, fileName);
        await fs.copyFile(from, to);
      })
    );

    // Small marker file for debugging deployments.
    await fs.writeFile(path.join(destDir, '.copied'), `copied ${toCopy.length} files\n`, 'utf8');

    console.log(`[copy-onnxruntime-assets] Copied ${toCopy.length} files to public/onnxruntime`);
  } catch (err) {
    console.error('[copy-onnxruntime-assets] Failed:', err);
    process.exitCode = 1;
  }
}

await main();
