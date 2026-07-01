# Taqwa Pulse — Make It More Interesting

## Problem
The current Taqwa Pulse feels flat. The orb is just a static radial gradient with a number, the slider is basic, and there's no sense of spiritual energy or feedback. Something is missing — it doesn't feel *alive*.

## What's Missing
1. **No breathing/pulsing animation** — the orb sits still until you drag
2. **No visual depth** — single gradient, no layers or aura rings
3. **No particle feedback** — score changes feel mechanical, not spiritual
4. **Labels are generic** — "Distracted", "Wandering" etc. lack Islamic flavor
5. **Empty state is dead** — nothing draws the eye before interaction

## Plan

### 1. Breathing Orb Animation (CSS + framer-motion)
- Add a slow CSS `@keyframes taqwa-breathe` pulse on the orb (scale 1 → 1.05 → 1, opacity shifts)
- Intensity scales with score: score 1 = slow/subtle, score 5 = faster/more pronounced
- Uses `animation-duration` tied to score via inline style

### 2. Concentric Aura Rings (CSS pseudo-elements)
- Add 2 expanding ring layers behind the orb via `::before` / `::after`
- Rings animate outward (scale + fade) when score changes — like a spiritual ripple
- Trigger via framer-motion `key={score}` to re-fire animation on each change

### 3. Floating Particles (framer-motion)
- Render 4-6 small dot particles that drift upward around the orb
- Particle count and speed increase with score
- Use `framer-motion` for smooth float + fade animations
- Only visible when score > 0

### 4. Better Labels with Islamic Spirituality
Replace the current labels:
- 1 → "Ghaflah (غفلة)" — Heedlessness
- 2 → "Sahw (سهو)" — Distracted
- 3 → "Tawajjuh (توجّه)" — Turning Attention
- 4 → "Hudhur (حضور)" — Presence
- 5 → "Ihsan (إحسان)" — Excellence in worship

Keep the English subtitle below for clarity.

### 5. Score Change Burst Effect
- On each score change, emit a brief radial burst (scale up + fade) from the orb center
- Uses `AnimatePresence` + a keyframed div that appears and fades out in 600ms

### 6. Slider Track Glow
- The track fill already glows, but enhance: when score ≥ 4, add a pulsing glow on the entire track
- CSS animation with `box-shadow` pulse

### 7. Empty State Micro-animation
- When score is null/0, show a gentle breathing animation on the orb + a subtle "tap to begin" shimmer on the track

## Files to Change
- `components/ruhaniah/TaqwaPulse.tsx` — component logic + particles + burst
- `assets/css/dawa-ruhaniah.css` — breathing keyframes, aura rings, particle styles, enhanced track glow

## Approach
- Keep it performant — CSS animations for loops, framer-motion only for one-shot transitions
- No new dependencies — uses existing `framer-motion` + CSS
- Accessible — reduced-motion media query disables all animations
