import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCongestionLevel, getLevelColor, getLevelImage, getLevelLabel } from '../utils/congestion';
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
  congestionData: Record<string, number>;
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

export default function KakaoMap({ congestionData }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const popupRef      = useRef<HTMLDivElement>(null);
  const popupNameRef  = useRef<HTMLDivElement>(null);
  const popupBadgeRef = useRef<HTMLSpanElement>(null);
  const popupImgRef   = useRef<HTMLImageElement>(null);
  const resetBtnRef   = useRef<HTMLButtonElement>(null);

  const navigate       = useNavigate();
  const congestionRef  = useRef(congestionData);
  const navigateRef    = useRef(navigate);
  useEffect(() => { congestionRef.current = congestionData; }, [congestionData]);
  useEffect(() => { navigateRef.current  = navigate; },      [navigate]);

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

    // 초기 위치 복귀 버튼
    if (resetBtnRef.current) {
      resetBtnRef.current.onclick = () => {
        map.setCenter(new kakao.maps.LatLng(INITIAL_CENTER.lat, INITIAL_CENTER.lng));
        map.setLevel(INITIAL_LEVEL);
      };
    }

    // 마우스 위치 추적 → popup 위치 갱신
    const onMouseMove = (e: MouseEvent) => {
      const popup = popupRef.current;
      if (!popup || !popup.classList.contains(styles.popupVisible)) return;
      popup.style.left = `${e.clientX + 20}px`;
      popup.style.top  = `${e.clientY - popup.offsetHeight / 2}px`;
    };
    window.addEventListener('mousemove', onMouseMove);

    fetch('/busan_districts.geojson')
      .then(r => r.json())
      .then((geojson: { features: DistrictFeature[] }) => {
        geojson.features.forEach(feature => {
          const { code, name } = feature.properties;
          const paths = toLatLngPaths(feature.geometry);

          const rate      = congestionRef.current[code] ?? 0;
          const level     = getCongestionLevel(rate);
          const fillColor = getLevelColor(level);

          const polygon = new kakao.maps.Polygon({
            map,
            path: paths,
            fillColor,
            fillOpacity: 0.55,
            strokeColor: '#ffffff',
            strokeWeight: 1.5,
            strokeOpacity: 0.9,
          });

          // 구 이름 라벨 — 폴리곤 중심에 고정
          const centroid = computeCentroid(feature.geometry);
          new kakao.maps.CustomOverlay({
            map,
            position: new kakao.maps.LatLng(centroid.lat, centroid.lng),
            content: `<div style="
              font-size:11px;font-weight:700;color:#111;
              pointer-events:none;white-space:nowrap;
              text-shadow:0 0 4px #fff,0 0 4px #fff,0 0 4px #fff,0 0 4px #fff;
            ">${name}</div>`,
            zIndex: 2,
          });

          kakao.maps.event.addListener(polygon, 'mouseover', () => {
            const r     = congestionRef.current[code] ?? 0;
            const lv    = getCongestionLevel(r);
            const color = getLevelColor(lv);

            polygon.setOptions({ fillColor: color, fillOpacity: 0.85, strokeWeight: 2.5 });

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
            popupRef.current?.classList.add(styles.popupVisible);
          });

          kakao.maps.event.addListener(polygon, 'mouseout', () => {
            polygon.setOptions({ fillColor, fillOpacity: 0.55, strokeWeight: 1.5 });
            popupRef.current?.classList.remove(styles.popupVisible);
          });

          kakao.maps.event.addListener(polygon, 'click', () => {
            navigateRef.current(`/list?district=${code}`);
          });
        });
      });

    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.wrapper}>
      <div className={styles.map} ref={containerRef} />

      {/* 초기 위치 복귀 */}
      <button className={styles.resetBtn} ref={resetBtnRef} title="처음 위치로">
        ↺ 부산 전체보기
      </button>

      {/* hover 팝업 — pointer-events:none으로 polygon 이벤트 방해 안 함 */}
      <div className={styles.popup} ref={popupRef}>
        <div className={styles.popupName}  ref={popupNameRef} />
        <div className={styles.popupLabel}>평균 혼잡도</div>
        <div className={styles.popupCrowdRow}>
          <span className={styles.popupBadge} ref={popupBadgeRef} />
          <img  className={styles.popupImg}   ref={popupImgRef} src="" alt="" />
        </div>
        <div className={styles.popupDivider} />
        <div className={styles.popupRecommendLabel}>추천 여행지</div>
        <div className={styles.popupRecommendPlaceholder} />
      </div>
    </div>
  );
}
