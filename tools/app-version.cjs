const pkgJson = require('../package.json');

/**
 * Offset added to the major version of the packaged app.
 *
 * The LG Content Store "updates" the app to the official YouTube app when
 * its version is higher than ours (it shares the `youtube.leanback.v4` id).
 * An extreme major version keeps that from ever happening.
 */
const MAJOR_OFFSET = 100;

/**
 * Version used for `appinfo.json`, the IPK file name and the manifest.
 * @returns {string}
 */
function getAppVersion() {
  const [major, ...rest] = pkgJson.version.split('.');
  if (major === undefined || !/^\d+$/.test(major) || rest.length < 2) {
    throw new Error(`Invalid package version: ${pkgJson.version}`);
  }

  return [Number(major) + MAJOR_OFFSET, ...rest].join('.');
}

module.exports = { getAppVersion };
