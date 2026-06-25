import { useState, useEffect, useRef, useMemo } from 'react';
import styles from './DateRangePicker.module.css';

interface Props {
  startDate: Date | null;
  endDate: Date | null;
  minDate: Date;
  maxDate: Date;
  onConfirm: (start: Date, end: Date) => void;
}

const DAY_NAMES_KO = ['일', '월', '화', '수', '목', '금', '토'];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export default function DateRangePicker({ startDate, endDate, minDate, maxDate, onConfirm }: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selStart, setSelStart] = useState<Date | null>(startDate);
  const [selEnd, setSelEnd] = useState<Date | null>(endDate);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);

  // 팝업 외부 클릭 → 닫기
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // 시작일 기준 최대 선택 가능한 종료일 (최대 7일)
  const effectiveMaxDate = useMemo(() => {
    if (!selStart || selEnd) return startOfDay(maxDate);
    const cap = new Date(selStart);
    cap.setDate(selStart.getDate() + 6); // start 포함 7일
    return cap < startOfDay(maxDate) ? cap : startOfDay(maxDate);
  }, [selStart, selEnd, maxDate]);

  // 날짜 클릭 핸들러
  function handleDayClick(date: Date) {
    const min = startOfDay(minDate);
    const max = selStart && !selEnd ? effectiveMaxDate : startOfDay(maxDate);
    if (date < min || date > max) return;

    if (!selStart || (selStart && selEnd)) {
      setSelStart(date);
      setSelEnd(null);
    } else {
      if (date < selStart) {
        setSelStart(date);
        setSelEnd(null);
      } else {
        setSelEnd(date);
      }
    }
  }

  // 달력 셀 데이터 생성
  const weeks = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startOffset = firstDay.getDay(); // 0=일
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: (Date | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewYear, viewMonth, d));
    }
    // 6행 채우기
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [viewYear, viewMonth]);

  function getCellClass(date: Date | null): string {
    if (!date) return styles.cellEmpty;

    const d = startOfDay(date);
    const min = startOfDay(minDate);
    const max = selStart && !selEnd ? effectiveMaxDate : startOfDay(maxDate);

    if (d < min || d > max) return `${styles.cell} ${styles.cellDisabled}`;

    const isStart = selStart && sameDay(d, selStart);
    const isEnd = selEnd && sameDay(d, selEnd);

    if (isStart) return `${styles.cell} ${styles.cellStart}`;
    if (isEnd) return `${styles.cell} ${styles.cellEnd}`;

    // 범위 내 체크 (hover 미리보기 포함)
    const rangeEnd = selEnd ?? (selStart && hoverDate && hoverDate >= selStart ? hoverDate : null);
    if (selStart && rangeEnd && d > selStart && d < rangeEnd) {
      return `${styles.cell} ${styles.cellInRange}`;
    }

    const isToday = sameDay(d, today);
    return `${styles.cell} ${isToday ? styles.cellToday : ''}`;
  }

  function handleConfirm() {
    if (!selStart || !selEnd) return;
    onConfirm(selStart, selEnd);
    setOpen(false);
  }

  function handleReset() {
    setSelStart(null);
    setSelEnd(null);
  }

  // 이전 달로 이동 가능한지
  const canPrev = viewYear > minDate.getFullYear() ||
    (viewYear === minDate.getFullYear() && viewMonth > minDate.getMonth());

  // 다음 달로 이동 가능한지
  const canNext = viewYear < maxDate.getFullYear() ||
    (viewYear === maxDate.getFullYear() && viewMonth < maxDate.getMonth());

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const triggerLabel = startDate && endDate
    ? `${fmtDate(startDate)} ~ ${fmtDate(endDate)}`
    : '기간 선택';

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {/* 트리거 버튼 */}
      <button
        className={`${styles.trigger} ${open ? styles.triggerActive : ''}`}
        onClick={() => setOpen(v => !v)}
        type="button"
      >
        <svg className={styles.calIcon} width="13" height="13" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="5" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <line x1="7" y1="3" x2="7" y2="7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="13" y1="3" x2="13" y2="7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        {triggerLabel}
      </button>

      {/* 캘린더 팝업 */}
      {open && (
        <div className={styles.popup}>
          {/* 안내 */}
          <p className={styles.hint}>
            {!selStart
              ? <><span className={styles.hintHighlight}>시작일</span>을 선택하세요</>
              : !selEnd
              ? <><span className={styles.hintHighlight}>종료일</span>을 선택하세요 (최대 7일)</>
              : <>범위가 선택됐어요 — <span className={styles.hintHighlight}>조회하기</span>를 눌러주세요</>
            }
          </p>

          {/* 월 네비게이션 */}
          <div className={styles.monthNav}>
            <button className={styles.navBtn} onClick={prevMonth} disabled={!canPrev} type="button">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className={styles.monthLabel}>{viewYear}년 {viewMonth + 1}월</span>
            <button className={styles.navBtn} onClick={nextMonth} disabled={!canNext} type="button">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className={styles.dayNames}>
            {DAY_NAMES_KO.map((name, i) => (
              <div key={name} className={`${styles.dayNameCell} ${i === 0 || i === 6 ? styles.dayNameCellWeekend : ''}`}>
                {name}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className={styles.grid}>
            {weeks.flat().map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className={styles.cellEmpty} />;
              }
              const cls = getCellClass(date);
              const d = startOfDay(date);
              const min = startOfDay(minDate);
              const max = selStart && !selEnd ? effectiveMaxDate : startOfDay(maxDate);
              const disabled = d < min || d > max;
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <div
                  key={date.toISOString()}
                  className={cls}
                  style={isWeekend && !cls.includes('Start') && !cls.includes('End') && !disabled
                    ? { color: '#e53e3e' }
                    : undefined}
                  onClick={() => !disabled && handleDayClick(d)}
                  onMouseEnter={() => !disabled && setHoverDate(d)}
                  onMouseLeave={() => setHoverDate(null)}
                >
                  {date.getDate()}
                </div>
              );
            })}
          </div>

          {/* 확인 / 초기화 */}
          <div className={styles.confirmRow}>
            <button className={styles.btnReset} onClick={handleReset} type="button">초기화</button>
            <button
              className={styles.btnConfirm}
              onClick={handleConfirm}
              disabled={!selStart || !selEnd}
              type="button"
            >
              조회하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}
