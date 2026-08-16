import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import DateRangePicker from '../components/DateRangePicker';
import LoadingOverlay from '../components/LoadingOverlay';
import IconPin from '../components/IconPin';
import { getCongestionLevel, getLevelColor, getLevelImage, getLevelLabel } from '../utils/congestion';
import { getSpotGradient } from '../utils/spotGradient';
import { josaIGa } from '../utils/josa';
import {
  countPlaceView,
  fetchPlaceCompanions,
  fetchPlaceCongestionPattern,
  fetchPlaceDetail,
  fetchPlaceFestivals,
  fetchPlaceForecast,
  fetchPlaceSuggestions,
} from '../api/places';
import type { FestivalItemResponse, ForecastItemResponse } from '../types/api';
import type { CongestionLevel } from '../types';
import styles from './DetailPage.module.css';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKENDS = new Set(['토', '일']);

// 요일별 혼잡 패턴 차트 전용 그라데이션 — 앱 전역 상태 색(getLevelColor)은 5단계가 서로 다른
// 색상(파랑/초록/주황/빨강 등)이라 막대를 나란히 봤을 때 순서가 아니라 범주처럼 읽혀서,
// 이 차트에서만 한산(파랑, 진함) → 보통(중립) → 혼잡(주황, 진함)의 단일 그라데이션을 쓴다.
const PATTERN_BAR_COLORS: Record<CongestionLevel, string> = {
  0: '#cbd5e0',
  1: '#1565d8',
  2: '#6aa8ec',
  3: '#cbd5e0',
  4: '#f3a35f',
  5: '#e2531c',
};

const LEVEL_TIP: Record<CongestionLevel, string> = {
  0: '이 관광지는 아직 예측 데이터가 없어요.',
  1: '눈치게임 대성공의 날! 원하는 사진을 마음껏 남겨보세요 📸',
  2: '눈치게임 성공! 발걸음 가볍게 출발하기 딱 좋은 날이에요 🌿',
  3: '평소만큼 북적이는 날이에요. 슬기롭게 즐겨보세요 👀',
  4: '눈치게임 주의보! 방문객이 많은 날이니 여유 있는 일정 계획을 권해요 ⚠️',
  5: '눈치게임 비상! 인파가 몰리니 주변 대안 명소도 함께 살펴보세요 🚨',
};

function IconFestival({ className, size = 14 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21V4" />
      <path d="M4 4h13l-2.5 4L17 12H4" />
    </svg>
  );
}

function IconInfo({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16.2" />
      <circle cx="12" cy="7.6" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconRefresh({ className }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 1-15.5 6.36M3 12a9 9 0 0 1 15.5-6.36" />
      <polyline points="21 3 21 9 15 9" />
      <polyline points="3 21 3 15 9 15" />
    </svg>
  );
}

interface RecPlace {
  id: number;
  name: string;
  districtName: string;
  imageUrl: string;
  level?: CongestionLevel;
  distanceKm?: number;
  category?: string;
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

  const viewedSpotId = useRef<string | null>(null);
  useEffect(() => {
    if (!spotId || viewedSpotId.current === spotId) return;
    viewedSpotId.current = spotId;
    countPlaceView(spotId).catch(() => {});
  }, [spotId]);

  const [descExpanded, setDescExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [recTab, setRecTab] = useState<'nearby' | 'similar'>('nearby');
  // 캘린더 날짜 셀 ↔ 아래 축제 정보 리스트 상호 하이라이트 — 둘 중 어느 쪽을 hover해도 같은 축제의 반대편이 강조됨
  const [highlightedFestivalId, setHighlightedFestivalId] = useState<number | null>(null);

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

  const { data: forecast, isFetching: isForecastFetching, isError: isForecastError, refetch: refetchForecast } = useQuery({
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

  const hasNoForecastData = !!forecast
    && forecast.selectedPeriod.items.length === 0
    && forecast.followingPeriod.items.length === 0;

  // 두 줄을 합쳐도 14일이 보장되지 않음(선택 기간이 7일 미만이거나 30일 예측 범위 끝자락에서 이후 7일이 partial일 수 있음) — 실제 데이터 있는 날짜만 비교
  const recommendedDate = useMemo(() => {
    const days = [...thisWeek, ...nextWeek].filter((d): d is DayEntry & { rate: number } => d.rate !== null);
    if (days.length === 0) return null;
    return days.reduce((best, d) => (d.rate < best.rate ? d : best)).date;
  }, [thisWeek, nextWeek]);

  const { data: pattern } = useQuery({
    queryKey: ['place-congestion-pattern', spotId],
    queryFn: () => fetchPlaceCongestionPattern(spotId!),
    enabled: !!spotId,
  });

  // 혼잡/매우혼잡(레벨 4 이상)일 때만 대체 스팟 추천을 조회
  const isCrowded = !!spot && getCongestionLevel(spot.todayCongestion.score) >= 4;

  const { data: suggestions } = useQuery({
    queryKey: ['place-suggestions', spotId],
    queryFn: () => fetchPlaceSuggestions(spotId!),
    enabled: !!spotId && isCrowded,
  });

  const nearbySpots: RecPlace[] = useMemo(
    () => suggestions?.nearby.map(s => ({
      id: s.id,
      name: s.name,
      districtName: s.districtName,
      imageUrl: s.imageUrl,
      level: getCongestionLevel(s.todayCongestion.score),
      distanceKm: s.distanceKm,
    })) ?? [],
    [suggestions],
  );

  const similarSpots: RecPlace[] = useMemo(
    () => suggestions?.similar.map(s => ({
      id: s.id,
      name: s.name,
      districtName: s.districtName,
      imageUrl: s.imageUrl,
      level: getCongestionLevel(s.todayCongestion.score),
      category: s.category,
    })) ?? [],
    [suggestions],
  );

  const { data: companions, refetch: refetchCompanions, isFetching: isCompanionsFetching } = useQuery({
    queryKey: ['place-companions', spotId],
    queryFn: () => fetchPlaceCompanions(spotId!),
    enabled: !!spotId,
  });

  const relatedSpots: RecPlace[] = useMemo(
    () => companions?.map(c => ({
      id: c.id,
      name: c.name,
      districtName: c.districtName,
      imageUrl: c.imageUrl,
    })) ?? [],
    [companions],
  );

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
            <div className={styles.spotImageWrap}>
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
              <div className={styles.levelStamp}>
                <img
                  src={getLevelImage(level)}
                  alt={getLevelLabel(level)}
                  className={styles.levelStampImg}
                />
                {level > 0 && (
                  <span className={styles.levelStampScore} style={{ color: getLevelColor(level) }}>
                    {spot.todayCongestion.score}%
                  </span>
                )}
              </div>
            </div>

            <div className={styles.spotTitleRow}>
              <h1 className={styles.spotName}>{spot.name}</h1>
              <p className={styles.spotAddress}>
                <IconPin className={styles.addressIcon} />
                {spot.address}
              </p>
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
                disabled={hasNoForecastData}
              />
            </div>

            <p className={styles.forecastCaution}>
              <IconInfo className={styles.forecastCautionIcon} />
              현장 상황에 따라 예측 정보와 다를 수 있으니 유의 바랍니다.
            </p>

            {isForecastError || hasNoForecastData ? (
              <div className={styles.forecastError}>
                <p className={styles.forecastErrorText}>
                  {isForecastError ? '예측 혼잡도를 불러오지 못했어요.' : LEVEL_TIP[0]}
                </p>
                {isForecastError && (
                  <button className={styles.forecastErrorRetry} onClick={() => refetchForecast()}>
                    <IconRefresh />
                    다시 시도
                  </button>
                )}
              </div>
            ) : (
              <>
                <WeekGrid
                  days={thisWeek}
                  isLoading={isForecastFetching && !forecast}
                  recommendedDate={recommendedDate}
                  highlightedFestivalId={highlightedFestivalId}
                  onHighlightFestival={setHighlightedFestivalId}
                />

                <div className={styles.nextWeekPanel}>
                  <div className={styles.nextWeekHeader}>
                    <span className={styles.nextWeekLabel}>이후 7일</span>
                    <span className={styles.nextWeekHint}>선택한 기간 다음에 자동으로 표시돼요</span>
                  </div>
                  <WeekGrid
                    days={nextWeek}
                    isLoading={isForecastFetching && !forecast}
                    recommendedDate={recommendedDate}
                    highlightedFestivalId={highlightedFestivalId}
                    onHighlightFestival={setHighlightedFestivalId}
                  />
                </div>
              </>
            )}

            {upcomingFestivals.length > 0 && (
              <div className={styles.festivalNotice}>
                <h3 className={styles.festivalTitle}>축제 정보</h3>
                <div className={styles.festivalList}>
                  {upcomingFestivals.map(f => {
                    const go = () => window.open(festivalSearchUrl(f.name), '_blank', 'noopener,noreferrer');
                    return (
                      <div
                        key={f.id}
                        className={`${styles.festivalRow} ${highlightedFestivalId === f.id ? styles.festivalRowHighlighted : ''}`}
                        onClick={go}
                        role="link"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && go()}
                        onMouseEnter={() => setHighlightedFestivalId(f.id)}
                        onMouseLeave={() => setHighlightedFestivalId(null)}
                      >
                        <span className={styles.festivalBadge}>
                          <IconFestival />
                        </span>
                        <div className={styles.festivalInfo}>
                          <p className={styles.festivalName}>{f.name}</p>
                          <p className={styles.festivalPlace}>{f.placeName}</p>
                        </div>
                        <span className={styles.festivalDateTag}>{f.displayPeriodText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {!!pattern && pattern.items.length > 0 && (
              <div className={styles.patternSection}>
                <div className={styles.patternHeader}>
                  <h3 className={styles.patternTitle}>요일별 혼잡 패턴</h3>
                  <span className={styles.patternSub}>향후 30일 기준 평균</span>
                </div>
                <div className={styles.vchartBars}>
                  {pattern.items.map(item => {
                    const lv = getCongestionLevel(item.averageCongestion.score);
                    return (
                      <div key={item.dayOfWeek} className={styles.vchartCol}>
                        <span
                          className={styles.vchartBarScore}
                          style={{ bottom: `calc(${item.averageCongestion.score}% + 4px)` }}
                        >
                          {item.averageCongestion.score}%
                        </span>
                        <div
                          className={styles.vchartBar}
                          style={{ height: `${item.averageCongestion.score}%`, background: PATTERN_BAR_COLORS[lv] }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className={styles.vchartLabels}>
                  {pattern.items.map(item => {
                    const isWeekend = WEEKENDS.has(item.dayLabel);
                    return (
                      <div key={item.dayOfWeek} className={styles.vchartLabel}>
                        <span className={`${styles.vchartLabelDay} ${isWeekend ? styles.vchartLabelDayWeekend : ''}`}>{item.dayLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {level >= 4 && (nearbySpots.length > 0 || similarSpots.length > 0) && (() => {
          const recGroups = [
            { key: 'nearby' as const, label: '내 주변', items: nearbySpots },
            { key: 'similar' as const, label: '취향저격', items: similarSpots },
          ].filter(g => g.items.length > 0);
          const activeGroup = recGroups.find(g => g.key === recTab) ?? recGroups[0];

          return (
            <section className={styles.sectionAlt}>
              <div className={styles.alertBanner}>
                <img
                  src={getLevelImage(level)}
                  alt={getLevelLabel(level)}
                  className={styles.alertBadge}
                />
                <span>{spot.name}{josaIGa(spot.name)} 혼잡해요 &mdash; 비슷한 분위기의 여유로운 곳을 추천해드립니다</span>
              </div>
              <div className={styles.sectionTitleRow}>
                <h2 className={styles.sectionTitleMain}>관광지 추천</h2>
                {recGroups.length > 1 && (
                  <div className={styles.tabGroup}>
                    {recGroups.map(g => (
                      <button
                        key={g.key}
                        className={`${styles.tabBtn} ${activeGroup.key === g.key ? styles.tabBtnActive : ''}`}
                        onClick={() => setRecTab(g.key)}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.cardGrid}>
                {activeGroup.items.slice(0, 4).map(s => (
                  <RecCard key={s.id} spot={s} navigate={navigate} />
                ))}
              </div>
            </section>
          );
        })()}

        {relatedSpots.length > 0 && (
          <section className={styles.sectionRelated}>
            <div className={styles.sectionTitleRow}>
              <h2 className={styles.sectionTitleMain}>함께 가기 좋아요</h2>
              {relatedSpots.length === 4 && (
                <button
                  className={styles.btnRefresh}
                  onClick={() => refetchCompanions()}
                  disabled={isCompanionsFetching}
                  aria-label="다른 추천 보기"
                >
                  <IconRefresh />
                </button>
              )}
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
  const [imgError, setImgError] = useState(false);
  const showImg = !!spot.imageUrl && !imgError;
  const go = () => navigate(`/detail/${spot.id}`);
  return (
    <article
      className={styles.recCard}
      onClick={go}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && go()}
    >
      <div className={styles.recCardImgWrap}>
        <div
          className={styles.recCardBg}
          style={showImg ? undefined : { background: getSpotGradient(String(spot.id)) }}
        >
          {showImg && (
            <img
              src={spot.imageUrl}
              alt={spot.name}
              className={styles.recCardPhoto}
              onError={() => setImgError(true)}
            />
          )}
        </div>
        {spot.distanceKm !== undefined && (
          <span className={styles.recCardTag}>{spot.distanceKm.toFixed(1)}km</span>
        )}
        {spot.category && (
          <span className={styles.recCardTag}>{spot.category}</span>
        )}
        {spot.level !== undefined && (
          <img
            src={getLevelImage(spot.level)}
            alt={getLevelLabel(spot.level)}
            className={styles.recCardLevelImg}
          />
        )}
      </div>
      <div className={styles.recCardInfo}>
        <p className={styles.recCardLoc}>
          <IconPin className={styles.recCardLocIcon} />
          부산시 {spot.districtName}
        </p>
        <p className={styles.recCardName}>{spot.name}</p>
      </div>
    </article>
  );
}

function WeekGrid({ days, isLoading, recommendedDate, highlightedFestivalId, onHighlightFestival }: {
  days: DayEntry[];
  isLoading: boolean;
  recommendedDate: string | null;
  highlightedFestivalId: number | null;
  onHighlightFestival: (id: number | null) => void;
}) {
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

  // 데스크톱 hover 팝업과 모바일 클릭 아코디언이 내용을 공유 — 모바일엔 hover가 없으니 탭하면 그리드 아래
  // 전체 폭으로 펼쳐지는 패널로 보여주고(같은 activeIdx 토글 재사용), 팝업은 그쪽에서만 숨김
  const popupBody = (d: DayEntry, color: string, hasFestival: boolean) => (
    <>
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
            {getLevelLabel(d.level!)} · {d.rate}%
          </p>
        </div>
      </div>
      <p className={styles.tooltipSay}>“{LEVEL_TIP[d.level!]}”</p>
      {hasFestival && (
        <div className={styles.tooltipFestivalsBlock}>
          <p className={styles.tooltipFestivalsHeader}>이 날의 축제</p>
          <div className={styles.tooltipFestivalsList}>
            {d.festivals.map(f => (
              <a
                key={f.id}
                href={festivalSearchUrl(f.name)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.tooltipFestivalRow}
                onMouseEnter={() => onHighlightFestival(f.id)}
                onMouseLeave={() => onHighlightFestival(null)}
              >
                <span
                  className={styles.tooltipFestivalRowDot}
                  style={{ background: highlightedFestivalId === f.id ? 'var(--color-secondary)' : 'var(--color-secondary-light)' }}
                />
                <span className={styles.tooltipFestivalRowBody}>
                  <p className={styles.tooltipFestivalRowName}>{f.name}</p>
                  <p className={styles.tooltipFestivalRowMeta}>{f.displayPeriodText} · {f.placeName}</p>
                </span>
              </a>
            ))}
          </div>
          <p className={styles.tooltipFestivalCaution}>축제 기간에는 예측과 실제 혼잡도가 더 차이날 수 있어요.</p>
        </div>
      )}
    </>
  );

  const activeDay = activeIdx !== null ? days[activeIdx] : null;
  const activeColor = activeDay && activeDay.level !== null ? getLevelColor(activeDay.level) : 'var(--color-sub)';
  const activeHasFestival = !!activeDay && activeDay.festivals.length > 0;

  return (
    <div className={styles.weekGrid}>
      {days.map((d, i) => {
        const isSaturday = d.day === '토';
        const isSunday = d.day === '일';
        const isEmpty = d.level === null;
        const color = isEmpty ? 'var(--color-sub)' : getLevelColor(d.level!);
        const hasFestival = d.festivals.length > 0;
        const isActive = activeIdx === i;
        const isRecommended = !isEmpty && recommendedDate !== null && d.date === recommendedDate;
        const isCrossHighlighted = hasFestival && d.festivals.some(f => f.id === highlightedFestivalId);
        const stateClass = isCrossHighlighted
          ? styles.dayCellHighlighted
          : (isActive && !isEmpty ? styles.dayCellActive : '');
        const tooltipAlign = i <= 1 ? styles.tooltipLeft : i >= 5 ? styles.tooltipRight : styles.tooltipCenter;

        return (
          <div
            key={i}
            className={`${styles.dayCell} ${isEmpty ? styles.dayCellEmpty : ''} ${stateClass}`}
            style={{ '--cell-accent': color } as React.CSSProperties}
            onMouseEnter={() => !isEmpty && setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(null)}
            onClick={() => !isEmpty && setActiveIdx(v => v === i ? null : i)}
          >
            {isRecommended && <span className={styles.recommendBadge}>★ 추천</span>}
            <div className={styles.dayTopRow}>
              <span className={`${styles.dayLabel} ${isSaturday ? styles.dayLabelSaturday : ''} ${isSunday ? styles.dayLabelSunday : ''}`}>
                {d.isToday ? '오늘' : d.day}
              </span>
              <span className={styles.dayDate}>
                {d.isToday ? <b>{d.date}</b> : d.date}
              </span>
            </div>
            <span className={styles.dayImageWrap}>
              {isEmpty ? (
                <div className={styles.dayLevelEmpty}>—</div>
              ) : (
                <img
                  src={getLevelImage(d.level!)}
                  alt={getLevelLabel(d.level!)}
                  className={styles.dayLevelImg}
                />
              )}
              {hasFestival && <span className={styles.dayFestivalFlag}>⚑</span>}
            </span>
            {!isEmpty && <span className={styles.dayRate}>{d.rate}%</span>}

            {isActive && !isEmpty && (
              <div className={`${styles.tooltip} ${tooltipAlign}`}>
                {popupBody(d, color, hasFestival)}
              </div>
            )}
          </div>
        );
      })}
      {activeDay && activeDay.level !== null && (
        <div className={styles.mobileAccordion}>
          {popupBody(activeDay, activeColor, activeHasFestival)}
        </div>
      )}
    </div>
  );
}
