import { describe, expect, it } from 'vitest';
import { checkGame, type Fetch } from '../src/status/checks';
import type { Game } from '../src/types';

/** Fake fetch: routes are matched by URL prefix. */
function fakeFetch(routes: Record<string, [number, unknown]>): Fetch & { calls: { url: string; auth?: string }[] } {
  const calls: { url: string; auth?: string }[] = [];
  const fn = (async (url: string, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ url, auth: headers.authorization });
    const key = Object.keys(routes).find((k) => url.startsWith(k));
    if (!key) throw new TypeError('fetch failed');
    const [status, body] = routes[key];
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
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

  it('Supabase: API status when a token is set', async () => {
    const game = { ...base, services: { supabase: { projectRef: 'abc' } } };
    const ok = await checkGame(game, {
      env: { SUPABASE_ACCESS_TOKEN: 't' },
      fetch: fakeFetch({ 'https://api.supabase.com/v1/projects/abc': [200, { status: 'ACTIVE_HEALTHY' }] }),
    });
    expect(ok.supabase.level).toBe('ok');
    const paused = await checkGame(game, {
      env: { SUPABASE_ACCESS_TOKEN: 't' },
      fetch: fakeFetch({ 'https://api.supabase.com/v1/projects/abc': [200, { status: 'INACTIVE' }] }),
    });
    expect(paused.supabase.level).toBe('down');
  });

  it('Supabase: ping only, and names the token, when no token is set', async () => {
    const game = { ...base, services: { supabase: { projectRef: 'abc' } } };
    const r = await checkGame(game, { env: {}, fetch: fakeFetch({ 'https://abc.supabase.co/': [401, {}] }) });
    expect(r.supabase).toMatchObject({ level: 'ok', source: 'ping', needs: ['SUPABASE_ACCESS_TOKEN'] });
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
    expect(down.render.level).toBe('down');
    const ok = await checkGame(game, {
      env,
      fetch: fakeFetch({
        'https://api.render.com/v1/services/srv-1/deploys': [200, [{ deploy: { status: 'live' } }]],
        'https://api.render.com/v1/services/srv-1': [200, { suspended: 'not_suspended' }],
      }),
    });
    expect(ok.render.level).toBe('ok');
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
});
