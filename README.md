# UpLife Painting — website

Static site for **UpLife Painting**, a painting company in **Macomb Township, Michigan**
serving Macomb County. UpLife Painting is the painting arm of **UpLife Home Improvement**.

- Phone (call **or text**): **586-356-3663**
- Facebook: <https://www.facebook.com/people/Uplifepainting/61594038056853/>
- Their own domain: **uplifepainting.com** — registered 2026-08-16 through Cloudflare,
  but it has **no DNS records and nothing live on it** as of 2026-09-01.
- Preview URL: <https://uplifepainting.elijahdesent.com>

## How it's built

Plain static HTML/CSS/JS — **no build step, no framework**. Edit the `.html` files
directly; whatever is committed is what ships.

```
index.html services.html gallery.html about.html contact.html 404.html
api/estimate.js — the free-estimate form handler (zero deps, Vercel function)
css/site.css    — the whole design system, one file
js/site.js      — mobile nav, scroll reveal, gallery lightbox, form submit
images/         — photos, logo crops, favicons, OG card
vercel.json     — cleanUrls + security and cache headers
sitemap.xml     — five pages; URLs flip with go-live.sh
robots.txt      — Disallow: / while in preview
go-live.sh      — one-command switch between preview and live
GO-LIVE.md      — the launch runbook: DNS, lead destination, checklist
```

**The header, nav and footer are duplicated in all five HTML files.** There is no include
mechanism. If you change the nav, change it in all five.

**Link without the `.html`.** `cleanUrls` 308-redirects `/about.html` → `/about`, so an
internal link ending in `.html` costs a redirect hop and disagrees with the canonical.

## This is a preview build — see GO-LIVE.md

`robots.txt` is `Disallow: /` and every page carries
`<meta name="robots" content="noindex,nofollow">`. **Don't flip these by hand** — run
`./go-live.sh --live`, which changes them together with the canonical/OG/JSON-LD URLs and
the sitemap. Doing one without the others is how a preview ends up competing with the real
site in search.

```
./go-live.sh --check     # what would change + live DNS status
./go-live.sh --live      # switch to www.uplifepainting.com, allow indexing
./go-live.sh --preview   # switch back (lossless round trip)
```

**The estimate form works, but has no destination configured yet.** `POST /api/estimate`
delivers to Slack and/or email depending on which env vars are set, and returns
`503 not_configured` when neither is — in which case the page tells the visitor to call
instead. It will never show the confirmation panel unless a lead actually went somewhere.
Set `SLACK_WEBHOOK_URL`, or `RESEND_API_KEY` + `ESTIMATE_TO_EMAIL`. See **GO-LIVE.md**.

## Design language

Everything is sampled from the company's own flyer and logo — nothing invented.

| Token | Value | Where it came from |
|---|---|---|
| `--navy-950` | `#02142C` | the flyer's background field |
| `--navy-800` | `#022248` | the navy in the "UpLife" logo on the sky photo |
| `--navy-700` | `#0A2747` | the flyer's lighter navy panels |
| `--gold` | `#E1A01E` | "LIFE" in the logo wordmark |
| `--paper` | `#F4F6FA` | neutral light band, so the navy isn't unrelieved |

- **Display type** is Montserrat 900 *italic uppercase* — the closest Google Font match to
  the heavy italic wordmark on their flyer. Body is Inter.
- The **diagonally cut hero photo panel** echoes the slanted photo strips on the flyer.
- The **gold chip strip** (Interior · Exterior · Drywall · Trim · Pressure Washing) is the
  flyer's five-icon row.
- The site is navy-dominant because **their own brand is** — the flyer is a dark navy
  poster. Light `--paper` bands are interleaved so the photos have somewhere to breathe.

## The logo

`images/logo-lockup.png` (and `-lg`) is the **real lockup from their flyer**, keyed off the
flat navy background at full flyer resolution: an alpha mask from luminance, connected-
component filtering to drop the flyer's decorative paint splatter, and the two brand colours
snapped back to true white and `#E1A01E` (a naive un-multiply turns the gold olive).

- It is **white-and-gold art with transparency**, so it only works on a dark ground. That is
  why the header and footer are navy. There is **no dark-on-light variant** — if one is ever
  needed, key the navy/gold "UpLife" version from their sky photo instead.
- The flanking gold flourish dashes were deliberately dropped: they collide with the flyer's
  splatter texture and vanish at header size.
- `images/logo-mark.png` is the "UP + arrow" crop, used for the favicon and app icons.

## Photos — all real, all theirs

Every photo came off their Facebook page and is a real UpLife job site. **There is no stock
or AI imagery anywhere on this site**, and there should not be: Facebook itself flags one of
their posts as "AI content", and the four house photos on their flyer look generated, so
**none of the flyer's photos are used.**

The photos resolve to three jobs:

| File | Job | What it shows |
|---|---|---|
| `exterior-before-masked.jpg` | A | Two-story home in worn taupe board-and-batten, masked for spraying — **the honest "before"** (original colour is visible) |
| `exterior-siding-repair.jpg` | A | Crew member on a ladder replacing a damaged siding board — **the hero photo** |
| `exterior-trim-carpentry.jpg` | A | New bare cedar trim fitted around the projecting gable |
| `exterior-after-front.jpg` | A | Finished, deep black siding over red brick |
| `exterior-after-side.jpg` | A | Finished side elevation, cut line where paint meets brick |
| `exterior-after-gable.jpg` | A | Finished gable end, ladder still up |
| `exterior-after-garage.jpg` | A | Finished elevation from the driveway |
| `ranch-during-masked.jpg` | B | Brick ranch mid-job, ladders up, entry masked |
| `ranch-after-entry.jpg` | B | Same ranch finished, charcoal gables and trim |
| `interior-vaulted-ceiling.jpg` | C | Vaulted ceiling coated, furniture under drop cloths |
| `interior-entry-arch.jpg` | C | Entry room repainted, floors taped and papered |
| `interior-navy-door.jpg` | C | Navy door against grey painted brick |
| `interior-brick-fireplace.jpg` | C | Fireplace brick painted soft grey |

Jobs A and B are genuine before/after pairs, shown side by side rather than in a slider —
the camera angles differ, and a slider would imply they don't.

The four interior photos were **cut out of a single six-up collage** on their Facebook page
(`788413219…`, 2048×2048; seams at 65.5% on both axes, and 32%/33% inside the two sub-grids).
Two tiles from that collage are **deliberately unused**: a black utility sink (a plumbing
fixture, not paint work) and a dated cherry-cabinet kitchen that is clearly a *before* with
no matching *after* — showing it alone would read as bad work.

Native widths are 631–1297px; nothing is upscaled.

## Facts used on the site — and facts we do NOT have

Used, and all verifiable from their own material:

- Services, **in their words**: exterior painting, interior painting, siding & trim painting,
  drywall & minor repairs, power washing.
- "Serving Macomb County & surrounding areas", based in Macomb Township.
- Free estimates; call **or** text 586-356-3663.
- Taglines from the flyer: "Transforming homes one coat at a time", "Quality work you can
  trust", "Clean, professional & reliable".
- The pull quote on `/` and `/about` is **quoted verbatim** from their own Facebook post.
  Don't paraphrase it into something they didn't say.

**Not known, and therefore claimed nowhere on the site** — do not add any of these without
asking them first:

- Owner's or any crew member's name (their Facebook page carries none, and the business has
  **zero** other web footprint — no BBB, Yelp, Google Business or directory listing found)
- Years in business, number of jobs, crew size
- Licence or insurance status
- Any warranty or guarantee terms
- Pricing, or any discount offer
- Business hours
- An email address (there is none; `/contact` routes to the form and the phone instead)
- Reviews or ratings — their Facebook page reads "Not yet rated (1 Review)", so there is no
  review count worth citing

The service-area town list on `/` and `/about` is real Macomb County municipalities, but it
is **our inference from "Macomb County & surrounding areas"** — not a list they published.
