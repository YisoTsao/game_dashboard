import { STATUS_COLORS, STATUS_EMOJI, STATUS_LABELS } from '../theme';
import type { Game, ServiceKey, ServiceStatus } from '../types';
import { SERVICE_KEYS, SERVICE_LABELS } from '../types';

interface Props {
  game: Game;
  statuses?: Record<ServiceKey, ServiceStatus>;
  /** Result of opening the game's link. */
  site?: ServiceStatus;
  platforms?: Record<ServiceKey, ServiceStatus>;
  onClose: () => void;
}

/** Paper card with the service list for one game. */
export function Panel({ game, statuses, site, platforms, onClose }: Props) {
  return (
    <aside className="panel sketch" aria-label={`${game.name} services`}>
      <button className="close sketch-btn" onClick={onClose} aria-label="Close">
        ✕
      </button>
      <h2>
        <span className="swatch" style={{ background: game.color }} />
        {game.name}
      </h2>
      {game.tagline && <p className="tagline">{game.tagline}</p>}
      {game.playUrl && (
        <a className="play-btn sketch-btn" href={game.playUrl} target="_blank" rel="noreferrer">
          ▶ {game.kind === 'game' ? '進入遊戲' : '開啟網頁'}
          <span className="play-url">{game.playUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
        </a>
      )}
      {site && (
        <p className={`site-row lvl-${site.level}`}>
          <span className="chip" style={{ background: STATUS_COLORS[site.level] }}>
            {STATUS_EMOJI[site.level]}
          </span>
          <strong>網站</strong> {site.paused ? '已暫停：' : ''}
          {site.detail}
        </p>
      )}
      <p className="links">
        {game.repo && (
          <a href={`https://github.com/${game.repo}`} target="_blank" rel="noreferrer">
            ⌥ {game.repo}
          </a>
        )}
      </p>
      {!game.confirmed && <p className="note">服務對應尚未確認，請編輯 src/data/games.ts。</p>}

      <ul className="services">
        {SERVICE_KEYS.map((k) => {
          const st: ServiceStatus = statuses?.[k] ?? {
            level: game.services[k] ? 'unknown' : 'unused',
            detail: game.services[k] ? 'Not checked yet.' : 'Not used by this game.',
          };
          return (
            <li key={k} className={`svc lvl-${st.level}`}>
              <span className="chip" style={{ background: STATUS_COLORS[st.level] }} title={STATUS_LABELS[st.level]}>
                {STATUS_EMOJI[st.level]}
              </span>
              <div className="svc-body">
                <div className="svc-head">
                  <strong>{SERVICE_LABELS[k]}</strong>
                  <span className="lvl">
                    {st.paused ? '已暫停' : STATUS_LABELS[st.level]}
                    {st.source === 'ping' && ' · ping'}
                  </span>
                </div>
                {st.level !== 'unused' && <div className="detail">{st.detail}</div>}
                {st.level !== 'unused' && platforms?.[k] && (platforms[k].level === 'warn' || platforms[k].level === 'down') && (
                  <div className="platform-note">
                    {SERVICE_LABELS[k]} 平台事件：{platforms[k].detail}
                  </div>
                )}
                {st.needs && st.needs.length > 0 && (
                  <div className="needs">
                    完整檢查需要：{st.needs.map((n) => <code key={n}>{n}</code>)}
                  </div>
                )}
                {st.link && st.level !== 'unused' && (
                  <a className="svc-link" href={st.link} target="_blank" rel="noreferrer">
                    查看 ↗
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
