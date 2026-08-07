import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCongestionLevel, getLevelColor } from '../utils/congestion';
import { getSpotGradient } from '../utils/spotGradient';
import IconPin from './IconPin';
import type { HiddenPlaceItemResponse } from '../types/api';
import styles from './HiddenPlaceCard.module.css';

interface Props {
  place: HiddenPlaceItemResponse;
}

export default function HiddenPlaceCard({ place }: Props) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const showImg = !!place.imageUrl && !imgError;
  const levelColor = getLevelColor(getCongestionLevel(place.averageCongestion.score));
  const goDetail = () => navigate(`/detail/${place.id}`);

  return (
    <article className={styles.card} onClick={goDetail} style={{ '--card-accent': levelColor } as React.CSSProperties}>
      <div className={styles.img} style={showImg ? undefined : { background: getSpotGradient(String(place.id)) }}>
        {showImg && (
          <img src={place.imageUrl} alt={place.name} className={styles.imgPhoto} onError={() => setImgError(true)} />
        )}
        <span className={styles.hiddenTag}>숨은명소</span>
      </div>
      <div className={styles.body}>
        <div className={styles.content}>
          <span className={styles.name}>{place.name}</span>
          <span className={styles.district}>
            <IconPin className={styles.districtIcon} />
            부산시 {place.districtName}
          </span>
          <p className={styles.desc}>
            <span className={styles.descLine}>
              향후 30일 평균 예측 혼잡도{' '}
              <strong className={styles.descScore} style={{ color: levelColor }}>
                {place.averageCongestion.score}%
              </strong>
            </span>
            <span className={styles.descLine}>여유롭게 즐기기 딱 좋은 시기입니다.</span>
          </p>
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.cta} aria-label="자세히 보기">
            <span className={styles.ctaLine} />
          </span>
        </div>
      </div>
    </article>
  );
}
