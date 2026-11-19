import { useCallback, useEffect, useState } from 'react';
import type { StatusReport } from './types';

export type LoadState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; report: StatusReport };

/** Loads status.json, which scripts/check-status.ts writes. */
export function useStatus() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState((s) => (s.kind === 'ready' ? s : { kind: 'loading' }));
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}status.json?t=${Date.now()}`);
      if (res.status === 404) return setState({ kind: 'missing' });
      if (!res.ok) return setState({ kind: 'error', message: `HTTP ${res.status}` });
      const report = (await res.json()) as StatusReport;
      setState({ kind: 'ready', report });
    } catch (err) {
      // Vite dev server serves index.html for unknown paths, so a missing file shows up as a JSON parse error.
      setState(err instanceof SyntaxError ? { kind: 'missing' } : { kind: 'error', message: String(err) });
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => clearInterval(id);
  }, [load]);

  return { state, reload: load };
}
