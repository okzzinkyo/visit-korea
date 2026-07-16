import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSpotGradient } from '../utils/spotGradient';
import type { HiddenPlaceItemResponse } from '../types/api';
import styles from './HiddenPlaceCard.module.css';

interface Props {
  place: HiddenPlaceItemResponse;
}

export default function HiddenPlaceCard({ place }: Props) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
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
        <div className={styles.content}>
          <span className={styles.name}>{place.name}</span>
          <p className={styles.desc}>{place.description}</p>
        </div>
        <button className={styles.cta} onClick={e => { e.stopPropagation(); goDetail(); }}>
          자세히 보기
        </button>
      </div>
    </article>
  );
}
