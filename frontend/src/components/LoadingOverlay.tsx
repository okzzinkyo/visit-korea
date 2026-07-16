import styles from './LoadingOverlay.module.css';

interface Props {
  message: string;
  /** 덮는 대상 뒤 배경이 단색일 때만 켜기 — 지도처럼 각진 콘텐츠 위에서는 모서리 틈으로 배경이 비쳐 보인다. */
  radius?: number;
}

export default function LoadingOverlay({ message, radius = 0 }: Props) {
  return (
    <div className={styles.overlay} style={{ borderRadius: radius }}>
      <div className={styles.spinner} />
      <span>{message}</span>
    </div>
  );
}
