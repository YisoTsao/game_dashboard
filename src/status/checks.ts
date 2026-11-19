/**
 * Service checks. Runs in Node (scripts/check-status.ts), never in the browser,
 * so API keys stay on the server side.
 */
import type { Game, ServiceKey, ServiceStatus, StatusReport } from '../types';
import { SERVICE_KEYS } from '../types';

export type Env = Record<string, string | undefined>;
export type Fetch = typeof fetch;

const TIMEOUT_MS = 10_000;

interface Ctx {
  env: Env;
  fetch: Fetch;
}

async function request(ctx: Ctx, url: string, headers: Record<string, string> = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await ctx.fetch(url, {
      headers: { 'user-agent': 'game-dashboard-status', ...headers },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    let body: unknown = null;
    const text = await res.text();
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { status: res.status, ok: res.ok, body, text, headers: res.headers };
  } finally {
    clearTimeout(timer);
  }
}

function errorStatus(err: unknown): ServiceStatus {
  const msg = err instanceof Error ? (err.name === 'AbortError' ? 'timed out' : err.message) : String(err);
  return { level: 'down', detail: `Request failed: ${msg}`, source: 'api' };
}

/** Ping a public URL. Used when no API key is set. */
/** Recognise the "this project is paused / suspended" pages that hosts serve instead of the site. */
export function detectPausedPage(res: { status: number; text: string; headers: Headers }): string | null {
  const vercelErr = res.headers.get('x-vercel-error') ?? '';
  if (/DEPLOYMENT_PAUSED|DEPLOYMENT_DISABLED/i.test(vercelErr) || /DEPLOYMENT_PAUSED/.test(res.text))
    return 'Vercel project is paused.';
  const renderRouting = res.headers.get('x-render-routing') ?? '';
  if (/suspend/i.test(renderRouting) || (res.status >= 400 && /service (has been )?suspended/i.test(res.text)))
    return 'Render service is suspended.';
  if (res.status === 540) return 'Supabase project is paused (HTTP 540).';
  return null;
}

async function ping(ctx: Ctx, url: string, needs: string[]): Promise<ServiceStatus> {
  try {
    const res = await request(ctx, url);
    const paused = detectPausedPage(res);
    if (paused) return { level: 'down', detail: paused, paused: true, source: 'ping', needs, link: url };
    if (res.status < 500) {
      return { level: 'ok', detail: `Site answers (HTTP ${res.status}). Ping only.`, source: 'ping', needs, link: url };
    }
    return { level: 'down', detail: `Site returned HTTP ${res.status}.`, source: 'ping', needs, link: url };
  } catch (err) {
    return { ...errorStatus(err), source: 'ping', needs, link: url };
  }
}

function unknown(needs: string[], why: string): ServiceStatus {
  return { level: 'unknown', detail: why, source: 'none', needs };
}

// ---------------------------------------------------------------- Supabase
/** Supabase management API statuses that mean the project is paused or gone. */
const SUPABASE_PAUSED = /INACTIVE|PAUSED|PAUSING|REMOVED|GOING_DOWN/;
const SUPABASE_BROKEN = /RESTORE_FAILED|INIT_FAILED|UPGRADE_FAILED|PAUSE_FAILED/;

async function checkSupabase(ctx: Ctx, cfg: NonNullable<Game['services']['supabase']>): Promise<ServiceStatus> {
  const tokenEnv = cfg.tokenEnv ?? 'SUPABASE_ACCESS_TOKEN';
  if (!cfg.projectRef) {
    return unknown(
      ['supabase.projectRef in games.ts', tokenEnv],
      `Project ref not set${cfg.name ? ` for "${cfg.name}"` : ''}.`,
    );
  }
  const link = `https://supabase.com/dashboard/project/${cfg.projectRef}`;
  const token = ctx.env[tokenEnv];
  if (!token) {
    // Without a token we can still see whether the API host answers. A paused project answers 540.
    const url = `https://${cfg.projectRef}.supabase.co/auth/v1/health`;
    try {
      const res = await request(ctx, url);
      if (res.status === 540)
        return { level: 'down', detail: 'Project is paused (HTTP 540).', paused: true, source: 'ping', needs: [tokenEnv], link };
    } catch {
      // handled by ping below
    }
    return { ...(await ping(ctx, url, [tokenEnv])), link };
  }
  try {
    const res = await request(ctx, `https://api.supabase.com/v1/projects/${cfg.projectRef}`, {
      authorization: `Bearer ${token}`,
    });
    if (res.status === 401 || res.status === 403 || res.status === 404)
      return {
        level: 'unknown',
        detail: `Token cannot see this project (HTTP ${res.status}). Is it in another Supabase account?`,
        source: 'api',
        needs: [tokenEnv],
        link,
      };
    if (!res.ok) return { level: 'down', detail: `Supabase API returned HTTP ${res.status}.`, source: 'api', link };
    const status = String((res.body as { status?: string })?.status ?? 'UNKNOWN');
    if (status === 'ACTIVE_HEALTHY') return { level: 'ok', detail: 'Project is active and healthy.', source: 'api', link };
    if (SUPABASE_PAUSED.test(status))
      return { level: 'down', detail: `Project is paused (${status}). Restore it in the Supabase dashboard.`, paused: true, source: 'api', link };
    if (SUPABASE_BROKEN.test(status)) return { level: 'down', detail: `Project status: ${status}.`, source: 'api', link };
    return { level: 'warn', detail: `Project status: ${status}.`, source: 'api', link };
  } catch (err) {
    return { ...errorStatus(err), link };
  }
}

// ---------------------------------------------------------------- Resend
async function checkResend(ctx: Ctx, cfg: NonNullable<Game['services']['resend']>): Promise<ServiceStatus> {
  const link = 'https://resend.com/domains';
  const key = ctx.env.RESEND_API_KEY;
  if (!key) return { ...unknown(['RESEND_API_KEY'], 'No Resend API key set.'), link };
  try {
    const res = await request(ctx, 'https://api.resend.com/domains', { authorization: `Bearer ${key}` });
    if (res.status === 401 || res.status === 403)
      return {
        level: 'unknown',
        detail: 'Key cannot list domains. Use a Resend key with "Full access".',
        source: 'api',
        needs: ['RESEND_API_KEY'],
        link,
      };
    if (!res.ok) return { level: 'down', detail: `Resend API returned HTTP ${res.status}.`, source: 'api', link };
    const domains = ((res.body as { data?: { name: string; status: string }[] })?.data ?? []);
    if (!cfg.domain) return { level: 'ok', detail: `API key works (${domains.length} domain(s)).`, source: 'api', link };
    const d = domains.find((x) => x.name === cfg.domain);
    if (!d) return { level: 'down', detail: `Domain ${cfg.domain} not found in Resend.`, source: 'api', link };
    if (d.status === 'verified') return { level: 'ok', detail: `${d.name} is verified.`, source: 'api', link };
    if (/failed|temporary_failure/.test(d.status))
      return { level: 'down', detail: `${d.name}: ${d.status}.`, source: 'api', link };
    return { level: 'warn', detail: `${d.name}: ${d.status}.`, source: 'api', link };
  } catch (err) {
    return { ...errorStatus(err), link };
  }
}

// ---------------------------------------------------------------- Render
async function checkRender(ctx: Ctx, cfg: NonNullable<Game['services']['render']>): Promise<ServiceStatus> {
  const keyEnv = cfg.tokenEnv ?? 'RENDER_API_KEY';
  const key = ctx.env[keyEnv];
  const link = cfg.serviceId ? `https://dashboard.render.com/web/${cfg.serviceId}` : 'https://dashboard.render.com';
  if (!key || !cfg.serviceId) {
    const needs = [!cfg.serviceId && 'render.serviceId in games.ts', !key && keyEnv].filter(Boolean) as string[];
    if (cfg.url) return { ...(await ping(ctx, cfg.url, needs)), link };
    return { ...unknown(needs, cfg.serviceId ? 'No Render API key set.' : 'Render service id not set.'), link };
  }
  try {
    const auth = { authorization: `Bearer ${key}`, accept: 'application/json' };
    const svc = await request(ctx, `https://api.render.com/v1/services/${cfg.serviceId}`, auth);
    if (!svc.ok) return { level: 'down', detail: `Render API returned HTTP ${svc.status}.`, source: 'api', link };
    if ((svc.body as { suspended?: string })?.suspended === 'suspended')
      return { level: 'down', detail: 'Service is suspended (paused). Resume it in the Render dashboard.', paused: true, source: 'api', link };
    const deploys = await request(ctx, `https://api.render.com/v1/services/${cfg.serviceId}/deploys?limit=1`, auth);
    const list = (deploys.body as { deploy?: { status: string } }[]) ?? [];
    const st = Array.isArray(list) ? list[0]?.deploy?.status : undefined;
    if (!st || st === 'live') return { level: 'ok', detail: st ? 'Latest deploy is live.' : 'Service is running.', source: 'api', link };
    if (/failed|canceled|deactivated/.test(st)) return { level: 'down', detail: `Latest deploy: ${st}.`, source: 'api', link };
    return { level: 'warn', detail: `Latest deploy: ${st}.`, source: 'api', link };
  } catch (err) {
    return { ...errorStatus(err), link };
  }
}

// ---------------------------------------------------------------- Vercel
async function checkVercel(ctx: Ctx, cfg: NonNullable<Game['services']['vercel']>): Promise<ServiceStatus> {
  const tokenEnv = cfg.tokenEnv ?? 'VERCEL_TOKEN';
  const token = ctx.env[tokenEnv];
  const link = cfg.url;
  if (!token) {
    if (cfg.url) return ping(ctx, cfg.url, [tokenEnv]);
    return unknown([tokenEnv], 'No Vercel token set.');
  }
  const team = ctx.env.VERCEL_TEAM_ID ? `&teamId=${encodeURIComponent(ctx.env.VERCEL_TEAM_ID)}` : '';
  const auth = { authorization: `Bearer ${token}` };
  try {
    const proj = await request(ctx, `https://api.vercel.com/v9/projects/${encodeURIComponent(cfg.project)}?${team.slice(1)}`, auth);
    if (proj.status === 404) return { level: 'down', detail: `Project "${cfg.project}" not found (check VERCEL_TEAM_ID).`, source: 'api', link };
    if (!proj.ok) return { level: 'down', detail: `Vercel API returned HTTP ${proj.status}.`, source: 'api', link };
    const project = proj.body as { id: string; paused?: boolean; live?: boolean };
    if (project.paused) return { level: 'down', detail: 'Project is paused on Vercel.', paused: true, source: 'api', link };
    const id = project.id;
    const deps = await request(ctx, `https://api.vercel.com/v6/deployments?projectId=${id}&target=production&limit=1${team}`, auth);
    const d = (deps.body as { deployments?: { state?: string; readyState?: string; url?: string }[] })?.deployments?.[0];
    const state = d?.readyState ?? d?.state;
    if (!state) return { level: 'warn', detail: 'No production deployment yet.', source: 'api', link };
    if (state === 'READY') return { level: 'ok', detail: 'Production deployment is ready.', source: 'api', link };
    if (state === 'ERROR' || state === 'CANCELED') return { level: 'down', detail: `Latest production deploy: ${state}.`, source: 'api', link };
    return { level: 'warn', detail: `Latest production deploy: ${state}.`, source: 'api', link };
  } catch (err) {
    return { ...errorStatus(err), link };
  }
}

// ---------------------------------------------------------------- GitHub
function ghHeaders(ctx: Ctx) {
  const token = ctx.env.GH_STATUS_TOKEN || ctx.env.GITHUB_TOKEN;
  const h: Record<string, string> = { accept: 'application/vnd.github+json' };
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}

async function checkActions(ctx: Ctx, cfg: NonNullable<Game['services']['githubActions']>): Promise<ServiceStatus> {
  const base = cfg.workflow
    ? `https://api.github.com/repos/${cfg.repo}/actions/workflows/${cfg.workflow}/runs`
    : `https://api.github.com/repos/${cfg.repo}/actions/runs`;
  const url = `${base}?per_page=1${cfg.branch ? `&branch=${encodeURIComponent(cfg.branch)}` : ''}`;
  const link = `https://github.com/${cfg.repo}/actions`;
  try {
    const res = await request(ctx, url, ghHeaders(ctx));
    if (res.status === 404 || res.status === 401 || res.status === 403)
      return {
        level: 'unknown',
        detail: `GitHub returned HTTP ${res.status} (private repo or rate limit).`,
        source: 'api',
        needs: ['GH_STATUS_TOKEN'],
        link,
      };
    if (!res.ok) return { level: 'down', detail: `GitHub API returned HTTP ${res.status}.`, source: 'api', link };
    const run = (res.body as { workflow_runs?: { status: string; conclusion: string | null; name: string; html_url: string }[] })
      ?.workflow_runs?.[0];
    if (!run) return { level: 'unused', detail: 'No workflow runs found.', source: 'api', link };
    const name = run.name;
    if (run.status !== 'completed') return { level: 'warn', detail: `"${name}" is ${run.status}.`, source: 'api', link: run.html_url };
    if (run.conclusion === 'success') return { level: 'ok', detail: `"${name}" passed.`, source: 'api', link: run.html_url };
    if (run.conclusion === 'failure' || run.conclusion === 'timed_out' || run.conclusion === 'startup_failure')
      return { level: 'down', detail: `"${name}" ${run.conclusion}.`, source: 'api', link: run.html_url };
    return { level: 'warn', detail: `"${name}" ${run.conclusion}.`, source: 'api', link: run.html_url };
  } catch (err) {
    return { ...errorStatus(err), link };
  }
}

async function checkPages(ctx: Ctx, cfg: NonNullable<Game['services']['githubPages']>): Promise<ServiceStatus> {
  const [owner, name] = cfg.repo.split('/');
  const siteUrl = cfg.url ?? `https://${owner.toLowerCase()}.github.io/${name}/`;
  try {
    const res = await request(ctx, `https://api.github.com/repos/${cfg.repo}/pages/builds/latest`, ghHeaders(ctx));
    if (res.ok) {
      const st = (res.body as { status?: string })?.status;
      if (st === 'built') return { level: 'ok', detail: 'Latest Pages build is live.', source: 'api', link: siteUrl };
      if (st === 'errored') return { level: 'down', detail: 'Latest Pages build errored.', source: 'api', link: siteUrl };
      return { level: 'warn', detail: `Pages build: ${st ?? 'unknown'}.`, source: 'api', link: siteUrl };
    }
  } catch {
    // fall through to a ping
  }
  // The builds endpoint needs auth, and Pages deployed from Actions have no "builds". Ping the site instead.
  return ping(ctx, siteUrl, ['GH_STATUS_TOKEN']);
}

// ---------------------------------------------------------------- platform status pages
/**
 * Public status pages (no key needed). They say whether the provider itself has an outage,
 * not whether one of your projects is paused.
 * Most use the Atlassian Statuspage JSON API; GitHub is read per component (Actions, Pages).
 */
export const PLATFORM_STATUS: Record<ServiceKey, { url: string; page: string; component?: string }> = {
  supabase: { url: 'https://status.supabase.com/api/v2/status.json', page: 'https://status.supabase.com' },
  resend: { url: 'https://resend-status.com/api/v2/status.json', page: 'https://resend-status.com' },
  render: { url: 'https://status.render.com/api/v2/status.json', page: 'https://status.render.com' },
  vercel: { url: 'https://www.vercel-status.com/api/v2/status.json', page: 'https://www.vercel-status.com' },
  githubActions: {
    url: 'https://www.githubstatus.com/api/v2/summary.json',
    page: 'https://www.githubstatus.com',
    component: 'Actions',
  },
  githubPages: {
    url: 'https://www.githubstatus.com/api/v2/summary.json',
    page: 'https://www.githubstatus.com',
    component: 'Pages',
  },
};

const INDICATOR: Record<string, ServiceStatus['level']> = { none: 'ok', minor: 'warn', major: 'down', critical: 'down', maintenance: 'warn' };
const COMPONENT: Record<string, ServiceStatus['level']> = {
  operational: 'ok',
  degraded_performance: 'warn',
  under_maintenance: 'warn',
  partial_outage: 'down',
  major_outage: 'down',
};

type StatusBody = {
  status?: { indicator?: string; description?: string };
  components?: { name: string; status: string }[];
  page?: { status?: string };
};

export async function checkPlatforms(ctx: Ctx): Promise<Record<ServiceKey, ServiceStatus>> {
  const cache = new Map<string, Promise<Awaited<ReturnType<typeof request>> | Error>>();
  const get = (url: string) => {
    if (!cache.has(url)) cache.set(url, request(ctx, url).catch((e: Error) => e));
    return cache.get(url)!;
  };
  const out = {} as Record<ServiceKey, ServiceStatus>;
  await Promise.all(
    SERVICE_KEYS.map(async (k) => {
      const cfg = PLATFORM_STATUS[k];
      const res = await get(cfg.url);
      const link = cfg.page;
      if (res instanceof Error || !res.ok || typeof res.body !== 'object' || !res.body) {
        out[k] = { level: 'unknown', detail: 'Status page could not be read.', source: 'api', link };
        return;
      }
      const body = res.body as StatusBody;
      if (cfg.component) {
        const c = body.components?.find((x) => x.name === cfg.component);
        const level = c ? (COMPONENT[c.status] ?? 'warn') : 'unknown';
        out[k] = { level, detail: c ? `${cfg.component}: ${c.status.replace(/_/g, ' ')}` : 'Component not listed.', source: 'api', link };
        return;
      }
      const ind = body.status?.indicator;
      if (ind) {
        out[k] = { level: INDICATOR[ind] ?? 'warn', detail: body.status?.description ?? ind, source: 'api', link };
        return;
      }
      // Instatus-style pages: { page: { status: "UP" | "HASISSUES" | "UNDERMAINTENANCE" } }
      const ps = body.page?.status;
      if (ps) {
        out[k] = { level: ps === 'UP' ? 'ok' : ps === 'UNDERMAINTENANCE' ? 'warn' : 'down', detail: ps, source: 'api', link };
        return;
      }
      out[k] = { level: 'unknown', detail: 'Unrecognised status page format.', source: 'api', link };
    }),
  );
  return out;
}

// ---------------------------------------------------------------- live site
/** Pings the game's own link. Catches "paused" pages from Vercel, Render and Supabase without any key. */
export async function checkSite(game: Game, ctx: Ctx): Promise<ServiceStatus | undefined> {
  if (!game.playUrl) return undefined;
  const r = await ping(ctx, game.playUrl, []);
  const { needs: _n, ...rest } = r;
  return { ...rest, detail: r.level === 'ok' ? `Site is up (HTTP ${r.detail.match(/HTTP (\d+)/)?.[1] ?? '?'}).` : r.detail };
}

// ---------------------------------------------------------------- runner
const UNUSED: ServiceStatus = { level: 'unused', detail: 'Not used by this game.' };

export async function checkGame(game: Game, ctx: Ctx): Promise<Record<ServiceKey, ServiceStatus>> {
  const s = game.services;
  const tasks: Record<ServiceKey, Promise<ServiceStatus>> = {
    supabase: s.supabase ? checkSupabase(ctx, s.supabase) : Promise.resolve(UNUSED),
    resend: s.resend ? checkResend(ctx, s.resend) : Promise.resolve(UNUSED),
    render: s.render ? checkRender(ctx, s.render) : Promise.resolve(UNUSED),
    vercel: s.vercel ? checkVercel(ctx, s.vercel) : Promise.resolve(UNUSED),
    githubActions: s.githubActions ? checkActions(ctx, s.githubActions) : Promise.resolve(UNUSED),
    githubPages: s.githubPages ? checkPages(ctx, s.githubPages) : Promise.resolve(UNUSED),
  };
  const out = {} as Record<ServiceKey, ServiceStatus>;
  await Promise.all(
    SERVICE_KEYS.map(async (k) => {
      out[k] = await tasks[k];
    }),
  );
  return out;
}

export async function checkAll(games: Game[], env: Env, fetchImpl: Fetch = fetch): Promise<StatusReport> {
  const ctx = { env, fetch: fetchImpl };
  const [entries, sites, platforms] = await Promise.all([
    Promise.all(games.map(async (g) => [g.id, await checkGame(g, ctx)] as const)),
    Promise.all(games.map(async (g) => [g.id, await checkSite(g, ctx)] as const)),
    checkPlatforms(ctx),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    games: Object.fromEntries(entries),
    sites: Object.fromEntries(sites.filter(([, s]) => s)) as Record<string, ServiceStatus>,
    platforms,
  };
}
