import type { CongestionLevel } from '../types';
import level00 from '../assets/images/level00.png';
import level01 from '../assets/images/level01.png';
import level02 from '../assets/images/level02.png';
import level03 from '../assets/images/level03.png';
import level04 from '../assets/images/level04.png';
import level05 from '../assets/images/level05.png';

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

const LEVEL_IMAGES: Record<CongestionLevel, string> = {
  0: level00,
  1: level01,
  2: level02,
  3: level03,
  4: level04,
  5: level05,
};

export function getLevelImage(level: CongestionLevel): string {
  return LEVEL_IMAGES[level];
}

export function getLevelColor(level: CongestionLevel): string {
  const colors: Record<CongestionLevel, string> = {
    0: '#9aa5b1',
    1: '#3b82d6',
    2: '#2fae7a',
    3: '#f0c32e',
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
