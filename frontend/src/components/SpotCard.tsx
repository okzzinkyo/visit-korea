import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCongestionLevel, getLevelColor, getLevelLabel, getLevelImage } from '../utils/congestion';
import { getSpotGradient } from '../utils/spotGradient';
import type { PlaceCardResponse } from '../types/api';
import styles from './SpotCard.module.css';

export default function SpotCard({ place }: { place: PlaceCardResponse }) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const rate  = place.last7DaysAverageCongestion.score;
  const level = getCongestionLevel(rate);
  const color = getLevelColor(level);
  const label = getLevelLabel(level);
  const showImg = !!place.imageUrl && !imgError;

  const goDetail = () => navigate(`/detail/${place.id}`);

  return (
    <article className={styles.card} onClick={goDetail}>
      <div className={styles.img} style={showImg ? undefined : { background: getSpotGradient(String(place.id)) }}>
        {showImg && (
          <img src={place.imageUrl} alt={place.name} className={styles.imgPhoto} onError={() => setImgError(true)} />
        )}
        <div className={styles.imgOverlay} />
        <img src={getLevelImage(level)} alt={label} className={styles.levelImg} />
        <span
          className={styles.badge}
          style={{ background: `${color}28`, color, border: `1px solid ${color}50` }}
        >
          {label}
        </span>
      </div>
      <div className={styles.body}>
        <p className={styles.name}>{place.name}</p>
        <p className={styles.district}>
          <span className={styles.districtDot} style={{ background: color }} />
          {place.districtName}
        </p>
        <span className={styles.avgLabel}>지난 7일 평균</span>
        <div className={styles.barRow}>
          <div className={styles.bar}>
            <div className={styles.barFill} style={{ width: `${rate}%`, background: color }} />
          </div>
          <span className={styles.rate} style={{ color }}>{rate}%</span>
        </div>
        <div className={styles.footer}>
          <span className={styles.views}>{place.last7DaysDetailViewCount.toLocaleString()}명이 눈치 보는 중!</span>
          <span className={styles.cta}>자세히 →</span>
        </div>
      </div>
    </article>
  );
}
