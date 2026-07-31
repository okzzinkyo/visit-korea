import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import Header from '../components/Header';
import SpotCard from '../components/SpotCard';
import LoadingOverlay from '../components/LoadingOverlay';
import { fetchPlaces } from '../api/places';
import CongestionBanner from '../components/CongestionBanner';
import styles from './ListPage.module.css';

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: 'NAME_ASC',   label: '관광지명 오름차순' },
  { value: 'NAME_DESC',  label: '관광지명 내림차순' },
  { value: 'CROWD_DESC', label: '핫한 관광지 순'    },
  { value: 'CROWD_ASC',  label: '눈치게임 성공 순'  },
] as const;
type SortValue = (typeof SORT_OPTIONS)[number]['value'];

function buildPageWindow(current: number, totalPages: number, windowSize = 5) {
  if (totalPages <= 0) return [];
  const half = Math.floor(windowSize / 2);
  let start = Math.max(0, current - half);
  const end = Math.min(totalPages - 1, start + windowSize - 1);
  start = Math.max(0, end - windowSize + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function ListPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeCode = searchParams.get('district') ?? '';
  const submittedKeyword = searchParams.get('q') ?? '';

  const [searchInput, setSearchInput] = useState(() => submittedKeyword);
  const [sort, setSort] = useState<SortValue>('NAME_ASC');
  const [page, setPage] = useState(0);

  const chipScrollRef = useRef<HTMLDivElement>(null);
  const activeChipRef = useRef<HTMLButtonElement>(null);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const districtCodeCache = useRef<Map<string, string>>(new Map());

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

  const { data, isPending, isError } = useQuery({
    queryKey: ['places', submittedKeyword, activeCode, sort, page],
    queryFn: () => fetchPlaces({
      keyword: submittedKeyword || undefined,
      districtCode: activeCode || undefined,
      sort,
      page,
      size: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    activeChipRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeCode, data]);

  useEffect(() => {
    setSearchInput(submittedKeyword);
  }, [submittedKeyword]);

  useEffect(() => {
    data?.districtFacets.forEach(f => {
      if (f.districtCode) districtCodeCache.current.set(f.districtName, f.districtCode);
    });
  }, [data?.districtFacets]);

  useEffect(() => {
    if (!sortOpen) return;
    const close = (e: MouseEvent) => {
      if (!sortDropdownRef.current?.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [sortOpen]);

  const selectDistrict = (code: string) => {
    const params = new URLSearchParams();
    if (code) params.set('district', code);
    if (submittedKeyword) params.set('q', submittedKeyword);
    const search = params.toString();
    setPage(0);
    navigate(search ? `/list?${search}` : '/list', { replace: true });
  };

  const handleSearch = () => {
    const q = searchInput.trim();
    setPage(0);
    if (!q) {
      navigate('/list', { replace: true });
      return;
    }
    const matchedCode = districtCodeCache.current.get(q)
      ?? data?.districtFacets.find(f => f.districtName === q)?.districtCode;
    if (matchedCode) {
      navigate(`/list?district=${matchedCode}`, { replace: true });
    } else {
      navigate(`/list?q=${encodeURIComponent(q)}`, { replace: true });
    }
  };

  const handleClear = () => {
    setSearchInput('');
    setPage(0);
    navigate('/list', { replace: true });
  };

  const handleSortChange = (value: SortValue) => {
    setSort(value);
    setPage(0);
  };

  const resultLabel = submittedKeyword
    ? `"${submittedKeyword}"`
    : data?.selectedDistrict
    ? `"${data.selectedDistrict.districtName}"`
    : '전체';

  const bannerDistrict = data?.districtSuggestion.selectedDistrict;
  const bannerTop3 = data?.districtSuggestion.recommendedDistricts ?? [];

  const items = data?.items ?? [];
  const totalCount = data?.page.totalElements ?? 0;
  const totalPages = data?.page.totalPages ?? 0;
  const pageWindow = buildPageWindow(page, totalPages);

  if (isError) {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.content}>
          <p style={{ color: 'var(--color-sub)', textAlign: 'center', marginTop: 80 }}>
            관광지 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.
          </p>
        </div>
      </div>
    );
  }

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


        <div className={styles.resultsArea}>
          {isPending ? (
          <LoadingOverlay message="관광지를 불러오는 중..." radius={16} />
          ) : (
          <>
          <div
            className={styles.chipScroll}
            ref={chipScrollRef}
            onMouseDown={onChipMouseDown}
            onMouseMove={onChipMouseMove}
            onMouseUp={onChipMouseUp}
            onMouseLeave={onChipMouseUp}
          >
            {(data?.districtFacets ?? []).map(facet => (
              <button
                key={facet.districtCode ?? 'all'}
                ref={facet.selected ? activeChipRef : undefined}
                className={`${styles.chip} ${facet.selected ? styles.chipActive : ''}`}
                onClick={() => { if (!dragState.current.moved) selectDistrict(facet.districtCode ?? ''); }}
              >
                {facet.districtName}
                <span className={styles.chipCount}>{facet.count}</span>
              </button>
            ))}
          </div>

          {data?.districtSuggestion.visible && bannerDistrict && (
            <CongestionBanner
              districtName={bannerDistrict.districtName}
              congestionScore={bannerDistrict.congestionScore}
              top3={bannerTop3}
              onSelectDistrict={selectDistrict}
            />
          )}

          <div className={styles.resultBar}>
            <span className={styles.resultCount}>
              <b>{resultLabel}</b> 관광지&nbsp;<b>{totalCount}개</b>
            </span>
            <div className={styles.sortSelect} ref={sortDropdownRef}>
              <button
                className={styles.sortSelectBtn}
                onClick={() => setSortOpen(v => !v)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M6 12h12M10 18h4"/>
                </svg>
                <span style={{ flex: 1, textAlign: 'left' }}>{SORT_OPTIONS.find(o => o.value === sort)?.label}</span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={sortOpen ? styles.chevronOpen : styles.chevron}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {sortOpen && (
                <div className={styles.sortDropdown}>
                  {SORT_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      className={`${styles.sortItem} ${sort === o.value ? styles.sortItemActive : ''}`}
                      onClick={() => { handleSortChange(o.value); setSortOpen(false); }}
                    >
                      <svg
                        width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ opacity: sort === o.value ? 1 : 0, flexShrink: 0 }}
                      >
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {items.length > 0 ? (
            <>
              <div className={styles.grid}>
                {items.map(place => (
                  <SpotCard key={place.id} place={place} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    className={styles.pageBtn}
                    disabled={page === 0}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                  >
                    이전
                  </button>
                  {pageWindow.map(p => (
                    <button
                      key={p}
                      className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p + 1}
                    </button>
                  ))}
                  <button
                    className={styles.pageBtn}
                    disabled={!(data?.page.hasNext ?? false)}
                    onClick={() => setPage(p => p + 1)}
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🔍</div>
              <p className={styles.emptyText}>검색 결과가 없어요</p>
              <p className={styles.emptySub}>다른 키워드나 구/군 이름으로 검색해보세요</p>
            </div>
          )}
          </>
          )}
        </div>
      </div>

    </div>
  );
}
