/** Full snapshots let slow networks skip obsolete intermediate typing saves. */
export function createProgressQueue<T>(save: (snapshot: T) => Promise<void>, onError: (error: unknown) => void) {
  let pending: T | null = null;
  let running: Promise<void> | null = null;
  async function drain() {
    while (pending !== null) {
      const snapshot = pending;
      pending = null;
      try { await save(snapshot); } catch (error) { onError(error); }
    }
  }
  return {
    enqueue(snapshot: T): Promise<void> {
      pending = snapshot;
      if (!running) running = drain().finally(() => { running = null; });
      return running;
    },
    flush(): Promise<void> { return running ?? Promise.resolve(); },
  };
}
