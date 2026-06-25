import { useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import SpotCard from '../components/SpotCard';
import { DISTRICT_CONGESTION, DISTRICT_NAMES, LIST_SPOTS } from '../data/mockData';
import { getCongestionLevel, getLevelColor } from '../utils/congestion';
import styles from './ListPage.module.css';

const DISTRICT_ENTRIES = Object.entries(DISTRICT_NAMES) as [string, string][];

export default function ListPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeCode = searchParams.get('district') ?? '';
  const submittedKeyword = searchParams.get('q') ?? '';

  const [searchInput, setSearchInput] = useState(() => submittedKeyword);
  const [sort, setSort] = useState<'default' | 'crowd_asc' | 'crowd_desc'>('default');

  const chipScrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });

  const onChipMouseDown = useCallback((e: React.MouseEvent) => {
    const el = chipScrollRef.current;
    if (!el) return;
    dragState.current = { isDown: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft, moved: false };
    el.style.cursor = 'grabbing';
  }, []);

  const onChipMouseMove = useCallback((e: React.MouseEvent) => {
    const s = dragState.current;
    if (!s.isDown) return;
    const el = chipScrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const delta = x - s.startX;
    if (Math.abs(delta) > 3) s.moved = true;
    el.scrollLeft = s.scrollLeft - delta;
  }, []);

  const onChipMouseUp = useCallback(() => {
    dragState.current.isDown = false;
    if (chipScrollRef.current) chipScrollRef.current.style.cursor = 'grab';
  }, []);

  const keywordFilteredSpots = useMemo(() => {
    if (!submittedKeyword.trim()) return LIST_SPOTS;
    const q = submittedKeyword.toLowerCase().trim();
    return LIST_SPOTS.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.districtName.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [submittedKeyword]);

  const filteredSpots = useMemo(() => {
    const spots = activeCode
      ? keywordFilteredSpots.filter(s => s.districtId === activeCode)
      : keywordFilteredSpots;
    const sorted = [...spots];
    if (sort === 'crowd_asc') sorted.sort((a, b) => a.congestionRate - b.congestionRate);
    if (sort === 'crowd_desc') sorted.sort((a, b) => b.congestionRate - a.congestionRate);
    return sorted;
  }, [keywordFilteredSpots, activeCode, sort]);

  const visibleDistrictEntries = useMemo(() => {
    if (!submittedKeyword.trim()) return DISTRICT_ENTRIES;
    const codes = new Set(keywordFilteredSpots.map(s => s.districtId));
    return DISTRICT_ENTRIES.filter(([code]) => codes.has(code));
  }, [submittedKeyword, keywordFilteredSpots]);

  const districtRate = activeCode ? (DISTRICT_CONGESTION[activeCode] ?? 0) : 0;
  const showBanner = !!activeCode && districtRate >= 70 && !submittedKeyword;

  const top3Calm = useMemo(
    () =>
      Object.entries(DISTRICT_CONGESTION)
        .filter(([code]) => code !== activeCode)
        .sort(([, a], [, b]) => a - b)
        .slice(0, 3)
        .map(([code, rate]) => ({ code, name: DISTRICT_NAMES[code], rate })),
    [activeCode]
  );

  const selectDistrict = (code: string) => {
    const params = new URLSearchParams();
    if (code) params.set('district', code);
    if (submittedKeyword) params.set('q', submittedKeyword);
    const search = params.toString();
    navigate(search ? `/list?${search}` : '/list', { replace: true });
  };

  const handleSearch = () => {
    const q = searchInput.trim();
    if (!q) {
      navigate('/list', { replace: true });
      return;
    }
    const matchedCode = DISTRICT_ENTRIES.find(([, name]) => name === q)?.[0];
    if (matchedCode) {
      setSearchInput('');
      navigate(`/list?district=${matchedCode}`, { replace: true });
    } else {
      navigate(`/list?q=${encodeURIComponent(q)}`, { replace: true });
    }
  };

  const handleClear = () => {
    setSearchInput('');
    navigate('/list', { replace: true });
  };

  const resultLabel = activeCode
    ? DISTRICT_NAMES[activeCode]
    : submittedKeyword
    ? `"${submittedKeyword}"`
    : '전체';

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.content}>
        <div className={styles.searchRow}>
          <button className={styles.backBtn} onClick={() => navigate(-1)} title="뒤로가기">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={styles.searchIcon}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="관광지 이름 또는 구/군 이름으로 검색"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            {(searchInput || activeCode || submittedKeyword) && (
              <button className={styles.clearBtn} onClick={handleClear} aria-label="초기화">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <button className={styles.searchBtn} onClick={handleSearch}>검색</button>
        </div>

        <div
          className={styles.chipScroll}
          ref={chipScrollRef}
          onMouseDown={onChipMouseDown}
          onMouseMove={onChipMouseMove}
          onMouseUp={onChipMouseUp}
          onMouseLeave={onChipMouseUp}
        >
          <button
            className={`${styles.chip} ${!activeCode ? styles.chipActive : ''}`}
            onClick={() => { if (!dragState.current.moved) selectDistrict(''); }}
          >
            전체
          </button>
          {visibleDistrictEntries.map(([code, name]) => {
            const rate = DISTRICT_CONGESTION[code] ?? 0;
            const color = getLevelColor(getCongestionLevel(rate));
            const isActive = activeCode === code;
            return (
              <button
                key={code}
                className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
                style={isActive ? { background: color, borderColor: color, color: '#fff' } : {}}
                onClick={() => { if (!dragState.current.moved) selectDistrict(code); }}
              >
                {name}
                <span
                  className={styles.chipDot}
                  style={{ background: isActive ? 'rgba(255,255,255,0.7)' : color }}
                />
              </button>
            );
          })}
        </div>

        {showBanner && (
          <div className={styles.banner}>
            <div className={styles.bannerLeft}>
              <span className={styles.bannerIcon}>😵</span>
              <div>
                <p className={styles.bannerTitle}>
                  {DISTRICT_NAMES[activeCode]}는 지금 혼잡해요&nbsp;
                  <span
                    className={styles.bannerRate}
                    style={{ color: getLevelColor(getCongestionLevel(districtRate)) }}
                  >
                    {districtRate}%
                  </span>
                </p>
                <p className={styles.bannerSub}>지금 한적한 구 TOP3 — 눈치게임 성공 도전!</p>
              </div>
            </div>
            <div className={styles.bannerChips}>
              {top3Calm.map(({ code, name, rate }) => {
                const color = getLevelColor(getCongestionLevel(rate));
                return (
                  <button
                    key={code}
                    className={styles.bannerChip}
                    style={{ borderColor: color, color }}
                    onClick={() => selectDistrict(code)}
                  >
                    {name}&nbsp;<b>{rate}%</b>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className={styles.resultBar}>
          <span className={styles.resultCount}>
            <b>{resultLabel}</b> 관광지&nbsp;<b>{filteredSpots.length}개</b>
          </span>
          <select
            className={styles.sortSelect}
            value={sort}
            onChange={e => setSort(e.target.value as typeof sort)}
          >
            <option value="default">기본순</option>
            <option value="crowd_asc">혼잡도 낮은 순</option>
            <option value="crowd_desc">혼잡도 높은 순</option>
          </select>
        </div>

        {filteredSpots.length > 0 ? (
          <div className={styles.grid}>
            {filteredSpots.map(spot => (
              <SpotCard key={spot.id} spot={spot} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔍</div>
            <p className={styles.emptyText}>검색 결과가 없어요</p>
            <p className={styles.emptySub}>다른 키워드나 구/군 이름으로 검색해보세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
