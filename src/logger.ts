/**
 * Keeps the most recent warnings and errors so they can be shown on the TV,
 * where the developer console is normally out of reach.
 */
export type LogLevel = 'warn' | 'error';

export interface LogEntry {
  time: Date;
  level: LogLevel;
  source: string;
  message: string;
}

const MAX_ENTRIES = 50;
const entries: LogEntry[] = [];

// A plain listener list: EventTarget can't be constructed on older webOS.
const listeners: ((entry: LogEntry) => void)[] = [];

export function onLogEntry(listener: (entry: LogEntry) => void) {
  listeners.push(listener);
}

function describe(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function add(level: LogLevel, source: string, args: unknown[]) {
  const entry: LogEntry = {
    time: new Date(),
    level,
    source,
    message: args.map(describe).join(' ')
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();
  for (const listener of listeners) {
    try {
      listener(entry);
    } catch {
      // Never let the logger itself throw.
    }
  }
}

/** Logger scoped to one feature, e.g. `createLogger('sponsorblock')`. */
export function createLogger(source: string) {
  return {
    warn(...args: unknown[]) {
      console.warn(`[${source}]`, ...args);
      add('warn', source, args);
    },
    error(...args: unknown[]) {
      console.error(`[${source}]`, ...args);
      add('error', source, args);
    }
  };
}

export function getLogEntries(): readonly LogEntry[] {
  return entries;
}

export function clearLogEntries() {
  entries.length = 0;
}

window.addEventListener('error', (evt) => {
  add('error', 'uncaught', [evt.error ?? evt.message]);
});

window.addEventListener('unhandledrejection', (evt) => {
  add('error', 'promise', [evt.reason]);
});
