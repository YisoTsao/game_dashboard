import type { Game } from '../types';

/**
 * The game list. Edit this file to add a game or change which services it uses.
 *
 * - Leave a service out of `services` if the game does not use it (it shows as "not used").
 * - `playUrl` is the "enter" link shown on the island, the bottom bar and the panel.
 * - The light is green only when the three core checks pass: the game is playable (playUrl
 *   answers 200), the database answers (supabase), and Render is up (render). A game that does
 *   not use Supabase or Render is judged on the checks it has.
 * - Supabase `publishableKey` is the public key the game's own page already ships; it lets the
 *   database check run without a secret. Render `url` is the service's public address.
 * - A core check with nothing to test with shows as "unknown" (grey) and the panel says what to fill in.
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
      supabase: {
        projectRef: 'dnnlmunlmmhiqpgkjbvr',
        name: 'mistwood',
        publishableKey: 'sb_publishable_iDyxbRYaPdxnLe5dnqwGaw_fVzcFLlk',
      },
      resend: {}, // TODO: set `domain` to the sending domain to check its verification
      render: { serviceId: 'srv-db8ec2m89jmc73d6mjc0', url: 'https://mistwood-server.yisoapp.com/' },
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
      // Its token is the SUPABASE_ACCESS_TOKEN_CALO secret.
      supabase: { projectRef: 'arjvdmkxnoxebqclsxpw', name: 'Calo circle', tokenEnv: 'SUPABASE_ACCESS_TOKEN_CALO' },
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
      supabase: {
        projectRef: 'njbbyyuzqzzllvronqgn',
        name: 'xiangqi-arena',
        publishableKey: 'sb_publishable__d16FrMDRlU8wIbI1IB77w_LZYvT_b2',
      },
      // Render service "xiangqi-arena-game-server", at Render's default address.
      render: { serviceId: 'srv-dbfmj4u7bikc73e4neeg', url: 'https://xiangqi-arena-game-server.onrender.com/' },
      vercel: { project: 'xiangqi-good', url: 'https://web-rose-sigma-54.vercel.app/' },
      githubActions: { repo: 'YisoTsao/xiangqi-arena' },
    },
    confirmed: true,
  },
];
