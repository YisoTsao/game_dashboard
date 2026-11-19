import { useMemo, useRef, useState } from 'react';
import { GAMES } from './data/games';
import { Scene } from './scene/Scene';
import { STATUS_COLORS, STATUS_EMOJI, STATUS_LABELS, worstLevel } from './theme';
import type { StatusLevel } from './types';
import { SERVICE_KEYS } from './types';
import { Panel } from './ui/Panel';
import { useStatus } from './useStatus';

const LEGEND: StatusLevel[] = ['ok', 'warn', 'down', 'unknown', 'unused'];

export default function App() {
  const { state, reload } = useStatus();
  const stageRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const report = state.kind === 'ready' ? state.report : undefined;
  const selected = GAMES.find((g) => g.id === selectedId) ?? null;

  const overall = useMemo(() => {
    const counts: Record<StatusLevel, number> = { ok: 0, warn: 0, down: 0, unknown: 0, unused: 0 };
    for (const g of GAMES) {
      const lv = report ? worstLevel(SERVICE_KEYS.map((k) => report.games[g.id]?.[k]?.level ?? 'unknown')) : 'unknown';
      counts[lv]++;
    }
    return counts;
  }, [report]);

  return (
    <div className="app">
      <div className="stage" ref={stageRef}>
        <Scene games={GAMES} report={report} selectedId={selectedId} onSelect={setSelectedId} labelRoot={stageRef} />
      </div>

      <header className="topbar">
        <div className="title sketch">
          <h1>遊戲儀表板</h1>
          <span className="sub">
            {GAMES.filter((g) => g.kind === 'game').length} 款遊戲 · {GAMES.filter((g) => g.kind === 'web').length} 個網頁
          </span>
        </div>
        <div className="summary sketch">
          {(['ok', 'warn', 'down', 'unknown'] as StatusLevel[]).map((l) => (
            <span key={l} className="sum-item" title={STATUS_LABELS[l]}>
              <span className="chip" style={{ background: STATUS_COLORS[l] }}>
                {STATUS_EMOJI[l]}
              </span>
              {overall[l]}
            </span>
          ))}
          <button className="sketch-btn" onClick={reload}>
            重新整理
          </button>
        </div>
      </header>

      <StatusNote state={state} />

      <nav className="game-strip" aria-label="Games">
        {GAMES.map((g) => {
          const lv = report ? worstLevel(SERVICE_KEYS.map((k) => report.games[g.id]?.[k]?.level ?? 'unknown')) : 'unknown';
          return (
            <button
              key={g.id}
              className={`game-chip sketch-btn ${selectedId === g.id ? 'is-on' : ''}`}
              onClick={() => setSelectedId(selectedId === g.id ? null : g.id)}
            >
              <span className="chip" style={{ background: STATUS_COLORS[lv] }}>
                {STATUS_EMOJI[lv]}
              </span>
              {g.name}
            </button>
          );
        })}
      </nav>

      <footer className="legend">
        {LEGEND.map((l) => (
          <span key={l}>
            <i style={{ background: STATUS_COLORS[l] }} />
            {STATUS_LABELS[l]}
          </span>
        ))}
      </footer>

      {selected && <Panel game={selected} statuses={report?.games[selected.id]} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function StatusNote({ state }: { state: ReturnType<typeof useStatus>['state'] }) {
  if (state.kind === 'ready')
    return <p className="checked">上次檢查：{new Date(state.report.generatedAt).toLocaleString()}</p>;
  if (state.kind === 'loading') return <p className="checked">讀取狀態中…</p>;
  if (state.kind === 'missing')
    return (
      <p className="checked warn sketch">
        還沒有 status.json。請執行 <code>npm run status</code>。
      </p>
    );
  return <p className="checked warn sketch">讀取狀態失敗：{state.message}</p>;
}
