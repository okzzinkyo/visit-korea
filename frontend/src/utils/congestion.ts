import type { CongestionLevel } from '../types';

export function getCongestionLevel(rate: number): CongestionLevel {
  if (rate <= 20) return 1;
  if (rate <= 40) return 2;
  if (rate <= 60) return 3;
  if (rate <= 80) return 4;
  return 5;
}

export function getLevelImage(level: CongestionLevel): string {
  return `/images/level0${level}.png`;
}

export function getLevelColor(level: CongestionLevel): string {
  const colors: Record<CongestionLevel, string> = {
    1: '#3b82d6',
    2: '#2fae7a',
    3: '#f0a92e',
    4: '#ff8a4c',
    5: '#ef4b3c',
  };
  return colors[level];
}

export function getLevelLabel(level: CongestionLevel): string {
  const labels: Record<CongestionLevel, string> = {
    1: '눈치게임 성공!',
    2: '여유',
    3: '보통',
    4: '조금 혼잡',
    5: '눈치게임 실패!',
  };
  return labels[level];
}
