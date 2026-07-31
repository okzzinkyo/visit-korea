import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import KakaoMap from '../components/KakaoMap';
import HotPlaceCard from '../components/HotPlaceCard';
import HiddenPlaceCard from '../components/HiddenPlaceCard';
import SearchBar from '../components/SearchBar';
import { getLevelImage, getLevelLabel } from '../utils/congestion';
import type { CongestionLevel } from '../types';
import { fetchMainData } from '../api/main';
import styles from './MainPage.module.css';

const LEVELS: CongestionLevel[] = [1, 2, 3, 4, 5];

export default function MainPage() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [battleTab, setBattleTab] = useState<'weekly' | 'monthly'>('weekly');

  const { data, isPending, isError } = useQuery({
    queryKey: ['main'],
    queryFn: fetchMainData,
  });

  const handleSearch = () => {
    const q = searchValue.trim();
    if (!q) return;
    navigate(`/list?q=${encodeURIComponent(q)}`);
  };

  if (isError) {
    return (
      <div className={styles.page}>
        <Header />
        <p style={{ color: 'var(--color-sub)', textAlign: 'center', marginTop: 80 }}>
          데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
        </p>
      </div>
    );
  }

  const battlePlaces = (battleTab === 'weekly' ? data?.weeklyBattle : data?.monthlyBattle)?.places ?? [];
  const hiddenPlaces = data?.hiddenPlace.places ?? [];

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.mapSection}>
        <KakaoMap districts={data?.districts ?? []} />
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
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>혼잡 배틀 TOP 3</p>
              <h2 className={styles.sectionTitle}>눈치게임 접전지</h2>
            </div>
            <div className={styles.tabGroup}>
              <button
                className={`${styles.tabBtn} ${battleTab === 'weekly' ? styles.tabBtnActive : ''}`}
                onClick={() => setBattleTab('weekly')}
              >
                주간
              </button>
              <button
                className={`${styles.tabBtn} ${battleTab === 'monthly' ? styles.tabBtnActive : ''}`}
                onClick={() => setBattleTab('monthly')}
              >
                월간
              </button>
            </div>
          </div>
          <div className={styles.hotGrid}>
            {isPending
              ? Array.from({ length: 3 }, (_, i) => <div key={i} className={styles.cardSkeleton} />)
              : battlePlaces.map(p => <HotPlaceCard key={p.id} place={p} />)}
          </div>
        </section>

        <section>
          <p className={styles.sectionEyebrow}>여유로운 부산 명소</p>
          <h2 className={styles.sectionTitle}>이 달의 히든 플레이스</h2>
          <div className={styles.hiddenGrid}>
            {isPending
              ? Array.from({ length: 2 }, (_, i) => <div key={i} className={styles.cardSkeleton} />)
              : hiddenPlaces.map(p => <HiddenPlaceCard key={p.id} place={p} />)}
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
