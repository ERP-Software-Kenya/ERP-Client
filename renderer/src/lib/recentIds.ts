import { useCallback, useSyncExternalStore } from 'react';

export interface RecentIdEntry {
  id: string;
  label?: string;
  savedAt: number;
}

const MAX = 50;

function storageKey(namespace: string) {
  return `erp:recent:${namespace}`;
}

/** Cache so useSyncExternalStore getSnapshot returns stable refs when unchanged. */
const snapshotCache = new Map<string, { raw: string | null; entries: RecentIdEntry[] }>();

function readEntries(namespace: string): RecentIdEntry[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey(namespace));
  } catch {
    raw = null;
  }
  const cached = snapshotCache.get(namespace);
  if (cached && cached.raw === raw) return cached.entries;

  let entries: RecentIdEntry[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as RecentIdEntry[];
      if (Array.isArray(parsed)) {
        entries = parsed
          .filter((e) => e && typeof e.id === 'string' && e.id.length > 0)
          .sort((a, b) => b.savedAt - a.savedAt)
          .slice(0, MAX);
      }
    } catch {
      entries = [];
    }
  }
  snapshotCache.set(namespace, { raw, entries });
  return entries;
}

function writeEntries(namespace: string, entries: RecentIdEntry[]) {
  const next = entries.slice(0, MAX);
  const raw = JSON.stringify(next);
  localStorage.setItem(storageKey(namespace), raw);
  snapshotCache.set(namespace, { raw, entries: next });
}

const listeners = new Map<string, Set<() => void>>();

function emit(namespace: string) {
  listeners.get(namespace)?.forEach((l) => l());
}

function subscribe(namespace: string, onStoreChange: () => void) {
  if (!listeners.has(namespace)) listeners.set(namespace, new Set());
  listeners.get(namespace)!.add(onStoreChange);
  return () => listeners.get(namespace)!.delete(onStoreChange);
}

export function pushRecentId(namespace: string, id: string, label?: string) {
  const trimmed = id.trim();
  if (!trimmed) return;
  const now = Date.now();
  const prev = readEntries(namespace).filter((e) => e.id !== trimmed);
  writeEntries(namespace, [{ id: trimmed, label, savedAt: now }, ...prev]);
  emit(namespace);
}

export function removeRecentId(namespace: string, id: string) {
  writeEntries(
    namespace,
    readEntries(namespace).filter((e) => e.id !== id),
  );
  emit(namespace);
}

export function clearRecentIds(namespace: string) {
  localStorage.removeItem(storageKey(namespace));
  snapshotCache.set(namespace, { raw: null, entries: [] });
  emit(namespace);
}

const EMPTY_RECENT: RecentIdEntry[] = [];

/** Recent UUIDs for a namespace, newest first. Browser-local only (no Core API list). */
export function useRecentIds(namespace: string) {
  const entries = useSyncExternalStore(
    (onStoreChange) => subscribe(namespace, onStoreChange),
    () => readEntries(namespace),
    () => EMPTY_RECENT,
  );

  const push = useCallback((id: string, label?: string) => pushRecentId(namespace, id, label), [namespace]);
  const remove = useCallback((id: string) => removeRecentId(namespace, id), [namespace]);
  const clear = useCallback(() => clearRecentIds(namespace), [namespace]);

  return { entries, push, remove, clear };
}

export const RECENT_NS = {
  stockTransfers: 'stock-transfers',
  unpublishedStock: 'unpublished-stock',
  stockMovementsInventory: 'stock-movements-inventory',
} as const;
