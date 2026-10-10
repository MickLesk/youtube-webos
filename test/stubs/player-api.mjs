export const PlayerMode = { NORMAL: 'NORMAL' };

// The player never appears in tests.
export function getPlayerManager() {
  return new Promise(() => {});
}
