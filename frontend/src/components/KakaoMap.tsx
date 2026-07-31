import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCongestionLevel, getLevelColor, getLevelImage, getLevelLabel } from '../utils/congestion';
import type { DistrictResponse } from '../types/api';
import LoadingOverlay from './LoadingOverlay';
import styles from './KakaoMap.module.css';

interface DistrictFeature {
  type: string;
  properties: { code: string; name: string };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

interface Props {
  districts: DistrictResponse[];
}

function toLatLngPaths(geometry: DistrictFeature['geometry']): kakao.maps.LatLng[][] {
  const rings: number[][][] =
    geometry.type === 'Polygon'
      ? (geometry.coordinates as number[][][])
      : (geometry.coordinates as number[][][][]).flat(1);
  return rings.map(ring =>
    ring.map(([lng, lat]) => new window.kakao.maps.LatLng(lat, lng))
  );
}

// 구 이름 라벨 위치: 좌표 수가 가장 많은 링(본토)의 bbox 중심
// → 섬이 있는 강서구처럼 MultiPolygon에서 섬 링이 첫 번째로 오는 경우를 방지
function computeCentroid(geometry: DistrictFeature['geometry']): { lat: number; lng: number } {
  const rings: number[][][] =
    geometry.type === 'Polygon'
      ? (geometry.coordinates as number[][][])
      : (geometry.coordinates as number[][][][]).flat(1);

  const mainRing = rings.reduce((a, b) => a.length > b.length ? a : b);

  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  mainRing.forEach(([lng, lat]) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  });
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

const INITIAL_CENTER = { lat: 35.1796, lng: 129.0756 };
const INITIAL_LEVEL  = 9;

export default function KakaoMap({ districts }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const popupRef      = useRef<HTMLDivElement>(null);
  const popupNameRef  = useRef<HTMLDivElement>(null);
  const popupBadgeRef = useRef<HTMLSpanElement>(null);
  const popupImgRef   = useRef<HTMLImageElement>(null);
  const popupRecommendRef     = useRef<HTMLDivElement>(null);
  const popupRecommendNameRef = useRef<HTMLParagraphElement>(null);
  const resetBtnRef   = useRef<HTMLButtonElement>(null);

  const [isLoading, setIsLoading] = useState(true);

  const navigate      = useNavigate();
  const districtsRef  = useRef<Map<string, DistrictResponse>>(new Map());
  const polygonsRef   = useRef<Map<string, kakao.maps.Polygon>>(new Map());
  const baseColorRef  = useRef<Map<string, string>>(new Map());
  const boundsRef     = useRef<kakao.maps.LatLngBounds | null>(null);
  const geojsonRef    = useRef<{ features: DistrictFeature[] } | null>(null);
  const builtRef      = useRef(false);
  const buildPolygonsRef = useRef<(() => void) | null>(null);
  const navigateRef   = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  const mousePosRef     = useRef({ x: 0, y: 0 });
  const hideTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOnPopupRef    = useRef(false);
  const recIdRef        = useRef<number | null>(null);

  // districts 갱신 시 처리 — 폴리곤이 아직 없으면(GeoJSON·혼잡도 데이터가 둘 다
  // 준비된 시점에) 실제 색으로 처음 그리고, 이미 있으면 색만 다시 칠한다.
  // 기본색(0%)으로 먼저 그렸다가 나중에 다시 칠하는 깜빡임을 막기 위함.
  useEffect(() => {
    districtsRef.current = new Map(districts.map(d => [d.districtCode, d]));

    if (!builtRef.current) {
      if (geojsonRef.current && districtsRef.current.size > 0) buildPolygonsRef.current?.();
      return;
    }

    polygonsRef.current.forEach((polygon, code) => {
      const rate  = districtsRef.current.get(code)?.congestion.score ?? 0;
      const color = getLevelColor(getCongestionLevel(rate));
      baseColorRef.current.set(code, color);
      polygon.setOptions({ fillColor: color });
    });
  }, [districts]);

  useEffect(() => {
    const kakao = window.kakao;
    if (!kakao || !containerRef.current) return;

    const center = new kakao.maps.LatLng(INITIAL_CENTER.lat, INITIAL_CENTER.lng);
    const map    = new kakao.maps.Map(containerRef.current, {
      center,
      level: INITIAL_LEVEL,
      scrollwheel: false,
      disableDoubleClickZoom: true,
    });

    // setBounds에 전달한 범위는 컨테이너 크기/비율과 무관하게 항상 전부 보이는 것이
    // 보장되므로, boundsRef에는 본토 영역만 담아 불필요하게 확대 축소되지 않게 한다
    // (강서구의 가덕도 같은 부속 섬까지 포함하면 그만큼 더 축소돼야 해서 전체적으로 작아 보인다).
    const fitBounds = () => {
      if (boundsRef.current) map.setBounds(boundsRef.current, 40, 40, 40, 40);
    };

    // 초기 위치 복귀 버튼 — GeoJSON 로드 전이면 고정 중심/레벨로, 로드 후면 부산 전체 범위로 복귀
    if (resetBtnRef.current) {
      resetBtnRef.current.onclick = () => {
        if (boundsRef.current) {
          fitBounds();
        } else {
          map.setCenter(new kakao.maps.LatLng(INITIAL_CENTER.lat, INITIAL_CENTER.lng));
          map.setLevel(INITIAL_LEVEL);
        }
      };
    }

    // 커서 위치만 추적 — 툴팁은 더 이상 커서를 따라가지 않음
    const onMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMouseMove);

    // 생성 시점에 컨테이너가 최종 레이아웃 크기로 자리잡기 전이면 지도 캔버스가
    // 그 크기로 굳어버리므로, 레이아웃이 안정된 다음 프레임에 한 번 재계산한다.
    requestAnimationFrame(() => map.relayout());

    // 화면/창 크기 변경 시에도 항상 부산 전체가 보이도록 재조정
    const onResize = () => {
      map.relayout();
      fitBounds();
    };
    window.addEventListener('resize', onResize);

    const buildPolygons = () => {
      const geojson = geojsonRef.current;
      if (!geojson) return;

      const bounds = new kakao.maps.LatLngBounds();

      geojson.features.forEach(feature => {
          const { code, name } = feature.properties;
          const paths = toLatLngPaths(feature.geometry);

          // fit 범위는 폴리곤 윤곽 전체가 아니라 "구 이름 라벨" 위치만 기준으로 삼는다.
          // 도형이 화면 밖으로 살짝 잘리는 건 괜찮고, 라벨과 hover 가능 영역만
          // 항상 보이면 되므로 — 훨씬 타이트하게(확대되게) 잡을 수 있다.
          const centroid = computeCentroid(feature.geometry);
          bounds.extend(new kakao.maps.LatLng(centroid.lat, centroid.lng));

          const rate      = districtsRef.current.get(code)?.congestion.score ?? 0;
          const level     = getCongestionLevel(rate);
          const fillColor = getLevelColor(level);
          baseColorRef.current.set(code, fillColor);

          const polygon = new kakao.maps.Polygon({
            map,
            path: paths,
            fillColor,
            fillOpacity: 0.55,
            strokeColor: '#ffffff',
            strokeWeight: 1.5,
            strokeOpacity: 0.9,
          });
          polygonsRef.current.set(code, polygon);

          // 폴리곤과 라벨 모두에서 동일하게 반응하도록 핸들러를 한 번만 정의해 공유
          const handleMouseOver = () => {
            if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }

            const district = districtsRef.current.get(code);
            const r     = district?.congestion.score ?? 0;
            const lv    = getCongestionLevel(r);
            const color = getLevelColor(lv);

            polygon.setOptions({ fillColor: color, fillOpacity: 0.85, strokeWeight: 2.5 });

            // 툴팁이 이미 보이면 150ms 디바운스 (인접 폴리곤 지나칠 때 내용/위치 안 바꿈)
            // 처음 진입이면 즉시 (0ms)
            const alreadyVisible = popupRef.current?.classList.contains(styles.popupVisible) ?? false;
            if (contentTimerRef.current) { clearTimeout(contentTimerRef.current); contentTimerRef.current = null; }
            contentTimerRef.current = setTimeout(() => {
              const popup = popupRef.current;
              if (!popup) return;
              // 진입 순간 커서 위치에 고정 — 이후 움직이지 않음
              popup.style.left = `${mousePosRef.current.x + 20}px`;
              popup.style.top  = `${mousePosRef.current.y - popup.offsetHeight / 2}px`;
              if (popupNameRef.current)  popupNameRef.current.textContent = name;
              if (popupBadgeRef.current) {
                popupBadgeRef.current.textContent      = `${r}%`;
                popupBadgeRef.current.style.color      = color;
                popupBadgeRef.current.style.background = `${color}22`;
              }
              if (popupImgRef.current) {
                popupImgRef.current.src = getLevelImage(lv);
                popupImgRef.current.alt = getLevelLabel(lv);
              }
              const rec = district?.recommendedPlace;
              recIdRef.current = rec?.id ?? null;
              if (popupRecommendNameRef.current) popupRecommendNameRef.current.textContent = rec?.name ?? '';
              if (popupRecommendRef.current) {
                popupRecommendRef.current.style.backgroundImage = rec?.imageUrl ? `url(${rec.imageUrl})` : 'none';
              }
              popup.classList.add(styles.popupVisible);
            }, alreadyVisible ? 150 : 0);
          };

          const handleMouseOut = () => {
            if (contentTimerRef.current) { clearTimeout(contentTimerRef.current); contentTimerRef.current = null; }
            polygon.setOptions({ fillColor: baseColorRef.current.get(code) ?? fillColor, fillOpacity: 0.55, strokeWeight: 1.5 });
            // 툴팁 위치는 그대로 — 300ms 안에 툴팁으로 이동하면 취소
            hideTimerRef.current = setTimeout(() => {
              if (!isOnPopupRef.current) popupRef.current?.classList.remove(styles.popupVisible);
            }, 300);
          };

          const handleClick = () => {
            navigateRef.current(`/list?district=${code}`);
          };

          kakao.maps.event.addListener(polygon, 'mouseover', handleMouseOver);
          kakao.maps.event.addListener(polygon, 'mouseout', handleMouseOut);
          kakao.maps.event.addListener(polygon, 'click', handleClick);

          // 구 이름 라벨 — 폴리곤 중심에 고정, 폴리곤과 동일한 hover/click 핸들러 부착
          const labelEl = document.createElement('div');
          labelEl.textContent = name;
          labelEl.style.cssText = `
            font-size:11px;font-weight:700;color:#111;
            cursor:pointer;white-space:nowrap;
            text-shadow:0 0 4px #fff,0 0 4px #fff,0 0 4px #fff,0 0 4px #fff;
          `;
          labelEl.addEventListener('mouseenter', handleMouseOver);
          labelEl.addEventListener('mouseleave', handleMouseOut);
          labelEl.addEventListener('click', handleClick);

          new kakao.maps.CustomOverlay({
            map,
            position: new kakao.maps.LatLng(centroid.lat, centroid.lng),
            content: labelEl,
            zIndex: 2,
          });
        });

      // 컨테이너 크기/해상도에 관계없이 모든 구 라벨이 항상 보이도록 범위 맞춤
      boundsRef.current = bounds;
      fitBounds();
      builtRef.current = true;
      setIsLoading(false);
    };
    buildPolygonsRef.current = buildPolygons;

    fetch('/busan_districts.geojson')
      .then(r => r.json())
      .then((geojson: { features: DistrictFeature[] }) => {
        geojsonRef.current = geojson;
        if (districtsRef.current.size > 0) buildPolygons();
      })
      .catch(() => setIsLoading(false));

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (contentTimerRef.current) clearTimeout(contentTimerRef.current);
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.map} ref={containerRef} />

      {isLoading && <LoadingOverlay message="혼잡도 데이터를 불러오는 중..." />}

      {/* 초기 위치 복귀 */}
      <button className={styles.resetBtn} ref={resetBtnRef} title="처음 위치로">
        ↺ 부산 전체보기
      </button>

      {/* hover tooltip — visible 상태일 때만 pointer-events: auto */}
      <div
        className={styles.popup}
        ref={popupRef}
        onMouseEnter={() => {
          isOnPopupRef.current = true;
          if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
        }}
        onMouseLeave={() => {
          isOnPopupRef.current = false;
          popupRef.current?.classList.remove(styles.popupVisible);
        }}
      >
        <div className={styles.popupName}  ref={popupNameRef} />
        <div className={styles.popupLabel}>평균 혼잡도</div>
        <div className={styles.popupCrowdRow}>
          <span className={styles.popupBadge} ref={popupBadgeRef} />
          <img  className={styles.popupImg}   ref={popupImgRef} alt="" />
        </div>
        <div className={styles.popupDivider} />
        <div className={styles.popupRecommendLabel}>추천 여행지</div>
        <div
          className={styles.popupRecommend}
          ref={popupRecommendRef}
          onClick={() => { if (recIdRef.current) navigateRef.current(`/detail/${recIdRef.current}`); }}
        >
          <p className={styles.popupRecommendName} ref={popupRecommendNameRef} />
        </div>
      </div>
    </div>
  );
}
