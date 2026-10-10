import kindOf from 'which-builtin-type';

import { configRead } from './config';
import { addParseHandler } from './hooks/json-parse';

function isObject(value: unknown): value is object {
  // @ts-expect-error - bad types
  return kindOf(value) === 'Object';
}

addParseHandler('remove-endscreen', (res) => {
  if (!configRead('removeEndscreen')) return;

  if (isObject(res.endscreen) && 'endscreenRenderer' in res.endscreen) {
    console.debug('Removed endscreen from JSON response', res.endscreen);
    delete res.endscreen;
  }
});
