import type { Game } from '../types';

/**
 * The game list. Edit this file to add a game or change which services it uses.
 *
 * - Leave a service out of `services` if the game does not use it (it shows as "not used").
 * - `confirmed: false` marks entries whose mapping is still a guess. The dashboard
 *   shows a small "?" sticker on them until you flip it to true.
 *
 * TODO(Yiso): confirm the list and every mapping below.
 */
export const GAMES: Game[] = [
  {
    id: 'misty-forest',
    name: 'Misty Forest',
    tagline: '迷霧之森：星光旅人',
    kind: 'game',
    color: '#7FB77E',
    playUrl: 'https://mistwood-blue.vercel.app',
    repo: 'YisoTsao/misty-forest',
    services: {
      supabase: { projectRef: 'dnnlmunlmmhiqpgkjbvr' }, // Supabase project "mistwood"
      vercel: { project: 'mistwood', url: 'https://mistwood-blue.vercel.app' },
      githubActions: { repo: 'YisoTsao/misty-forest' },
    },
    confirmed: false,
  },
  {
    id: 'warfront',
    name: 'Warfront',
    kind: 'game',
    color: '#E97B5A',
    repo: 'YisoTsao/warfront',
    services: {
      githubActions: { repo: 'YisoTsao/warfront' },
    },
    confirmed: false,
  },
  {
    id: 'sky-cube-island',
    name: 'Sky Cube Island',
    kind: 'game',
    color: '#6FB7E0',
    playUrl: 'https://yisotsao.github.io/sky-cube-island/',
    repo: 'YisoTsao/sky-cube-island',
    services: {
      githubActions: { repo: 'YisoTsao/sky-cube-island' },
      githubPages: {
        repo: 'YisoTsao/sky-cube-island',
        url: 'https://yisotsao.github.io/sky-cube-island/',
      },
    },
    confirmed: false,
  },
  {
    id: 'infinity-web',
    name: 'Infinity Web',
    kind: 'game',
    color: '#A68BD8',
    playUrl: 'https://yisotsao.github.io/infinity-web-source/',
    repo: 'YisoTsao/infinity-web-source',
    services: {
      githubActions: { repo: 'YisoTsao/infinity-web-source' },
      githubPages: {
        repo: 'YisoTsao/infinity-web-source',
        url: 'https://yisotsao.github.io/infinity-web-source/',
      },
    },
    confirmed: false,
  },
  {
    id: 'game-store',
    name: 'Game Store',
    kind: 'game',
    color: '#F2C14E',
    // No repo or services found yet.
    services: {},
    confirmed: false,
  },
  {
    id: 'xiangqi-arena',
    name: 'Xiangqi Arena',
    tagline: '象棋競技場 (is this one of the 5?)',
    kind: 'game',
    color: '#D9665B',
    playUrl: 'https://web-rose-sigma-54.vercel.app',
    repo: 'YisoTsao/xiangqi-arena',
    services: {
      supabase: { projectRef: 'njbbyyuzqzzllvronqgn' },
      vercel: { project: 'web', url: 'https://web-rose-sigma-54.vercel.app' },
      githubActions: { repo: 'YisoTsao/xiangqi-arena' },
      githubPages: { repo: 'YisoTsao/xiangqi-arena' },
    },
    confirmed: false,
  },
  {
    id: 'tokyo-trip',
    name: 'Tokyo Trip',
    tagline: '東京行程 2026/11/26–12/02',
    kind: 'web',
    color: '#F28FB1',
    playUrl: 'https://tokyo-trip-eosin.vercel.app',
    repo: 'YisoTsao/tokyo-trip',
    services: {
      vercel: { project: 'tokyo-trip', url: 'https://tokyo-trip-eosin.vercel.app' },
      githubActions: { repo: 'YisoTsao/tokyo-trip' },
      githubPages: { repo: 'YisoTsao/tokyo-trip' },
    },
    confirmed: false,
  },
];
