#!/usr/bin/env node
/**
 * Generate event HTML pages from a template.
 * Each event gets its own HTML file that imports its data module.
 */
const fs = require('fs');
const path = require('path');

const EVENTS_DIR = path.join(__dirname, '..', 'events');
fs.mkdirSync(EVENTS_DIR, { recursive: true });

const events = [
  {
    id: '100m',
    name: '100m',
    type: 'Sprint',
    subtitle: 'Acceleration, peak velocity & deceleration analysis from 10m split data across the fastest sprints in history.',
    tagline: '17 Men · 10 Women · 1988–2025',
    defaultTime: 11.00,
    timeMin: 9.5, timeMax: 14.0, timeStep: 0.01,
    timeLabel: 'Target Time (seconds)',
    storyTitle: 'The Science of the 100m Sprint',
    storyContent: `
      <div class="story-block">
        <h3>Acceleration Is Everything</h3>
        <p>The 100m sprint is not about top speed alone — it's about how quickly you reach it. Elite sprinters typically reach peak velocity between 50-70m, spending the first 30-40m in pure acceleration. The fastest athletes don't necessarily have the highest top speed, but they reach near-peak velocity sooner and maintain it longer.</p>
        <div class="story-insight"><p>Usain Bolt's 9.58 WR featured a peak velocity of 12.27 m/s (44.2 km/h) reached around 65m — then he decelerated less than his competitors over the final 30m.</p></div>
      </div>
      <div class="story-block">
        <h3>The Deceleration Phase</h3>
        <p>Every sprinter decelerates in the final 20-30m of a 100m race. The key differentiator at the elite level is <strong>minimizing deceleration</strong>. World-class sprinters lose only 1-3% of peak velocity by the finish, while sub-elite sprinters may lose 5-8%. This is where speed endurance training makes the critical difference.</p>
      </div>
      <div class="story-block">
        <h3>Reaction Time Matters</h3>
        <p>While the 0-10m split includes reaction time (~0.12-0.18s), the race is won and lost in the drive phase (0-30m) and the transition to maximal velocity (30-60m). Faster reaction times contribute less than 0.05s advantage on average.</p>
      </div>`,
    sortOptions: `
      <option value="time-asc">Fastest first</option>
      <option value="time-desc">Slowest first</option>
      <option value="date-desc">Most recent</option>
      <option value="date-asc">Oldest first</option>`,
  },
  {
    id: '200m',
    name: '200m',
    type: 'Sprint',
    subtitle: 'Curve versus straight dynamics across 50m splits. How elites manage the stagger and maintain velocity through the turn.',
    tagline: '15 Men · 9 Women · 1996–2025',
    defaultTime: 21.00,
    timeMin: 19.0, timeMax: 28.0, timeStep: 0.01,
    timeLabel: 'Target Time (seconds)',
    storyTitle: 'Mastering the 200m Curve',
    storyContent: `
      <div class="story-block">
        <h3>The Curve Disadvantage</h3>
        <p>The first 100m of a 200m race is run on the curve, which inherently slows runners due to centripetal force. Elite sprinters in the outside lanes (7-8) have a gentler curve and can maintain higher speeds, while inside lanes (1-3) face tighter turns. The typical curve-to-straight split difference is 0.5-1.0 seconds.</p>
        <div class="story-insight"><p>Usain Bolt's 19.19s WR in Berlin (2009) featured a 9.92s first 100m (curve) and a blistering 9.27s second 100m (straight) — a 0.65s differential showing his extraordinary ability to accelerate off the turn.</p></div>
      </div>
      <div class="story-block">
        <h3>Split Strategies</h3>
        <p>Unlike the 100m which is pure acceleration, the 200m requires <strong>pace management</strong>. The best 200m runners don't simply sprint all-out from the gun — they use the curve to build momentum and then "release" into maximum velocity on the straight. The 100-150m segment is typically the fastest.</p>
      </div>`,
    sortOptions: `
      <option value="time-asc">Fastest first</option>
      <option value="time-desc">Slowest first</option>
      <option value="date-desc">Most recent</option>
      <option value="date-asc">Oldest first</option>
      <option value="diff-asc">Smallest differential</option>
      <option value="diff-desc">Largest differential</option>`,
  },
  {
    id: '400m',
    name: '400m',
    type: 'Sprint / Speed Endurance',
    subtitle: 'The definitive 400m pacing resource. 100m split analysis with differential tracking and speed endurance metrics from the world\'s greatest quarter-milers.',
    tagline: '39 Men · 37 Women · 1968–2025',
    defaultTime: 50.00,
    timeMin: 40, timeMax: 95, timeStep: 0.01,
    timeLabel: 'Target Time (seconds)',
    storyTitle: 'The Art of 400m Pacing',
    storyContent: `
      <div class="story-block">
        <h3>The Differential: Key to Performance</h3>
        <p>The 400m is defined by the <strong>differential</strong> — the time difference between the first 200m and second 200m. Elite men average 1.3-1.9s differential, while elite women average 1.5-2.5s. A smaller differential indicates better speed endurance and more disciplined pacing.</p>
        <div class="story-insight"><p><strong>Even pacing (reference):</strong> Michael Johnson's 43.18 from Seville (1999) is the classic tight line — only a 0.74s differential between 200m halves (21.22 + 21.96). <strong>Current world record:</strong> Wayde van Niekerk's 43.03 in Rio (2016) is faster overall with a larger +1.87s differential — more front-loaded, then holding on — showing record pace does not require the smallest split gap. For contrast, Kirani James' 43.76 Olympic win carried a 2.54s differential: explosive start, pronounced fade.</p></div>
      </div>
      <div class="story-block">
        <h3>Two Schools of Pacing</h3>
        <p>Elite 400m mixes <strong>even pacing</strong> (Johnson, Reynolds) with <strong>front-loaded WR attempts</strong> (van Niekerk): you can break the record with a bigger differential if your peak speed and speed endurance align. Slower differentials are not always slower clocks — they reflect how evenly the athlete trades energy across the lap.</p>
      </div>
      <div class="story-block">
        <h3>The Final 100m</h3>
        <p>Regardless of strategy, every 400m runner slows in the final 100m. The fastest segment is almost always 100-200m (the "free speed" portion after acceleration, before significant fatigue). The 300-400m segment accounts for 26-29% of total race time depending on performance level — a higher percentage indicates greater fatigue-induced deceleration.</p>
      </div>`,
    sortOptions: `
      <option value="time-asc">Fastest first</option>
      <option value="time-desc">Slowest first</option>
      <option value="date-desc">Most recent</option>
      <option value="date-asc">Oldest first</option>
      <option value="diff-asc">Smallest differential</option>
      <option value="diff-desc">Largest differential</option>`,
  },
  {
    id: '800m',
    name: '800m',
    type: 'Middle Distance',
    subtitle: '200m split analysis revealing the balance between aggressive front-running and tactical kick strategies in the most demanding middle-distance event.',
    tagline: '13 Men · 8 Women · 1997–2025',
    defaultTime: 115,
    timeMin: 100, timeMax: 180, timeStep: 0.1,
    timeLabel: 'Target Time (seconds)',
    storyTitle: 'The Tactical 800m',
    storyContent: `
      <div class="story-block">
        <h3>Speed vs. Endurance</h3>
        <p>The 800m sits at the intersection of speed and endurance. It demands both the anaerobic power of a 400m sprinter and the aerobic capacity of a distance runner. Pacing strategy is crucial — go out too fast and you'll "die" in the final 200m; go out too slow and you can't close enough to compete.</p>
        <div class="story-insight"><p>David Rudisha's 1:40.91 WR in London 2012 was a masterclass in front-running — he led from start to finish with near-perfect even splits (49.28 + 51.63 for the 400m halves). His aggressive approach destroyed the field.</p></div>
      </div>
      <div class="story-block">
        <h3>Tactical vs. Fast Races</h3>
        <p>Championship 800m races often feature <strong>tactical pacing</strong> — a slow first lap followed by a fast kick. Time trials and Diamond League races tend to be <strong>honestly paced</strong> with rabbits. The pacing calculator offers recommendations for both strategies, because the optimal split distribution changes dramatically between the two.</p>
      </div>
      <div class="story-block">
        <h3>The Third 200m</h3>
        <p>Coaches call the 400-600m segment the "valley of death" — it's where lactic acid accumulates most rapidly and pace typically slows. Elite runners minimize this slowdown through specific speed endurance training. The final 200m is where the race is decided, and the best 800m runners can actually accelerate in this segment.</p>
      </div>`,
    sortOptions: `
      <option value="time-asc">Fastest first</option>
      <option value="time-desc">Slowest first</option>
      <option value="date-desc">Most recent</option>
      <option value="date-asc">Oldest first</option>
      <option value="diff-asc">Smallest differential</option>
      <option value="diff-desc">Largest differential</option>`,
  },
  {
    id: '1500m',
    name: '1500m',
    type: 'Middle Distance',
    subtitle: 'Lap-by-lap pacing with 400m splits plus the critical 300m finishing segment. The metric mile, decoded.',
    tagline: '11 Men · 8 Women · 1998–2025',
    defaultTime: 240,
    timeMin: 200, timeMax: 420, timeStep: 0.1,
    timeLabel: 'Target Time (seconds)',
    storyTitle: 'Decoding the 1500m',
    velocityChartDesc:
      'Relative speed: each point is % of the average m/s over the first three 400m segments (100% = that cruise). The last segment is 300m — raw m/s would misleadingly dip even on great kicks, so this scale matches the story. Tooltips also show true m/s. Curated races include WR pace, Paris 2024, and a tactical Olympic final.',
    storyContent: `
      <div class="story-block">
        <h3>How the race unfolds</h3>
        <p>Most of the field stays together through about 1100m; separation usually builds on the last lap and home straight. A fast finish is normal, but it does not mean every lap gets faster on the clock. The final split here is only <strong>300m</strong>, so plotting raw metres per second makes almost everyone look like they slow at the end. The velocity chart uses <strong>speed relative to the average of the first three 400m segments</strong> (100% = that early rhythm). Values above 100% on the last point mean the finish was faster than that cruise — what tactical kick wins often show.</p>
      </div>
      <div class="story-block">
        <h3>Time trials vs championships</h3>
        <p>World-record and paced races tend to be honest early and very hard late. Major finals are often slower for two or three laps, then violent from 800m out — good for medals, hard on the time. Model the kind of race you are actually targeting.</p>
        <div class="story-insight"><p><strong>Mile conversion:</strong> 1500m is ~93.2% of the mile. Multiply mile time by <strong>0.9259</strong> for a rough equivalent (e.g. 4:00.0 mile → about 3:42.5).</p></div>
      </div>`,
    sortOptions: `
      <option value="time-asc">Fastest first</option>
      <option value="time-desc">Slowest first</option>
      <option value="date-desc">Most recent</option>
      <option value="date-asc">Oldest first</option>`,
  },
  {
    id: '2mile',
    name: '2 Mile',
    type: 'Distance',
    subtitle: 'Lap-by-lap pacing across 8 laps with first mile vs second mile differential analysis for strategic race planning.',
    tagline: '8 Men · 6 Women · 2003–2025',
    defaultTime: 520,
    timeMin: 460, timeMax: 900, timeStep: 0.5,
    timeLabel: 'Target Time (seconds)',
    storyTitle: 'Two-Mile Strategy',
    storyContent: `
      <div class="story-block">
        <h3>Even Splits Win Races</h3>
        <p>The 2-mile (or 3200m) rewards <strong>even pacing</strong> more than any other track event. The optimal strategy is to run the second mile within 2-4 seconds of the first. Going out too fast leads to exponential slowdown due to glycogen depletion and lactate accumulation.</p>
        <div class="story-insight"><p>The differential between first and second mile is the single best predictor of performance. Elite runners target a 1-3 second positive split; anything over 5 seconds indicates the first mile was too aggressive.</p></div>
      </div>
      <div class="story-block">
        <h3>Lap-by-Lap Consistency</h3>
        <p>Top 2-milers maintain remarkably consistent lap times. A variance of more than 2 seconds between laps (excluding the first and last) typically indicates tactical racing rather than time-trial pacing. For personal bests, the best approach is metronomic consistency with a slight pickup over the final 2 laps.</p>
      </div>`,
    sortOptions: `
      <option value="time-asc">Fastest first</option>
      <option value="time-desc">Slowest first</option>
      <option value="date-desc">Most recent</option>
      <option value="date-asc">Oldest first</option>`,
  },
  {
    id: '5k',
    name: '5K',
    type: 'Distance',
    subtitle: 'Per-kilometer pacing analysis for the premier distance event, with cross-country adjustment factors for terrain and conditions.',
    tagline: '11 Men · 7 Women · 2004–2025',
    defaultTime: 900,
    timeMin: 720, timeMax: 1800, timeStep: 1,
    timeLabel: 'Target Time (seconds)',
    storyTitle: 'Racing the 5K',
    storyContent: `
      <div class="story-block">
        <h3>Negative Splits: The Gold Standard</h3>
        <p>The fastest 5K performances in history almost universally feature <strong>negative or even splits</strong> — running the second half as fast or faster than the first. This pacing pattern allows the aerobic system to fully engage before pushing pace, preventing early lactate accumulation that leads to a costly slowdown.</p>
        <div class="story-insight"><p>Joshua Cheptegei's 12:35.36 WR featured remarkably even kilometer splits, never varying more than 3 seconds from his average pace. Consistency at 2:31/km across 5 kilometers is extraordinary.</p></div>
      </div>
      <div class="story-block">
        <h3>Cross-Country Adjustments</h3>
        <p>Cross-country 5K times are not directly comparable to track times. Factors like terrain (hills, mud, grass), weather, and course technicality can add 30-90 seconds. The pacing calculator includes adjustment factors for common cross-country conditions so you can set realistic split targets.</p>
      </div>
      <div class="story-block">
        <h3>Per-Kilometer Consistency</h3>
        <p>For recreational runners targeting a specific time, the most important metric is <strong>per-K consistency</strong>. Aim for less than 5 seconds variance between your fastest and slowest kilometer. For competitive runners, allow the first K to be 2-3 seconds slow (settling in) and the last K to be 3-5 seconds fast (kick).</p>
      </div>`,
    sortOptions: `
      <option value="time-asc">Fastest first</option>
      <option value="time-desc">Slowest first</option>
      <option value="date-desc">Most recent</option>
      <option value="date-asc">Oldest first</option>`,
  },
];

function generateEventPage(event) {
  const eventOptions = events.map(e =>
    `<option value="/events/${e.id}.html" ${e.id === event.id ? 'selected' : ''}>${e.name}</option>`
  ).join('\n            ');

  const velocityChartDesc =
    event.velocityChartDesc ||
    'Speed (m/s) per segment for the top performances. Your target is overlaid when using the calculator.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${event.name} Pace Lab — Split Times Database & Pacing Calculator</title>
<meta name="description" content="${event.subtitle}">
<meta property="og:title" content="${event.name} Pace Lab — Pacing Analysis">
<meta property="og:description" content="${event.subtitle}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://pace.alphapeak.io/events/${event.id}.html">
<meta property="og:site_name" content="Pace Lab">
<meta property="og:image" content="https://pace.alphapeak.io/apeak.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="AlphaPeak — Pace Lab">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${event.name} Pace Lab — Pacing Analysis">
<meta name="twitter:description" content="${event.subtitle.replace(/"/g, '&quot;')}">
<meta name="twitter:image" content="https://pace.alphapeak.io/apeak.png">
<meta name="twitter:image:alt" content="AlphaPeak — Pace Lab">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body>

<div class="hero">
  <a class="alphapeak-brand" href="https://alphapeak.io" target="_blank" rel="noopener noreferrer" aria-label="AlphaPeak — alphapeak.io">
    <img src="/apeak.png" alt="AlphaPeak" width="160" height="40" decoding="async">
  </a>
  <h1>${event.name} Pace Lab</h1>
  <p class="sub">${event.subtitle}</p>
  <span class="tag">${event.tagline}</span>
</div>

<nav class="nav">
  <select id="eventSelect" class="nav-event-select">
    <option value="/">All Events</option>
    ${eventOptions}
  </select>
  <div class="nav-divider"></div>
  <button class="active" data-section="story">Data Story</button>
  <button data-section="calculator">Calculator</button>
  <button data-section="men-data">Men's Data</button>
  <button data-section="women-data">Women's Data</button>
  <button data-section="models">Models</button>
  <button data-section="about">About</button>
</nav>

<!-- DATA STORY -->
<div id="story" class="section active">
  <h2 class="section-title">${event.storyTitle}</h2>
  <p class="section-desc">How the world's best athletes pace the ${event.name}.</p>

  ${event.storyContent}

  <!-- Charts -->
  <div class="chart-section">
    <div class="chart-gender-group">
      <button type="button" class="chart-gender-btn active" data-gender="male">Men</button>
      <button type="button" class="chart-gender-btn" data-gender="female">Women</button>
    </div>

    <div class="chart-row">
      <div class="chart-container">
        <div class="chart-title">Split Distribution by Performance Tier</div>
        <div class="chart-desc">How each segment's share of total time changes across performance levels.</div>
        <canvas id="splitDistChart" height="300"></canvas>
      </div>
      <div class="chart-container">
        <div class="chart-title">Velocity Profile</div>
        <div class="chart-desc">${velocityChartDesc}</div>
        <canvas id="velocityChart" height="300"></canvas>
      </div>
    </div>
    <div class="chart-row">
      <div class="chart-container">
        <div class="chart-title">Differential Analysis</div>
        <div class="chart-desc">Finish time vs. half-race differential, with a least-squares trend line. Lower differential = more even pacing between halves.</div>
        <canvas id="diffChart" height="300"></canvas>
      </div>
      <div class="chart-container">
        <div class="chart-title">Pacing Trends</div>
        <div class="chart-desc">How first and last segment percentages have evolved over time.</div>
        <canvas id="historicalChart" height="300"></canvas>
      </div>
    </div>
  </div>
</div>

<!-- CALCULATOR -->
<div id="calculator" class="section">
  <h2 class="section-title">Pace Calculator</h2>
  <p class="section-desc">Enter a target ${event.name} time and gender to get recommended split targets based on elite pacing data.</p>
  <div class="calc-grid">
    <div class="calc-inputs">
      <div class="input-group">
        <label>Gender</label>
        <div class="gender-toggle">
          <button id="gm" class="active">Male</button>
          <button id="gf">Female</button>
        </div>
      </div>
      <div class="input-group">
        <label>${event.timeLabel}</label>
        <input type="number" id="targetTime" value="${event.defaultTime}" step="${event.timeStep}" min="${event.timeMin}" max="${event.timeMax}">
      </div>
      <div class="input-group">
        <label>Or enter as minutes:seconds</label>
        <input type="text" id="targetMMSS" placeholder="e.g. ${event.defaultTime >= 60 ? Math.floor(event.defaultTime/60) + ':' + (event.defaultTime%60).toFixed(0).padStart(2,'0') : '0:' + event.defaultTime.toFixed(2)}">
      </div>
      <div id="levelLabel" style="padding:12px 16px;background:var(--accent-dim);border-radius:8px;color:var(--accent);font-weight:600;font-size:0.9rem"></div>
    </div>
    <div class="calc-results">
      <div id="splitBars"></div>
      <div class="summary-grid" id="summaryGrid"></div>
      <div class="velocity-row" id="velocityRow"></div>
      <div id="confidenceBand" class="confidence-band"></div>
      <div id="rankingCard" class="ranking-card"></div>
    </div>
  </div>
</div>

<!-- MEN DATA -->
<div id="men-data" class="section">
  <h2 class="section-title">Men's ${event.name} Split Database</h2>
  <p class="section-desc">Elite race split data sourced from official timing systems and biomechanical analyses.</p>
  <div class="table-controls">
    <input type="text" id="menSearch" placeholder="Search athlete, competition, year..." >
    <select id="menSort">
      ${event.sortOptions}
    </select>
  </div>
  <div class="table-wrap" id="menTable"></div>
</div>

<!-- WOMEN DATA -->
<div id="women-data" class="section">
  <h2 class="section-title">Women's ${event.name} Split Database</h2>
  <p class="section-desc">Elite race split data from the world's top performers.</p>
  <div class="table-controls">
    <input type="text" id="womenSearch" placeholder="Search athlete, competition, year...">
    <select id="womenSort">
      ${event.sortOptions}
    </select>
  </div>
  <div class="table-wrap" id="womenTable"></div>
</div>

<!-- MODELS -->
<div id="models" class="section">
  <h2 class="section-title">Pacing Models by Performance Tier</h2>
  <p class="section-desc">Average split distribution percentages derived from the database, organized by performance level.</p>
  <h3 style="font-size:1.1rem;margin-bottom:16px;color:var(--accent)">Men's Models</h3>
  <div class="model-cards" id="maleModels"></div>
  <h3 style="font-size:1.1rem;margin:32px 0 16px;color:var(--accent)">Women's Models</h3>
  <div class="model-cards" id="femaleModels"></div>
</div>

<!-- ABOUT -->
<div id="about" class="section">
  <h2 class="section-title">About & Sources</h2>
  <div class="about-content">
    <p>This database compiles ${event.name} race split times from major international competitions. All data comes from official timing systems and published biomechanical analyses.</p>
    <p>The <strong>pacing calculator</strong> uses split distribution percentages derived from this database, adjusted for gender and performance level. The model interpolates between performance tiers to generate smooth, realistic pacing recommendations.</p>
    <p><strong>Key features:</strong> Confidence bands show the typical range of split variation among athletes at similar performance levels. The database ranking shows where your target time falls among recorded elite performances.</p>
    <h3 style="margin:24px 0 12px;font-size:1.1rem">Primary Sources</h3>
    <ul class="source-list">
      <li><strong>Athletes First (athletefirst.org)</strong> — Comprehensive split times archive</li>
      <li><strong>World Athletics Biomechanical Reports</strong> — Championship analysis reports</li>
      <li><strong>Omega Timing</strong> — Diamond League race analysis 2018–2025</li>
      <li><strong>Seiko Timing</strong> — World Championships race analysis 2023–2025</li>
      <li><strong>Paris 2024 Olympic Games Results Book</strong> — Official results</li>
      <li><strong>Academic research</strong> — Br&uuml;ggemann (1990), Reardon (2013), and others</li>
    </ul>
  </div>
</div>

<footer>
  <a class="alphapeak-brand" href="https://alphapeak.io" target="_blank" rel="noopener noreferrer" aria-label="AlphaPeak — alphapeak.io">
    <img src="/apeak.png" alt="AlphaPeak" width="140" height="35" decoding="async">
  </a>
  <p>Pace Lab — Data compiled from <a href="https://www.athletefirst.org/" target="_blank" rel="noopener noreferrer">Athletes First</a>, World Athletics, and academic research.<br>
  <a href="https://alphapeak.io" target="_blank" rel="noopener noreferrer">alphapeak.io</a> · <a href="/">Home</a> · <a href="/pace-lab.html">All events</a></p>
</footer>

<script type="module">
import { initEventPage } from '../src/js/event-page.js';
import { eventMeta, menData, womenData, pacingModels } from '../src/data/${event.id}.js';

initEventPage({ eventMeta, menData, womenData, pacingModels });
</script>
</body>
</html>`;
}

// Generate all event pages
for (const event of events) {
  const html = generateEventPage(event);
  const filePath = path.join(EVENTS_DIR, `${event.id}.html`);
  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`  Generated ${filePath}`);
}

console.log('\nDone! Generated all event pages.');
