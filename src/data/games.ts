import type { Game } from '../types';

/**
 * The game list. Edit this file to add a game or change which services it uses.
 *
 * - Leave a service out of `services` if the game does not use it (it shows as "not used").
 * - `playUrl` is the "enter" link shown on the island, the bottom bar and the panel.
 * - A service with a missing id (Supabase projectRef, Render serviceId) shows as "unknown"
 *   and the panel says what to fill in.
 * - `tokenEnv` lets one project use a different API key, e.g. a Supabase project that lives
 *   in another account.
 *
 * Mapping confirmed by Yiso on 2026-11-19.
 */
export const GAMES: Game[] = [
  {
    id: 'misty-forest',
    name: '迷霧之森',
    tagline: 'Misty Forest · 星光旅人',
    kind: 'game',
    color: '#7FB77E',
    playUrl: 'https://mistwood.yisoapp.com/',
    repo: 'YisoTsao/misty-forest',
    services: {
      supabase: { projectRef: 'dnnlmunlmmhiqpgkjbvr', name: 'mistwood' },
      resend: {}, // TODO: set `domain` to the sending domain to check its verification
      render: {}, // TODO: set `serviceId` ("srv-...") and `url`
      vercel: { project: 'mistwood', url: 'https://mistwood.yisoapp.com/' },
      githubActions: { repo: 'YisoTsao/misty-forest' },
    },
    confirmed: true,
  },
  {
    id: 'sky-cube-island',
    name: '天空方塊島',
    tagline: 'Sky Cube Island',
    kind: 'game',
    color: '#6FB7E0',
    playUrl: 'https://yisotsao.github.io/sky-cube-island/',
    repo: 'YisoTsao/sky-cube-island',
    services: {
      githubActions: { repo: 'YisoTsao/sky-cube-island' },
      githubPages: { repo: 'YisoTsao/sky-cube-island', url: 'https://yisotsao.github.io/sky-cube-island/' },
    },
    confirmed: true,
  },
  {
    id: 'calorie-count',
    name: '卡洛里計算',
    tagline: 'Calo Circle',
    kind: 'game',
    color: '#F2C14E',
    playUrl: 'http://calo-circle.yisoapp.com/',
    repo: 'YisoTsao/calorie-count',
    services: {
      // "Calo circle" is in a different Supabase account from the other two projects.
      // TODO: set projectRef, and put that account's token in SUPABASE_ACCESS_TOKEN_CALO.
      supabase: { name: 'Calo circle', tokenEnv: 'SUPABASE_ACCESS_TOKEN_CALO' },
      vercel: { project: 'calorie-count', url: 'http://calo-circle.yisoapp.com/' },
      githubActions: { repo: 'YisoTsao/calorie-count' },
    },
    confirmed: true,
  },
  {
    id: 'infinity-web',
    name: '無限網頁',
    tagline: 'Infinity Web',
    kind: 'game',
    color: '#A68BD8',
    playUrl: 'https://infinity-web-source.yisoapp.com/cosmos/',
    repo: 'YisoTsao/infinity-web-source',
    services: {
      githubActions: { repo: 'YisoTsao/infinity-web-source' },
      githubPages: {
        repo: 'YisoTsao/infinity-web-source',
        url: 'https://infinity-web-source.yisoapp.com/cosmos/',
      },
    },
    confirmed: true,
  },
  {
    id: 'tokyo-trip',
    name: '東京富山行程',
    tagline: 'Tokyo · Toyama 2026/11/26–12/02',
    kind: 'web',
    color: '#F28FB1',
    playUrl: 'https://yisotsao.github.io/tokyo-trip/',
    repo: 'YisoTsao/tokyo-trip',
    services: {
      vercel: { project: 'tokyo-trip', url: 'https://tokyo-trip-eosin.vercel.app' },
      githubActions: { repo: 'YisoTsao/tokyo-trip' },
      githubPages: { repo: 'YisoTsao/tokyo-trip', url: 'https://yisotsao.github.io/tokyo-trip/' },
    },
    confirmed: true,
  },
  {
    id: 'mahjong-hall',
    name: '麻將館',
    tagline: 'Vercel: xiangqi-good · repo: xiangqi-arena',
    kind: 'game',
    color: '#D9665B',
    playUrl: 'https://web-rose-sigma-54.vercel.app/',
    repo: 'YisoTsao/xiangqi-arena',
    services: {
      supabase: { projectRef: 'njbbyyuzqzzllvronqgn', name: 'xiangqi-arena' },
      render: {}, // TODO: set `serviceId` ("srv-...") and `url`
      vercel: { project: 'xiangqi-good', url: 'https://web-rose-sigma-54.vercel.app/' },
      githubActions: { repo: 'YisoTsao/xiangqi-arena' },
    },
    confirmed: true,
  },
];
