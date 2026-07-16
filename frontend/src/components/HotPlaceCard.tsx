import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCongestionLevel, getLevelColor } from '../utils/congestion';
import { getSpotGradient } from '../utils/spotGradient';
import type { BattlePlaceResponse } from '../types/api';
import styles from './HotPlaceCard.module.css';

interface Props {
  place: BattlePlaceResponse;
}

export default function HotPlaceCard({ place }: Props) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const color = getLevelColor(getCongestionLevel(place.congestion.score));
  const showImg = !!place.imageUrl && !imgError;
  const goDetail = () => navigate(`/detail/${place.id}`);

  return (
    <article className={styles.card} onClick={goDetail}>
      <div className={styles.img} style={showImg ? undefined : { background: getSpotGradient(String(place.id)) }}>
        {showImg && (
          <img src={place.imageUrl} alt={place.name} className={styles.imgPhoto} onError={() => setImgError(true)} />
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.top}>
          <span className={styles.name}>{place.name}</span>
          <span className={styles.pct} style={{ color }}>{place.congestion.score}%</span>
        </div>
        <span className={styles.location}>부산시 {place.districtName}</span>
        <div className={styles.bottom}>
          <span className={styles.visitorCount}>{place.detailViewCount.toLocaleString()}명 눈치 보는 중</span>
          <button className={styles.cta} onClick={e => { e.stopPropagation(); goDetail(); }}>
            자세히 보기 →
          </button>
        </div>
      </div>
    </article>
  );
}
