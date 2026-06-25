import type { CongestionLevel } from '../types';

export function getCongestionLevel(rate: number): CongestionLevel {
  if (rate <= 40) return 1;
  if (rate <= 55) return 2;
  if (rate <= 70) return 3;
  if (rate <= 84) return 4;
  return 5;
}

export function getLevelImage(level: CongestionLevel): string {
  return `/images/level0${level}.png`;
}

export function getLevelColor(level: CongestionLevel): string {
  const colors: Record<CongestionLevel, string> = {
    1: '#5bbfdf',
    2: '#52c87c',
    3: '#e8c844',
    4: '#f08060',
    5: '#e06868',
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
