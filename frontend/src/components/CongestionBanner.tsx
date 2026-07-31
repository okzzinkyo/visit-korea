import { useState } from 'react';
import { getCongestionLevel, getLevelColor, getLevelLabel, getLevelImage } from '../utils/congestion';
import type { DistrictCongestionResponse } from '../types/api';
import styles from './CongestionBanner.module.css';

interface Props {
  districtName: string;
  congestionScore: number;
  top3: DistrictCongestionResponse[];
  onSelectDistrict: (code: string) => void;
}

export default function CongestionBanner({ districtName, congestionScore, top3, onSelectDistrict }: Props) {
  const [popupDismissed, setPopupDismissed] = useState(false);

  const level = getCongestionLevel(congestionScore);
  const color = getLevelColor(level);
  const label = getLevelLabel(level);
  const sortedTop3 = [...top3].sort((a, b) => a.congestionScore - b.congestionScore);

  return (
    <>
      {/* 혼잡도 배너 — 모바일 */}
      <div className={styles.bannerAlt} style={{ '--banner-accent': color } as React.CSSProperties}>
        <div className={styles.bannerAltLeft}>
          <img src={getLevelImage(level)} alt={label} className={styles.bannerLevelImg} />
          <div className={styles.bannerInfo}>
            <span className={styles.bannerHeadline}>{districtName}, 지금 붐빕니다!</span>
            <span className={styles.bannerScore} style={{ color }}>혼잡도 {congestionScore}%</span>
          </div>
        </div>
        <div className={styles.bannerDivider} />
        <div className={styles.bannerRight}>
          <p className={styles.bannerRightLabel}>
            눈치게임 성공 구역
            <span className={styles.bannerTop3}>TOP 3</span>
          </p>
          <div className={styles.bannerChips}>
            {sortedTop3.map(d => {
              const chipColor = getLevelColor(getCongestionLevel(d.congestionScore));
              return (
                <button key={d.districtCode} className={styles.bannerChip} onClick={() => onSelectDistrict(d.districtCode)}>
                  <span className={styles.bannerChipName}>{d.districtName}</span>
                  <span className={styles.bannerChipScore} style={{ color: chipColor }}>{d.congestionScore}%</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 혼잡도 배너 — PC */}
      <button
        className={styles.bannerC}
        style={{ '--banner-accent': color } as React.CSSProperties}
        onClick={() => setPopupDismissed(false)}
        aria-label={`${districtName} 혼잡 — 눈치게임 성공 TOP 3 보기`}
      >
        <img src={getLevelImage(level)} alt={label} className={styles.bannerCImg} />
        <p className={styles.bannerCHeadline}>
          <span className={styles.bannerCDistrict}>{districtName}</span>
          , 지금 붐빕니다!
          <span className={styles.bannerCSub}>여유로운 구역을 추천드릴게요!</span>
        </p>
        <span className={styles.bannerCCta}>
          눈치게임 성공 TOP 3
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </span>
      </button>

      {/* 혼잡도 플로팅 팝업 — PC */}
      {!popupDismissed && (
        <div className={styles.bannerPopup} style={{ '--banner-accent': color } as React.CSSProperties}>
          <button className={styles.bannerPopupClose} onClick={() => setPopupDismissed(true)} aria-label="닫기">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div className={styles.bannerPopupTop}>
            <img src={getLevelImage(level)} alt={label} className={styles.bannerPopupImg} />
            <div className={styles.bannerInfo}>
              <span className={styles.bannerHeadline}>
                <span className={styles.bannerHeadlineLine1}>{districtName},</span>
                지금 붐빕니다!
              </span>
              <span className={styles.bannerScore} style={{ color }}>혼잡도 {congestionScore}%</span>
            </div>
          </div>
          <div className={styles.bannerPopupDivider} />
          <p className={styles.bannerRightLabel}>
            눈치게임 성공 구역
            <span className={styles.bannerTop3}>TOP 3</span>
          </p>
          <div className={styles.bannerTextList}>
            {sortedTop3.map((d, i) => {
              const itemColor = getLevelColor(getCongestionLevel(d.congestionScore));
              return (
                <button key={d.districtCode} className={styles.bannerTextItem} onClick={() => onSelectDistrict(d.districtCode)}>
                  <span className={styles.bannerTextRank}>{i + 1}</span>
                  <span className={styles.bannerTextName}>{d.districtName}</span>
                  <span className={styles.bannerTextScore} style={{ color: itemColor }}>{d.congestionScore}%</span>
                  <svg className={styles.bannerTextChevron} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
