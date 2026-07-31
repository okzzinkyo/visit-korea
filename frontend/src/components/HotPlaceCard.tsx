import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCongestionLevel, getLevelColor } from '../utils/congestion';
import { getSpotGradient } from '../utils/spotGradient';
import type { BattlePlaceResponse } from '../types/api';
import styles from './HotPlaceCard.module.css';

const RANK_STYLE: Record<number, { bg: string; label: string }> = {
  1: { bg: 'rgba(210, 158, 12, 0.92)', label: '🥇' },
  2: { bg: 'rgba(118, 136, 152, 0.90)', label: '🥈' },
  3: { bg: 'rgba(162, 98, 40, 0.90)', label: '🥉' },
};

interface Props {
  place: BattlePlaceResponse;
}

export default function HotPlaceCard({ place }: Props) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const level = getCongestionLevel(place.congestion.score);
  const levelColor = getLevelColor(level);
  const showImg = !!place.imageUrl && !imgError;
  const rankStyle = RANK_STYLE[place.rank];
  const goDetail = () => navigate(`/detail/${place.id}`);

  return (
    <article className={styles.card} onClick={goDetail}>
      <div className={styles.img} style={showImg ? undefined : { background: getSpotGradient(String(place.id)) }}>
        {showImg && (
          <img src={place.imageUrl} alt={place.name} className={styles.imgPhoto} onError={() => setImgError(true)} />
        )}
        {rankStyle && (
          <span className={styles.rankBadge} style={{ background: rankStyle.bg }}>
            {place.rank}
          </span>
        )}
        <span className={styles.congestionPill} style={{ background: levelColor }}>
          {place.congestion.score}%
        </span>
      </div>
      <div className={styles.body}>
        <div>
          <span className={styles.name}>{place.name}</span>
          <span className={styles.location}>부산시 {place.districtName}</span>
        </div>
        <div className={styles.bottom}>
          <span className={styles.visitorCount}>{place.detailViewCount.toLocaleString()}명 눈치 중</span>
          <button className={styles.cta} onClick={e => { e.stopPropagation(); goDetail(); }}>
            자세히 →
          </button>
        </div>
      </div>
    </article>
  );
}
