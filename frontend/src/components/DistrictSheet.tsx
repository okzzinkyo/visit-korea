import { useEffect } from 'react';
import { getCongestionLevel, getLevelColor, getLevelLabel } from '../utils/congestion';
import { DISTRICT_CONGESTION, DISTRICT_NAMES } from '../data/mockData';
import styles from './DistrictSheet.module.css';

export interface DistrictInfo {
  code: string;
  name: string;
  congestionRate: number;
}

interface Props {
  district: DistrictInfo | null;
  onClose: () => void;
  onNavigate: (code: string) => void;
}

export default function DistrictSheet({ district, onClose, onNavigate }: Props) {
  const isOpen = district !== null;

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!district) return null;

  const { code, name, congestionRate } = district;
  const level = getCongestionLevel(congestionRate);
  const color = getLevelColor(level);
  const label = getLevelLabel(level);
  const isCongested = congestionRate >= 70;

  const calmDistricts = Object.entries(DISTRICT_CONGESTION)
    .filter(([c]) => c !== code)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([c, rate]) => ({ code: c, name: DISTRICT_NAMES[c], rate }));

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayShow : ''}`}
        onClick={onClose}
      />
      <div className={`${styles.sheet} ${isOpen ? styles.sheetShow : ''}`}>
        <div className={styles.handle} />
        <div className={styles.districtRow}>
          <span className={styles.districtName}>{name}</span>
          <span className={styles.crowdBadge} style={{ background: `${color}22`, color }}>
            {label} {congestionRate}%
          </span>
        </div>
        <p className={styles.desc}>
          {isCongested
            ? `지금 ${name}이(가) 혼잡해요. 비슷한 테마의 여유로운 구를 먼저 살펴볼까요?`
            : `지금 ${name}은(는) 비교적 여유로워요. 관광지를 바로 탐색해보세요.`}
        </p>
        {isCongested && (
          <div className={styles.calmSection}>
            <div className={styles.calmTitle}>🌿 지금 여유로운 인근 구</div>
            <div className={styles.calmChips}>
              {calmDistricts.map(d => (
                <button key={d.code} className={styles.calmChip} onClick={() => onNavigate(d.code)}>
                  <span className={styles.calmChipName}>{d.name}</span>
                  <span className={styles.calmChipCrowd}>{d.rate}%</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className={styles.btnRow}>
          <button className={styles.btnSecondary} onClick={onClose}>닫기</button>
          <button className={styles.btnPrimary} onClick={() => onNavigate(code)}>
            이 구 관광지 보기
          </button>
        </div>
      </div>
    </>
  );
}
