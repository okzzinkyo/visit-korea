# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Visit Busan" (부산 눈치게임) — a Busan tourism congestion-visualization app. Shows district-level
crowd congestion on a Kakao map, hot/hidden place recommendations, a searchable/filterable spot list,
and per-spot congestion forecasts with festival overlays. Frontend-only repo; all data is currently
mocked (no backend exists yet).

The actual app lives in `frontend/` — always `cd frontend` before running commands.

## Commands

Run from `frontend/`:

- `npm run dev` — start Vite dev server
- `npm run build` — typecheck (`tsc -b`) then production build
- `npm run lint` — ESLint over the whole project
- `npm run preview` — preview the production build

There is no test runner configured in this project.

## Environment

`frontend/.env` holds `VITE_KAKAO_APP_KEY`, injected into `index.html` as `%VITE_KAKAO_APP_KEY%` for the
Kakao Maps SDK `<script>` tag. Vite env vars are the only config mechanism — there's no other env layer.

## Architecture

**Routing** (`src/App.tsx`): three routes — `/` (MainPage, map + hot/hidden picks), `/list` (ListPage,
searchable/filterable spot grid, reads `?q=` and `?district=` query params), `/detail/:spotId`
(DetailPage, forecast calendar + festivals + recommendations). `QueryClientProvider` wraps the app but
`@tanstack/react-query` is not actually used for data fetching anywhere yet — pages currently fetch via
plain `useState`/`useEffect`. `zustand`, `recharts`, and `dayjs` are installed but also unused so far.

**Mock data layer is the integration seam.** `src/data/mockData.ts` is the single source of truth for
spots (`LIST_SPOTS`), festivals (`FESTIVALS`), district congestion rates (`DISTRICT_CONGESTION`), and
district names (`DISTRICT_NAMES`), plus curated `HOT_PLACES`/`HIDDEN_PLACES` for the main page.
`src/api/forecast.ts` (`fetchCongestionForecast`) simulates an async API call (delay + deterministic
pseudo-random generation) over the same mock spots — its comment explicitly marks it as the spot to
swap in a real `fetch(...)` call. When wiring real APIs, these are the two files whose exports
(`Spot`, `Festival`, district maps, `ForecastDay`) other components depend on — preserve the shapes in
`src/types/index.ts` and `src/data/mockData.ts`/`src/api/forecast.ts` or update all consumers together.

**Congestion level system** (`src/utils/congestion.ts`) is the central mapping used everywhere a
congestion rate (0-100 number) needs to become a `CongestionLevel` (1-5) plus its color/image/label:
`getCongestionLevel`, `getLevelColor`, `getLevelImage` (→ `/images/level0N.png` in `public/`),
`getLevelLabel`. Any new component displaying congestion should go through these rather than
reimplementing thresholds.

**Kakao map** (`src/components/KakaoMap.tsx`): loads Busan district polygons from
`public/busan_districts.geojson`, colors each by `getLevelColor(getCongestionLevel(rate))`, and
navigates to `/list?district={code}` on click. District source shapefiles live under
`public/LSMD_ADM_SECT_UMD_부산/`; `public/busan_umd.geojson` is a converted counterpart. Kakao SDK
types are declared in `src/types/kakao.d.ts`; the SDK itself loads globally via the `index.html`
script tag, not an npm package.

**Styling**: CSS Modules per component/page (`X.module.css` next to `X.tsx`), plus shared CSS custom
properties in `src/styles/variables.css` (e.g. `--color-primary`, `--color-sub`) referenced throughout
inline `style={}` props for level-based coloring.

**District IDs** are 5-digit Korean administrative codes (`26350` = 해운대구, etc.) and are the join key
across `DISTRICT_CONGESTION`, `DISTRICT_NAMES`, `Spot.districtId`, `Festival.districtId`, and the
GeoJSON `properties.code` — keep new data keyed the same way.
