import { describe, expect, it } from 'vitest';
import { checkAll, checkGame, checkPlatforms, checkSite, type Fetch } from '../src/status/checks';
import { gameLevel } from '../src/theme';
import type { Game, ServiceKey, ServiceStatus, StatusReport } from '../src/types';
import { SERVICE_KEYS } from '../src/types';

/** Fake fetch: routes are matched by URL prefix. */
function fakeFetch(routes: Record<string, [number, unknown] | [number, unknown, Record<string, string>]>): Fetch & { calls: { url: string; auth?: string }[] } {
  const calls: { url: string; auth?: string }[] = [];
  const fn = (async (url: string, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ url, auth: headers.authorization });
    const key = Object.keys(routes).find((k) => url.startsWith(k));
    if (!key) throw new TypeError('fetch failed');
    const [status, body, resHeaders] = routes[key] as [number, unknown, Record<string, string>?];
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: resHeaders });
  }) as unknown as Fetch & { calls: typeof calls };
  fn.calls = calls;
  return fn;
}

const base: Game = { id: 'g', name: 'G', kind: 'game', color: '#fff', services: {}, confirmed: true };

describe('checkGame', () => {
  it('marks services the game does not use as unused', async () => {
    const r = await checkGame(base, { env: {}, fetch: fakeFetch({}) });
    expect(Object.values(r).every((s) => s.level === 'unused')).toBe(true);
  });

  it('DB (token): management API db health', async () => {
    const game = { ...base, services: { supabase: { projectRef: 'abc' } } };
    const ok = await checkGame(game, {
      env: { SUPABASE_ACCESS_TOKEN: 't' },
      fetch: fakeFetch({ 'https://api.supabase.com/v1/projects/abc/health': [200, [{ name: 'db', healthy: true, status: 'ACTIVE_HEALTHY' }]] }),
    });
    expect(ok.supabase).toMatchObject({ level: 'ok', source: 'api' });
    const bad = await checkGame(game, {
      env: { SUPABASE_ACCESS_TOKEN: 't' },
      fetch: fakeFetch({
        'https://api.supabase.com/v1/projects/abc/health': [200, [{ name: 'db', healthy: false, status: 'UNHEALTHY' }]],
        'https://api.supabase.com/v1/projects/abc': [200, { status: 'ACTIVE_HEALTHY' }],
      }),
    });
    expect(bad.supabase).toMatchObject({ level: 'down', detail: expect.stringContaining('UNHEALTHY') });
  });

  it('DB (no token): REST API with the publishable key', async () => {
    const game = { ...base, services: { supabase: { projectRef: 'abc', publishableKey: 'sb_publishable_x' } } };
    const f = fakeFetch({ 'https://abc.supabase.co/rest/v1/': [200, { swagger: '2.0' }] });
    const ok = await checkGame(game, { env: {}, fetch: f });
    expect(ok.supabase).toMatchObject({ level: 'ok', source: 'ping', needs: ['SUPABASE_ACCESS_TOKEN'] });
    const noDb = await checkGame(game, {
      env: {},
      fetch: fakeFetch({ 'https://abc.supabase.co/rest/v1/': [503, { code: 'PGRST001', message: 'Database client error' }] }),
    });
    expect(noDb.supabase.level).toBe('down');
    const pgDenied = await checkGame(game, {
      env: {},
      fetch: fakeFetch({ 'https://abc.supabase.co/rest/v1/': [401, { code: '42501', message: 'permission denied' }] }),
    });
    expect(pgDenied.supabase.level).toBe('ok');
    const gatewayOnly = await checkGame(game, {
      env: {},
      fetch: fakeFetch({ 'https://abc.supabase.co/rest/v1/': [401, { message: 'Invalid API key' }] }),
    });
    expect(gatewayOnly.supabase.level).toBe('unknown');
  });

  it('DB: no token and no publishable key is unknown, not green', async () => {
    const game = { ...base, services: { supabase: { projectRef: 'abc' } } };
    const r = await checkGame(game, { env: {}, fetch: fakeFetch({}) });
    expect(r.supabase).toMatchObject({ level: 'unknown', needs: ['supabase.publishableKey in games.ts', 'SUPABASE_ACCESS_TOKEN'] });
  });

  it('Resend: unknown without key, verified domain is ok, restricted key is unknown', async () => {
    const game = { ...base, services: { resend: { domain: 'mail.x.com' } } };
    expect((await checkGame(game, { env: {}, fetch: fakeFetch({}) })).resend).toMatchObject({
      level: 'unknown',
      needs: ['RESEND_API_KEY'],
    });
    const ok = await checkGame(game, {
      env: { RESEND_API_KEY: 'k' },
      fetch: fakeFetch({ 'https://api.resend.com/domains': [200, { data: [{ name: 'mail.x.com', status: 'verified' }] }] }),
    });
    expect(ok.resend.level).toBe('ok');
    const restricted = await checkGame(game, {
      env: { RESEND_API_KEY: 'k' },
      fetch: fakeFetch({ 'https://api.resend.com/domains': [401, { name: 'restricted_api_key' }] }),
    });
    expect(restricted.resend.level).toBe('unknown');
  });

  it('Render: suspended service is down, live deploy is ok', async () => {
    const game = { ...base, services: { render: { serviceId: 'srv-1' } } };
    const env = { RENDER_API_KEY: 'k' };
    const down = await checkGame(game, {
      env,
      fetch: fakeFetch({ 'https://api.render.com/v1/services/srv-1': [200, { suspended: 'suspended' }] }),
    });
    expect(down.render).toMatchObject({ level: 'down', paused: true });
    const ok = await checkGame(game, {
      env,
      fetch: fakeFetch({
        'https://api.render.com/v1/services/srv-1/deploys': [200, [{ deploy: { status: 'live' } }]],
        'https://api.render.com/v1/services/srv-1': [200, { suspended: 'not_suspended' }],
      }),
    });
    expect(ok.render.level).toBe('ok');    const badKey = await checkGame(game, {
      env,
      fetch: fakeFetch({ 'https://api.render.com/v1/services/srv-1': [401, { message: 'unauthorized' }] }),
    });
    expect(badKey.render).toMatchObject({ level: 'unknown', needs: ['RENDER_API_KEY'] });
  });

  it('Render (no key): pings the service URL; missing URL is unknown', async () => {
    const game = { ...base, services: { render: { url: 'https://api.onrender.com/' } } };
    const up = await checkGame(game, { env: {}, fetch: fakeFetch({ 'https://api.onrender.com/': [404, 'Not Found'] }) });
    expect(up.render).toMatchObject({ level: 'ok', source: 'ping', needs: ['RENDER_API_KEY'] });
    const down = await checkGame(game, { env: {}, fetch: fakeFetch({ 'https://api.onrender.com/': [502, 'Bad gateway'] }) });
    expect(down.render.level).toBe('down');
    const none = await checkGame({ ...base, services: { render: {} } }, { env: {}, fetch: fakeFetch({}) });
    expect(none.render).toMatchObject({ level: 'unknown' });
    expect(none.render.needs).toContain('render.url in games.ts');
  });

  it('Vercel: READY production deploy is ok and passes the team id', async () => {
    const game = { ...base, services: { vercel: { project: 'p' } } };
    const f = fakeFetch({
      'https://api.vercel.com/v9/projects/p': [200, { id: 'prj_1' }],
      'https://api.vercel.com/v6/deployments': [200, { deployments: [{ readyState: 'READY' }] }],
    });
    const r = await checkGame(game, { env: { VERCEL_TOKEN: 't', VERCEL_TEAM_ID: 'team_1' }, fetch: f });
    expect(r.vercel.level).toBe('ok');
    expect(f.calls.every((c) => c.url.includes('teamId=team_1'))).toBe(true);
    expect(f.calls[0].auth).toBe('Bearer t');
  });

  it('GitHub Actions: failed run is down; private repo without token is unknown', async () => {
    const game = { ...base, services: { githubActions: { repo: 'o/r' } } };
    const failed = await checkGame(game, {
      env: {},
      fetch: fakeFetch({
        'https://api.github.com/repos/o/r/actions/runs': [
          200,
          { workflow_runs: [{ status: 'completed', conclusion: 'failure', name: 'CI', html_url: 'u' }] },
        ],
      }),
    });
    expect(failed.githubActions.level).toBe('down');
    const priv = await checkGame(game, {
      env: {},
      fetch: fakeFetch({ 'https://api.github.com/repos/o/r/actions/runs': [404, {}] }),
    });
    expect(priv.githubActions).toMatchObject({ level: 'unknown', needs: ['GH_STATUS_TOKEN'] });
  });

  it('GitHub Pages: falls back to pinging the site', async () => {
    const game = { ...base, services: { githubPages: { repo: 'Owner/site' } } };
    const r = await checkGame(game, {
      env: {},
      fetch: fakeFetch({
        'https://api.github.com/repos/Owner/site/pages': [401, {}],
        'https://owner.github.io/site/': [200, '<html>'],
      }),
    });
    expect(r.githubPages).toMatchObject({ level: 'ok', source: 'ping' });
  });

  it('Supabase: paused project is down and flagged paused', async () => {
    const game = { ...base, services: { supabase: { projectRef: 'abc' } } };
    const r = await checkGame(game, {
      env: { SUPABASE_ACCESS_TOKEN: 't' },
      fetch: fakeFetch({
        'https://api.supabase.com/v1/projects/abc/health': [200, [{ name: 'db', healthy: false, status: 'UNHEALTHY' }]],
        'https://api.supabase.com/v1/projects/abc': [200, { status: 'INACTIVE' }],
      }),
    });
    expect(r.supabase).toMatchObject({ level: 'down', paused: true });
  });

  it('Supabase: per-project tokenEnv picks the other account token', async () => {
    const game = { ...base, services: { supabase: { projectRef: 'abc', tokenEnv: 'SUPABASE_ACCESS_TOKEN_CALO' } } };
    const f = fakeFetch({ 'https://api.supabase.com/v1/projects/abc/health': [200, [{ name: 'db', healthy: true }]] });
    const r = await checkGame(game, { env: { SUPABASE_ACCESS_TOKEN: 'main', SUPABASE_ACCESS_TOKEN_CALO: 'calo' }, fetch: f });
    expect(r.supabase.level).toBe('ok');
    expect(f.calls[0].auth).toBe('Bearer calo');
  });

  it('Supabase: missing project ref is unknown and says what to fill in', async () => {
    const game = { ...base, services: { supabase: { name: 'Calo circle' } } };
    const r = await checkGame(game, { env: {}, fetch: fakeFetch({}) });
    expect(r.supabase.level).toBe('unknown');
    expect(r.supabase.needs).toContain('supabase.projectRef in games.ts');
  });

  it('Supabase: paused project answers 540 on ping', async () => {
    const game = { ...base, services: { supabase: { projectRef: 'abc', publishableKey: 'k' } } };
    const r = await checkGame(game, { env: {}, fetch: fakeFetch({ 'https://abc.supabase.co/': [540, 'paused'] }) });
    expect(r.supabase).toMatchObject({ level: 'down', paused: true, source: 'ping' });
  });

  it('Vercel: paused project is down and flagged paused', async () => {
    const game = { ...base, services: { vercel: { project: 'p' } } };
    const r = await checkGame(game, {
      env: { VERCEL_TOKEN: 't' },
      fetch: fakeFetch({ 'https://api.vercel.com/v9/projects/p': [200, { id: 'prj_1', paused: true }] }),
    });
    expect(r.vercel).toMatchObject({ level: 'down', paused: true });
  });

  it('Platforms: reads Statuspage indicators and GitHub components without any key', async () => {
    const f = fakeFetch({
      'https://status.supabase.com/': [200, { status: { indicator: 'none', description: 'All Systems Operational' } }],
      'https://resend-status.com/': [200, { page: { status: 'HASISSUES' } }],
      'https://status.render.com/': [200, { status: { indicator: 'minor', description: 'Minor Service Outage' } }],
      'https://www.vercel-status.com/': [500, 'oops'],
      'https://www.githubstatus.com/': [
        200,
        { components: [{ name: 'Actions', status: 'operational' }, { name: 'Pages', status: 'major_outage' }] },
      ],
    });
    const p = await checkPlatforms({ env: {}, fetch: f });
    expect(p.supabase.level).toBe('ok');
    expect(p.resend.level).toBe('down');
    expect(p.render.level).toBe('warn');
    expect(p.vercel.level).toBe('unknown');
    expect(p.githubActions.level).toBe('ok');
    expect(p.githubPages.level).toBe('down');
    // GitHub summary fetched once for both components
    expect(f.calls.filter((c) => c.url.includes('githubstatus')).length).toBe(1);
  });

  it('Site: up, Vercel paused page, Render suspended page', async () => {
    const game = { ...base, playUrl: 'https://g.example/' };
    const up = await checkSite(game, { env: {}, fetch: fakeFetch({ 'https://g.example/': [200, '<html>'] }) });
    expect(up?.level).toBe('ok');
    const vercel = await checkSite(game, {
      env: {},
      fetch: fakeFetch({ 'https://g.example/': [503, 'paused', { 'x-vercel-error': 'DEPLOYMENT_PAUSED' }] }),
    });
    expect(vercel).toMatchObject({ level: 'down', paused: true });
    const render = await checkSite(game, {
      env: {},
      fetch: fakeFetch({ 'https://g.example/': [503, '<h1>This service has been suspended.</h1>'] }),
    });
    expect(render).toMatchObject({ level: 'down', paused: true });
    expect(await checkSite(base, { env: {}, fetch: fakeFetch({}) })).toBeUndefined();
  });

  it('Playable: requires 200, so a 404 or login wall is down', async () => {
    const game = { ...base, playUrl: 'https://g.example/' };
    const nf = await checkSite(game, { env: {}, fetch: fakeFetch({ 'https://g.example/': [404, 'Not Found'] }) });
    expect(nf?.level).toBe('down');
    const auth = await checkSite(game, { env: {}, fetch: fakeFetch({ 'https://g.example/': [401, 'Login'] }) });
    expect(auth?.level).toBe('down');
    const json = await checkSite(game, { env: {}, fetch: fakeFetch({ 'https://g.example/': [200, { ok: true }] }) });
    expect(json?.level).toBe('warn');
  });
});

describe('gameLevel (the light)', () => {
  const ok = { level: 'ok' as const, detail: '' };
  const report = (games: Record<string, Partial<Record<ServiceKey, ServiceStatus>>>, sites: Record<string, ServiceStatus>) => {
    const unused = Object.fromEntries(SERVICE_KEYS.map((k) => [k, { level: 'unused', detail: '' }]));
    return {
      generatedAt: '',
      games: Object.fromEntries(Object.entries(games).map(([id, g]) => [id, { ...unused, ...g }])),
      sites,
    } as StatusReport;
  };

  it('green only when playable, db and render are all ok', () => {
    expect(gameLevel(report({ g: { supabase: ok, render: ok } }, { g: ok }), 'g')).toBe('ok');
    expect(gameLevel(report({ g: { supabase: ok, render: { level: 'unknown', detail: '' } } }, { g: ok }), 'g')).toBe('unknown');
    expect(gameLevel(report({ g: { supabase: { level: 'down', detail: '' }, render: ok } }, { g: ok }), 'g')).toBe('down');
    expect(gameLevel(report({ g: { supabase: ok, render: ok } }, { g: { level: 'down', detail: '' } }), 'g')).toBe('down');
  });

  it('other services do not change the light; unused core checks are skipped', () => {
    const r = report({ g: { githubActions: { level: 'down', detail: '' }, vercel: { level: 'warn', detail: '' } } }, { g: ok });
    expect(gameLevel(r, 'g')).toBe('ok');
  });

  it('checkAll: report includes sites and platforms', async () => {
    const r = await checkAll([{ ...base, playUrl: 'https://g.example/' }], {}, fakeFetch({ 'https://g.example/': [200, '<html>'] }));
    expect(r.sites?.g.level).toBe('ok');
    expect(Object.keys(r.platforms ?? {})).toHaveLength(6);
  });
});
