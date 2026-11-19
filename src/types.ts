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
   * `tokenEnv` names the env var holding the access token, for projects in another Supabase account.
   */
  supabase?: { projectRef?: string; name?: string; tokenEnv?: string };
  /** Resend sending domain, e.g. "mail.example.com". Omit domain to only check that the key works. */
  resend?: { domain?: string };
  /** Render service id ("srv-...") and optional public URL for a ping fallback. */
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

export interface StatusReport {
  generatedAt: string;
  games: Record<string, Record<ServiceKey, ServiceStatus>>;
  /** Result of opening each game's playUrl (no key needed). */
  sites?: Record<string, ServiceStatus>;
  /** Each provider's public status page: is the platform itself having an outage? */
  platforms?: Record<ServiceKey, ServiceStatus>;
}
