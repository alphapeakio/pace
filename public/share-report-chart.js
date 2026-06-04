/**
 * Pace Lab — shared report: pace slider + Chart.js (loads after chart.umd + #rp-chart-data).
 * Keep in sync with video-lab slider math and pacing-model.js getPacingModel.
 */
(function () {
  var el = document.getElementById('rp-chart-data');
  if (!el || typeof Chart === 'undefined') return;
  var payload;
  try {
    payload = JSON.parse(el.textContent);
  } catch (e) {
    return;
  }
  /**
   * Inject CSS the script depends on. Old shares (saved before the gap-bar
   * class rename) only have CSS for the legacy class names; without this the
   * re-rendered bars after a slider move are invisible.
   */
  (function injectStyles() {
    if (document.getElementById('rp-runtime-styles')) return;
    var s = document.createElement('style');
    s.id = 'rp-runtime-styles';
    s.textContent =
      '.rp-gap{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}' +
      '.rp-gap-head{display:flex;align-items:baseline;gap:10px;font-size:0.82rem;line-height:1.3;white-space:nowrap;overflow:hidden}' +
      '.rp-gap-seg{color:#eaeaf2;font-weight:600;flex-shrink:0}' +
      '.rp-gap-true{color:#9898a8;font-size:0.74rem;font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}' +
      '.rp-gap-val{margin-left:auto;color:#eaeaf2;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.82rem;flex-shrink:0}' +
      '.rp-gap-track{position:relative;height:14px;background:#1e1e28;border-radius:7px;overflow:hidden;border:1px solid #2a2a3a}' +
      '.rp-gap-mid{position:absolute;left:50%;top:0;bottom:0;width:1px;background:#444;transform:translateX(-50%)}' +
      '.rp-gap-bar{position:absolute;top:2px;bottom:2px;border-radius:4px}' +
      '@media(max-width:520px){.rp-gap-head{font-size:0.74rem;gap:8px}.rp-gap-seg{font-size:0.78rem}.rp-gap-true{font-size:0.66rem}.rp-gap-val{font-size:0.78rem}.rp-gap-track{height:16px;border-radius:8px}}' +
      '.rp-cum{display:inline-block;margin-top:2px;color:#4d9fff;font-size:0.78rem;font-weight:500}';
    document.head.appendChild(s);
  })();
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function getPacingModel(pacingModels, gender, targetTime, eventMeta) {
    var models = pacingModels[gender];
    if (!models || models.length === 0) {
      var n = eventMeta.segments.length;
      var evenPct = 100 / n;
      return {
        pcts: Array(n).fill(evenPct),
        splits: Array(n).fill(targetTime / n),
        level: 'Estimated',
      };
    }
    var sorted = [].concat(models).sort(function (a, b) {
      return a.targetTime - b.targetTime;
    });
    var upper;
    var lower;
    if (targetTime <= sorted[0].targetTime) {
      upper = lower = sorted[0];
    } else if (targetTime >= sorted[sorted.length - 1].targetTime) {
      upper = lower = sorted[sorted.length - 1];
    } else {
      for (var i = 0; i < sorted.length - 1; i++) {
        if (targetTime >= sorted[i].targetTime && targetTime <= sorted[i + 1].targetTime) {
          upper = sorted[i];
          lower = sorted[i + 1];
          break;
        }
      }
      if (upper == null || lower == null) {
        upper = lower = sorted[sorted.length - 1];
      }
    }
    var t = 0;
    if (upper !== lower && lower.targetTime !== upper.targetTime) {
      t = (targetTime - upper.targetTime) / (lower.targetTime - upper.targetTime);
    }
    var numSeg = Math.min(upper.pcts.length, lower.pcts.length);
    var pcts = [];
    for (var j = 0; j < numSeg; j++) pcts.push(lerp(upper.pcts[j], lower.pcts[j], t));
    var pctSum = pcts.reduce(function (s, p) {
      return s + p;
    }, 0);
    if (pctSum > 0 && Math.abs(pctSum - 100) > 0.01) {
      var sc = 100 / pctSum;
      for (var k = 0; k < pcts.length; k++) pcts[k] *= sc;
    }
    var splits = pcts.map(function (p) {
      return (targetTime * p) / 100;
    });
    var level = t < 0.5 ? upper.level : lower.level;
    return { pcts: pcts, splits: splits, level: level };
  }
  function formatRpTime(seconds, unit) {
    if (seconds == null) return '—';
    if (unit === 'minutes' || seconds >= 60) {
      var mins = Math.floor(seconds / 60);
      var secs = seconds - mins * 60;
      return mins + ':' + secs.toFixed(2).padStart(5, '0');
    }
    return seconds.toFixed(2);
  }
  var labelPlugin = {
    id: 'rpSplitLabels',
    afterDatasetsDraw: function (chart) {
      var ctx = chart.ctx;
      chart.data.datasets.forEach(function (dataset, di) {
        var meta = chart.getDatasetMeta(di);
        if (meta.hidden) return;
        meta.data.forEach(function (element, i) {
          var v = dataset.data[i];
          if (v == null || isNaN(v)) return;
          var pt = element.getProps(['x', 'y'], true);
          ctx.save();
          ctx.fillStyle = di === 0 ? '#ffb088' : '#9aa0b8';
          ctx.font = '600 10px system-ui,sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(Number(v).toFixed(3) + 's', pt.x, pt.y - 10);
          ctx.restore();
        });
      });
    },
  };
  var canvas = document.getElementById('rp-chart-canvas');
  if (!canvas) return;
  var T = payload.T;
  var unit = payload.unit || 'seconds';
  var initial = getPacingModel(payload.pacingModels, payload.gender, T, { segments: payload.segments });
  var chart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: payload.labels,
      datasets: [
        {
          label: 'Your splits (s)',
          data: payload.yourSplits,
          borderColor: '#ff6b35',
          backgroundColor: 'rgba(255,107,53,0.2)',
          borderWidth: 2.5,
          tension: 0.25,
          pointRadius: 5,
          fill: false,
        },
        {
          label: 'Reference @ ' + formatRpTime(T, unit) + ' (' + T.toFixed(3) + ' s)',
          data: initial.splits,
          borderColor: '#9aa0b8',
          borderWidth: 2,
          borderDash: [6, 4],
          tension: 0.25,
          pointRadius: 4,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: function (c) {
              return c.dataset.label + ': ' + c.parsed.y.toFixed(3) + 's';
            },
          },
        },
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Segment time (s)' } },
        x: { title: { display: true, text: 'Segment' } },
      },
    },
    plugins: [labelPlugin],
  });
  var slider = document.getElementById('rp-pace-slider');
  var readout = document.getElementById('rp-pace-readout');
  var tableBody = document.getElementById('rp-table-body');
  var gapsBox = document.getElementById('rp-gaps');
  if (!slider) return;

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderTable(splits, Tprime) {
    if (!tableBody) return;
    var rows = '';
    var yCum = 0;
    var rCum = 0;
    for (var i = 0; i < payload.labels.length; i++) {
      var label = payload.labels[i];
      var actual = payload.yourSplits[i];
      var model = splits[i];
      yCum += actual;
      rCum += model;
      var gap = actual - model;
      var py = ((actual / T) * 100).toFixed(1);
      var pm = ((model / Tprime) * 100).toFixed(1);
      var sign = gap > 0 ? '+' : '';
      rows +=
        '<tr>' +
        '<td>' + escapeHtml(label) + '</td>' +
        '<td class="mono">' + actual.toFixed(3) + '<br><span class="rp-cum mono">Σ ' + yCum.toFixed(3) + '</span></td>' +
        '<td class="mono">' + model.toFixed(3) + '<br><span class="rp-cum mono">Σ ' + rCum.toFixed(3) + '</span></td>' +
        '<td class="mono">' + sign + gap.toFixed(3) + '</td>' +
        '<td class="mono">' + py + '% <span class="pct-sec">(' + actual.toFixed(3) + 's of ' + T.toFixed(3) + 's)</span></td>' +
        '<td class="mono">' + pm + '% <span class="pct-sec">(' + model.toFixed(3) + 's of ' + Tprime.toFixed(3) + 's)</span></td>' +
        '</tr>';
    }
    tableBody.innerHTML = rows;
  }

  function renderGaps(splits) {
    if (!gapsBox) return;
    var maxAbs = 0.001;
    for (var i = 0; i < splits.length; i++) {
      var g = payload.yourSplits[i] - splits[i];
      if (Math.abs(g) > maxAbs) maxAbs = Math.abs(g);
    }
    var rowS = 'display:flex;flex-direction:column;gap:6px;margin-bottom:14px';
    var headS = 'display:flex;align-items:baseline;gap:10px;font-size:0.82rem;line-height:1.3;white-space:nowrap;overflow:hidden';
    var segS = 'color:#eaeaf2;font-weight:600;flex-shrink:0';
    var trueS = 'color:#9898a8;font-size:0.74rem;font-weight:500;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;font-family:ui-monospace,SFMono-Regular,Menlo,monospace';
    var valS = 'margin-left:auto;color:#eaeaf2;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.82rem;flex-shrink:0';
    var trackS = 'position:relative;height:14px;background:#1e1e28;border-radius:7px;overflow:hidden;border:1px solid #2a2a3a;width:100%';
    var midS = 'position:absolute;left:50%;top:0;bottom:0;width:1px;background:#444;transform:translateX(-50%)';
    var html = '';
    for (var j = 0; j < splits.length; j++) {
      var actualJ = payload.yourSplits[j];
      var modelJ = splits[j];
      var gj = actualJ - modelJ;
      var halfPct = Math.min(50, (Math.abs(gj) / maxAbs) * 50);
      var w = halfPct + '%';
      var sign = gj > 0 ? '+' : '';
      var barColor = gj >= 0 ? '#f87171' : '#34d399';
      var barPos = gj >= 0
        ? 'left:50%;width:' + w
        : 'right:50%;width:' + w;
      var barS = 'position:absolute;top:2px;bottom:2px;border-radius:4px;background:' + barColor + ';' + barPos;
      html +=
        '<div class="rp-gap" style="' + rowS + '">' +
          '<div class="rp-gap-head" style="' + headS + '">' +
            '<span class="rp-gap-seg" style="' + segS + '">' + escapeHtml(payload.labels[j]) + '</span>' +
            '<span class="rp-gap-true" style="' + trueS + '">you ' + actualJ.toFixed(3) + 's · ref ' + modelJ.toFixed(3) + 's</span>' +
            '<span class="rp-gap-val" style="' + valS + '">' + sign + gj.toFixed(3) + 's</span>' +
          '</div>' +
          '<div class="rp-gap-track" style="' + trackS + '"><span style="' + midS + '"></span><span style="' + barS + '"></span></div>' +
        '</div>';
    }
    gapsBox.innerHTML = html;
  }

  function sync() {
    var v = Number(slider.value);
    var Tprime = T * (1.12 - (v / 100) * 0.24);
    var m = getPacingModel(payload.pacingModels, payload.gender, Tprime, { segments: payload.segments });
    chart.data.datasets[1].data = m.splits;
    chart.data.datasets[1].label =
      'Reference @ ' + formatRpTime(Tprime, unit) + ' (' + Tprime.toFixed(3) + ' s)';
    chart.update('none');
    renderTable(m.splits, Tprime);
    renderGaps(m.splits);
    if (readout) {
      readout.innerHTML =
        'Your total <span style="font-family:var(--mono,monospace)">' +
        formatRpTime(T, unit) +
        '</span> <span style="font-size:0.72rem;color:var(--muted)">(' +
        T.toFixed(3) +
        ' s)</span><br>Reference total <span style="font-family:var(--mono,monospace)">' +
        formatRpTime(Tprime, unit) +
        '</span> <span style="font-size:0.72rem;color:var(--muted)">(' +
        Tprime.toFixed(3) +
        ' s)</span>';
    }
  }
  slider.addEventListener('input', sync);
  slider.addEventListener('change', sync);
  slider.value = 50;
  sync();
})();
