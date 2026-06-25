import { useNavigate } from 'react-router-dom';
import type { Spot } from '../types';
import { getLevelColor, getLevelLabel, getLevelImage } from '../utils/congestion';
import { getSpotGradient } from '../utils/spotGradient';
import styles from './SpotCard.module.css';

export default function SpotCard({ spot }: { spot: Spot }) {
  const navigate = useNavigate();
  const color = getLevelColor(spot.level);
  const label = getLevelLabel(spot.level);
  const bg = getSpotGradient(spot.id);

  const goDetail = () => navigate(`/detail/${spot.id}`);

  return (
    <article className={styles.card} onClick={goDetail}>
      <div className={styles.img} style={{ background: bg }}>
        <div className={styles.imgOverlay} />
        <img src={getLevelImage(spot.level)} alt={label} className={styles.levelImg} />
        <span
          className={styles.badge}
          style={{ background: `${color}28`, color, border: `1px solid ${color}50` }}
        >
          {label}
        </span>
      </div>
      <div className={styles.body}>
        <p className={styles.name}>{spot.name}</p>
        <p className={styles.district}>
          <span className={styles.districtDot} style={{ background: color }} />
          {spot.districtName}
        </p>
        <div className={styles.barRow}>
          <div className={styles.bar}>
            <div className={styles.barFill} style={{ width: `${spot.congestionRate}%`, background: color }} />
          </div>
          <span className={styles.rate} style={{ color }}>{spot.congestionRate}%</span>
        </div>
        <button
          className={styles.btn}
          onClick={e => { e.stopPropagation(); goDetail(); }}
        >
          자세히 보기 →
        </button>
      </div>
    </article>
  );
}
