import { useNavigate } from 'react-router-dom';
import type { PlaceDisplay } from '../data/mockData';
import styles from './HiddenPlaceCard.module.css';

type Props = Pick<PlaceDisplay, 'spot' | 'bgGradient' | 'visitorCount'>;

export default function HiddenPlaceCard({ spot, bgGradient }: Props) {
  const navigate = useNavigate();

  return (
    <article className={styles.card} onClick={() => navigate(`/detail/${spot.id}`)}>
      <div className={styles.img} style={{ background: bgGradient }} />
      <div className={styles.body}>
        <div className={styles.content}>
          <span className={styles.name}>{spot.name}</span>
          <p className={styles.desc}>{spot.description}</p>
        </div>
        <button
          className={styles.cta}
          onClick={e => { e.stopPropagation(); navigate(`/detail/${spot.id}`); }}
        >
          자세히 보기
        </button>
      </div>
    </article>
  );
}
