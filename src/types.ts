/** The six services the dashboard knows how to check. */
export type ServiceKey =
  | 'supabase'
  | 'resend'
  | 'render'
  | 'vercel'
  | 'githubActions'
  | 'githubPages';

export const SERVICE_KEYS: ServiceKey[] = [
  'supabase',
  'resend',
  'render',
  'vercel',
  'githubActions',
  'githubPages',
];

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  supabase: 'Supabase',
  resend: 'Resend',
  render: 'Render',
  vercel: 'Vercel',
  githubActions: 'GitHub Actions',
  githubPages: 'GitHub Pages',
};

/** Per-service settings for one game. Leave a service out if the game does not use it. */
export interface GameServices {
  /**
   * Supabase project ref, e.g. "dnnlmunlmmhiqpgkjbvr" (from the project URL).
   * `publishableKey` is the project's public key ("sb_publishable_..." or the legacy anon key). It is
   * already public in the game's own web page, and lets the database check run without any secret.
   * `tokenEnv` names the env var holding the access token, for projects in another Supabase account.
   * `healthUrl` is the game's own health route (e.g. "https://api.example.com/health"). It must run a
   * real database query and answer 200 {"ok":true,"db":"ok"} or 503. Until it exists (404), the
   * checks above are used.
   */
  supabase?: { projectRef?: string; name?: string; publishableKey?: string; tokenEnv?: string; healthUrl?: string };
  /** Resend sending domain, e.g. "mail.example.com". Omit domain to only check that the key works. */
  resend?: { domain?: string };
  /**
   * Render service. `url` is its public address (e.g. "https://my-api.onrender.com/healthz"), pinged
   * without a key. `serviceId` ("srv-...") plus RENDER_API_KEY adds suspended / deploy state.
   */
  render?: { serviceId?: string; url?: string; tokenEnv?: string };
  /** Vercel project name or id, and optional production URL for a ping fallback. */
  vercel?: { project: string; url?: string; tokenEnv?: string };
  /** GitHub repo "owner/name" and optional workflow file / branch filter. */
  githubActions?: { repo: string; workflow?: string; branch?: string };
  /** GitHub repo "owner/name" and optional Pages URL for a ping fallback. */
  githubPages?: { repo: string; url?: string };
}

export type GameKind = 'game' | 'web';

export interface Game {
  id: string;
  name: string;
  /** Short line shown under the name. */
  tagline?: string;
  kind: GameKind;
  /** Main colour of the island in the 3D scene. */
  color: string;
  /** Where people play it or open it. Shown as the "enter" button. */
  playUrl?: string;
  repo?: string;
  services: GameServices;
  /** false until Yiso confirms the service mapping. */
  confirmed: boolean;
}

export type StatusLevel = 'ok' | 'warn' | 'down' | 'unknown' | 'unused';

export interface ServiceStatus {
  level: StatusLevel;
  /** One short human-readable line. */
  detail: string;
  /** How the result was obtained. */
  source?: 'api' | 'ping' | 'none';
  /** Env var(s) that would enable a full check, when level is unknown or ping-only. */
  needs?: string[];
  /** True when the service is paused or suspended (not just failing). */
  paused?: boolean;
  /** Link to the service's own page for this project. */
  link?: string;
}

/** The three checks that decide a game's light. */
export type CoreCheck = 'playable' | 'db' | 'render';
export const CORE_CHECKS: CoreCheck[] = ['playable', 'db', 'render'];
export const CORE_LABELS: Record<CoreCheck, string> = {
  playable: '遊戲可玩',
  db: '資料庫連線',
  render: 'Render 服務',
};

export interface StatusReport {
  generatedAt: string;
  games: Record<string, Record<ServiceKey, ServiceStatus>>;
  /** Is the game playable: its playUrl must answer HTTP 200 with a page (no key needed). */
  sites?: Record<string, ServiceStatus>;
  /** Each provider's public status page: is the platform itself having an outage? */
  platforms?: Record<ServiceKey, ServiceStatus>;
}
