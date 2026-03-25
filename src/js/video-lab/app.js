/**
 * Video Lab — client-only timing + analysis wizard.
 */
import '../../styles/global.css';
import { formatTime, parseTime } from '../utils.js';
import {
  createEmptySession,
  finalSegmentSeconds,
  getEffectiveGun,
  raceTotalFromSession,
} from './session.js';
import { runVideoLabAnalysis, formatAnalysisSummary } from './analysis.js';
import {
  buildExportPayload,
  exportJsonBlob,
  exportCsv,
  triggerDownload,
  buildAthleteReportHtmlFromExport,
} from './export.js';
import { resolveCoachNarrative } from './coach-narrative.js';
import { createYouVsModelLineChart, updateVideoLabLineChartModel } from '../charts.js';
import { getPacingModel } from '../pacing-model.js';

const EVENT_IDS = ['100m', '200m', '400m', '800m', '1500m', '2mile', '5k'];

/** @type {null | { T: number; segmentSeconds: number[]; meta: object; unit: string; gender: string; pacingModels: object }} */
let vlAnalysisCtx = null;

const LOADERS = {
  '100m': () => import('../../data/100m.js'),
  '200m': () => import('../../data/200m.js'),
  '400m': () => import('../../data/400m.js'),
  '800m': () => import('../../data/800m.js'),
  '1500m': () => import('../../data/1500m.js'),
  '2mile': () => import('../../data/2mile.js'),
  '5k': () => import('../../data/5k.js'),
};

let session = createEmptySession();
/** @type {Awaited<ReturnType<typeof LOADERS['100m']>> | null} */
let eventBundle = null;

const els = {};

function $(id) {
  return document.getElementById(id);
}

function readMissedHead() {
  if (!els.missedEnable?.checked) {
    session.missedHeadSeconds = 0;
    return;
  }
  if (!els.missedHead) return;
  const v = parseFloat(els.missedHead.value);
  session.missedHeadSeconds = Number.isFinite(v) && v >= 0 ? v : 0;
}

function updateClockHint() {
  if (!els.clockHint) return;
  els.clockHint.textContent = els.missedEnable?.checked
    ? 'Race clock = video time minus gun, plus the late-recording seconds below. With the video focused, ← → nudge 0.05s (Shift: 0.5s).'
    : 'Race clock = current video time minus gun. With the video focused, ← → nudge 0.05s (Shift: 0.5s).';
}

function setMissedLateUiOpen(open) {
  if (els.missedDetails) els.missedDetails.hidden = !open;
  if (els.missedEnable) els.missedEnable.checked = open;
  if (!open && els.missedHead) els.missedHead.value = '0';
  readMissedHead();
  updateClockHint();
  tickClock();
}

function showStep(name) {
  document.querySelectorAll('[data-vl-step]').forEach(el => {
    el.hidden = el.dataset.vlStep !== name;
  });
  const wb = $('vl-workbench');
  if (wb) {
    const inReview = ['gun', 'splits', 'official'].includes(name);
    wb.hidden = !inReview;
    if (!inReview) {
      const v = $('vl-video');
      if (v && !v.paused) v.pause();
    }
  }
}

function bindEls() {
  els.file = $('vl-file');
  els.video = $('vl-video');
  els.raceClock = $('vl-race-clock');
  els.stepHint = $('vl-step-hint');
  els.splitProgress = $('vl-split-progress');
  els.btnMarkSplit = $('vl-btn-mark-split');
  els.btnUndoSplit = $('vl-btn-undo-split');
  els.officialInput = $('vl-official-time');
  els.reconcileScale = $('vl-reconcile-scale');
  els.reconcileRaw = $('vl-reconcile-raw');
  els.analysisTable = $('vl-analysis-table');
  els.athleteLabel = $('vl-athlete-label');
  els.missedHead = $('vl-missed-head');
  els.missedEnable = $('vl-missed-enable');
  els.missedDetails = $('vl-missed-details');
  els.clockHint = $('vl-clock-hint');
  els.dashCards = $('vl-dash-cards');
  els.coachLoading = $('vl-coach-loading');
  els.coachBody = $('vl-coach-body');
  els.gapViz = $('vl-gap-viz');
  els.uploadZone = $('vl-upload-zone');
  els.uploadPlaceholder = $('vl-upload-placeholder');
  els.uploadPreview = $('vl-upload-preview');
  els.uploadPreviewVideo = $('vl-upload-preview-video');
  els.uploadChange = $('vl-upload-change');
  els.projectionEl = $('vl-projection');
  els.anchorStrip = $('vl-anchor-strip');
  els.paceTarget = $('vl-pace-target');
  els.paceReadout = $('vl-pace-readout');
}

function revokeUrl() {
  if (session.objectUrl) {
    URL.revokeObjectURL(session.objectUrl);
    session.objectUrl = null;
  }
}

function refreshUploadUi() {
  const has = !!session.file;
  if (els.uploadPlaceholder) els.uploadPlaceholder.hidden = has;
  if (els.uploadPreview) els.uploadPreview.hidden = !has;
  if (els.uploadZone) {
    els.uploadZone.classList.toggle('vl-upload-zone--has-file', has);
    if (has) els.uploadZone.removeAttribute('tabindex');
    else els.uploadZone.setAttribute('tabindex', '0');
  }
}

function onFileChange() {
  const f = els.file.files?.[0];
  revokeUrl();
  session.file = f || null;
  if (f) {
    session.objectUrl = URL.createObjectURL(f);
    els.video.src = session.objectUrl;
    if (els.uploadPreviewVideo) {
      els.uploadPreviewVideo.src = session.objectUrl;
      els.uploadPreviewVideo.load();
    }
    refreshUploadUi();
    queueMicrotask(() => showStep('event'));
  } else {
    els.video.removeAttribute('src');
    if (els.uploadPreviewVideo) {
      els.uploadPreviewVideo.removeAttribute('src');
      els.uploadPreviewVideo.load();
    }
    refreshUploadUi();
    showStep('upload');
  }
}

function tickClock() {
  readMissedHead();
  const g = getEffectiveGun(session);
  if (!els.video || g == null) {
    els.raceClock.textContent = '—';
    return;
  }
  const t = els.video.currentTime - g;
  els.raceClock.textContent = t >= 0 ? formatTime(t, 'seconds') : '—';
}

function loadVideoStep() {
  showStep('gun');
  els.stepHint.textContent =
    'Scrub to the start signal, pause, then set gun. Use “Recording started late” only if the clock needs a fixed offset.';
  session.tGun = null;
}

async function loadEventStep() {
  const id = $('vl-event').value;
  session.eventId = id;
  session.gender = $('vl-gender').value;
  if (!LOADERS[id]) {
    alert('Select an event.');
    return;
  }
  eventBundle = await LOADERS[id]();
  session.segmentEndVideoTimes = [];
  session.tGun = null;
  showStep('gun');
  loadVideoStep();
}

function setGun() {
  readMissedHead();
  session.tGun = els.video.currentTime;
  const g = getEffectiveGun(session);
  els.stepHint.textContent = `Gun mark at video ${session.tGun.toFixed(3)}s (effective race t=0 at ${g?.toFixed(3) ?? '—'}s). Play and mark each segment end.`;
  showStep('splits');
  updateSplitUI();
}

function updateSplitUI() {
  const n = eventBundle?.eventMeta?.segments?.length || 0;
  const k = session.segmentEndVideoTimes.length;
  if (k >= n) {
    els.btnMarkSplit.disabled = true;
    els.splitProgress.textContent = 'All segments marked. Continue to finish / official time.';
    return;
  }
  els.btnMarkSplit.disabled = false;
  const seg = eventBundle.eventMeta.segments[k];
  els.splitProgress.textContent = `Mark ${k + 1} of ${n}: end of “${seg.label}” (${seg.distance}m)`;
}

function markSplit() {
  readMissedHead();
  const n = eventBundle?.eventMeta?.segments?.length || 0;
  const g = getEffectiveGun(session);
  if (g == null || n === 0) return;
  const t = els.video.currentTime;
  if (session.segmentEndVideoTimes.length > 0 && t <= session.segmentEndVideoTimes.at(-1)) {
    alert('Split time must be after the previous mark.');
    return;
  }
  if (t <= g) {
    alert('Split must be after the effective gun time.');
    return;
  }
  session.segmentEndVideoTimes.push(t);
  updateSplitUI();
  if (session.segmentEndVideoTimes.length >= n) {
    showStep('official');
    const rt = raceTotalFromSession(session);
    els.stepHint.textContent = `Race total (effective gun → last mark): ${formatTime(rt, eventBundle.eventMeta.timeUnit)}. Optionally enter official chip / FAT time below.`;
  }
}

function undoSplit() {
  session.segmentEndVideoTimes.pop();
  updateSplitUI();
  if (session.segmentEndVideoTimes.length < (eventBundle?.eventMeta?.segments?.length || 0)) {
    showStep('splits');
  }
}

function readOfficial() {
  const raw = els.officialInput.value.trim();
  if (!raw) {
    session.officialTime = null;
    return;
  }
  const s = parseTime(raw);
  session.officialTime = Number.isFinite(s) ? s : null;
}

function readReconcile() {
  session.reconcileMode = els.reconcileScale.checked ? 'scale' : 'raw';
}

function maxAbsGap(gaps) {
  return gaps.reduce((m, g) => Math.max(m, Math.abs(g.gap)), 0);
}

function renderGapBarsDom(container, gaps) {
  const cap = Math.max(maxAbsGap(gaps), 0.001);
  container.innerHTML = gaps
    .map(g => {
      const halfPct = Math.min(50, (Math.abs(g.gap) / cap) * 50);
      const w = `${halfPct}%`;
      const sign = g.gap > 0 ? '+' : '';
      const barStyle =
        g.gap >= 0 ? `left:50%;width:${w}` : `right:50%;width:${w}`;
      const tone = g.gap >= 0 ? 'vl-gap-bar-slow' : 'vl-gap-bar-fast';
      return `<div class="vl-gap-row"><span class="vl-gap-seg">${g.segment}<span class="vl-gap-true mono"> · you ${g.actual.toFixed(3)}s · ref ${g.model.toFixed(3)}s</span></span><div class="vl-gap-track"><span class="vl-gap-mid"></span><span class="vl-gap-bar ${tone}" style="${barStyle}"></span></div><span class="vl-gap-val mono">${sign}${g.gap.toFixed(3)}s</span></div>`;
    })
    .join('');
}

function buildGapsRowsFromModel(segmentSeconds, modelSplits, meta, yourTotal, refTotal) {
  return meta.segments.map((seg, i) => {
    const a = segmentSeconds[i];
    const m = modelSplits[i];
    return {
      segment: seg.label,
      actual: a,
      model: m,
      gap: a - m,
      pctActual: (a / yourTotal) * 100,
      pctModel: (m / refTotal) * 100,
    };
  });
}

function renderAnalysisTableBody(gaps, yourTotal, refTotal) {
  const rows = gaps
    .map(g => {
      const py = g.pctActual.toFixed(1);
      const pm = g.pctModel.toFixed(1);
      return `<tr>
      <td>${g.segment}</td>
      <td class="mono">${g.actual.toFixed(3)}</td>
      <td class="mono">${g.model.toFixed(3)}</td>
      <td class="mono">${g.gap > 0 ? '+' : ''}${g.gap.toFixed(3)}</td>
      <td class="mono">${py}% <span class="vl-pct-true">(${g.actual.toFixed(3)}s of ${yourTotal.toFixed(3)}s)</span></td>
      <td class="mono">${pm}% <span class="vl-pct-true">(${g.model.toFixed(3)}s of ${refTotal.toFixed(3)}s)</span></td>
    </tr>`;
    })
    .join('');
  els.analysisTable.innerHTML = `<table class="vl-table"><thead><tr><th>Segment</th><th>You (s)</th><th>Ref @ goal (s)</th><th>Gap (s)</th><th>% of your race</th><th>% of ref race</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function syncPaceTargetFromSlider() {
  if (!vlAnalysisCtx || !els.paceTarget) return;
  const v = Number(els.paceTarget.value);
  const T = vlAnalysisCtx.T;
  const Tprime = T * (1.12 - (v / 100) * 0.24);
  const model = getPacingModel(vlAnalysisCtx.pacingModels, vlAnalysisCtx.gender, Tprime, vlAnalysisCtx.meta);
  const label = `Reference @ ${formatTime(Tprime, vlAnalysisCtx.unit)} (${Tprime.toFixed(3)} s total)`;
  updateVideoLabLineChartModel('vl-chart', model.splits, label);
  const gaps = buildGapsRowsFromModel(
    vlAnalysisCtx.segmentSeconds,
    model.splits,
    vlAnalysisCtx.meta,
    T,
    Tprime
  );
  renderGapBarsDom(els.gapViz, gaps);
  renderAnalysisTableBody(gaps, T, Tprime);
  if (els.paceReadout) {
    els.paceReadout.innerHTML = `Your race total <span class="mono">${formatTime(T, vlAnalysisCtx.unit)}</span> <span class="vl-readout-sub mono">(${T.toFixed(3)} s)</span><br>Reference curve total <span class="mono">${formatTime(Tprime, vlAnalysisCtx.unit)}</span> <span class="vl-readout-sub mono">(${Tprime.toFixed(3)} s)</span>`;
  }
}

function setupPaceMeterInteractive() {
  if (!els.paceTarget || !vlAnalysisCtx) return;
  els.paceTarget.min = 0;
  els.paceTarget.max = 100;
  els.paceTarget.step = 1;
  els.paceTarget.value = 50;
  els.paceTarget.oninput = () => syncPaceTargetFromSlider();
  syncPaceTargetFromSlider();
}

function renderDashboard(result, meta, unit, segmentSeconds) {
  if (result.error) {
    els.dashCards.innerHTML = `<p class="vl-strong">${result.error}</p>`;
    els.gapViz.innerHTML = '';
    els.coachBody.innerHTML = '';
    if (els.projectionEl) els.projectionEl.innerHTML = '';
    if (els.anchorStrip) els.anchorStrip.textContent = '';
    return;
  }

  if (els.anchorStrip) {
    els.anchorStrip.textContent = meta.segments
      .map((s, i) => `${s.label} ${segmentSeconds[i].toFixed(3)}s`)
      .join(' · ');
  }

  const diff =
    result.diff != null ? `${result.diff > 0 ? '+' : ''}${result.diff.toFixed(2)}s` : '—';
  const fh = result.firstHalfPct != null ? `${result.firstHalfPct.toFixed(1)}%` : '—';
  const mid = Math.floor(meta.segments.length / 2);
  const fhSec = segmentSeconds.slice(0, mid).reduce((a, b) => a + b, 0);
  const shape = result.shape.replace(/_/g, ' ');
  const p = result.projection;

  els.dashCards.innerHTML = `
    <div class="vl-dash-card"><span class="vl-dash-k">Your total</span><span class="vl-dash-v">${formatTime(result.total, unit)}</span><span class="vl-dash-raw mono">${result.total.toFixed(3)} s</span></div>
    <div class="vl-dash-card"><span class="vl-dash-k">Model tier</span><span class="vl-dash-v">${result.model.level}</span><span class="vl-dash-raw mono">at your time</span></div>
    <div class="vl-dash-card"><span class="vl-dash-k">Half Δ</span><span class="vl-dash-v">${diff}</span></div>
    <div class="vl-dash-card"><span class="vl-dash-k">Shape</span><span class="vl-dash-v">${shape}</span></div>
    <div class="vl-dash-card"><span class="vl-dash-k">1st half</span><span class="vl-dash-v">${fh}</span><span class="vl-dash-raw mono">${fhSec.toFixed(3)} s / ${result.total.toFixed(3)} s</span></div>
    <div class="vl-dash-card"><span class="vl-dash-k">Est. upside band</span><span class="vl-dash-v">${p ? `~${formatTime(p.illustrativeLow, 'seconds')}–${formatTime(p.illustrativeHigh, 'seconds')}` : '—'}</span>${p ? `<span class="vl-dash-raw mono">${p.illustrativeLow.toFixed(3)}–${p.illustrativeHigh.toFixed(3)} s</span>` : ''}</div>
  `;

  if (els.projectionEl) {
    els.projectionEl.innerHTML = p
      ? `<h3 class="vl-projection-h">If pacing matched the reference better</h3>
         <p class="vl-projection-p">${escapeDom(p.blurb)}</p>
         <p class="vl-projection-band">Illustrative faster band: about <strong>${formatTime(p.illustrativeLow, 'seconds')}</strong> to <strong>${formatTime(p.illustrativeHigh, 'seconds')}</strong> seconds (same clock units as segment splits).</p>`
      : '';
  }

  const baseGaps = buildGapsRowsFromModel(
    segmentSeconds,
    result.model.splits,
    meta,
    result.total,
    result.total
  );
  renderGapBarsDom(els.gapViz, baseGaps);

  const labels = meta.segments.map(s => s.label);
  const modelLabel = `Reference @ ${formatTime(result.total, unit)} (${result.total.toFixed(3)} s total)`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      createYouVsModelLineChart('vl-chart', labels, segmentSeconds, result.model.splits, modelLabel);
    });
  });
}

async function runAnalysisUI() {
  readOfficial();
  readReconcile();
  readMissedHead();
  session.athleteLabel = els.athleteLabel.value.trim();

  const meta = eventBundle.eventMeta;
  const n = meta.segments.length;
  const segs = finalSegmentSeconds(session, n);
  if (!segs) {
    vlAnalysisCtx = null;
    if (els.paceTarget) els.paceTarget.oninput = null;
    showStep('analysis');
    els.dashCards.innerHTML = '<p class="vl-strong">Could not compute splits.</p>';
    els.gapViz.innerHTML = '';
    els.coachBody.innerHTML = '';
    els.coachLoading.hidden = true;
    els.analysisTable.innerHTML = '';
    if (els.projectionEl) els.projectionEl.innerHTML = '';
    if (els.anchorStrip) els.anchorStrip.textContent = '';
    window.__vlLastExport = null;
    return;
  }

  const raceData = session.gender === 'female' ? eventBundle.womenData : eventBundle.menData;
  const result = runVideoLabAnalysis({
    segmentSeconds: segs,
    eventMeta: meta,
    pacingModels: eventBundle.pacingModels,
    raceData,
    gender: session.gender,
  });

  const unit = meta.timeUnit || 'seconds';
  let summary = formatAnalysisSummary(result, meta, unit);
  const vidT = raceTotalFromSession(session);
  if (
    session.officialTime != null &&
    session.reconcileMode === 'raw' &&
    Math.abs(session.officialTime - vidT) > 0.05
  ) {
    summary += `\n\nNote: Official time ${formatTime(session.officialTime, unit)} vs video-derived total ${formatTime(vidT, unit)} — “Keep raw splits” leaves the model matched to your video total, not the official time.`;
  }

  showStep('analysis');
  renderDashboard(result, meta, unit, segs);

  if (result.error) {
    vlAnalysisCtx = null;
    if (els.paceTarget) els.paceTarget.oninput = null;
    els.coachLoading.hidden = true;
    els.coachBody.innerHTML = '';
    window.__vlLastExport = null;
    return;
  }

  vlAnalysisCtx = {
    T: result.total,
    segmentSeconds: segs,
    meta,
    unit: meta.timeUnit || 'seconds',
    gender: session.gender,
    pacingModels: eventBundle.pacingModels,
  };

  const baseGapsForTable = buildGapsRowsFromModel(segs, result.model.splits, meta, result.total, result.total);
  renderAnalysisTableBody(baseGapsForTable, result.total, result.total);

  els.coachBody.innerHTML = '';
  els.coachLoading.hidden = false;
  const genderLabel = session.gender === 'female' ? 'Women' : 'Men';
  const narrative = await resolveCoachNarrative(result, meta, session.athleteLabel, genderLabel);
  els.coachLoading.hidden = true;
  els.coachBody.innerHTML = narrative.paragraphs.map(p => `<p>${escapeDom(p)}</p>`).join('');
  setupPaceMeterInteractive();

  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const chartPng = document.getElementById('vl-chart')?.toDataURL('image/png') || '';
  const coachNote = '';

  window.__vlLastExport = {
    session,
    eventMeta: meta,
    segmentSeconds: segs,
    analysisResult: result,
    summaryText: summary,
    coachParagraphs: narrative.paragraphs,
    coachSourceNote: coachNote,
    chartPngDataUrl: chartPng,
    genderLabel,
  };
}

function escapeDom(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function exportJson() {
  const x = window.__vlLastExport;
  if (!x) return;
  const payload = buildExportPayload(x.session, x.eventMeta, x.segmentSeconds, x.analysisResult);
  payload.coachParagraphs = x.coachParagraphs;
  payload.coachSource = x.coachSourceNote;
  triggerDownload(exportJsonBlob(payload), `pace-lab-video-${x.session.eventId}-${Date.now()}.json`);
}

function exportCsvClick() {
  const x = window.__vlLastExport;
  if (!x) return;
  const blob = exportCsv(x.eventMeta, x.segmentSeconds, x.analysisResult);
  triggerDownload(blob, `pace-lab-video-${x.session.eventId}-${Date.now()}.csv`);
}

function exportTxt() {
  const x = window.__vlLastExport;
  if (!x) return;
  const coachBlock = (x.coachParagraphs || []).join('\n\n');
  const body = `${x.summaryText}\n\n--- Coach read ---\n\n${coachBlock}`;
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, `pace-lab-video-${x.session.eventId}-${Date.now()}.txt`);
}

function exportHtmlReport() {
  const x = window.__vlLastExport;
  if (!x || x.analysisResult?.error) return;
  const html = buildAthleteReportHtmlFromExport(x);
  if (!html) return;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  triggerDownload(blob, `pace-athlete-report-${x.session.eventId}-${Date.now()}.html`);
}

const SHARE_API_BASE = (import.meta.env.VITE_SHARE_API_BASE || '').replace(/\/$/, '');

async function copyShareLink() {
  const x = window.__vlLastExport;
  if (!x || x.analysisResult?.error) return;
  if (!SHARE_API_BASE) {
    window.alert(
      'Share link is not configured. Set VITE_SHARE_API_BASE to your pace-share worker URL (no trailing slash), rebuild, and deploy the worker + D1 migrations.',
    );
    return;
  }
  const html = buildAthleteReportHtmlFromExport(x);
  if (!html) return;

  const btn = $('vl-btn-share-link');
  const prev = btn?.textContent;

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving…';
    }
    const res = await fetch(`${SHARE_API_BASE}/api/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || res.statusText || 'Save failed');
    }
    const url = data.viewUrl || `${SHARE_API_BASE}/s/${data.id}`;
    await navigator.clipboard.writeText(url);
    if (btn) btn.textContent = 'Copied link!';
    else window.alert(`Link copied:\n${url}`);
    setTimeout(() => {
      if (btn) {
        btn.textContent = prev || 'Copy share link';
        btn.disabled = false;
      }
    }, 2200);
  } catch (e) {
    if (btn) {
      btn.textContent = prev || 'Copy share link';
      btn.disabled = false;
    }
    window.alert(e?.message || String(e));
  }
}

function bindUploadZone() {
  const z = els.uploadZone;
  if (!z || !els.file) return;

  z.addEventListener('click', e => {
    if (session.file) {
      if (e.target.closest('#vl-upload-change')) return;
      if (e.target.closest('.vl-upload-preview-video')) return;
      return;
    }
    els.file.click();
  });

  z.addEventListener('keydown', e => {
    if (session.file) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      els.file.click();
    }
  });

  ['dragenter', 'dragover'].forEach(ev => {
    z.addEventListener(ev, e => {
      e.preventDefault();
      e.stopPropagation();
      z.classList.add('vl-upload-zone--active');
    });
  });
  z.addEventListener('dragleave', e => {
    e.preventDefault();
    if (!z.contains(e.relatedTarget)) z.classList.remove('vl-upload-zone--active');
  });
  z.addEventListener('drop', e => {
    e.preventDefault();
    z.classList.remove('vl-upload-zone--active');
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('video/')) {
      const dt = new DataTransfer();
      dt.items.add(f);
      els.file.files = dt.files;
      els.file.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  els.uploadChange?.addEventListener('click', e => {
    e.stopPropagation();
    els.file.click();
  });
}

function onKeyVideo(e) {
  if (document.activeElement === els.officialInput || document.activeElement === els.athleteLabel) return;
  if (
    document.activeElement === els.missedHead ||
    document.activeElement === els.missedEnable ||
    document.activeElement === els.paceTarget
  )
    return;
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  e.preventDefault();
  const dt = e.shiftKey ? 0.5 : 0.05;
  els.video.currentTime = Math.max(0, els.video.currentTime + (e.key === 'ArrowRight' ? dt : -dt));
}

export function initVideoLab() {
  bindEls();

  EVENT_IDS.forEach(id => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = id.toUpperCase();
    $('vl-event').appendChild(opt);
  });

  els.file.addEventListener('change', onFileChange);
  els.video.addEventListener('timeupdate', tickClock);
  els.video.addEventListener('seeked', tickClock);
  els.video.addEventListener('keydown', onKeyVideo);
  if (els.missedHead) {
    els.missedHead.addEventListener('input', () => {
      readMissedHead();
      tickClock();
    });
  }
  if (els.missedEnable && els.missedDetails) {
    els.missedEnable.addEventListener('change', () => {
      els.missedDetails.hidden = !els.missedEnable.checked;
      if (!els.missedEnable.checked && els.missedHead) els.missedHead.value = '0';
      readMissedHead();
      updateClockHint();
      tickClock();
    });
  }
  updateClockHint();
  bindUploadZone();
  refreshUploadUi();

  $('vl-btn-event-next').addEventListener('click', () => loadEventStep());
  $('vl-btn-event-back').addEventListener('click', () => showStep('upload'));

  $('vl-btn-set-gun').addEventListener('click', setGun);
  $('vl-btn-gun-back').addEventListener('click', () => showStep('event'));

  els.btnMarkSplit.addEventListener('click', markSplit);
  els.btnUndoSplit.addEventListener('click', undoSplit);
  $('vl-btn-splits-back').addEventListener('click', () => {
    showStep('gun');
    session.segmentEndVideoTimes = [];
    updateSplitUI();
  });

  $('vl-btn-official-next').addEventListener('click', () => runAnalysisUI());
  $('vl-btn-official-back').addEventListener('click', () => showStep('splits'));

  $('vl-btn-export-json').addEventListener('click', exportJson);
  $('vl-btn-export-csv').addEventListener('click', exportCsvClick);
  $('vl-btn-export-txt').addEventListener('click', exportTxt);
  $('vl-btn-export-html').addEventListener('click', exportHtmlReport);
  $('vl-btn-share-link')?.addEventListener('click', copyShareLink);
  $('vl-btn-analysis-restart').addEventListener('click', () => {
    vlAnalysisCtx = null;
    if (els.paceTarget) els.paceTarget.oninput = null;
    revokeUrl();
    session = createEmptySession();
    eventBundle = null;
    els.file.value = '';
    els.video.removeAttribute('src');
    els.officialInput.value = '';
    els.athleteLabel.value = '';
    if (els.missedHead) els.missedHead.value = '0';
    setMissedLateUiOpen(false);
    if (els.uploadPreviewVideo) {
      els.uploadPreviewVideo.removeAttribute('src');
      els.uploadPreviewVideo.load();
    }
    refreshUploadUi();
    showStep('upload');
  });

  requestAnimationFrame(function loop() {
    tickClock();
    requestAnimationFrame(loop);
  });

  showStep('upload');
}
