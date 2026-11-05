/**
 * Like/dislike ratios from the Return YouTube Dislike API for feed tiles,
 * fetched in the background a few at a time and cached, so poorly rated
 * videos can be hidden the next time they appear.
 */
const API = 'https://returnyoutubedislikeapi.com/votes';
const STORAGE_KEY = 'ytaf-ratings';
const MAX_ENTRIES = 1500;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const CONCURRENCY = 2;
/** Fewer votes say nothing reliable about a video. */
const MIN_VOTES = 50;

/** [likes, dislikes, fetched at] */
type Entry = [number, number, number];
type Cache = Record<string, Entry>;

let cache: Cache | null = null;

function load(): Cache {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Cache) : {};
  } catch {
    cache = {};
  }
  return cache!;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const all = load();
    const ids = Object.keys(all);
    if (ids.length > MAX_ENTRIES) {
      ids.sort((a, b) => all[a]![2] - all[b]![2]);
      for (const id of ids.slice(0, ids.length - MAX_ENTRIES)) delete all[id];
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
      // Storage full: the in-memory cache still works for this session.
    }
  }, 2000);
}

const queue: string[] = [];
const pending: Record<string, true> = {};
let running = 0;

async function fetchOne(videoId: string) {
  try {
    const resp = await fetch(`${API}?videoId=${encodeURIComponent(videoId)}`);
    if (!resp.ok) return;
    const data = (await resp.json()) as { likes?: unknown; dislikes?: unknown };
    const likes = Number(data.likes);
    const dislikes = Number(data.dislikes);
    if (!Number.isFinite(likes) || !Number.isFinite(dislikes)) return;
    load()[videoId] = [likes, dislikes, Date.now()];
    save();
  } catch (err) {
    console.debug('[ratings] request failed for', videoId, err);
  }
}

function pump() {
  while (running < CONCURRENCY && queue.length) {
    const id = queue.shift()!;
    running++;
    void fetchOne(id).then(() => {
      running--;
      delete pending[id];
      pump();
    });
  }
}

/** Share of likes (0..1), or `null` if unknown or too few votes. */
export function likeRatio(videoId: string): number | null {
  const entry = load()[videoId];
  if (!entry || Date.now() - entry[2] > MAX_AGE_MS) return null;
  const total = entry[0] + entry[1];
  if (total < MIN_VOTES) return null;
  return entry[0] / total;
}

/** Fetch the rating in the background if it is not cached yet. */
export function requestRating(videoId: string) {
  const entry = load()[videoId];
  if (entry && Date.now() - entry[2] <= MAX_AGE_MS) return;
  if (pending[videoId]) return;
  pending[videoId] = true;
  queue.push(videoId);
  // Feeds are long: keep the queue to what is likely still on screen.
  if (queue.length > 120) delete pending[queue.shift()!];
  pump();
}
