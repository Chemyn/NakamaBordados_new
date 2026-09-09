import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { prepareStaticDeployment } from '../scripts/prepare-static-deployment.mjs';

test('packages server rules, the checkout plugin, and a readable version with the static export', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'nakama-deploy-'));
  await mkdir(path.join(rootDir, 'out'), { recursive: true });
  await writeFile(path.join(rootDir, '.htaccess'), '# cache rules\n', 'utf8');
  await writeFile(path.join(rootDir, 'nakama-checkout-tools.php'), '<?php // checkout tools\n', 'utf8');

  await prepareStaticDeployment({ rootDir, buildId: 'commit-abc123' });

  assert.equal(await readFile(path.join(rootDir, 'out', '.htaccess'), 'utf8'), '# cache rules\n');
  assert.equal(
    await readFile(
      path.join(
        rootDir,
        'out',
        'wp-content',
        'plugins',
        'nakama-checkout-tools',
        'nakama-checkout-tools.php',
      ),
      'utf8',
    ),
    '<?php // checkout tools\n',
  );
  assert.deepEqual(
    JSON.parse(await readFile(path.join(rootDir, 'out', 'app', 'web-version.json'), 'utf8')),
    { buildId: 'commit-abc123' },
  );
});
