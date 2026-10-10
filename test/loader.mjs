/**
 * Module resolution for tests: tries `.ts`, `.js` and `/index.ts` for
 * extensionless imports, and replaces modules that need the TV app.
 */
const STUBS = {
  '/src/player_api/index.ts': './stubs/player-api.mjs',
  '/src/ui.js': './stubs/ui.mjs'
};

const CANDIDATES = ['', '.ts', '.js', '/index.ts'];

export async function resolve(specifier, context, nextResolve) {
  const relative = specifier.startsWith('.') || specifier.startsWith('/');
  let resolved = null;

  if (relative && context.parentURL?.includes('/src/')) {
    for (const suffix of CANDIDATES) {
      try {
        // eslint-disable-next-line no-await-in-loop -- tried in order
        resolved = await nextResolve(specifier + suffix, context);
        break;
      } catch {
        // Try the next candidate.
      }
    }
  }
  resolved ??= await nextResolve(specifier, context);

  for (const [path, stub] of Object.entries(STUBS)) {
    if (resolved.url.endsWith(path)) {
      return { url: new URL(stub, import.meta.url).href, shortCircuit: true };
    }
  }
  return resolved;
}
