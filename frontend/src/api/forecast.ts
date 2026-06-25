import type { CongestionLevel } from '../types';
import { LIST_SPOTS } from '../data/mockData';
import { getCongestionLevel } from '../utils/congestion';

// 레벨별 혼잡도 수치 범위
const LEVEL_RATE_RANGE: Record<CongestionLevel, [number, number]> = {
  1: [5,  40],
  2: [41, 55],
  3: [56, 70],
  4: [71, 84],
  5: [85, 100],
};

function deterministicResult(date: Date, baseLevel: CongestionLevel): { level: CongestionLevel; rate: number } {
  const day = Math.floor(date.getTime() / 86_400_000);
  const pseudo = ((day * 1_664_525 + 1_013_904_223) >>> 0) % 100;
  const dow = date.getDay();
  const isWeekend = dow === 0 || dow === 6;

  let lv: number = baseLevel;
  if (isWeekend) lv += 1;
  if (dow === 1) lv -= 1;

  const noise = pseudo < 33 ? -1 : pseudo < 66 ? 0 : 1;
  lv = Math.max(1, Math.min(5, lv + noise)) as CongestionLevel;

  const [min, max] = LEVEL_RATE_RANGE[lv as CongestionLevel];
  // pseudo2로 범위 내 수치 결정
  const pseudo2 = ((day * 22_695_477 + 1) >>> 0) % 100;
  const rate = Math.round(min + (pseudo2 / 100) * (max - min));

  return { level: lv as CongestionLevel, rate };
}

export interface ForecastDay {
  date: Date;
  level: CongestionLevel | null; // null = 30일 예측 범위 밖
  rate: number | null;           // 예측 혼잡도 수치 (%)
}

export async function fetchCongestionForecast(
  spotId: string,
  startDate: Date,
  endDate: Date,
): Promise<ForecastDay[]> {
  // 실제 API 연동 시 이 부분을 fetch(...)로 교체
  await new Promise(r => setTimeout(r, 600));

  const spot = LIST_SPOTS.find(s => s.id === spotId);
  if (!spot) return [];

  // 오늘 기준 30일이 예측 데이터의 최대 범위
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const forecastLimit = new Date(todayStart);
  forecastLimit.setDate(todayStart.getDate() + 29);

  const baseLevel = getCongestionLevel(spot.congestionRate);
  const result: ForecastDay[] = [];

  const cur = new Date(startDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (cur <= end) {
    const inRange = cur >= todayStart && cur <= forecastLimit;
    const { level, rate } = inRange ? deterministicResult(cur, baseLevel) : { level: null, rate: null };
    result.push({ date: new Date(cur), level, rate });
    cur.setDate(cur.getDate() + 1);
  }

  return result;
}
