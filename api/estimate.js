/* POST /api/estimate — the free-estimate form handler.
 *
 * Zero dependencies. Delivers each lead to whichever destinations are configured
 * by environment variable, and refuses to report success if none are:
 *
 *   SLACK_WEBHOOK_URL     Slack incoming webhook — the lead is posted to that channel.
 *   RESEND_API_KEY        Resend API key.
 *   ESTIMATE_TO_EMAIL     Where leads are emailed (comma-separate for several).
 *   ESTIMATE_FROM_EMAIL   Verified Resend sender, e.g. leads@uplifepainting.com.
 *
 * Set at least one destination or the form returns 503 and the page tells the
 * visitor to call instead. See GO-LIVE.md.
 */

'use strict';

const FIELDS = ['name', 'phone', 'email', 'city', 'job', 'details'];
const MAX = { name: 120, phone: 40, email: 160, city: 120, job: 80, details: 4000 };

function clean(v, cap) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, cap);
}

function esc(s) {
  return String(s).replace(/[<>&]/g, function (c) {
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c];
  });
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { return {}; }
}

async function toSlack(url, lead) {
  const lines = [
    '*' + lead.job + '* — ' + lead.city,
    '*Name:* ' + lead.name,
    '*Phone:* ' + lead.phone,
    lead.email ? '*Email:* ' + lead.email : null,
    '',
    lead.details
  ].filter(Boolean);

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'New free-estimate request — ' + lead.name + ' (' + lead.city + ')',
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: '🎨 New free-estimate request' } },
        { type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } },
        {
          type: 'context',
          elements: [{ type: 'mrkdwn', text: 'uplifepainting.com · ' + new Date().toLocaleString('en-US', { timeZone: 'America/Detroit' }) + ' (Detroit)' }]
        }
      ]
    })
  });
  if (!r.ok) throw new Error('Slack ' + r.status + ' ' + (await r.text()).slice(0, 200));
}

async function toEmail(lead) {
  const to = process.env.ESTIMATE_TO_EMAIL.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  const rows = [
    ['Name', lead.name],
    ['Phone', lead.phone],
    ['Email', lead.email || '—'],
    ['City / township', lead.city],
    ['Job type', lead.job]
  ].map(function (p) {
    return '<tr><td style="padding:6px 16px 6px 0;color:#5A6779;font:600 13px system-ui">' + esc(p[0]) +
           '</td><td style="padding:6px 0;color:#0E1726;font:600 15px system-ui">' + esc(p[1]) + '</td></tr>';
  }).join('');

  const html =
    '<div style="font:15px/1.6 system-ui,sans-serif;color:#0E1726;max-width:620px">' +
      '<div style="background:#02142C;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">' +
        '<div style="font:800 12px system-ui;letter-spacing:.16em;color:#E1A01E">NEW FREE-ESTIMATE REQUEST</div>' +
        '<div style="font:800 22px system-ui;margin-top:6px">' + esc(lead.name) + ' — ' + esc(lead.city) + '</div>' +
      '</div>' +
      '<div style="border:1px solid #E4E8EF;border-top:0;border-radius:0 0 12px 12px;padding:22px 24px">' +
        '<table style="border-collapse:collapse;margin-bottom:16px">' + rows + '</table>' +
        '<div style="font:600 12px system-ui;letter-spacing:.14em;color:#5A6779;margin-bottom:6px">DETAILS</div>' +
        '<div style="white-space:pre-wrap;background:#F4F6FA;border-radius:8px;padding:14px 16px">' + esc(lead.details) + '</div>' +
        '<p style="margin-top:18px"><a href="tel:' + esc(lead.phone.replace(/[^\d+]/g, '')) + '" style="background:#E1A01E;color:#02142C;font:800 14px system-ui;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">Call ' + esc(lead.phone) + '</a></p>' +
      '</div>' +
    '</div>';

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.ESTIMATE_FROM_EMAIL || 'UpLife Painting <onboarding@resend.dev>',
      to: to,
      reply_to: lead.email || undefined,
      subject: 'Free estimate request — ' + lead.name + ' (' + lead.city + ')',
      html: html
    })
  });
  if (!r.ok) throw new Error('Resend ' + r.status + ' ' + (await r.text()).slice(0, 300));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, code: 'method_not_allowed' });
  }

  const body = await readBody(req);

  // Spam gates: a hidden field real people never fill, and a minimum fill time.
  if (clean(body.company, 200)) return res.status(200).json({ ok: true, delivered: [] });
  if (Number(body.elapsed) >= 0 && Number(body.elapsed) < 2500) {
    return res.status(400).json({ ok: false, code: 'too_fast' });
  }

  const lead = {};
  FIELDS.forEach(function (f) { lead[f] = clean(body[f], MAX[f]); });

  const missing = ['name', 'phone', 'city', 'job', 'details'].filter(function (f) { return !lead[f]; });
  if (missing.length) return res.status(400).json({ ok: false, code: 'missing_fields', fields: missing });
  if (lead.phone.replace(/\D/g, '').length < 7) {
    return res.status(400).json({ ok: false, code: 'bad_phone' });
  }

  const slack = process.env.SLACK_WEBHOOK_URL;
  const email = process.env.RESEND_API_KEY && process.env.ESTIMATE_TO_EMAIL;
  if (!slack && !email) {
    console.error('estimate: no destination configured — lead dropped:', JSON.stringify(lead));
    return res.status(503).json({ ok: false, code: 'not_configured' });
  }

  const jobs = [];
  if (slack) jobs.push({ name: 'slack', p: toSlack(slack, lead) });
  if (email) jobs.push({ name: 'email', p: toEmail(lead) });

  const settled = await Promise.allSettled(jobs.map(function (j) { return j.p; }));
  const delivered = [];
  settled.forEach(function (s, i) {
    if (s.status === 'fulfilled') delivered.push(jobs[i].name);
    else console.error('estimate: ' + jobs[i].name + ' failed:', s.reason && s.reason.message);
  });

  if (!delivered.length) {
    // Never tell the visitor it went through when nothing did — the lead is the whole point.
    console.error('estimate: ALL destinations failed — lead:', JSON.stringify(lead));
    return res.status(502).json({ ok: false, code: 'delivery_failed' });
  }

  return res.status(200).json({ ok: true, delivered: delivered });
};
