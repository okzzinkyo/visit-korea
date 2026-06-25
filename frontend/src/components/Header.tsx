import styles from './Header.module.css';

export default function Header() {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="/" className={styles.logo}>
          <img src="/images/logo.svg" alt="부산 눈치게임" className={styles.logoImg} />
        </a>
        <div className={styles.today}>
          <span className={styles.liveDot} />
          <div className={styles.todayText}>
            <span className={styles.todayDate}>{today}</span>
            <span className={styles.todayLabel}>오늘 구별 혼잡도 평균</span>
          </div>
        </div>
      </div>
    </header>
  );
}
