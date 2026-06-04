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
import { buildAthleteReportHtmlFromExport } from './export.js';
import { createYouVsModelLineChart, updateVideoLabLineChartModel } from '../charts.js';
import { getPacingModel } from '../pacing-model.js';

const EVENT_IDS = ['100m', '200m', '400m', '800m', '1500m', '2mile', '5k', '110mh', '100mh', '400mh', '300mh'];

const EVENT_LABELS = {
  '100m': '100m', '200m': '200m', '400m': '400m', '800m': '800m',
  '1500m': '1500m', '2mile': '2 Mile', '5k': '5K',
  '110mh': '110m Hurdles', '100mh': '100m Hurdles',
  '400mh': '400m Hurdles', '300mh': '300m Hurdles',
};

const GENDER_LOCK = { '110mh': 'male', '100mh': 'female' };

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
  '110mh': () => import('../../data/110mh.js'),
  '100mh': () => import('../../data/100mh.js'),
  '400mh': () => import('../../data/400mh.js'),
  '300mh': () => import('../../data/300mh.js'),
};

let session = createEmptySession();
let eventBundle = null;
let scrubbing = false;

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

function setMissedLateUiOpen(open) {
  if (els.missedDetails) els.missedDetails.hidden = !open;
  if (els.missedEnable) els.missedEnable.checked = open;
  if (!open && els.missedHead) els.missedHead.value = '0';
  readMissedHead();
  tickClock();
}

function setActiveStep(name) {
  document.body.dataset.vlStep = name;
  document.querySelectorAll('[data-vl-step]').forEach(el => {
    el.hidden = el.dataset.vlStep !== name;
  });
}

function showStep(name) {
  setActiveStep(name);
  const wb = $('vl-workbench');
  if (wb) {
    const inReview = ['gun', 'splits', 'official'].includes(name);
    wb.hidden = !inReview;
    if (!inReview) {
      const v = $('vl-video');
      if (v && !v.paused) v.pause();
    }
    document.body.classList.toggle('vl-timing-mode', inReview);
  }
}

function bindEls() {
  els.file = $('vl-file');
  els.video = $('vl-video');
  els.raceClock = $('vl-race-clock');
  els.splitProgress = $('vl-split-progress');
  els.splitsList = $('vl-splits-list');
  els.btnMarkSplit = $('vl-btn-mark-split');
  els.btnUndoSplit = $('vl-btn-undo-split');
  els.officialSummary = $('vl-official-summary');
  els.officialInput = $('vl-official-time');
  els.reconcileScale = $('vl-reconcile-scale');
  els.reconcileRaw = $('vl-reconcile-raw');
  els.analysisTable = $('vl-analysis-table');
  els.athleteLabel = $('vl-athlete-label');
  els.missedHead = $('vl-missed-head');
  els.missedEnable = $('vl-missed-enable');
  els.missedDetails = $('vl-missed-details');
  els.dashCards = $('vl-dash-cards');
  els.gapViz = $('vl-gap-viz');
  els.uploadZone = $('vl-upload-zone');
  els.uploadPlaceholder = $('vl-upload-placeholder');
  els.uploadPreview = $('vl-upload-preview');
  els.uploadPreviewVideo = $('vl-upload-preview-video');
  els.uploadChange = $('vl-upload-change');
  els.anchorStrip = $('vl-anchor-strip');
  els.paceTarget = $('vl-pace-target');
  els.paceReadout = $('vl-pace-readout');
  els.scrubber = $('vl-scrubber');
  els.ctlPlay = $('vl-ctl-play');
  els.ctlBack = $('vl-ctl-back');
  els.ctlFwd = $('vl-ctl-fwd');
  els.ctlTime = $('vl-ctl-time');
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
  if (!els.video) return;
  if (g == null) {
    if (els.raceClock) els.raceClock.textContent = '—';
    return;
  }
  const t = els.video.currentTime - g;
  if (els.raceClock) els.raceClock.textContent = t >= 0 ? formatTime(t, 'seconds') : '—';
}

function fmtMmSs(t) {
  if (!Number.isFinite(t) || t < 0) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function syncScrubber() {
  if (!els.scrubber || !els.video) return;
  if (!scrubbing) {
    els.scrubber.value = String(els.video.currentTime || 0);
  }
  if (els.ctlTime) {
    const cur = fmtMmSs(els.video.currentTime || 0);
    const dur = Number.isFinite(els.video.duration) ? fmtMmSs(els.video.duration) : '—';
    els.ctlTime.textContent = `${cur} / ${dur}`;
  }
}

function updatePlayIcon() {
  if (!els.ctlPlay || !els.video) return;
  els.ctlPlay.classList.toggle('vl-ctl-play--playing', !els.video.paused);
}

function loadVideoStep() {
  showStep('gun');
  session.tGun = null;
  renderSplitsList();
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
  showStep('splits');
  updateSplitUI();
  renderSplitsList();
}

function updateSplitUI() {
  const n = eventBundle?.eventMeta?.segments?.length || 0;
  const k = session.segmentEndVideoTimes.length;
  if (k >= n) {
    els.btnMarkSplit.disabled = true;
    els.splitProgress.textContent = `Done — ${n}/${n}`;
    return;
  }
  els.btnMarkSplit.disabled = false;
  const seg = eventBundle.eventMeta.segments[k];
  els.splitProgress.textContent = `${k + 1}/${n} · ${seg.label} (${seg.distance}m)`;
}

function renderSplitsList() {
  if (!els.splitsList) return;
  const meta = eventBundle?.eventMeta;
  const segs = meta?.segments || [];
  const g = getEffectiveGun(session);
  const marks = session.segmentEndVideoTimes;
  if (!marks.length || g == null) {
    els.splitsList.innerHTML = '';
    return;
  }
  els.splitsList.innerHTML = marks
    .map((t, i) => {
      const prev = i === 0 ? g : marks[i - 1];
      const dur = t - prev;
      const race = t - g;
      const seg = segs[i];
      const label = seg ? seg.label : `Seg ${i + 1}`;
      return `<li class="vl-split-item">
        <span class="vl-split-num">${i + 1}</span>
        <span class="vl-split-label">${label}</span>
        <span class="vl-split-dur mono">${dur.toFixed(2)}s</span>
        <span class="vl-split-race mono">@ ${race.toFixed(2)}</span>
      </li>`;
    })
    .join('');
  els.splitsList.scrollTop = els.splitsList.scrollHeight;
}

function markSplit() {
  readMissedHead();
  const n = eventBundle?.eventMeta?.segments?.length || 0;
  const g = getEffectiveGun(session);
  if (g == null || n === 0) return;
  const t = els.video.currentTime;
  if (session.segmentEndVideoTimes.length > 0 && t <= session.segmentEndVideoTimes.at(-1)) {
    alert('Split must be after the previous mark.');
    return;
  }
  if (t <= g) {
    alert('Split must be after gun.');
    return;
  }
  session.segmentEndVideoTimes.push(t);
  updateSplitUI();
  renderSplitsList();
  if (session.segmentEndVideoTimes.length >= n) {
    showStep('official');
    const rt = raceTotalFromSession(session);
    if (els.officialSummary) {
      els.officialSummary.textContent = `Race total: ${formatTime(rt, eventBundle.eventMeta.timeUnit)}`;
    }
  }
}

function undoSplit() {
  session.segmentEndVideoTimes.pop();
  updateSplitUI();
  renderSplitsList();
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
      return `<div class="vl-gap-row">
        <div class="vl-gap-head">
          <span class="vl-gap-seg-label">${g.segment}</span>
          <span class="vl-gap-true mono">you ${g.actual.toFixed(3)}s · ref ${g.model.toFixed(3)}s</span>
          <span class="vl-gap-val mono">${sign}${g.gap.toFixed(3)}s</span>
        </div>
        <div class="vl-gap-track"><span class="vl-gap-mid"></span><span class="vl-gap-bar ${tone}" style="${barStyle}"></span></div>
      </div>`;
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
  let yourCum = 0;
  let refCum = 0;
  const rows = gaps
    .map(g => {
      yourCum += g.actual;
      refCum += g.model;
      const py = g.pctActual.toFixed(1);
      const pm = g.pctModel.toFixed(1);
      return `<tr>
      <td>${g.segment}</td>
      <td class="mono">${g.actual.toFixed(3)}<br><span class="vl-cum mono">Σ ${yourCum.toFixed(3)}</span></td>
      <td class="mono">${g.model.toFixed(3)}<br><span class="vl-cum mono">Σ ${refCum.toFixed(3)}</span></td>
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

async function renderDashboard(result, meta, unit, segmentSeconds) {
  if (result.error) {
    els.dashCards.innerHTML = `<p class="vl-strong">${result.error}</p>`;
    els.gapViz.innerHTML = '';
    if (els.anchorStrip) els.anchorStrip.textContent = '';
    return;
  }

  if (els.anchorStrip) {
    let cum = 0;
    const headers =
      '<span class="vl-anchor-h">Segment</span>' +
      '<span class="vl-anchor-h vl-anchor-h--num">Split</span>' +
      '<span class="vl-anchor-h vl-anchor-h--num">Σ Total</span>';
    const rows = meta.segments
      .map((s, i) => {
        cum += segmentSeconds[i];
        return (
          `<span class="vl-anchor-label">${s.label}</span>` +
          `<span class="vl-anchor-dur mono">${segmentSeconds[i].toFixed(3)}s</span>` +
          `<span class="vl-anchor-cum mono">${cum.toFixed(3)}</span>`
        );
      })
      .join('');
    els.anchorStrip.innerHTML = headers + rows;
  }

  const diff =
    result.diff != null ? `${result.diff > 0 ? '+' : ''}${result.diff.toFixed(2)}s` : '—';
  const fh = result.firstHalfPct != null ? `${result.firstHalfPct.toFixed(1)}%` : '—';
  const mid = Math.floor(meta.segments.length / 2);
  const fhSec = segmentSeconds.slice(0, mid).reduce((a, b) => a + b, 0);
  const shape = result.shape.replace(/_/g, ' ');

  els.dashCards.innerHTML = `
    <div class="vl-dash-card"><span class="vl-dash-k">Your total</span><span class="vl-dash-v">${formatTime(result.total, unit)}</span><span class="vl-dash-raw mono">${result.total.toFixed(3)} s</span></div>
    <div class="vl-dash-card"><span class="vl-dash-k">Model tier</span><span class="vl-dash-v">${result.model.level}</span><span class="vl-dash-raw mono">at your time</span></div>
    <div class="vl-dash-card"><span class="vl-dash-k">Half Δ</span><span class="vl-dash-v">${diff}</span></div>
    <div class="vl-dash-card"><span class="vl-dash-k">Shape</span><span class="vl-dash-v">${shape}</span></div>
    <div class="vl-dash-card"><span class="vl-dash-k">1st half</span><span class="vl-dash-v">${fh}</span><span class="vl-dash-raw mono">${fhSec.toFixed(3)} s / ${result.total.toFixed(3)} s</span></div>
  `;

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
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  createYouVsModelLineChart('vl-chart', labels, segmentSeconds, result.model.splits, modelLabel);
}

async function runAnalysisUI() {
  resetShareLinkUi();
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
    els.analysisTable.innerHTML = '';
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
  await renderDashboard(result, meta, unit, segs);

  if (result.error) {
    vlAnalysisCtx = null;
    if (els.paceTarget) els.paceTarget.oninput = null;
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
  setupPaceMeterInteractive();

  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const chartPng = document.getElementById('vl-chart')?.toDataURL('image/png') || '';
  const genderLabel = session.gender === 'female' ? 'Women' : 'Men';

  let pacingModelsPlain = null;
  try {
    pacingModelsPlain = eventBundle?.pacingModels
      ? JSON.parse(JSON.stringify(eventBundle.pacingModels))
      : null;
  } catch {
    pacingModelsPlain = eventBundle?.pacingModels ?? null;
  }

  window.__vlLastExport = {
    session,
    eventMeta: meta,
    segmentSeconds: segs,
    analysisResult: result,
    summaryText: summary,
    chartPngDataUrl: chartPng,
    genderLabel,
    pacingModels: pacingModelsPlain,
  };
}

function escapeDom(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

const SHARE_API_BASE = (import.meta.env.VITE_SHARE_API_BASE || '').replace(/\/$/, '');

const SHARE_BTN_DEFAULT = 'Save & copy share link';

function resetShareLinkUi() {
  const box = $('vl-share-result');
  const input = $('vl-share-url');
  const msg = $('vl-share-result-msg');
  if (box) box.hidden = true;
  if (input) input.value = '';
  if (msg) msg.textContent = '';
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;padding:0;margin:0;border:0;opacity:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function showShareLinkFallback(url, message) {
  const box = $('vl-share-result');
  const input = $('vl-share-url');
  const msg = $('vl-share-result-msg');
  if (msg) msg.textContent = message;
  if (input) input.value = url;
  if (box) box.hidden = false;
  requestAnimationFrame(() => {
    if (input) {
      input.focus();
      input.select();
    }
  });
}

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
  const prev = btn?.textContent ?? SHARE_BTN_DEFAULT;

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving…';
    }
    resetShareLinkUi();
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
    const copied = await copyTextToClipboard(url);
    if (copied) {
      if (btn) btn.textContent = 'Link copied!';
      setTimeout(() => {
        if (btn) {
          btn.textContent = SHARE_BTN_DEFAULT;
          btn.disabled = false;
        }
      }, 2200);
    } else {
      if (btn) {
        btn.textContent = SHARE_BTN_DEFAULT;
        btn.disabled = false;
      }
      showShareLinkFallback(
        url,
        'Your report was saved. Automatic copy was blocked — select the link below and copy it, or use the Copy link button.',
      );
    }
  } catch (e) {
    if (btn) {
      btn.textContent = prev;
      btn.disabled = false;
    }
    window.alert(e?.message || String(e));
  }
}

async function copyShareUrlManual() {
  const input = $('vl-share-url');
  if (!input?.value) return;
  const ok = await copyTextToClipboard(input.value);
  const b = $('vl-btn-copy-url-manual');
  if (ok && b) {
    const t = b.textContent;
    b.textContent = 'Copied!';
    setTimeout(() => {
      b.textContent = t;
    }, 1600);
  } else if (input) {
    input.focus();
    input.select();
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

function bindCustomControls() {
  if (!els.video || !els.scrubber) return;

  const togglePlay = () => {
    if (!els.video.src) return;
    if (els.video.paused) els.video.play().catch(() => {});
    else els.video.pause();
  };

  els.ctlPlay?.addEventListener('click', togglePlay);
  els.video.addEventListener('click', togglePlay);
  els.video.addEventListener('play', updatePlayIcon);
  els.video.addEventListener('pause', updatePlayIcon);

  els.video.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(els.video.duration)) {
      els.scrubber.max = String(els.video.duration);
    }
    syncScrubber();
  });
  els.video.addEventListener('durationchange', () => {
    if (Number.isFinite(els.video.duration)) {
      els.scrubber.max = String(els.video.duration);
    }
    syncScrubber();
  });

  ['pointerdown', 'mousedown', 'touchstart'].forEach(ev => {
    els.scrubber.addEventListener(ev, () => {
      scrubbing = true;
    }, { passive: true });
  });
  ['pointerup', 'pointercancel', 'mouseup', 'touchend', 'touchcancel', 'mouseleave', 'change'].forEach(ev => {
    els.scrubber.addEventListener(ev, () => {
      scrubbing = false;
    });
  });
  els.scrubber.addEventListener('input', () => {
    const v = parseFloat(els.scrubber.value);
    if (Number.isFinite(v) && els.video.duration) {
      els.video.currentTime = v;
      if (els.ctlTime) {
        const cur = fmtMmSs(v);
        const dur = Number.isFinite(els.video.duration) ? fmtMmSs(els.video.duration) : '—';
        els.ctlTime.textContent = `${cur} / ${dur}`;
      }
    }
  });

  const nudge = dt => {
    if (!els.video.src) return;
    els.video.currentTime = Math.max(0, els.video.currentTime + dt);
  };
  els.ctlBack?.addEventListener('click', () => nudge(-0.05));
  els.ctlFwd?.addEventListener('click', () => nudge(0.05));

  document.addEventListener('keydown', e => {
    if (
      document.activeElement === els.officialInput ||
      document.activeElement === els.athleteLabel ||
      document.activeElement === els.missedHead ||
      document.activeElement === els.missedEnable ||
      document.activeElement === els.paceTarget ||
      document.activeElement === els.scrubber
    )
      return;
    if (document.body.dataset.vlStep !== 'gun' && document.body.dataset.vlStep !== 'splits' && document.body.dataset.vlStep !== 'official') return;
    if (e.key === ' ') {
      e.preventDefault();
      togglePlay();
      return;
    }
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const dt = e.shiftKey ? 0.5 : 0.05;
    nudge(e.key === 'ArrowRight' ? dt : -dt);
  });
}

export function initVideoLab() {
  bindEls();

  EVENT_IDS.forEach(id => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = EVENT_LABELS[id] || id.toUpperCase();
    $('vl-event').appendChild(opt);
  });

  $('vl-event').addEventListener('change', () => {
    const genderSel = $('vl-gender');
    const lock = GENDER_LOCK[$('vl-event').value];
    if (lock) {
      genderSel.value = lock;
      genderSel.disabled = true;
    } else {
      genderSel.disabled = false;
    }
  });

  els.file.addEventListener('change', onFileChange);
  els.video.addEventListener('timeupdate', () => {
    tickClock();
    syncScrubber();
  });
  els.video.addEventListener('seeked', () => {
    tickClock();
    syncScrubber();
  });

  bindCustomControls();

  if (els.missedHead) {
    els.missedHead.addEventListener('input', () => {
      readMissedHead();
      tickClock();
      renderSplitsList();
    });
  }
  if (els.missedEnable && els.missedDetails) {
    els.missedEnable.addEventListener('change', () => {
      els.missedDetails.hidden = !els.missedEnable.checked;
      if (!els.missedEnable.checked && els.missedHead) els.missedHead.value = '0';
      readMissedHead();
      tickClock();
      renderSplitsList();
    });
  }
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
    renderSplitsList();
  });

  $('vl-btn-official-next').addEventListener('click', () => runAnalysisUI());
  $('vl-btn-official-back').addEventListener('click', () => showStep('splits'));

  $('vl-btn-share-link')?.addEventListener('click', copyShareLink);
  $('vl-btn-copy-url-manual')?.addEventListener('click', copyShareUrlManual);
  $('vl-btn-analysis-restart').addEventListener('click', () => {
    resetShareLinkUi();
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
    renderSplitsList();
    showStep('upload');
  });

  requestAnimationFrame(function loop() {
    tickClock();
    requestAnimationFrame(loop);
  });

  showStep('upload');
}
