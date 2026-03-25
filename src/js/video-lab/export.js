/**
 * JSON / CSV / text export for Video Lab session.
 */
import { formatTime } from '../utils.js';
import { escapeHtml } from './coach-narrative.js';

function maxAbsGap(gaps) {
  if (!gaps?.length) return 0;
  return gaps.reduce((m, g) => Math.max(m, Math.abs(g.gap)), 0);
}

/**
 * Full athlete report HTML (same document as download). Returns null if no valid analysis.
 * @param {object} x — same shape as `window.__vlLastExport`
 */
export function buildAthleteReportHtmlFromExport(x) {
  if (!x || x.analysisResult?.error) return null;
  const r = x.analysisResult;
  const meta = x.eventMeta;
  const unit = meta.timeUnit || 'seconds';
  const diff =
    r.diff != null ? `${r.diff > 0 ? '+' : ''}${r.diff.toFixed(2)}s` : '—';
  const fh = r.firstHalfPct != null ? `${r.firstHalfPct.toFixed(1)}%` : '—';
  const shape = r.shape.replace(/_/g, ' ');
  const png = x.chartPngDataUrl || '';
  const mag = maxAbsGap(r.gaps);
  return buildShareableReportHtml({
    title: x.session.athleteLabel || `Pacing report — ${meta.name}`,
    generatedAt: new Date().toLocaleString(),
    eventName: meta.name,
    genderLabel: x.genderLabel,
    athleteLabel: x.session.athleteLabel || `${meta.name} pacing`,
    totalDisplay: formatTime(r.total, unit),
    modelTier: r.model.level,
    diffDisplay: diff,
    shapeDisplay: shape,
    firstHalfPctDisplay: fh,
    projectionSectionHtml: buildReportProjectionSectionHtml(r.projection),
    tableInnerHtml: buildReportTableRowsHtml(r.gaps, r.total, r.total),
    chartPngDataUrl: png,
    gapBarsInnerHtml: buildGapBarsInnerHtml(r.gaps, mag),
    coachParagraphs: x.coachParagraphs || [],
    coachSourceNote: x.coachSourceNote,
  });
}

export function buildExportPayload(session, eventMeta, segmentSeconds, analysisResult) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    eventId: session.eventId,
    eventName: eventMeta?.name,
    gender: session.gender,
    athleteLabel: session.athleteLabel || null,
    tGun: session.tGun,
    missedHeadSeconds: session.missedHeadSeconds ?? 0,
    segmentEndVideoTimes: session.segmentEndVideoTimes,
    officialTime: session.officialTime,
    reconcileMode: session.reconcileMode,
    segmentSeconds: segmentSeconds || null,
    analysis: analysisResult?.error ? { error: analysisResult.error } : stripAnalysisForJson(analysisResult),
  };
}

function stripAnalysisForJson(r) {
  if (!r || r.error) return r;
  return {
    total: r.total,
    modelLevel: r.model.level,
    diff: r.diff,
    shape: r.shape,
    firstHalfPct: r.firstHalfPct,
    projection: r.projection
      ? {
          slowSlackSeconds: r.projection.slowSlackSeconds,
          illustrativeLow: r.projection.illustrativeLow,
          illustrativeMid: r.projection.illustrativeMid,
          illustrativeHigh: r.projection.illustrativeHigh,
          blurb: r.projection.blurb,
        }
      : null,
    gaps: r.gaps.map(g => ({
      segment: g.segment,
      actual: g.actual,
      model: g.model,
      gap: g.gap,
      pctActual: g.pctActual,
      pctModel: g.pctModel,
    })),
    flags: r.flags,
  };
}

export function exportJsonBlob(payload) {
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export function exportCsv(eventMeta, segmentSeconds, analysisResult) {
  const rows = [['segment', 'distance_m', 'seconds', 'model_seconds', 'gap_seconds', 'pct_total']];
  if (!segmentSeconds || !eventMeta?.segments || segmentSeconds.length !== eventMeta.segments.length) {
    return new Blob(['segment,error\n"No data",\n'], { type: 'text/csv' });
  }
  const T = segmentSeconds.reduce((a, b) => a + b, 0);
  const modelSplits = analysisResult?.model?.splits;
  eventMeta.segments.forEach((seg, i) => {
    const a = segmentSeconds[i];
    const m = modelSplits?.[i];
    const gap = m != null ? a - m : '';
    rows.push([
      seg.label,
      String(seg.distance),
      a.toFixed(3),
      m != null ? Number(m).toFixed(3) : '',
      gap === '' ? '' : Number(gap).toFixed(3),
      ((a / T) * 100).toFixed(2),
    ]);
  });
  rows.push(['TOTAL', String(eventMeta.distance), T.toFixed(3), '', '', '100']);
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  return new Blob([csv], { type: 'text/csv' });
}

export function triggerDownload(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Single-file HTML report for athletes (open locally or attach to email).
 */
export function buildReportProjectionSectionHtml(projection) {
  if (!projection) return '';
  const low = projection.illustrativeLow.toFixed(2);
  const high = projection.illustrativeHigh.toFixed(2);
  return `<div class="rp-section">
  <h2>Pacing upside (estimate)</h2>
  <p class="rp-p">${escapeHtml(projection.blurb)}</p>
  <p class="rp-note">Illustrative faster band: about ${escapeHtml(low)}–${escapeHtml(high)} seconds (same units as splits above).</p>
</div>`;
}

export function buildShareableReportHtml({
  title,
  generatedAt,
  eventName,
  genderLabel,
  athleteLabel,
  totalDisplay,
  modelTier,
  diffDisplay,
  shapeDisplay,
  firstHalfPctDisplay,
  projectionSectionHtml = '',
  tableInnerHtml,
  chartPngDataUrl,
  gapBarsInnerHtml,
  coachParagraphs,
  coachSourceNote,
}) {
  const head = escapeHtml(title || 'Pacing report');
  const safeCoach = coachParagraphs.map(p => `<p class="rp-p">${escapeHtml(p)}</p>`).join('');
  const note = coachSourceNote ? `<p class="rp-note">${escapeHtml(coachSourceNote)}</p>` : '';
  const chartBlock = chartPngDataUrl
    ? `<div class="rp-chart"><img src="${chartPngDataUrl}" alt="You vs model — segment times" width="800" height="400" loading="lazy"></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${head}</title>
<style>
:root{--bg:#0c0c12;--surface:#15151f;--border:#2a2a3a;--text:#eaeaf2;--muted:#9898a8;--accent:#ff6b35;--green:#34d399;--red:#f87171;--font:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;--mono:ui-monospace,SFMono-Regular,Menlo,monospace}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);background:var(--bg);color:var(--text);line-height:1.55;padding:28px 20px 48px;max-width:880px;margin:0 auto}
.rp-brand{font-size:0.75rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
h1{font-size:1.65rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:6px}
.rp-meta{color:var(--muted);font-size:0.88rem;margin-bottom:22px}
.rp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:24px}
.rp-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px}
.rp-card .k{font-size:0.68rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);margin-bottom:4px}
.rp-card .v{font-family:var(--mono);font-size:1.05rem;font-weight:600;color:var(--accent)}
.rp-section{margin-top:28px}
.rp-section h2{font-size:1.05rem;font-weight:700;margin-bottom:12px}
.rp-coach{background:var(--surface);border:1px solid var(--border);border-left:4px solid var(--accent);border-radius:0 12px 12px 0;padding:18px 20px;margin-bottom:20px}
.rp-p{margin-bottom:12px;color:var(--text);font-size:0.95rem}
.rp-p:last-child{margin-bottom:0}
.rp-note{font-size:0.78rem;color:var(--muted);margin-top:14px}
.rp-chart{margin:16px 0;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:#0a0a10}
.rp-chart img{display:block;width:100%;height:auto;max-height:420px;object-fit:contain}
table{width:100%;border-collapse:collapse;font-size:0.82rem;margin-top:8px}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid var(--border)}
th{font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted)}
.mono{font-family:var(--mono)}
.pct-sec{font-size:0.78em;color:var(--muted);font-weight:400}
.rp-gaps{margin-top:16px}
.rp-gap{display:flex;align-items:center;gap:10px;margin-bottom:12px;font-size:0.82rem}
.rp-gap .seg{flex:0 0 118px;color:var(--muted)}
.rp-gap .track{flex:1;position:relative;height:12px;background:#1e1e28;border-radius:6px;overflow:hidden}
.rp-gap .mid{position:absolute;left:50%;top:0;bottom:0;width:1px;background:#444;transform:translateX(-50%)}
.rp-gap .bar{position:absolute;top:2px;bottom:2px;border-radius:4px}
.rp-gap .val{flex:0 0 76px;text-align:right;font-family:var(--mono);font-size:0.78rem}
footer{margin-top:36px;padding-top:20px;border-top:1px solid var(--border);font-size:0.75rem;color:var(--muted)}
</style>
</head>
<body>
<p class="rp-brand">Pace Lab · AlphaPeak</p>
<h1>${escapeHtml(athleteLabel || 'Pacing report')}</h1>
<p class="rp-meta">${escapeHtml(eventName)} · ${escapeHtml(genderLabel)} · ${escapeHtml(generatedAt)}</p>
<div class="rp-grid">
  <div class="rp-card"><div class="k">Total (analysis)</div><div class="v">${escapeHtml(totalDisplay)}</div></div>
  <div class="rp-card"><div class="k">Model tier</div><div class="v">${escapeHtml(modelTier)}</div></div>
  <div class="rp-card"><div class="k">Half differential</div><div class="v">${escapeHtml(diffDisplay)}</div></div>
  <div class="rp-card"><div class="k">Shape</div><div class="v">${escapeHtml(shapeDisplay)}</div></div>
  <div class="rp-card"><div class="k">First half %</div><div class="v">${escapeHtml(firstHalfPctDisplay)}</div></div>
</div>
<div class="rp-section">
  <h2>Coach read</h2>
  <div class="rp-coach">${safeCoach}${note}</div>
</div>
${projectionSectionHtml}
${chartBlock}
<div class="rp-section">
  <h2>Segment table</h2>
  <table><thead><tr><th>Segment</th><th>You (s)</th><th>Ref (s)</th><th>Gap (s)</th><th>% of your race</th><th>% of ref race</th></tr></thead><tbody>${tableInnerHtml}</tbody></table>
</div>
<div class="rp-section">
  <h2>Gaps vs model</h2>
  <div class="rp-gaps">${gapBarsInnerHtml}</div>
</div>
<footer>Static report — open this file in any browser. Timing is from your video marks, not photo-finish. pace.alphapeak.io</footer>
</body>
</html>`;
}

export function buildGapBarsInnerHtml(gaps, maxAbsGap) {
  const cap = Math.max(maxAbsGap, 0.001);
  return gaps
    .map(g => {
      const gap = g.gap;
      const halfPct = Math.min(50, (Math.abs(gap) / cap) * 50);
      const w = `${halfPct}%`;
      const sign = gap > 0 ? '+' : '';
      const barStyle =
        gap >= 0
          ? `left:50%;width:${w};background:var(--red)`
          : `right:50%;width:${w};background:var(--green)`;
      return `<div class="rp-gap"><span class="seg">${escapeHtml(g.segment)}</span><div class="track"><span class="mid"></span><span class="bar" style="${barStyle}"></span></div><span class="val">${sign}${gap.toFixed(3)}</span></div>`;
    })
    .join('');
}

export function buildReportTableRowsHtml(gaps, yourTotalSec, refTotalSec) {
  const yT = yourTotalSec ?? gaps.reduce((s, g) => s + g.actual, 0);
  const rT = refTotalSec ?? yT;
  return gaps
    .map(g => {
      const py = ((g.actual / yT) * 100).toFixed(1);
      const pm = ((g.model / rT) * 100).toFixed(1);
      return `<tr>
      <td>${escapeHtml(g.segment)}</td>
      <td class="mono">${g.actual.toFixed(3)}</td>
      <td class="mono">${g.model.toFixed(3)}</td>
      <td class="mono">${g.gap > 0 ? '+' : ''}${g.gap.toFixed(3)}</td>
      <td class="mono">${py}% <span class="pct-sec">(${g.actual.toFixed(3)}s of ${yT.toFixed(3)}s)</span></td>
      <td class="mono">${pm}% <span class="pct-sec">(${g.model.toFixed(3)}s of ${rT.toFixed(3)}s)</span></td>
    </tr>`;
    })
    .join('');
}
