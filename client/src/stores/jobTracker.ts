import { create } from 'zustand';
import { api } from '@/lib/api';
import type { JobTrackerEntry, ListResponse } from '@/types';

const DEVICE_KEY = 'jf_job_device';
const STATE_KEY = 'jf_job_tracker';
/** Recent local edits made offline are kept past a server prune for this long, so they are not mistaken for deleted jobs. */
const OFFLINE_GRACE_MS = 15_000;

type Entries = Record<string, JobTrackerEntry>;

/** A random id, matching the server's `[A-Za-z0-9_-]{16,64}` device-id shape; this is the sync code, never an IP. */
const makeId = (): string => {
  try {
    return crypto.randomUUID().replace(/-/g, '');
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
  }
};

const deviceId = ((): string => {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = makeId();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return makeId();
  }
})();

const loadLocal = (): Entries => {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY) ?? '{}') as Entries;
  } catch {
    return {};
  }
};

const saveLocal = (entries: Entries): void => {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(entries));
  } catch {
    // Private-browsing storage is disabled; degrade to in-memory only.
  }
};

let pushTimer: ReturnType<typeof setTimeout> | null = null;
/** Debounced, fire-and-forget: a failed sync must never surface to the user, since localStorage already holds the truth. */
const pushToServer = (entries: Entries): void => {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void api
      .put(`/jobs/track/${deviceId}`, { entries: Object.values(entries) })
      .catch(() => {});
  }, 800);
};

const now = (): string => new Date().toISOString();

interface JobTrackerStore {
  entries: Entries;
  hydrated: boolean;
  isApplied: (jobId: string) => boolean;
  isSaved: (jobId: string) => boolean;
  isHidden: (jobId: string) => boolean;
  noteOf: (jobId: string) => string;
  toggleApplied: (jobId: string) => void;
  toggleSaved: (jobId: string) => void;
  setHidden: (jobId: string, hidden: boolean) => void;
  setNote: (jobId: string, note: string) => void;
  hydrate: () => Promise<void>;
}

export const useJobTracker = create<JobTrackerStore>((set, get) => {
  const patch = (jobId: string, changes: Partial<JobTrackerEntry>): void => {
    const prev = get().entries[jobId] ?? { jobId, updatedAt: now() };
    const next: JobTrackerEntry = {
      ...prev,
      ...changes,
      jobId,
      updatedAt: now(),
    };
    const entries = { ...get().entries };
    // An entry toggled back to nothing is dropped, so localStorage and the sync payload can't grow without bound.
    if (next.applied || next.saved || next.hidden || next.note)
      entries[jobId] = next;
    else delete entries[jobId];
    set({ entries });
    saveLocal(entries);
    pushToServer(entries);
  };

  return {
    entries: loadLocal(),
    hydrated: false,
    isApplied: (jobId) => Boolean(get().entries[jobId]?.applied),
    isSaved: (jobId) => Boolean(get().entries[jobId]?.saved),
    isHidden: (jobId) => Boolean(get().entries[jobId]?.hidden),
    noteOf: (jobId) => get().entries[jobId]?.note ?? '',

    toggleApplied: (jobId) => {
      const applied = !get().entries[jobId]?.applied;
      patch(jobId, { applied, appliedAt: applied ? now() : undefined });
    },
    toggleSaved: (jobId) => {
      const saved = !get().entries[jobId]?.saved;
      patch(jobId, { saved, savedAt: saved ? now() : undefined });
    },
    setHidden: (jobId, hidden) =>
      patch(jobId, { hidden, hiddenAt: hidden ? now() : undefined }),
    setNote: (jobId, note) => patch(jobId, { note }),

    hydrate: async () => {
      if (get().hydrated) return;
      set({ hydrated: true });
      try {
        const server =
          (
            await api.get<ListResponse<JobTrackerEntry>>(
              `/jobs/track/${deviceId}`
            )
          ).data.data ?? [];
        const serverMap = new Map(server.map((entry) => [entry.jobId, entry]));
        const local = get().entries;
        const merged: Entries = {};
        for (const entry of server) merged[entry.jobId] = entry;

        const cutoff = Date.now() - OFFLINE_GRACE_MS;
        for (const [jobId, localEntry] of Object.entries(local)) {
          const remote = serverMap.get(jobId);
          if (remote) {
            // A newer local edit wins over what the server had for the same job.
            if (new Date(localEntry.updatedAt) > new Date(remote.updatedAt))
              merged[jobId] = localEntry;
          } else if (new Date(localEntry.updatedAt).getTime() > cutoff) {
            // The server has no record and the edit is fresh, so it is an offline change, not a prune.
            merged[jobId] = localEntry;
          }
          // Otherwise the server pruned it (its job was removed), so it is dropped here too.
        }

        set({ entries: merged });
        saveLocal(merged);
        if (JSON.stringify(merged) !== JSON.stringify(local))
          pushToServer(merged);
      } catch {
        // Offline or the endpoint is unreachable; the local copy stands on its own.
      }
    },
  };
});

/** Count helpers for the detail-page stats, derived from the current entries. */
export const trackerStats = (
  entries: Entries
): { applied: number; saved: number } => {
  const values = Object.values(entries);
  return {
    applied: values.filter((entry) => entry.applied).length,
    saved: values.filter((entry) => entry.saved).length,
  };
};
