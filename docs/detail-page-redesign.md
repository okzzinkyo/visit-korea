# 상세 화면(DetailPage) UI 리팩토링

대상 파일: `frontend/src/pages/DetailPage.tsx`, `DetailPage.module.css`

## 전제 (바꾸지 않는 것)
- 컬러 토큰: Primary `#088bff`, Secondary `#f55220` — 이미 확정, 전 페이지 공통이므로 유지.
- 전역 폰트(시스템 폰트 스택) — 상세 화면만 별도 서체 적용 시 다른 페이지와 톤이 어긋남. 폰트 교체는 이 문서 범위 밖(전역 결정 필요).
- 레이아웃 골격(좌 정보 / 우 예보 2컬럼, sticky) — 구조 자체는 문제없음, 톤만 손봄.

## Stage 0 — 코드 정리 (완료)
`DetailPage.module.css`에 있던 중복/죽은 규칙 제거:
- `.festivalNotice`/`.festivalItem`/`.festivalDot`가 두 번 정의되어 있던 것 → 하나로 통합
- 실제 JSX에서 안 쓰는 클래스 삭제: `.tag`, `.tagRow`, `.dateRangeLabel`, `.selectedRangeLabel`, `.weekSectionLabel`, `.weekDateRange`, `.weekDateRangeSub`, `.dayCellFestival`(+hover 툴팁), `.festivalItemIcon/Name/Period`

## Stage 1 — 아이콘 통일 (완료)
**문제**: 뒤로가기·주차장 버튼은 커스텀 SVG인데, 나머지(📍 위치 / 🎉 축제 / 🔄 새로고침 / ⚠️ 경고)는 이모지 — 톤이 섞여 있음.

**변경**
- 파일 상단에 `IconPin`/`IconFestival`/`IconRefresh`/`IconAlert` 4개 SVG 컴포넌트 추가 (stroke-based, `currentColor` 상속 → 배치된 위치의 텍스트 색을 그대로 따라감)
- `spot.address` 앞 📍 → `IconPin`
- 축제 배너/툴팁의 🎉 (2곳) → `IconFestival` (secondary 컬러)
- `btnRefresh`의 🔄 → `IconRefresh`
- `alertBanner`의 ⚠️ → `IconAlert`
- 추가로 추천 카드의 `부산시 {구}` 위치 텍스트에도 `IconPin` 적용 — 상세 화면 주소와 카드 위치 표기가 같은 아이콘 언어를 쓰도록 통일 (`recCardLoc`)

파일: `DetailPage.tsx`, `DetailPage.module.css`

## Stage 2 — 히어로 영역에 "눈치게임" 컨셉 강화 (완료)
**문제**: 서비스의 핵심 아이덴티티(레벨 이미지 + "눈치성공/눈치실패" 카피)가 사진 우측 상단의 작은 뱃지(44px) 하나뿐. 정작 상세 페이지에서 가장 안 보임. 레벨 이미지 자체가 이미 "눈치게임 성공!/실패!" 문구가 박힌 원형 스티커 일러스트라 확대 노출만으로도 시그니처가 됨.

**적용한 방향**
- 레벨 뱃지를 title row에서 빼서, 사진 우측 하단 모서리에 걸쳐지는 "오늘의 눈치게임 결과 스탬프"로 확대 배치 (100px, -6deg 회전 + drop-shadow로 스티커가 붙은 느낌)
- 스탬프 아래에 오늘 혼잡도 `{score}%`를 레벨 컬러로 보여주는 작은 필 라벨 추가 — 뱃지가 "결과"를, 숫자가 "근거"를 담당
- `spotImageWrap`(새 래퍼)이 오버플로된 스탬프 공간을 확보, 모바일에서는 76px로 축소

파일: `DetailPage.tsx`(spotImage 블록), `DetailPage.module.css`

## Stage 3 — 제네릭 컴포넌트 재설계 (완료)
**문제**: 아래 요소들이 어느 서비스에서나 볼 수 있는 기본값으로 되어 있음.
- `.tabGroup`/`.tabBtn`: `#f0f0f0` + 흰 알약 iOS 세그먼트 컨트롤 그대로
- `.recCard::before`: 카드 상단 4px 그라디언트 바 — 의미 없는 장식
- `.alertBanner`: 이모지 아이콘 + 틴트 배경의 표준 warning banner

**적용한 방향**
- 탭: 회색 필 세그먼트 → 밑줄형(primary 컬러 underline)으로 교체, 배경/그림자 제거
- 카드 상단 그라디언트 바 삭제, 대신 코너의 레벨 뱃지(`recCardLevelImg`)에 -4deg 회전을 줘 Stage 2 히어로 스탬프와 같은 "스티커" 시각 언어로 통일
- 경고 배너: `IconAlert`(범용 경고 삼각형) 제거 → 해당 스팟의 실제 레벨 뱃지 이미지를 42px로 넣어 "왜 추천하는지"를 그 자리에서 시각적으로 증명하도록 변경

파일: `DetailPage.tsx`, `DetailPage.module.css`

## Stage 4 — 이번주/다음주 그리드 구분 명확화
**문제**: `WeekGrid`가 이번 주/다음 주에서 완전히 동일한 톤이라 `.divider` + 라벨 하나로만 구분됨. 두 구간이 다른 이유(선택 가능 vs 참고용 등)가 시각적으로 안 드러남.

**변경 방향**
- 다음 주 그리드에 약한 배경 톤 차이 또는 낮은 opacity로 "참고용" 느낌 부여
- 구분 헤더를 라인 대신 좀 더 명확한 섹션 라벨로

파일: `DetailPage.module.css`

---
## 진행 방식
Stage 1개씩 순서대로 확인받고 적용. Stage 2가 가장 임팩트 크지만 판단이 필요한 부분(실제 톤/카피)이 있어 먼저 방향 스케치를 보여주고 진행 권장.
