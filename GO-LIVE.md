# UpLife Painting — go-live runbook

**The site is live and indexable** — step 3 is done. What's left:

| # | Step | Who | Blocking? |
|---|---|---|---|
| 1 | Point `uplifepainting.com` DNS at Vercel | whoever holds the Cloudflare login | **yes** |
| 2 | Choose where estimate leads go, set one env var | UpLife (needs their email) | **yes** |
| ~~3~~ | ~~Flip to live~~ — **done**, canonicals + robots now on `www.uplifepainting.com` | — | done |
| 4 | Google Business Profile, Search Console | UpLife | no — do after |

Viewable now at <https://uplifepainting.elijahdesent.com> (serves fine; sends
`X-Robots-Tag: noindex` so it can't be indexed in place of the real domain).
Nothing will be indexed until step 1 lands, because that is where every canonical points.

---

## 1. DNS at Cloudflare

`uplifepainting.com` is registered through **Cloudflare** (registered 2026-08-16) and its
nameservers are `mimi.ns.cloudflare.com` / `giancarlo.ns.cloudflare.com`. It currently has
**no A or CNAME records at all** — nothing resolves.

Both `uplifepainting.com` and `www.uplifepainting.com` are **already attached to the Vercel
project and ownership-verified**. They only need these records added in the Cloudflare
dashboard (DNS → Records):

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `216.150.1.1` | **DNS only** |
| A | `@` | `216.150.16.1` | **DNS only** |
| CNAME | `www` | `ed6ac61ed4237b3f.vercel-dns-016.com` | **DNS only** |

**The proxy setting matters.** Cloudflare defaults new records to *Proxied* (orange cloud).
Leave it on and Vercel can't issue the TLS certificate, and you get a redirect loop. Click
the cloud so it reads **DNS only** (grey) on all three records.

Apex → www is already set as a **308 redirect at Vercel**, so `uplifepainting.com` will land
on `www.uplifepainting.com`. Don't add a redirect rule in Cloudflare too — you'd get a loop.

Check it with:

```
./go-live.sh --check       # prints live DNS for both hostnames
```

Certificates issue automatically about a minute after DNS resolves.

---

## 2. Where do the estimate leads go?

`/api/estimate` is written, deployed and tested. It is **one environment variable away from
working** — right now it returns `503 not_configured`, and the form honestly tells the
visitor to call instead of pretending the message sent.

**This is the one thing that needs an answer from UpLife: what email address should leads go
to?** There is no email address anywhere on their Facebook page or the flyer.

### Option A — email (what a painter actually wants)

Uses Resend. Eli already has a Resend account (there's a `RESEND_API_KEY` on the
`elmwoodbaptist` project).

```bash
cd ~/uplife-painting
npx vercel env add RESEND_API_KEY      production   # paste the key
npx vercel env add ESTIMATE_TO_EMAIL   production   # their address, e.g. uplifepainting@gmail.com
npx vercel env add ESTIMATE_FROM_EMAIL production   # "UpLife Painting <leads@uplifepainting.com>"
npx vercel --prod
```

`ESTIMATE_FROM_EMAIL` must be on a **domain verified in Resend**. Verify
`uplifepainting.com` there after step 1 — it needs its own DKIM/SPF records, which is easier
once you're already in the Cloudflare DNS panel. Until it's verified you can leave
`ESTIMATE_FROM_EMAIL` unset; it falls back to Resend's `onboarding@resend.dev`, which
**only delivers to the Resend account owner's address** — fine for testing, not for launch.

Replies go to the customer: the function sets `reply_to` to whatever email they typed.

### Option B — Slack (zero setup, good for the handover period)

```bash
npx vercel env add SLACK_WEBHOOK_URL production   # an incoming-webhook URL
npx vercel --prod
```

Leads arrive as a formatted Slack message. Useful so **no lead is lost while UpLife decides
on an inbox** — set this now and add email later.

Both can be on at once; the function delivers to each and only reports success if at least
one actually went through. If every destination fails it returns `502` and the page shows
the call/text fallback — it will never tell someone their message sent when it didn't.

**One ownership note:** if UpLife ever takes over this Vercel project, don't hand over Eli's
shared Resend key with it. Issue them their own, or move the destination to Slack/their own
Resend account first.

---

## 3. Flip it live

Only after DNS resolves. One command, idempotent, reversible:

```bash
cd ~/uplife-painting
./go-live.sh --check      # confirm DNS is up and see what will change
./go-live.sh --live       # swap URLs, drop noindex, open robots.txt
git commit -am "Go live on www.uplifepainting.com"
git push
npx vercel --prod
```

That single command:

- rewrites `https://uplifepainting.elijahdesent.com` → `https://www.uplifepainting.com`
  everywhere it appears (canonical, `og:`/`twitter:` tags, JSON-LD, sitemap)
- removes `<meta name="robots" content="noindex,nofollow">` from all five pages
- replaces `robots.txt` with an allow rule plus the sitemap reference

`./go-live.sh --preview` puts it all back. The round trip is byte-for-byte lossless — it was
tested both ways.

`uplifepainting.elijahdesent.com` keeps working after the flip as a spare preview URL, but
`vercel.json` sends **`X-Robots-Tag: noindex, nofollow` on that host only** (a `has`-scoped
header rule). So the preview stays viewable and shareable while never competing with the real
domain in search — which matters most right now, because until DNS resolves the preview is the
only reachable copy and its canonical points somewhere Google can't fetch. Leave that rule in
place permanently; the real domain is unaffected by it.

---

## 4. After launch

**Google Business Profile** is worth more than the website for a local painter — it's what
puts them in the map pack. Nothing else on this list comes close.

- Create/claim the profile at <https://business.google.com>, category **Painter**.
- Service-area business (they work at customers' homes, no storefront): set the service area
  to **Macomb County** rather than publishing a street address.
- Add the site URL, the phone `586-356-3663`, and upload the same job photos from
  `images/` — Google weights recent photos heavily.
- **Ask every finished customer for a review.** They're at "Not yet rated (1 Review)" on
  Facebook. Reviews are the single biggest lever on local ranking.

**Google Search Console** — add `www.uplifepainting.com`, verify by DNS TXT while you're in
Cloudflare, and submit `https://www.uplifepainting.com/sitemap.xml`.

**Bing Webmaster Tools** — import from Search Console, takes a minute.

**Analytics is not wired up**, on purpose. Vercel Web Analytics is provisioned on the
project but `/_vercel/insights/script.js` returns **404 on every one of Eli's sites**
(checked against `paragonpainting` and the live `ibck.org`), so it isn't actually enabled at
the account level. A script tag that 404s on every page load is worse than no analytics, so
it was removed. To turn it on: enable Analytics in the Vercel dashboard for this project,
confirm the script serves, then add one line before `</body>` on each page:

```html
<script defer src="/_vercel/insights/script.js"></script>
```

Verify it by checking `window.va` in a browser console — **not** by grepping the HTML, since
the request path is obfuscated and the tag being present proves nothing.

**Point the Facebook page** at the real domain once it's up. Their page already lists
"Uplifepainting.com" as its website, which currently goes nowhere.

---

## What is still unknown

None of these appear anywhere on the site, deliberately. Fill them in only with answers from
UpLife — don't guess:

- Owner's name (nothing on the FB page; the business has no other web footprint at all)
- Years in business, crew size
- Licence and insurance status — **worth adding once confirmed**, homeowners look for it
- Warranty terms
- Business hours
- Email address
- Whether "UpLife Home Improvement" does trades beyond painting — if so, that's a second
  service page and more search traffic

The service-area town list on `/` and `/about` is our inference from "Macomb County &
surrounding areas", not a list they published. Worth confirming they'll actually travel to
all of them.

---

## Quick reference

| | |
|---|---|
| Repo | `edesent/uplife-painting` (private) |
| Local | `~/uplife-painting` |
| Vercel project | `uplife-painting` on **Eli's Websites** |
| Preview URL | `uplifepainting.elijahdesent.com` |
| Live URL (pending DNS) | `www.uplifepainting.com` |
| Apex | 308 → www, set at Vercel |
| Deploy | `npx vercel --prod` (git push also deploys) |
| Lead endpoint | `POST /api/estimate` |
