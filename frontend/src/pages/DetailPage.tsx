import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import DateRangePicker from '../components/DateRangePicker';
import { LIST_SPOTS, FESTIVALS } from '../data/mockData';
import type { Festival } from '../data/mockData';
import { getLevelColor, getLevelImage, getLevelLabel } from '../utils/congestion';
import { getSpotGradient } from '../utils/spotGradient';
import { fetchCongestionForecast } from '../api/forecast';
import type { ForecastDay } from '../api/forecast';
import type { CongestionLevel } from '../types';
import styles from './DetailPage.module.css';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const ORDERED_DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const WEEKENDS = new Set(['토', '일']);

const LEVEL_LABELS_SHORT: Record<CongestionLevel, string> = {
  1: '눈치성공', 2: '여유', 3: '보통', 4: '혼잡', 5: '눈치실패',
};

const BAR_HEIGHTS: Record<CongestionLevel, number> = {
  1: 20, 2: 40, 3: 60, 4: 80, 5: 100,
};

type DayEntry = {
  day: string;
  date: string;
  level: CongestionLevel | null;
  rate: number | null;
  isToday: boolean;
  festivals: Festival[];
};

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function fmtDate(d: Date) {
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

function buildWeekEntries(
  rangeStart: Date,
  forecastData: ForecastDay[],
  weekOffset: number,
  districtId: string,
): DayEntry[] {
  const today = startOfDay(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(rangeStart);
    d.setDate(rangeStart.getDate() + weekOffset + i);
    d.setHours(0, 0, 0, 0);
    const fd = forecastData[weekOffset + i] ?? null;
    return {
      day: DAY_NAMES[d.getDay()],
      date: fmtDate(d),
      level: fd ? fd.level : null,
      rate: fd ? fd.rate : null,
      isToday: d.getTime() === today.getTime(),
      festivals: FESTIVALS.filter(f => f.districtId === districtId && d >= f.start && d <= f.end),
    };
  });
}

export default function DetailPage() {
  const { spotId } = useParams<{ spotId: string }>();
  const navigate = useNavigate();

  const spot = LIST_SPOTS.find(s => s.id === spotId);

  const [descExpanded, setDescExpanded] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + 29);
    return d;
  }, [today]);

  const [rangeStart, setRangeStart] = useState<Date>(today);
  const [confirmedStart, setConfirmedStart] = useState<Date>(today);
  const [confirmedEnd, setConfirmedEnd] = useState<Date>(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + 6);
    return d;
  });

  const [forecastData, setForecastData] = useState<ForecastDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitLoaded, setIsInitLoaded] = useState(false);

  useEffect(() => {
    if (!spot) return;
    const start = startOfDay(new Date());
    const end = new Date(start);
    end.setDate(start.getDate() + 13);
    setIsLoading(true);
    fetchCongestionForecast(spot.id, start, end)
      .then(data => { setForecastData(data); setIsInitLoaded(true); })
      .finally(() => setIsLoading(false));
  }, [spot?.id]);

  const handleRangeConfirm = useCallback(async (start: Date, end: Date) => {
    if (!spot) return;
    setRangeStart(start);
    setConfirmedStart(start);
    setConfirmedEnd(end);
    setIsLoading(true);
    try {
      const fetchEnd = new Date(start);
      fetchEnd.setDate(start.getDate() + 13);
      const data = await fetchCongestionForecast(spot.id, start, fetchEnd);
      setForecastData(data);
    } finally {
      setIsLoading(false);
    }
  }, [spot]);

  const thisWeek = useMemo(
    () => spot ? buildWeekEntries(rangeStart, forecastData, 0, spot.districtId) : [],
    [rangeStart, forecastData, spot],
  );

  const nextWeek = useMemo(
    () => spot ? buildWeekEntries(rangeStart, forecastData, 7, spot.districtId) : [],
    [rangeStart, forecastData, spot],
  );

  const periodFestivals = useMemo(() => {
    if (!spot) return [];
    const windowEnd = new Date(rangeStart);
    windowEnd.setDate(rangeStart.getDate() + 13);
    return FESTIVALS.filter(
      f => f.districtId === spot.districtId && f.start <= windowEnd && f.end >= rangeStart
    );
  }, [rangeStart, spot]);

  const weekdayAvg = useMemo(() => {
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    ORDERED_DAYS.forEach(d => { sums[d] = 0; counts[d] = 0; });
    forecastData.forEach(fd => {
      const name = DAY_NAMES[fd.date.getDay()];
      sums[name] += fd.level;
      counts[name]++;
    });
    const avg: Record<string, CongestionLevel> = {};
    ORDERED_DAYS.forEach(d => {
      avg[d] = (counts[d] ? Math.round(sums[d] / counts[d]) : 3) as CongestionLevel;
    });
    return avg;
  }, [forecastData]);

  const maxLv = Math.max(...ORDERED_DAYS.map(d => weekdayAvg[d])) as CongestionLevel;
  const minLv = Math.min(...ORDERED_DAYS.map(d => weekdayAvg[d])) as CongestionLevel;
  const busiestDays = ORDERED_DAYS.filter(d => weekdayAvg[d] === maxLv);
  const calmestDays = ORDERED_DAYS.filter(d => weekdayAvg[d] === minLv);

  const altSpots = useMemo(() => {
    if (!spot) return [];
    return LIST_SPOTS
      .filter(s => s.id !== spot.id && s.tags.some(t => spot.tags.includes(t)) && s.level <= 2)
      .sort((a, b) => a.congestionRate - b.congestionRate)
      .slice(0, 4);
  }, [spot]);

  const relatedSpots = useMemo(() => {
    if (!spot) return [];
    return LIST_SPOTS
      .filter(s => s.id !== spot.id && s.districtId === spot.districtId)
      .slice(0, 4);
  }, [spot]);

  if (!spot) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.backRow}>
            <button className={styles.backBtn} onClick={() => navigate(-1)}>← 뒤로가기</button>
          </div>
          <p style={{ color: 'var(--color-sub)', textAlign: 'center', marginTop: 40 }}>
            해당 관광지를 찾을 수 없어요.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.backRow}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            뒤로가기
          </button>
        </div>

        <div className={styles.detailGrid}>
          <div>
            <div className={styles.spotImage} style={{ background: getSpotGradient(spot.id) }}>
              <div className={styles.spotImageOverlay} />
            </div>

            <div className={styles.spotTitleRow}>
              <div>
                <h1 className={styles.spotName}>{spot.name}</h1>
                <p className={styles.spotAddress}>
                  <span>📍</span>
                  {spot.address}
                </p>
              </div>
              <img
                src={getLevelImage(spot.level)}
                alt={getLevelLabel(spot.level)}
                className={styles.levelImg}
              />
            </div>

            <div className={styles.spotParkingRow}>
              <button
                className={styles.btnParking}
                onClick={() =>
                  window.open(
                    `https://map.kakao.com/?q=${encodeURIComponent(spot.name + ' 주차장')}`,
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
              >
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="3" width="14" height="14" rx="3" stroke="white" strokeWidth="1.8" />
                  <text x="10" y="14.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="white">P</text>
                </svg>
                근처 주차장
              </button>
            </div>

            <div className={styles.spotDescWrap}>
              <p className={`${styles.spotDesc} ${descExpanded ? styles.spotDescExpanded : ''}`}>
                {spot.description}
              </p>
              {spot.description.length > 60 && (
                <button className={styles.btnMore} onClick={() => setDescExpanded(v => !v)}>
                  {descExpanded ? '접기' : '더보기'}
                </button>
              )}
            </div>
          </div>

          <div className={styles.colRight}>
            <div className={styles.forecastHeader}>
              <h2 className={styles.sectionTitle}>예측 혼잡도</h2>
              <DateRangePicker
                startDate={confirmedStart}
                endDate={confirmedEnd}
                minDate={today}
                maxDate={maxDate}
                onConfirm={handleRangeConfirm}
              />
            </div>

            <WeekGrid days={thisWeek} isLoading={isLoading || !isInitLoaded} />

            <div className={styles.nextWeekHeader}>
              <div className={styles.divider} />
              <span className={styles.nextWeekLabel}>이후 7일</span>
              <div className={styles.divider} />
            </div>
            <WeekGrid days={nextWeek} isLoading={isLoading || !isInitLoaded} />

            {periodFestivals.length > 0 && (
              <div className={styles.festivalNotice}>
                {periodFestivals.map(f => (
                  <div key={f.id} className={styles.festivalItem}>
                    <span className={styles.festivalIcon}>{f.icon}</span>
                    <div>
                      <p className={styles.festivalName}>{f.name}</p>
                      <p className={styles.festivalPeriod}>
                        {f.place} · {fmtDate(f.start)} ~ {fmtDate(f.end)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isInitLoaded && (
              <div className={styles.patternSection}>
                <div className={styles.patternHeader}>
                  <h3 className={styles.patternTitle}>요일별 혼잡 패턴</h3>
                  <span className={styles.patternSub}>30일 예측 기준 평균</span>
                </div>
                {forecastData.length > 0 && (
                  <div className={styles.patternInsight}>
                    <span className={styles.chipBusy}>혼잡 {busiestDays.join('·')}요일</span>
                    <span className={styles.chipCalm}>여유 {calmestDays.join('·')}요일</span>
                  </div>
                )}
                <div className={styles.vchartBars}>
                  {ORDERED_DAYS.map(d => {
                    const lv = weekdayAvg[d];
                    const isHighest = lv === maxLv;
                    const bg = isHighest ? 'var(--color-secondary)' : 'var(--color-primary)';
                    const opacity = isHighest ? 1 : 0.25 + (lv - 1) * 0.15;
                    return (
                      <div key={d} className={styles.vchartCol}>
                        <div
                          className={styles.vchartBar}
                          style={{ height: `${BAR_HEIGHTS[lv]}%`, background: bg, opacity }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className={styles.vchartLabels}>
                  {ORDERED_DAYS.map(d => {
                    const lv = weekdayAvg[d];
                    const isHighest = lv === maxLv;
                    const isWeekend = WEEKENDS.has(d);
                    return (
                      <div key={d} className={styles.vchartLabel}>
                        <span className={`${styles.vchartLabelDay} ${isWeekend ? styles.vchartLabelDayWeekend : ''}`}>{d}</span>
                        <span
                          className={styles.vchartLabelLv}
                          style={{ color: isHighest ? 'var(--color-secondary)' : 'var(--color-sub)' }}
                        >
                          {LEVEL_LABELS_SHORT[lv]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {spot.level >= 4 && altSpots.length > 0 && (
          <section className={styles.sectionAlt}>
            <div className={styles.alertBanner}>
              <span>⚠️</span>
              <span>{spot.name}이(가) 혼잡해요 &mdash; 비슷한 분위기의 여유로운 곳을 추천해드립니다</span>
            </div>
            <div className={styles.sectionTitleRow}>
              <h2 className={styles.sectionTitleMain}>관광지 추천</h2>
            </div>
            <div className={styles.cardGrid}>
              {altSpots.map(s => {
                const sharedTag = s.tags.find(t => spot.tags.includes(t));
                return (
                  <RecCard key={s.id} spot={s} navigate={navigate} tag={sharedTag} />
                );
              })}
            </div>
          </section>
        )}

        {relatedSpots.length > 0 && (
          <section className={styles.sectionRelated}>
            <div className={styles.sectionTitleRow}>
              <h2 className={styles.sectionTitleMain}>함께 가기 좋아요</h2>
            </div>
            <div className={styles.cardGrid}>
              {relatedSpots.map(s => (
                <RecCard key={s.id} spot={s} navigate={navigate} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function RecCard({ spot, navigate, tag }: {
  spot: (typeof LIST_SPOTS)[number];
  navigate: ReturnType<typeof useNavigate>;
  tag?: string;
}) {
  const go = () => navigate(`/detail/${spot.id}`);
  return (
    <article
      className={styles.recCard}
      onClick={go}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && go()}
    >
      <div className={styles.recCardImgWrap}>
        <div className={styles.recCardBg} style={{ background: getSpotGradient(spot.id) }} />
        {tag && <span className={styles.recCardTag}>#{tag}</span>}
        <img
          src={getLevelImage(spot.level)}
          alt={getLevelLabel(spot.level)}
          className={styles.recCardLevelImg}
        />
      </div>
      <div className={styles.recCardInfo}>
        <p className={styles.recCardLoc}>부산시 {spot.districtName}</p>
        <p className={styles.recCardName}>{spot.name}</p>
      </div>
    </article>
  );
}

const LEVEL_BAR_WIDTH: Record<CongestionLevel, string> = {
  1: '20%', 2: '40%', 3: '60%', 4: '80%', 5: '100%',
};

function WeekGrid({ days, isLoading }: { days: DayEntry[]; isLoading: boolean }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className={styles.weekGrid}>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className={`${styles.dayCell} ${styles.dayCellSkeleton}`}>
            <div className={styles.skeletonLine} style={{ width: '60%', height: 12 }} />
            <div className={styles.skeletonCircle} />
            <div className={styles.skeletonLine} style={{ width: '80%', height: 10 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.weekGrid}>
      {days.map((d, i) => {
        const isWeekend = WEEKENDS.has(d.day);
        const isEmpty = d.level === null;
        const color = isEmpty ? 'var(--color-sub)' : getLevelColor(d.level!);
        const hasFestival = d.festivals.length > 0;
        const isActive = activeIdx === i;
        const tooltipAlign = i <= 1 ? styles.tooltipLeft : i >= 5 ? styles.tooltipRight : styles.tooltipCenter;

        return (
          <div
            key={i}
            className={`${styles.dayCell} ${isEmpty ? styles.dayCellEmpty : ''} ${isActive && !isEmpty ? styles.dayCellActive : ''}`}
            onMouseEnter={() => !isEmpty && setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(null)}
            onClick={() => !isEmpty && setActiveIdx(v => v === i ? null : i)}
          >
            <span className={`${styles.dayLabel} ${isWeekend ? styles.dayLabelWeekend : ''}`}>
              {d.day}
            </span>
            <span className={styles.dayDate}>
              {d.isToday ? <b>{d.date}</b> : d.date}
            </span>
            {isEmpty ? (
              <div className={styles.dayLevelEmpty}>—</div>
            ) : (
              <img
                src={getLevelImage(d.level!)}
                alt={getLevelLabel(d.level!)}
                className={styles.dayLevelImg}
              />
            )}
            <span className={styles.dayLevelLabel} style={{ color }}>
              {isEmpty ? '' : LEVEL_LABELS_SHORT[d.level!]}
            </span>
            {hasFestival && <div className={styles.festivalDot} />}

            {isActive && !isEmpty && (
              <div className={`${styles.tooltip} ${tooltipAlign}`}>
                <div className={styles.tooltipHeader}>
                  <img
                    src={getLevelImage(d.level!)}
                    alt={getLevelLabel(d.level!)}
                    className={styles.tooltipLevelImg}
                  />
                  <div>
                    <p className={styles.tooltipDate}>
                      {d.isToday && <span className={styles.tooltipTodayBadge}>오늘</span>}
                      {d.day}요일 {d.date}
                    </p>
                    <p className={styles.tooltipLevelLabel} style={{ color }}>
                      {getLevelLabel(d.level!)}
                    </p>
                  </div>
                </div>
                <div className={styles.tooltipBarRow}>
                  <div className={styles.tooltipBar}>
                    <div
                      className={styles.tooltipBarFill}
                      style={{ width: `${d.rate ?? 0}%`, background: color }}
                    />
                  </div>
                  <span className={styles.tooltipRate} style={{ color }}>{d.rate}%</span>
                </div>
                {hasFestival && (
                  <div className={styles.tooltipFestivals}>
                    {d.festivals.map(f => (
                      <div key={f.id} className={styles.tooltipFestivalItem}>
                        <span>{f.icon}</span>
                        <span className={styles.tooltipFestivalName}>{f.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={styles.tooltipArrow} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
