import styles from './SearchBar.module.css';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSearch: () => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({ value, onChange, onSearch, placeholder = '관광지를 입력해주세요.', className }: Props) {
  return (
    <div className={`${styles.wrapper}${className ? ` ${className}` : ''}`}>
      <svg className={styles.icon} width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        className={styles.input}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSearch()}
      />
      <button className={styles.btn} onClick={onSearch}>검색</button>
    </div>
  );
}
