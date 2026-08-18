# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Visit Busan" (부산 눈치게임) — a Busan tourism congestion-visualization app. Shows district-level
crowd congestion on a Kakao map, hot/hidden place recommendations, a searchable/filterable spot list,
and per-spot congestion forecasts with festival overlays. The frontend talks to a real backend
(`busan-timing-backend.onrender.com`) — this repo itself is still frontend-only (no backend code here).

The actual app lives in `frontend/` — always `cd frontend` before running commands.

## Commands

Run from `frontend/`:

- `npm run dev` — start Vite dev server
- `npm run build` — typecheck (`tsc -b`) then production build
- `npm run lint` — ESLint over the whole project
- `npm run preview` — preview the production build

There is no test runner configured in this project.

## Environment

`frontend/.env` holds `VITE_KAKAO_APP_KEY` (injected into `index.html` as `%VITE_KAKAO_APP_KEY%` for the
Kakao Maps SDK `<script>` tag) and `VITE_API_BASE_URL` (the backend origin, currently
`https://busan-timing-backend.onrender.com`, prefixed onto every `apiGet`/`apiPost` call). Vite env vars
are the only config mechanism — there's no other env layer. Vercel deploys need the same two vars set
under Project Settings → Environment Variables (they don't come from `.env`, which is local-only).

## Architecture

**Routing** (`src/App.tsx`): three routes — `/` (MainPage, map + hot/hidden picks), `/list` (ListPage,
searchable/filterable spot grid, reads `?q=` and `?district=` query params), `/detail/:spotId`
(DetailPage, forecast calendar + festivals + recommendations). `@tanstack/react-query` (via
`QueryClientProvider` in `App.tsx`) is the actual data-fetching layer — every page uses `useQuery`
against `src/api/*`. `zustand`, `recharts`, and `dayjs` are installed but still unused.

**Real backend via `src/api/`.** `src/api/client.ts` (`apiGet`/`apiPost`) calls `${VITE_API_BASE_URL}`.
`src/api/main.ts` (`fetchMainData`) backs MainPage, `src/api/places.ts` backs ListPage (`fetchPlaces`)
and DetailPage (`fetchPlaceDetail`, `fetchPlaceForecast`, `fetchPlaceFestivals`,
`fetchPlaceCongestionPattern`, `fetchPlaceSuggestions`, `fetchPlaceCompanions`, `countPlaceView`).
Response shapes live in `src/types/api.ts`, which is meant to mirror the backend's OpenAPI schema
(`/v3/api-docs`) 1:1 — when the backend contract changes, update that file first, then its consumers.

There is no mock data layer — `src/types/index.ts` only exports `CongestionLevel`. A district-detail
bottom sheet showing "calmer nearby districts" would source that list from `fetchMainData`'s
`districts` array (already used by `KakaoMap`), not static data.

**Congestion level system** (`src/utils/congestion.ts`) is the central mapping used whenever a
congestion rate (0-100 number) needs to become a `CongestionLevel` (0-5, where 0 = "집계중"/not yet
aggregated) plus its color/image/label: `getCongestionLevel`, `getLevelColor`, `getLevelImage` (→
`/images/level0N.png` in `public/`), `getLevelLabel`. Note the backend also returns its own
`levelCode`/`label` on `CongestionResponse` objects — components re-derive locally via
`getCongestionLevel(score)` rather than trusting the API's label, so keep the two in sync if backend
thresholds change. Any new component displaying congestion should go through these utils rather than
reimplementing thresholds.

**Kakao map** (`src/components/KakaoMap.tsx`): takes `districts: DistrictResponse[]` as a prop (sourced
from `fetchMainData` on MainPage), loads Busan district polygons from
`public/busan_districts.geojson`, colors each by `getLevelColor(getCongestionLevel(rate))`, overlays a
level-based duck watermark image (`src/assets/images/level0N__duck.png`), and navigates to
`/list?district={code}` on click. District source shapefiles live under
`public/LSMD_ADM_SECT_UMD_부산/`; `public/busan_umd.geojson` is a converted counterpart. Kakao SDK
types are declared in `src/types/kakao.d.ts`; the SDK itself loads globally via the `index.html`
script tag, not an npm package.

**Styling**: CSS Modules per component/page (`X.module.css` next to `X.tsx`), plus shared CSS custom
properties in `src/styles/variables.css` (e.g. `--color-primary`, `--color-sub`) referenced throughout
inline `style={}` props for level-based coloring.

**District IDs** are 5-digit Korean administrative codes (`26350` = 해운대구, etc.) and are the join key
across the backend's `districtCode` fields (`DistrictResponse`, `DistrictFacetResponse`, etc. in
`src/types/api.ts`) and the GeoJSON `properties.code` — keep new data keyed the same way.
