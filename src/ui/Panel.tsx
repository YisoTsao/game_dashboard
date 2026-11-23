import { STATUS_COLORS, STATUS_EMOJI, STATUS_LABELS } from '../theme';
import type { CoreCheck, Game, ServiceKey, ServiceStatus, StatusLevel } from '../types';
import { CORE_CHECKS, CORE_LABELS, SERVICE_KEYS, SERVICE_LABELS } from '../types';

/** Services shown under the light's checks (db = Supabase, render = Render), so not repeated below. */
const CORE_SERVICES: ServiceKey[] = ['supabase', 'render'];

interface Props {
  game: Game;
  statuses?: Record<ServiceKey, ServiceStatus>;
  /** The three checks behind the light (undefined = the game does not use it). */
  core?: Record<CoreCheck, ServiceStatus | undefined>;
  /** The game's light. */
  level: StatusLevel;
  platforms?: Record<ServiceKey, ServiceStatus>;
  onClose: () => void;
}

/** Paper card with the service list for one game. */
export function Panel({ game, statuses, core, level, platforms, onClose }: Props) {
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
      <section className="core">
        <h3>
          <span className="chip" style={{ background: STATUS_COLORS[level] }}>
            {STATUS_EMOJI[level]}
          </span>
          燈號：{STATUS_LABELS[level]}
        </h3>
        <p className="core-rule">三項都正常才是綠燈：遊戲可玩、資料庫連線、Render 服務。</p>
        <ul className="services">
          {CORE_CHECKS.map((k) => {
            const st = core?.[k];
            const used = k === 'playable' ? !!game.playUrl : !!game.services[k === 'db' ? 'supabase' : 'render'];
            return (
              <ServiceRow
                key={k}
                label={CORE_LABELS[k]}
                st={st ?? { level: used ? 'unknown' : 'unused', detail: used ? 'Not checked yet.' : '這款遊戲不使用。' }}
                platform={k === 'db' ? platforms?.supabase : k === 'render' ? platforms?.render : undefined}
              />
            );
          })}
        </ul>
      </section>
      <p className="links">
        {game.repo && (
          <a href={`https://github.com/${game.repo}`} target="_blank" rel="noreferrer">
            ⌥ {game.repo}
          </a>
        )}
      </p>
      {!game.confirmed && <p className="note">服務對應尚未確認，請編輯 src/data/games.ts。</p>}

      <h3 className="others-title">其他服務（不影響燈號）</h3>
      <ul className="services">
        {SERVICE_KEYS.filter((k) => !CORE_SERVICES.includes(k)).map((k) => (
          <ServiceRow
            key={k}
            label={SERVICE_LABELS[k]}
            st={
              statuses?.[k] ?? {
                level: game.services[k] ? 'unknown' : 'unused',
                detail: game.services[k] ? 'Not checked yet.' : 'Not used by this game.',
              }
            }
            platform={platforms?.[k]}
          />
        ))}
      </ul>
    </aside>
  );
}

function ServiceRow({ label, st, platform }: { label: string; st: ServiceStatus; platform?: ServiceStatus }) {
  return (
    <li className={`svc lvl-${st.level}`}>
      <span className="chip" style={{ background: STATUS_COLORS[st.level] }} title={STATUS_LABELS[st.level]}>
        {STATUS_EMOJI[st.level]}
      </span>
      <div className="svc-body">
        <div className="svc-head">
          <strong>{label}</strong>
          <span className="lvl">
            {st.paused ? '已暫停' : STATUS_LABELS[st.level]}
            {st.source === 'ping' && ' · 免金鑰'}
          </span>
        </div>
        {st.level !== 'unused' && <div className="detail">{st.detail}</div>}
        {st.level !== 'unused' && platform && (platform.level === 'warn' || platform.level === 'down') && (
          <div className="platform-note">
            {label} 平台事件：{platform.detail}
          </div>
        )}
        {st.needs && st.needs.length > 0 && (
          <div className="needs">
            {st.level === 'unknown' ? '需要：' : '更完整的檢查可加：'}
            {st.needs.map((n) => (
              <code key={n}>{n}</code>
            ))}
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
}
