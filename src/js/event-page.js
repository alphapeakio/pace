/**
 * Shared event page initialization.
 * Each event HTML page imports this and passes its data.
 */
import '../styles/global.css';
import { initNav, showSection } from './nav.js';
import { initCalculator } from './calculator.js';
import { initTable } from './table.js';
import { renderModelCards } from './models-renderer.js';
import {
  createSplitDistributionChart,
  createVelocityProfileChart,
  createDifferentialChart,
  createHistoricalChart,
  updateVelocityOverlay,
} from './charts.js';

/**
 * Initialize a complete event page.
 *
 * @param {Object} params
 * @param {Object} params.eventMeta - event metadata
 * @param {Array} params.menData - men's race data
 * @param {Array} params.womenData - women's race data
 * @param {Object} params.pacingModels - pacing models { male, female }
 * @param {Object} params.config - event-specific config
 */
export function initEventPage({ eventMeta, menData, womenData, pacingModels, config = {} }) {
  // Initialize navigation
  initNav();

  // Initialize calculator
  const calculator = initCalculator({
    eventMeta,
    pacingModels,
    menData,
    womenData,
    config: config.calculator || {},
  });

  // Initialize tables
  const extraColumns = config.extraColumns || [];

  initTable({
    containerId: 'menTable',
    searchId: 'menSearch',
    sortId: 'menSort',
    data: menData,
    eventMeta,
    extraColumns,
  });

  initTable({
    containerId: 'womenTable',
    searchId: 'womenSearch',
    sortId: 'womenSort',
    data: womenData,
    eventMeta,
    extraColumns,
  });

  // Render pacing model cards
  renderModelCards('maleModels', pacingModels.male, eventMeta.segments, eventMeta.timeUnit);
  renderModelCards('femaleModels', pacingModels.female, eventMeta.segments, eventMeta.timeUnit);

  initCharts(eventMeta, menData, womenData, pacingModels);

  // Show default section
  showSection('story');
}

function initCharts(eventMeta, menData, womenData, pacingModels) {
  const segments = eventMeta.segments;
  const velocityOptions =
    eventMeta.id === '1500m'
      ? { mode: '1500_relative', gender: 'male' }
      : {};

  // Split Distribution chart (men by default)
  createSplitDistributionChart('splitDistChart', pacingModels, 'male', segments);

  createVelocityProfileChart('velocityChart', menData, segments, null, velocityOptions);

  // Differential chart (men)
  createDifferentialChart('diffChart', menData, eventMeta.timeUnit);

  // Historical chart (men)
  createHistoricalChart('historicalChart', menData, segments);

  // Gender toggle for charts
  const chartGenderBtns = document.querySelectorAll('.chart-gender-btn');
  chartGenderBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      chartGenderBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const gender = btn.dataset.gender;
      const data = gender === 'male' ? menData : womenData;
      const vOpts =
        eventMeta.id === '1500m'
          ? { mode: '1500_relative', gender }
          : {};
      createSplitDistributionChart('splitDistChart', pacingModels, gender, segments);
      createVelocityProfileChart('velocityChart', data, segments, null, vOpts);
      createDifferentialChart('diffChart', data, eventMeta.timeUnit);
      createHistoricalChart('historicalChart', data, segments);
    });
  });

  document.addEventListener('calculator-update', e => {
    const { splits, gender } = e.detail;
    const overlayOpts =
      eventMeta.id === '1500m'
        ? { mode: '1500_relative', gender: gender || 'male' }
        : {};
    updateVelocityOverlay('velocityChart', segments, splits, overlayOpts);
  });
}
