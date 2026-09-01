#!/usr/bin/env bash
# Flip the site from preview to live (or back). Idempotent — safe to re-run.
#
#   ./go-live.sh --check     what would change, nothing written  (default)
#   ./go-live.sh --live      point at www.uplifepainting.com, allow indexing
#   ./go-live.sh --preview   point back at the preview URL, block indexing
#
# Run this only once DNS actually resolves (./go-live.sh --check tells you).
# After it, commit and deploy:  git commit -am "Go live" && npx vercel --prod

set -euo pipefail
cd "$(dirname "$0")"

PREVIEW="https://uplifepainting.elijahdesent.com"
LIVE="https://www.uplifepainting.com"
MODE="${1:---check}"

python3 - "$MODE" "$PREVIEW" "$LIVE" <<'PY'
import sys, os, re, glob

mode, preview, live = sys.argv[1], sys.argv[2], sys.argv[3]
PAGES = ['index.html', 'services.html', 'gallery.html', 'about.html', 'contact.html']
NOINDEX = '<meta name="robots" content="noindex,nofollow">\n'

if mode not in ('--check', '--live', '--preview'):
    sys.exit('usage: go-live.sh [--check|--live|--preview]')

cur_live = live in open('index.html').read()
# --check reports whichever direction actually moves the site
want_live = (not cur_live) if mode == '--check' else (mode == '--live')
frm, to = (preview, live) if want_live else (live, preview)
write = mode != '--check'
changes = []

for f in PAGES:
    s = open(f).read()
    orig = s
    s = s.replace(frm, to)
    if want_live:
        s = s.replace(NOINDEX, '')
    elif NOINDEX not in s:
        # restore it directly above the canonical link
        s = re.sub(r'(?m)^(<link rel="canonical")', NOINDEX + r'\1', s, count=1)
    if s != orig:
        changes.append(f)
        if write:
            open(f, 'w').write(s)

# 404 keeps its own noindex,follow — only its URLs (if any) move
for f in ['404.html', 'sitemap.xml']:
    if not os.path.exists(f):
        continue
    s = open(f).read()
    if frm in s:
        changes.append(f)
        if write:
            open(f, 'w').write(s.replace(frm, to))

robots_live = (
    "User-agent: *\n"
    "Allow: /\n\n"
    "Sitemap: %s/sitemap.xml\n" % live
)
robots_prev = (
    "# Demo/preview build — not the public site yet.\n"
    "# Run ./go-live.sh --live to flip this and the per-page noindex together.\n"
    "User-agent: *\n"
    "Disallow: /\n"
)
target = robots_live if want_live else robots_prev
if open('robots.txt').read() != target:
    changes.append('robots.txt')
    if write:
        open('robots.txt', 'w').write(target)

state = 'LIVE (www.uplifepainting.com, indexable)' if want_live else 'PREVIEW (elijahdesent.com, noindex)'
if mode == '--check':
    print('current state : %s' % ('LIVE' if cur_live else 'PREVIEW'))
    print('would switch  : %s' % ('PREVIEW -> LIVE' if want_live else 'LIVE -> PREVIEW'))
    print('files touched : %s' % (', '.join(sorted(set(changes))) or 'none'))
    print('\nrun  ./go-live.sh --live     to switch to %s' % live)
    print('run  ./go-live.sh --preview  to switch back')
else:
    print('switched to %s' % state)
    print('files changed: %s' % (', '.join(sorted(set(changes))) or 'none — already there'))
    print('\nnext: git commit -am "Go live" && npx vercel --prod')
PY

if [ "$MODE" = "--check" ]; then
  echo
  echo "DNS right now:"
  for h in uplifepainting.com www.uplifepainting.com; do
    got="$(dig +short "$h" 2>/dev/null | tr '\n' ' ')"
    if [ -z "$got" ]; then
      echo "  $h — no records yet (not ready to go live)"
    else
      echo "  $h -> $got"
    fi
  done
fi
