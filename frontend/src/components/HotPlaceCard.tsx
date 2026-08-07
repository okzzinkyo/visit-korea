import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCongestionLevel, getLevelColor } from '../utils/congestion';
import { getSpotGradient } from '../utils/spotGradient';
import IconPin from './IconPin';
import type { BattlePlaceResponse } from '../types/api';
import styles from './HotPlaceCard.module.css';

const RANK_BG: Record<number, string> = {
  1: 'var(--color-secondary)',
  2: 'color-mix(in srgb, var(--color-secondary) 78%, #141414)',
  3: 'color-mix(in srgb, var(--color-secondary) 58%, #141414)',
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
  const rankBg = RANK_BG[place.rank];
  const goDetail = () => navigate(`/detail/${place.id}`);

  return (
    <article className={styles.card} onClick={goDetail} style={{ '--card-accent': levelColor } as React.CSSProperties}>
      <div className={styles.img} style={showImg ? undefined : { background: getSpotGradient(String(place.id)) }}>
        {showImg && (
          <img src={place.imageUrl} alt={place.name} className={styles.imgPhoto} onError={() => setImgError(true)} />
        )}
        {rankBg && (
          <span className={styles.rankBadge} style={{ background: rankBg }}>
            {place.rank}위
          </span>
        )}
        <span className={styles.congestionPill} style={{ background: levelColor }}>
          {place.congestion.score}%
        </span>
      </div>
      <div className={styles.body}>
        <div>
          <span className={styles.name}>{place.name}</span>
          <span className={styles.location}>
            <IconPin className={styles.locationIcon} />
            부산시 {place.districtName}
          </span>
        </div>
        <div className={styles.bottom}>
          <span className={styles.visitorCount}>{place.detailViewCount.toLocaleString()}명 눈치 중</span>
          <span className={styles.cta} aria-label="자세히 보기">
            <span className={styles.ctaLine} />
          </span>
        </div>
      </div>
    </article>
  );
}
