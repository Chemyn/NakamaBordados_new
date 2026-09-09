import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function prepareStaticDeployment({ rootDir, buildId }) {
  const outDir = path.join(rootDir, 'out');
  const appMetadataDir = path.join(outDir, 'app');
  const checkoutPluginDir = path.join(
    outDir,
    'wp-content',
    'plugins',
    'nakama-checkout-tools',
  );
  await mkdir(appMetadataDir, { recursive: true });
  await mkdir(checkoutPluginDir, { recursive: true });
  await copyFile(path.join(rootDir, '.htaccess'), path.join(outDir, '.htaccess'));
  await copyFile(
    path.join(rootDir, 'nakama-checkout-tools.php'),
    path.join(checkoutPluginDir, 'nakama-checkout-tools.php'),
  );
  await writeFile(
    path.join(appMetadataDir, 'web-version.json'),
    `${JSON.stringify({ buildId })}\n`,
    'utf8',
  );
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const rootDir = process.cwd();
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID || 'local';
  await prepareStaticDeployment({ rootDir, buildId });
}
