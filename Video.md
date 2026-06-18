# Addawah Landing Page — Background Intro Video

## Purpose

This document provides AI video generation prompts for a **cinematic intro video** used as the **background** of the Addawah landing page hero section.

**Addawah** (الدَّعْوَة — *the call*) is an Islamic worship app for salah tracking, brotherhood, daily Qur'anic wisdom, and spiritual growth. The video should feel sacred, timeless, and uplifting — not promotional or flashy. It tells a visual story of Islam, the beauty of worship, the ummah united in prayer, and the timeless importance of **dawah** — calling oneself and others toward Allah with mercy and sincerity.

---

## How the video will be used

| Requirement | Detail |
|---|---|
| Placement | Full-width background behind the landing page hero (text and UI overlay on top) |
| Duration | **30–60 seconds** (ideal: **45s**), seamless **loop** |
| Aspect ratio | **16:9** (desktop) — also export a **9:16** crop for mobile if needed |
| Resolution | **1920×1080** minimum (4K preferred for downscaling) |
| Motion | Slow, smooth camera moves — no rapid cuts or shaky footage |
| Audio | **No audio** (muted background) — or generate silent; ambient only if required |
| Readability | Keep centre and lower-third relatively **calm and darker** so white/gold hero text remains readable |
| Mood | Reverent · luminous · peaceful · brotherhood · dawn-to-dusk spiritual journey |
| Style | Cinematic documentary + ethereal light · golden hour · soft film grain · shallow depth of field |
| Avoid | Faces in extreme close-up · political imagery · violence · text/logos/watermarks · modern city clutter |

---

## Master prompt (single clip — copy & paste)

Use this as one full prompt in Runway Gen-3/Gen-4, Kling, Pika, Sora, Luma Dream Machine, or similar:

```
Cinematic Islamic spiritual intro film, 45 seconds, seamless loop, 16:9, 24fps, slow graceful camera movement, golden hour and blue hour lighting, soft film grain, shallow depth of field, reverent and peaceful mood, no text, no logos, no faces in close-up, suitable as a website hero background with text overlay.

Opening: pre-dawn sky over a vast desert horizon, first light of Fajr breaking, thin crescent moon fading, stars dissolving into warm amber glow, gentle dust particles in light beams.

Cut to: silhouette of a single minaret and dome against a rose-gold sunrise, birds crossing the sky slowly, call to prayer atmosphere without showing a person’s face.

Transition: majestic wide aerial glide toward the Kaaba in Makkah at peaceful hours — white marble courtyard, pilgrims in ihram as distant small figures moving with unity and humility, soft golden reflections on marble, slow circular drone orbit, sacred and awe-inspiring.

Flow into: serene courtyard of the Prophet’s Mosque in Madinah — green dome glowing softly, rows of worshippers in sujood from a respectful elevated wide angle, warm lantern light, quiet devotion.

Transition: Al-Aqsa Mosque at dusk — golden stone walls, calm sky, gentle breeze in olive trees, a sense of history and steadfast faith.

Interlude: close details of Islamic artistry — ornate geometric arabesque patterns on an arch, light passing through a mihrab-shaped window, Qur’an pages turning slowly in soft light (no readable text), prayer beads resting beside folded hands in soft focus.

Scene of ummah: diverse Muslim men and women from behind or at a distance walking toward a mosque at Maghrib, warm orange sky, lanterns lit, community and brotherhood, modest clothing, peaceful faces not shown directly.

Spirit of dawah: a gentle hand offering water to another, friends sitting in circle sharing quiet conversation at sunset, one person helping another stand for prayer — acts of mercy, invitation through character not preaching.

Closing loop: night sky over a calm mosque courtyard, crescent moon, faint stars, warm window glow, slow pull-back to mirror the opening desert dawn so the clip loops seamlessly.

Color palette: deep navy, emerald green accents, warm gold, soft ivory, subtle teal shadows — match a sacred modern app aesthetic. Consistent exposure, slightly darkened edges for UI overlay readability. Ethereal god rays, no harsh contrast, no strobe, no fast cuts.
```

---

## Extended storyboard (for multi-clip generation + edit)

If your AI tool works best with **short clips (5–10s each)**, generate these separately and stitch in CapCut, DaVinci Resolve, or Premiere. Use the **same style line** on every clip:

> *Cinematic Islamic documentary, golden hour, slow camera, reverent, soft grain, no text, no logos, seamless tone.*

| # | Duration | Scene | Clip prompt |
|---|---|---|---|
| 1 | 6s | Fajr dawn | Pre-dawn desert horizon, crescent moon, first orange light of Fajr, stars fading, slow push-in, peaceful and vast |
| 2 | 6s | Minaret silhouette | Single mosque minaret and dome silhouette at sunrise, rose-gold sky, birds flying slowly, no faces |
| 3 | 8s | Makkah | Wide aerial slow orbit around the Kaaba, white marble, distant pilgrims in ihram, humble unity, sacred atmosphere |
| 4 | 7s | Madinah | Prophet’s Mosque green dome at soft morning light, wide courtyard, rows of worshippers in prayer from elevated respectful angle |
| 5 | 6s | Al-Aqsa | Al-Aqsa golden walls at dusk, olive trees swaying gently, calm sky, historical reverence |
| 6 | 5s | Islamic art | Ornate mihrab arch, geometric arabesque patterns, light rays through lattice, macro slow pan |
| 7 | 6s | Qur’an & dhikr | Open Qur’an pages turning in warm light (blurred text), prayer beads, folded hands, shallow depth of field |
| 8 | 6s | Brotherhood | Muslims walking together toward mosque at Maghrib from behind, warm sky, lanterns, community |
| 9 | 5s | Dawah in action | Sunset scene — sharing food, gentle invitation, mercy between friends, modest dress, no direct face close-ups |
| 10 | 6s | Loop ending | Night mosque courtyard, crescent moon, warm glow, slow pull-back to dark horizon matching clip 1 |

**Edit notes:** Cross-dissolve transitions (1–1.5s). Apply a subtle **20–30% dark gradient overlay** at the bottom for text legibility. Export H.264 `.mp4`, muted, loop-friendly.

---

## Short loop prompt (15–20s — lighter background)

For a subtler, less distracting hero background:

```
Slow looping cinematic background, 20 seconds, 16:9, Islamic spiritual atmosphere, soft golden light rays through a mihrab arch, gentle floating dust particles, distant mosque silhouette at sunset, crescent moon and stars, emerald and gold color grade, very slow camera drift left to right, darkened lower third for text overlay, no people, no text, no logos, peaceful meditative mood, seamless loop.
```

---

## Negative prompt (use if tool supports it)

```
text, subtitles, watermark, logo, brand name, cartoon, anime, 3D render look, video game, shaky camera, fast cuts, strobe light, neon colors, nightclub, violence, weapons, war, blood, political flags, protest, luxury cars, skyscrapers, party, alcohol, inappropriate dress, exaggerated facial close-ups, distorted hands, low quality, blurry faces, modern advertisements
```

---

## Post-production checklist (before adding to site)

- [ ] Compress for web: target **≤ 8 MB** for hero loop (use HandBrake or similar)
- [ ] Mute audio track completely
- [ ] Verify loop point is seamless (last frame blends into first)
- [ ] Test readability of hero headline over video on **dark** and **light** theme
- [ ] Add CSS overlay: `linear-gradient` dark scrim (~40–55% opacity) over video
- [ ] Provide fallback poster image (first frame JPG/WebP) for slow connections
- [ ] Save as: `/public/assets/video/addawah-hero-intro.mp4`

---

## Suggested on-page integration (reference)

```html
<!-- Hero background video (muted, autoplay, loop, playsinline) -->
<video autoplay muted loop playsinline poster="/assets/images/hero-poster.webp">
  <source src="/assets/video/addawah-hero-intro.mp4" type="video/mp4" />
</video>
```

---

## Narrative theme summary (for human editors)

The video should communicate this story **without spoken words**:

1. **Islam begins in stillness** — Fajr, dawn, creation waking under Allah’s light  
2. **Sacred places anchor the ummah** — Makkah, Madinah, Al-Aqsa as symbols of unity and history  
3. **Worship is the heart** — salah, sujood, Qur’an, dhikr — beauty in discipline  
4. **Brotherhood strengthens faith** — praying together, supporting one another  
5. **Dawah is invitation with mercy** — not force, but gentle call toward goodness  
6. **The journey continues** — night returns to dawn; faith is daily, lifelong, shared  

This aligns with Addawah’s mission: *Pray Together. Grow Together. Inspire Each Other.*

---

## Recommended AI tools

| Tool | Best for |
|---|---|
| **Runway Gen-3 Alpha / Gen-4** | Cinematic realism, camera control |
| **Kling AI** | Longer clips, smooth motion |
| **Luma Dream Machine** | Atmospheric light and environments |
| **Pika** | Stylised loops, quick iterations |
| **OpenAI Sora** | High-quality narrative sequences (when available) |

Generate 2–3 variations of the master prompt, pick the most readable under text overlay, then loop and compress.

---

*Created for the Addawah project — landing page hero background intro video.*
