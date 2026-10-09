import { spawnSync } from 'node:child_process';
import { normalize } from 'node:path';

import appVersion from './app-version.cjs';

process.exit(
  spawnSync(
    normalize('./node_modules/.bin/ares-install'),
    [normalize(`./youtube.leanback.v4_${appVersion.getAppVersion()}_all.ipk`)],
    { stdio: 'inherit', shell: true }
  ).status ?? 0
);
