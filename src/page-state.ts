/**
 * One shared observer for page changes. YouTube marks the page type with a
 * WEB_PAGE_TYPE_* class on <body>; features listen here instead of each
 * watching every class change on <body> (several of ours toggle classes
 * there too).
 */
const PREFIX = 'WEB_PAGE_TYPE_';

export type PageListener = (page: string, previous: string) => void;

const listeners: PageListener[] = [];

function readPage(): string {
  const classes = document.body.classList;
  for (let i = 0; i < classes.length; i++) {
    const name = classes[i]!;
    if (name.indexOf(PREFIX) === 0) return name.slice(PREFIX.length);
  }
  return '';
}

let page = readPage();

/** Current page type, e.g. "WATCH", "BROWSE", "SEARCH". */
export function currentPage() {
  return page;
}

export function isWatchPage() {
  return page === 'WATCH';
}

/** Called after every change of the page type. */
export function onPageChange(listener: PageListener) {
  listeners.push(listener);
}

new MutationObserver(() => {
  const next = readPage();
  if (next === page) return;
  const previous = page;
  page = next;
  for (const listener of listeners) {
    try {
      listener(next, previous);
    } catch (err) {
      console.warn('[page-state] listener failed:', err);
    }
  }
}).observe(document.body, { attributes: true, attributeFilter: ['class'] });
