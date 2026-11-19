# Game Dashboard

![Dashboard preview](docs/images/preview.png)

A cartoon 3D dashboard (React Three Fiber + Three.js + TypeScript) that lists Yiso's games and shows whether the services each one uses are working: Supabase, Resend, Render, Vercel, GitHub Actions and GitHub Pages.


## Run it

```bash
npm install
cp .env.example .env   # fill in the keys you have
npm run status         # checks every service, writes public/status.json
npm run dev            # http://localhost:5173
```

Other scripts: `npm test` (unit tests for the checks), `npm run build`, `npm run typecheck`.

## How it works

```
src/data/games.ts      the game list and which services each game uses  <- edit this
scripts/check-status.ts runs the checks in Node, writes public/status.json
src/status/checks.ts   one check per service
src/scene/             the 3D islands (R3F)
src/ui/                HTML panel
.github/workflows/status.yml  runs the check every 30 min and deploys to GitHub Pages
```

API keys are only read by the Node script (locally from `.env`, in CI from GitHub secrets). The web page only reads the finished `status.json`, so keys never reach the browser. `status.json` contains status text only, but note it is public if the site is public.

## Statuses

| Status | Meaning |
|---|---|
| 正常 ok | The API says it is healthy, or the site answers (marked "ping" when only pinged) |
| 注意 warn | Building, pending, cancelled, or an unexpected state |
| 異常 down | Failed deploy, failed run, site not answering |
| 已暫停 paused | Shown as down with a "已暫停" label: Supabase project paused, Render service suspended, Vercel project paused |
| 未知 unknown | No credential to check it. The panel names the env var that would enable it |
| 未使用 unused | The game does not use this service |

## What works without any key

- **Platform status (平台狀態)**: each provider's public status page (Supabase, Resend, Render, Vercel, and GitHub's Actions and Pages components). This shows whether the provider itself has an outage. It cannot tell you about your own project.
- **Site (網站)**: opens each game's `playUrl`. A down site shows as 異常. When a host serves its "paused" page instead of the game, it is flagged **已暫停**: Vercel `DEPLOYMENT_PAUSED`, Render "service suspended", Supabase HTTP 540.
- **Supabase project**: pings `https://<ref>.supabase.co/auth/v1/health`. HTTP 540 means the project is paused.
- **GitHub Actions / Pages**: the public API works for public repos.

A key is still needed for whatever a public URL cannot show: Resend domain status, a Render service that has no public URL, Vercel deployment state, and the exact Supabase status.

## What each check needs

| Service | Env var | What is checked | Without the key |
|---|---|---|---|
| Supabase | `SUPABASE_ACCESS_TOKEN` (one per account; set `tokenEnv` in games.ts for a second account) | Management API project status (`ACTIVE_HEALTHY`, `INACTIVE` = paused, …) | Pings `https://<ref>.supabase.co` (HTTP 540 = paused) |
| Resend | `RESEND_API_KEY` (full access) | Domain verification status | unknown |
| Render | `RENDER_API_KEY` + `serviceId` | Suspended flag and latest deploy | Pings `url` if set, else unknown |
| Vercel | `VERCEL_TOKEN` (+ `VERCEL_TEAM_ID`) | Latest production deployment state | Pings `url` if set |
| GitHub Actions | `GH_STATUS_TOKEN` (optional) | Latest workflow run result | Works for public repos |
| GitHub Pages | `GH_STATUS_TOKEN` (optional) | Latest Pages build | Pings the Pages URL |

See `.env.example` for where to create each key.

## Deploy on GitHub Pages

1. Repo Settings → Pages → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions: add the keys from `.env.example` you want.
3. Push to `main`, or run the "Check status and deploy" workflow by hand.

## Adding a game

Add an entry to `GAMES` in `src/data/games.ts`. Leave out services the game does not use. Set `confirmed: true` once the mapping is right.
