import type { CongestionLevel } from '../types';

// ponytail: 백엔드가 아직 "데이터 없음"을 null 대신 0으로 내려주고 있어 0을 집계중으로 취급한다.
// 백엔드가 null을 내려주도록 고쳐지면 `rate === 0` 분기는 지우고 null 체크만 남길 것.
export function getCongestionLevel(rate: number | null): CongestionLevel {
  if (rate === null || rate === 0) return 0;
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
    0: '#9aa5b1',
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
    0: '집계중',
    1: '눈치게임 성공!',
    2: '여유',
    3: '보통',
    4: '조금 혼잡',
    5: '눈치게임 실패!',
  };
  return labels[level];
}
