import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import KakaoMap from '../components/KakaoMap';
import HotPlaceCard from '../components/HotPlaceCard';
import HiddenPlaceCard from '../components/HiddenPlaceCard';
import SearchBar from '../components/SearchBar';
import { getLevelImage, getLevelLabel } from '../utils/congestion';
import type { CongestionLevel } from '../types';
import { DISTRICT_CONGESTION, HOT_PLACES, HIDDEN_PLACES } from '../data/mockData';
import styles from './MainPage.module.css';

const LEVELS: CongestionLevel[] = [1, 2, 3, 4, 5];

export default function MainPage() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = () => {
    const q = searchValue.trim();
    if (!q) return;
    navigate(`/list?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.mapSection}>
        <KakaoMap congestionData={DISTRICT_CONGESTION} />
        <SearchBar
          value={searchValue}
          onChange={setSearchValue}
          onSearch={handleSearch}
          className={styles.overlaySearch}
        />
        <div className={styles.legend}>
          <div className={styles.legendEmojis}>
            {LEVELS.map(l => (
              <img key={l} src={getLevelImage(l)} alt={getLevelLabel(l)} className={styles.legendImg} />
            ))}
          </div>
          <div className={styles.legendBar} />
        </div>
      </div>

      <div className={styles.content}>
        <section>
          <h2 className={styles.sectionTitle}>눈치게임 접전지</h2>
          <div className={styles.hotGrid}>
            {HOT_PLACES.map(p => (
              <HotPlaceCard key={p.spot.id} {...p} />
            ))}
          </div>
        </section>

        <section>
          <h2 className={styles.sectionTitle}>이 달의 히든 플레이스</h2>
          <div className={styles.hiddenGrid}>
            {HIDDEN_PLACES.map(p => (
              <HiddenPlaceCard key={p.spot.id} {...p} />
            ))}
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerCopy}>© 2026 부산 눈치게임 — 부산광역시 관광 혼잡도 서비스</span>
          <div className={styles.footerLinks}>
            <a href="#">이용약관</a>
            <a href="#">개인정보처리방침</a>
            <a href="#">오픈데이터 출처</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
