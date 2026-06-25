import { useNavigate } from 'react-router-dom';
import { getLevelColor } from '../utils/congestion';
import type { PlaceDisplay } from '../data/mockData';
import styles from './HotPlaceCard.module.css';

type Props = Pick<PlaceDisplay, 'spot' | 'bgGradient' | 'visitorCount'>;

export default function HotPlaceCard({ spot, bgGradient, visitorCount }: Props) {
  const navigate = useNavigate();
  const color = getLevelColor(spot.level);

  return (
    <article className={styles.card} onClick={() => navigate(`/detail/${spot.id}`)}>
      <div className={styles.img} style={{ background: bgGradient }} />
      <div className={styles.body}>
        <div className={styles.top}>
          <span className={styles.name}>{spot.name}</span>
          <span className={styles.pct} style={{ color }}>{spot.congestionRate}%</span>
        </div>
        <span className={styles.location}>{spot.address}</span>
        <div className={styles.bottom}>
          <span className={styles.visitorCount}>{visitorCount.toLocaleString()}명 눈치 보는 중</span>
          <button
            className={styles.cta}
            onClick={e => { e.stopPropagation(); navigate(`/detail/${spot.id}`); }}
          >
            자세히 보기 →
          </button>
        </div>
      </div>
    </article>
  );
}
