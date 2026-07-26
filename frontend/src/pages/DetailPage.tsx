import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import DateRangePicker from '../components/DateRangePicker';
import LoadingOverlay from '../components/LoadingOverlay';
import { getCongestionLevel, getLevelColor, getLevelImage, getLevelLabel } from '../utils/congestion';
import { getSpotGradient } from '../utils/spotGradient';
import { fetchPlaceCongestionPattern, fetchPlaceDetail, fetchPlaceFestivals, fetchPlaceForecast } from '../api/places';
import type { FestivalItemResponse, ForecastItemResponse } from '../types/api';
import type { CongestionLevel } from '../types';
import styles from './DetailPage.module.css';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKENDS = new Set(['토', '일']);
const FESTIVAL_ICON = '🎉';

const LEVEL_LABELS_SHORT: Record<CongestionLevel, string> = {
  1: '눈치성공', 2: '여유', 3: '보통', 4: '혼잡', 5: '눈치실패',
};

// TODO: 대체 스팟/함께 가기 좋아요 관련 API 연동 전까지 자리만 유지
interface RecPlace {
  id: number;
  name: string;
  districtName: string;
  level: CongestionLevel;
}

type DayEntry = {
  day: string;
  date: string;
  level: CongestionLevel | null;
  rate: number | null;
  isToday: boolean;
  festivals: FestivalItemResponse[];
};

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// 백엔드는 오늘 날짜의 dayLabel을 요일 대신 "오늘" 문자열로 내려주므로, 요일이 꼭 필요한 곳(주말 판정·툴팁)은 직접 계산한다
function weekdayOf(dateStr: string): string {
  return DAY_NAMES[parseISODate(dateStr).getDay()];
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86_400_000) + 1;
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

function festivalSearchUrl(name: string): string {
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(name)}`;
}

// 혼잡/여유 요일 중 더 적은(=평소와 다른, 눈에 띄는) 쪽을 강조 대상으로 고른다
function resolveHighlightGroup(crowdedDays: string[], relaxedDays: string[]): 'crowded' | 'relaxed' | null {
  if (crowdedDays.length === 0 && relaxedDays.length === 0) return null;
  if (relaxedDays.length === 0) return 'crowded';
  if (crowdedDays.length === 0) return 'relaxed';
  return crowdedDays.length <= relaxedDays.length ? 'crowded' : 'relaxed';
}

function mapForecastItem(
  item: ForecastItemResponse,
  todayISO: string,
  festivalsById: Map<number, FestivalItemResponse>,
): DayEntry {
  return {
    day: weekdayOf(item.date),
    date: item.monthDay,
    level: getCongestionLevel(item.congestion.score),
    rate: item.congestion.score,
    isToday: item.date === todayISO,
    festivals: item.festivalIds
      .map(id => festivalsById.get(id))
      .filter((f): f is FestivalItemResponse => !!f),
  };
}

// 30일 예측 범위 끝자락에서는 followingPeriod가 7일보다 짧게(partial) 올 수 있어 7칸으로 채워둠
function padToSeven(
  items: ForecastItemResponse[],
  todayISO: string,
  festivalsById: Map<number, FestivalItemResponse>,
): DayEntry[] {
  const mapped = items.slice(0, 7).map(item => mapForecastItem(item, todayISO, festivalsById));
  while (mapped.length < 7) {
    mapped.push({ day: '', date: '', level: null, rate: null, isToday: false, festivals: [] });
  }
  return mapped;
}

export default function DetailPage() {
  const { spotId } = useParams<{ spotId: string }>();
  const navigate = useNavigate();

  const { data: spot, isPending, isError } = useQuery({
    queryKey: ['place-detail', spotId],
    queryFn: () => fetchPlaceDetail(spotId!),
    enabled: !!spotId,
  });

  const [descExpanded, setDescExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + 29);
    return d;
  }, [today]);

  const [confirmedStart, setConfirmedStart] = useState<Date>(today);
  const [confirmedEnd, setConfirmedEnd] = useState<Date>(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + 6);
    return d;
  });

  const startParam = toISODate(confirmedStart);
  const daysParam = daysBetween(confirmedStart, confirmedEnd);
  const todayISO = useMemo(() => toISODate(new Date()), []);

  const { data: forecast, isFetching: isForecastFetching } = useQuery({
    queryKey: ['place-forecast', spotId, startParam, daysParam],
    queryFn: () => fetchPlaceForecast(spotId!, { start: startParam, days: daysParam }),
    enabled: !!spotId,
  });

  const { data: festivalData } = useQuery({
    queryKey: ['place-festivals', spotId],
    queryFn: () => fetchPlaceFestivals(spotId!),
    enabled: !!spotId,
  });

  const festivalsById = useMemo(() => {
    const map = new Map<number, FestivalItemResponse>();
    festivalData?.items.forEach(f => map.set(f.id, f));
    return map;
  }, [festivalData]);

  // 향후 30일(혼잡도 예보 범위)과 겹치는 축제는 실제 조회 구간과 무관하게 목록으로 노출
  const upcomingFestivals = useMemo(() => {
    if (!festivalData) return [];
    return festivalData.items.filter(f =>
      rangesOverlap(parseISODate(f.startDate), parseISODate(f.endDate), today, maxDate),
    );
  }, [festivalData, today, maxDate]);

  const handleRangeConfirm = useCallback((start: Date, end: Date) => {
    setConfirmedStart(start);
    setConfirmedEnd(end);
  }, []);

  const thisWeek = useMemo(
    () => forecast ? padToSeven(forecast.selectedPeriod.items, todayISO, festivalsById) : [],
    [forecast, todayISO, festivalsById],
  );

  const nextWeek = useMemo(
    () => forecast ? padToSeven(forecast.followingPeriod.items, todayISO, festivalsById) : [],
    [forecast, todayISO, festivalsById],
  );

  const { data: pattern } = useQuery({
    queryKey: ['place-congestion-pattern', spotId],
    queryFn: () => fetchPlaceCongestionPattern(spotId!),
    enabled: !!spotId,
  });

  if (isPending) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.loadingArea}>
            <LoadingOverlay message="관광지 정보를 불러오는 중..." />
          </div>
        </main>
      </div>
    );
  }

  if (isError || !spot) {
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

  const level = getCongestionLevel(spot.todayCongestion.score);
  const showImg = !!spot.imageUrl && !imgError;

  // TODO: 혼잡/매우혼잡 판정 시 저혼잡 대체 스팟을 보여주는 API 연동 전까지 항상 비어있음
  const altSpots: RecPlace[] = [];
  // TODO: 연관 관광지(함께 가기 좋아요) API 연동 전까지 항상 비어있음
  const relatedSpots: RecPlace[] = [];

  const highlightGroup = pattern
    ? resolveHighlightGroup(pattern.summary.crowdedDays, pattern.summary.relaxedDays)
    : null;

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
            <div
              className={styles.spotImage}
              style={showImg ? undefined : { background: getSpotGradient(String(spot.id)) }}
            >
              {showImg && (
                <img
                  src={spot.imageUrl}
                  alt={spot.name}
                  className={styles.spotImagePhoto}
                  onError={() => setImgError(true)}
                />
              )}
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
                src={getLevelImage(level)}
                alt={getLevelLabel(level)}
                className={styles.levelImg}
              />
            </div>

            <div className={styles.spotParkingRow}>
              <button
                className={styles.btnParking}
                onClick={() =>
                  window.open(spot.parkingSearchUrl, '_blank', 'noopener,noreferrer')
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

            <WeekGrid days={thisWeek} isLoading={isForecastFetching && !forecast} />

            <div className={styles.nextWeekHeader}>
              <div className={styles.divider} />
              <span className={styles.nextWeekLabel}>이후 7일</span>
              <div className={styles.divider} />
            </div>
            <WeekGrid days={nextWeek} isLoading={isForecastFetching && !forecast} />

            {upcomingFestivals.length > 0 && (
              <div className={styles.festivalNotice}>
                {upcomingFestivals.map(f => {
                  const go = () => window.open(festivalSearchUrl(f.name), '_blank', 'noopener,noreferrer');
                  return (
                    <div
                      key={f.id}
                      className={styles.festivalItem}
                      onClick={go}
                      role="link"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && go()}
                    >
                      <span className={styles.festivalIcon}>{FESTIVAL_ICON}</span>
                      <div>
                        <p className={styles.festivalName}>{f.name}</p>
                        <p className={styles.festivalPeriod}>
                          {f.placeName} · {f.displayPeriodText}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!!pattern && pattern.items.length > 0 && (
              <div className={styles.patternSection}>
                <div className={styles.patternHeader}>
                  <h3 className={styles.patternTitle}>요일별 혼잡 패턴</h3>
                  <span className={styles.patternSub}>예측 기간 기준 평균</span>
                </div>
                {(pattern.summary.crowdedDays.length > 0 || pattern.summary.relaxedDays.length > 0) && (
                  <div className={styles.patternInsight}>
                    {pattern.summary.crowdedDays.length > 0 && (
                      <span className={styles.chipBusy}>혼잡 {pattern.summary.crowdedDays.join('·')}요일</span>
                    )}
                    {pattern.summary.relaxedDays.length > 0 && (
                      <span className={styles.chipCalm}>여유 {pattern.summary.relaxedDays.join('·')}요일</span>
                    )}
                  </div>
                )}
                <div className={styles.vchartBars}>
                  {pattern.items.map(item => {
                    const lv = getCongestionLevel(item.averageCongestion.score);
                    const isCrowded = highlightGroup === 'crowded' && pattern.summary.crowdedDays.includes(item.dayLabel);
                    const isRelaxed = highlightGroup === 'relaxed' && pattern.summary.relaxedDays.includes(item.dayLabel);
                    const bg = isCrowded ? 'var(--color-secondary)' : isRelaxed ? 'var(--level-2)' : 'var(--color-primary)';
                    const opacity = isCrowded || isRelaxed ? 1 : 0.25 + (lv - 1) * 0.15;
                    return (
                      <div key={item.dayOfWeek} className={styles.vchartCol}>
                        <div
                          className={styles.vchartBar}
                          style={{ height: `${item.averageCongestion.score}%`, background: bg, opacity }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className={styles.vchartLabels}>
                  {pattern.items.map(item => {
                    const lv = getCongestionLevel(item.averageCongestion.score);
                    const isCrowded = highlightGroup === 'crowded' && pattern.summary.crowdedDays.includes(item.dayLabel);
                    const isRelaxed = highlightGroup === 'relaxed' && pattern.summary.relaxedDays.includes(item.dayLabel);
                    const isWeekend = WEEKENDS.has(item.dayLabel);
                    return (
                      <div key={item.dayOfWeek} className={styles.vchartLabel}>
                        <span className={`${styles.vchartLabelDay} ${isWeekend ? styles.vchartLabelDayWeekend : ''}`}>{item.dayLabel}</span>
                        <span
                          className={styles.vchartLabelLv}
                          style={{ color: isCrowded ? 'var(--color-secondary)' : isRelaxed ? 'var(--level-2)' : 'var(--color-sub)' }}
                        >
                          {LEVEL_LABELS_SHORT[lv]}
                        </span>
                        <span className={styles.vchartLabelScore}>{item.averageCongestion.score}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {level >= 4 && altSpots.length > 0 && (
          <section className={styles.sectionAlt}>
            <div className={styles.alertBanner}>
              <span>⚠️</span>
              <span>{spot.name}이(가) 혼잡해요 &mdash; 비슷한 분위기의 여유로운 곳을 추천해드립니다</span>
            </div>
            <div className={styles.sectionTitleRow}>
              <h2 className={styles.sectionTitleMain}>관광지 추천</h2>
            </div>
            <div className={styles.cardGrid}>
              {altSpots.map(s => (
                <RecCard key={s.id} spot={s} navigate={navigate} />
              ))}
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

function RecCard({ spot, navigate }: {
  spot: RecPlace;
  navigate: ReturnType<typeof useNavigate>;
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
        <div className={styles.recCardBg} style={{ background: getSpotGradient(String(spot.id)) }} />
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
              {d.isToday ? '오늘' : d.day}
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
                        <span>{FESTIVAL_ICON}</span>
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
