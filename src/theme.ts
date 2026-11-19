import type { StatusLevel } from './types';

/** Design tokens shared by the 3D scene and the HTML UI. See docs/STYLE_GUIDE.md. */
export const INK = '#2B2118';
export const PAPER = '#FFF6E5';
export const SKY_TOP = '#BFE3F2';
export const SKY_BOTTOM = '#FFF6E5';
export const GRASS_SIDE = '#B9864F';

export const STATUS_COLORS: Record<StatusLevel, string> = {
  ok: '#5DBB63',
  warn: '#F5B841',
  down: '#E5534B',
  unknown: '#9AA5B1',
  unused: '#E8E1D3',
};

export const STATUS_LABELS: Record<StatusLevel, string> = {
  ok: '正常',
  warn: '注意',
  down: '異常',
  unknown: '未知',
  unused: '未使用',
};

export const STATUS_EMOJI: Record<StatusLevel, string> = {
  ok: '✓',
  warn: '!',
  down: '✕',
  unknown: '?',
  unused: '–',
};

const RANK: Record<StatusLevel, number> = { down: 4, warn: 3, unknown: 2, ok: 1, unused: 0 };

/** The worst level in a list, ignoring "unused". Returns "unused" when nothing is used. */
export function worstLevel(levels: StatusLevel[]): StatusLevel {
  return levels.reduce<StatusLevel>((acc, l) => (RANK[l] > RANK[acc] ? l : acc), 'unused');
}
