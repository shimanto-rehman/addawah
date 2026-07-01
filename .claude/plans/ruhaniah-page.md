# Ruhaniah — Verse Bug Fix + Graphs + Dua Remarking

## 1. Fix: Verse Not Showing Arabic/Translation After Refresh

**Root cause**: The GET endpoint doesn't unpack `arabic`, `translation`, `tafsir` from the `signals` JSON field. POST returns them fine, but on page reload the GET path omits them.

**Files to fix**:
- `app/api/ruhaniah/route.ts` — extract fields from `verse.signals` in GET response
- `hooks/useRuhaniah.ts` — add `arabic`, `translation`, `tafsir` to verse type
- `components/ruhaniah/RuhaniahFlow.tsx` — map those fields when restoring verse from context

## 2. Dua Remarking in DuaLog

**Current state**: DuaLog shows statuses (WAITING, ANSWERED_SAME, ANSWERED_DIFFERENT, STORED_AKHIRAH) but no way to update them.

**Plan**:
- Tap existing dua → inline status picker (4 options with emojis)
- New PATCH `/api/ruhaniah/duas` endpoint to update status + dateResolved
- Component: update `DuaLog.tsx` with remarking UI

## 3. Ruhaniah Insights Graphs

Add a collapsible "Your Insights" section below the check-in flow. Uses existing Chart.js.

### 3a. Fahm Radar (Psychology ↔ Iman)
- 8-axis radar: QADR, TRUTH, DAWAH, NAFS, AKHIRAH, SABR_SHUKR, ILM, SOCIAL
- Data from `UserFahmProfile.categoryScores`
- Shows strongest/weakest + trend badge

### 3b. Taqwa Trend Line
- 30-day area chart of taqwa scores
- Data from `/api/ruhaniah/history`

### 3c. Dua Status Doughnut
- WAITING / ANSWERED_SAME / ANSWERED_DIFFERENT / STORED_AKHIRAH
- Acceptance rate % in center

### 3d. API: Expose Fahm Profile
- Extend `/api/ruhaniah` GET to include fahmProfile data

## Files to Create
- `components/ruhaniah/FahmRadar.tsx`
- `components/ruhaniah/TaqwaTrend.tsx`
- `components/ruhaniah/DuaChart.tsx`
- `components/ruhaniah/RuhaniahInsights.tsx`
- `app/api/ruhaniah/duas/route.ts` (PATCH)

## Files to Modify
- `app/api/ruhaniah/route.ts` — fix verse GET + include fahmProfile
- `hooks/useRuhaniah.ts` — update types
- `components/ruhaniah/RuhaniahFlow.tsx` — fix verse restore + add Insights
- `components/ruhaniah/DuaLog.tsx` — add remarking
- `components/ruhaniah/RuhaniahDataProvider.tsx` — extend context
- `assets/css/dawa-ruhaniah.css` — insight styles

## Order
1. Fix verse bug
2. Dua remarking API + UI
3. Extend GET API with fahmProfile
4. FahmRadar chart
5. TaqwaTrend chart
6. DuaChart
7. RuhaniahInsights container + wire in
