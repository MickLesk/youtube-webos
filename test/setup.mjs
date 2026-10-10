/**
 * Runs before every test file: a minimal browser environment for the
 * modules under test, and a loader that resolves the extensionless imports
 * webpack allows (and swaps modules that need the real TV app for stubs).
 */
import { register } from 'node:module';

register('./loader.mjs', import.meta.url);

const store = new Map();
const localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear()
};

// config.js also uses `localStorage[key] = value`.
const storageProxy = new Proxy(localStorage, {
  get: (target, key) => (key in target ? target[key] : store.get(key)),
  set: (_target, key, value) => {
    store.set(key, String(value));
    return true;
  }
});

const windowTarget = new EventTarget();
globalThis.window = Object.assign(globalThis, {
  localStorage: storageProxy,
  addEventListener: windowTarget.addEventListener.bind(windowTarget),
  removeEventListener: windowTarget.removeEventListener.bind(windowTarget)
});
globalThis.location = { hash: '#/browse', href: 'https://www.youtube.com/tv' };
globalThis.navigator ??= { language: 'en-US' };
globalThis.document = {
  body: { classList: { contains: () => false } },
  createDocumentFragment: () => new EventTarget()
};
globalThis.DocumentFragment = EventTarget;
globalThis.CustomEvent ??= class CustomEvent extends Event {
  constructor(type, init) {
    super(type);
    this.detail = init?.detail;
  }
};
