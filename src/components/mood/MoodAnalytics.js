import { MOOD_CONFIG as TAILWIND_MOOD_CONFIG, MOOD_ORDER } from '../../utils/moodConfig.js';

// Chart-specific color config (hex colors for Canvas rendering)
const CHART_MOOD_CONFIG = {
  happy: { label: 'Happy', emoji: '😊', color: '#facc15' },
  sad: { label: 'Sad', emoji: '😢', color: '#60a5fa' },
  angry: { label: 'Angry', emoji: '😠', color: '#f87171' },
  surprised: { label: 'Surprised', emoji: '😲', color: '#f472b6' },
  neutral: { label: 'Neutral', emoji: '😐', color: '#9ca3af' },
  confused: { label: 'Confused', emoji: '😕', color: '#a78bfa' },
  tired: { label: 'Tired', emoji: '😴', color: '#94a3b8' }
};

export class MoodAnalytics {
  constructor(stateManager, themeManager, options = {}) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.container = null;
    this.unsubscribes = [];
    this.detailed = options.detailed || false;
  }

  mount(container) {
    this.container = container;
    this.render();
    this.setupListeners();
  }

  render() {
    if (!this.container) return;

    const history = this.stateManager.getMoodHistory();
    const confirmedHistory = history.filter(e => e.source !== 'predicted');

    if (confirmedHistory.length === 0) {
      this.container.innerHTML = this.renderEmptyState();
      return;
    }

    const stats = this.calculateStats(confirmedHistory);

    this.container.innerHTML = `
      <div class="space-y-6" id="mood-analytics">
        <!-- Summary Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="summary-cards">
          ${this.renderSummaryCards(stats)}
        </div>

        ${this.detailed ? this.renderDetailedAnalytics(confirmedHistory, stats) : this.renderOverviewAnalytics(confirmedHistory, stats)}
      </div>
    `;

    // Initialize charts after DOM is ready
    setTimeout(() => this.initCharts(confirmedHistory, stats), 100);
  }

  calculateStats(history) {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const todayEntries = history.filter(e => e.timestamp >= today.getTime());
    const weekEntries = history.filter(e => e.timestamp >= weekAgo.getTime());
    const monthEntries = history.filter(e => e.timestamp >= monthAgo.getTime());

    // Mood distribution
    const distribution = {};
    MOOD_ORDER.forEach(mood => distribution[mood] = 0);
    history.forEach(e => { if (distribution[e.mood] !== undefined) distribution[e.mood]++; });

    // Most frequent mood
    let topMood = 'neutral';
    let topCount = 0;
    Object.entries(distribution).forEach(([mood, count]) => {
      if (count > topCount) { topCount = count; topMood = mood; }
    });

    // Current streak
    let streak = 0;
    const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
    let currentDate = new Date(today);
    for (const entry of sortedHistory) {
      const entryDate = new Date(entry.timestamp);
      entryDate.setHours(0, 0, 0, 0);
      if (entryDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (entryDate < currentDate) {
        break;
      }
    }

    // Average per day (last 30 days)
    const daysWithEntries = new Set();
    monthEntries.forEach(e => {
      const d = new Date(e.timestamp);
      d.setHours(0, 0, 0, 0);
      daysWithEntries.add(d.getTime());
    });
    const avgPerDay = daysWithEntries.size > 0 ? (monthEntries.length / daysWithEntries.size).toFixed(1) : 0;

    // Mood trends (last 7 days)
    const dailyMoods = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const key = date.getTime();
      const dayEntries = history.filter(e => {
        const d = new Date(e.timestamp);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === key;
      });
      if (dayEntries.length > 0) {
        // Get most frequent mood for that day
        const dayDist = {};
        dayEntries.forEach(e => dayDist[e.mood] = (dayDist[e.mood] || 0) + 1);
        let top = 'neutral', max = 0;
        Object.entries(dayDist).forEach(([m, c]) => { if (c > max) { max = c; top = m; } });
        dailyMoods[key] = top;
      }
    }

    return {
      total: history.length,
      today: todayEntries.length,
      week: weekEntries.length,
      month: monthEntries.length,
      distribution,
      topMood,
      topCount,
      streak,
      avgPerDay,
      dailyMoods,
      history
    };
  }

  renderSummaryCards(stats) {
    const topConfig = TAILWIND_MOOD_CONFIG[stats.topMood] || TAILWIND_MOOD_CONFIG.neutral;

    return [
      {
        label: 'Total Entries',
        value: stats.total,
        icon: '📊',
        color: 'from-primary-400 to-accent-400'
      },
      {
        label: 'This Week',
        value: stats.week,
        icon: '📅',
        color: 'from-green-400 to-teal-400'
      },
      {
        label: 'Top Mood',
        value: `${topConfig.emoji} ${topConfig.label}`,
        subValue: `${stats.topCount} times`,
        icon: '🏆',
        color: topConfig.color
      },
      {
        label: 'Streak',
        value: `${stats.streak} days`,
        icon: '🔥',
        color: 'from-red-400 to-orange-400'
      }
    ].map(card => `
      <div class="card p-5 relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br ${card.color} opacity-5"></div>
        <div class="relative z-10">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-muted">${card.label}</span>
            <span class="text-2xl">${card.icon}</span>
          </div>
          <p class="font-display text-2xl font-bold text-primary-900 dark:text-primary-100">${card.value}</p>
          ${card.subValue ? `<p class="text-sm text-muted mt-1">${card.subValue}</p>` : ''}
        </div>
      </div>
    `).join('');
  }

  renderOverviewAnalytics(history, stats) {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Mood Distribution -->
        <section class="card p-6" aria-labelledby="dist-heading">
          <h3 id="dist-heading" class="font-display text-lg font-semibold text-primary-900 dark:text-primary-100 mb-4">Mood Distribution</h3>
          <div class="h-64 flex items-center justify-center" id="distribution-chart">
            <canvas id="distribution-canvas"></canvas>
          </div>
          <div class="mt-4 flex flex-wrap gap-2 justify-center" id="distribution-legend">
            ${this.renderLegend(stats.distribution)}
          </div>
        </section>

        <!-- Weekly Trend -->
        <section class="card p-6" aria-labelledby="trend-heading">
          <h3 id="trend-heading" class="font-display text-lg font-semibold text-primary-900 dark:text-primary-100 mb-4">Weekly Trend</h3>
          <div class="h-64" id="trend-chart">
            <canvas id="trend-canvas"></canvas>
          </div>
        </section>

        <!-- Mood Breakdown -->
        <section class="card p-6 lg:col-span-2" aria-labelledby="breakdown-heading">
          <h3 id="breakdown-heading" class="font-display text-lg font-semibold text-primary-900 dark:text-primary-100 mb-4">Mood Breakdown</h3>
          <div class="space-y-3" id="mood-breakdown">
            ${this.renderMoodBreakdown(stats.distribution, stats.total)}
          </div>
        </section>
      </div>
    `;
  }

  renderDetailedAnalytics(history, stats) {
    return `
      <div class="space-y-6">
        <!-- Distribution Chart -->
        <section class="card p-6" aria-labelledby="dist-heading">
          <h3 id="dist-heading" class="font-display text-lg font-semibold text-primary-900 dark:text-primary-100 mb-4">Mood Distribution</h3>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 h-80" id="distribution-chart">
              <canvas id="distribution-canvas"></canvas>
            </div>
            <div class="space-y-3" id="distribution-legend-detailed">
              ${this.renderDetailedLegend(stats.distribution, stats.total)}
            </div>
          </div>
        </section>

        <!-- Time-based Analytics -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Weekly Trend -->
          <section class="card p-6" aria-labelledby="weekly-heading">
            <h3 id="weekly-heading" class="font-display text-lg font-semibold text-primary-900 dark:text-primary-100 mb-4">Last 7 Days</h3>
            <div class="h-72" id="weekly-chart">
              <canvas id="weekly-canvas"></canvas>
            </div>
          </section>

          <!-- Monthly Trend -->
          <section class="card p-6" aria-labelledby="monthly-heading">
            <h3 id="monthly-heading" class="font-display text-lg font-semibold text-primary-900 dark:text-primary-100 mb-4">Last 30 Days</h3>
            <div class="h-72" id="monthly-chart">
              <canvas id="monthly-canvas"></canvas>
            </div>
          </section>
        </div>

        <!-- Mood Breakdown Table -->
        <section class="card p-6" aria-labelledby="breakdown-heading">
          <h3 id="breakdown-heading" class="font-display text-lg font-semibold text-primary-900 dark:text-primary-100 mb-4">Detailed Breakdown</h3>
          <div class="overflow-x-auto">
            <table class="w-full" id="breakdown-table">
              <thead>
                <tr class="text-left text-sm text-muted border-b border-lavender-200/50 dark:border-primary-800/50">
                  <th class="pb-2 font-medium">Mood</th>
                  <th class="pb-2 font-medium text-right">Count</th>
                  <th class="pb-2 font-medium text-right">Percentage</th>
                  <th class="pb-2 font-medium text-right">Avg Confidence</th>
                  <th class="pb-2 font-medium text-right">Last Logged</th>
                </tr>
              </thead>
              <tbody id="breakdown-tbody">
                ${this.renderBreakdownTableRows(stats.distribution, history)}
              </tbody>
            </table>
          </div>
        </section>

        <!-- Source Analysis -->
        <section class="card p-6" aria-labelledby="source-heading">
          <h3 id="source-heading" class="font-display text-lg font-semibold text-primary-900 dark:text-primary-100 mb-4">Entry Sources</h3>
          <div class="h-64" id="source-chart">
            <canvas id="source-canvas"></canvas>
          </div>
        </section>
      </div>
    `;
  }

  renderLegend(distribution) {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total === 0) return '';

    return MOOD_ORDER.filter(m => distribution[m] > 0).map(mood => {
      const config = TAILWIND_MOOD_CONFIG[mood];
      const count = distribution[mood];
      const percentage = ((count / total) * 100).toFixed(1);
      return `
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg glass">
          <span class="w-3 h-3 rounded-full" style="background: ${CHART_MOOD_CONFIG[mood].color}"></span>
          <span class="text-sm font-medium text-primary-900 dark:text-primary-100">${config.label}</span>
          <span class="text-xs text-muted">${percentage}%</span>
        </div>
      `;
    }).join('');
  }

  renderDetailedLegend(distribution, total) {
    if (total === 0) return '<p class="text-muted text-center py-4">No data</p>';

    return MOOD_ORDER.filter(m => distribution[m] > 0).map(mood => {
      const config = TAILWIND_MOOD_CONFIG[mood];
      const chartConfig = CHART_MOOD_CONFIG[mood];
      const count = distribution[mood];
      const percentage = ((count / total) * 100).toFixed(1);
      const barWidth = (count / total) * 100;
      return `
        <div class="flex items-center gap-3">
          <div class="w-8 text-center">
            <span class="text-lg">${config.emoji}</span>
          </div>
          <div class="flex-1">
            <div class="flex justify-between text-sm mb-1">
              <span class="font-medium text-primary-900 dark:text-primary-100">${config.label}</span>
              <span class="text-muted">${count} (${percentage}%)</span>
            </div>
            <div class="h-2 bg-lavender-200 dark:bg-primary-800 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" style="width: ${barWidth}%; background: ${chartConfig.color}"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderMoodBreakdown(distribution, total) {
    if (total === 0) return '<p class="text-muted text-center py-4">No data available</p>';

    return MOOD_ORDER.filter(m => distribution[m] > 0).map(mood => {
      const config = TAILWIND_MOOD_CONFIG[mood];
      const chartConfig = CHART_MOOD_CONFIG[mood];
      const count = distribution[mood];
      const percentage = (count / total) * 100;
      return `
        <div class="flex items-center gap-4 p-3 rounded-xl glass">
          <div class="w-10 h-10 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center text-xl flex-shrink-0">
            ${config.emoji}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between text-sm mb-1">
              <span class="font-medium text-primary-900 dark:text-primary-100">${config.label}</span>
              <span class="text-muted">${count} entries</span>
            </div>
            <div class="h-2 bg-lavender-200 dark:bg-primary-800 rounded-full overflow-hidden">
              <div class="h-full rounded-full" style="width: ${percentage}%; background: ${chartConfig.color}"></div>
            </div>
          </div>
          <span class="font-semibold text-primary-900 dark:text-primary-100 text-sm">${percentage.toFixed(1)}%</span>
        </div>
      `;
    }).join('');
  }

  renderBreakdownTableRows(distribution, history) {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total === 0) return '<tr><td colspan="5" class="py-8 text-center text-muted">No data</td></tr>';

    return MOOD_ORDER.filter(m => distribution[m] > 0).map(mood => {
      const config = MOOD_CONFIG[mood];
      const count = distribution[mood];
      const percentage = ((count / total) * 100).toFixed(1);

      // Calculate average confidence for this mood
      const moodEntries = history.filter(e => e.mood === mood);
      const avgConfidence = moodEntries.length > 0
        ? (moodEntries.reduce((sum, e) => sum + e.confidence, 0) / moodEntries.length * 100).toFixed(1)
        : 0;

      // Last logged
      const lastEntry = moodEntries.sort((a, b) => b.timestamp - a.timestamp)[0];
      const lastLogged = lastEntry ? new Date(lastEntry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';

      return `
        <tr class="border-b border-lavender-200/50 dark:border-primary-800/50">
          <td class="py-3 flex items-center gap-2">
            <span class="text-lg">${config.emoji}</span>
            <span class="font-medium text-primary-900 dark:text-primary-100">${config.label}</span>
          </td>
          <td class="py-3 text-right text-primary-900 dark:text-primary-100">${count}</td>
          <td class="py-3 text-right text-muted">${percentage}%</td>
          <td class="py-3 text-right text-muted">${avgConfidence}%</td>
          <td class="py-3 text-right text-muted">${lastLogged}</td>
        </tr>
      `;
    }).join('');
  }

  renderEmptyState() {
    return `
      <div class="text-center py-16 text-muted">
        <svg class="w-20 h-20 mx-auto mb-6 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
        <h3 class="font-display text-xl font-semibold text-primary-900 dark:text-primary-100 mb-2">No Analytics Yet</h3>
        <p class="text-primary-700 dark:text-lavender-200 mb-6">Log some moods to see your emotional patterns and trends.</p>
        <button class="btn btn-primary" id="log-mood-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
          Log Your First Mood
        </button>
      </div>
    `;
  }

  initCharts(history, stats) {
    // Distribution Chart (Doughnut)
    this.initDistributionChart(stats.distribution);

    // Trend Chart (Line)
    this.initTrendChart(stats.dailyMoods);

    if (this.detailed) {
      this.initWeeklyChart(history);
      this.initMonthlyChart(history);
      this.initSourceChart(history);
    }
  }

  initDistributionChart(distribution) {
    const canvas = this.container.querySelector('#distribution-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const data = MOOD_ORDER.filter(m => distribution[m] > 0).map(m => distribution[m]);
    const labels = MOOD_ORDER.filter(m => distribution[m] > 0).map(m => TAILWIND_MOOD_CONFIG[m].label);
    const colors = MOOD_ORDER.filter(m => distribution[m] > 0).map(m => CHART_MOOD_CONFIG[m].color);

    // Set canvas size
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    this.drawDoughnutChart(ctx, canvas.width, canvas.height, data, labels, colors);
  }

  initTrendChart(dailyMoods) {
    const canvas = this.container.querySelector('#trend-canvas') || this.container.querySelector('#weekly-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dates = Object.keys(dailyMoods).sort((a, b) => a - b);
    const values = dates.map(d => MOOD_ORDER.indexOf(dailyMoods[d]));
    const labels = dates.map(d => new Date(parseInt(d)).toLocaleDateString(undefined, { weekday: 'short' }));

    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    this.drawLineChart(ctx, canvas.width, canvas.height, values, labels, MOOD_CONFIG);
  }

  initWeeklyChart(history) {
    const canvas = this.container.querySelector('#weekly-canvas');
    if (!canvas) return;

    // Last 7 days daily mood averages
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const dailyData = [];
    const dailyLabels = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const key = date.getTime();

      const dayEntries = history.filter(e => {
        const d = new Date(e.timestamp);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === key;
      });

      dailyLabels.push(date.toLocaleDateString(undefined, { weekday: 'short' }));

      if (dayEntries.length > 0) {
        const dayDist = {};
        dayEntries.forEach(e => dayDist[e.mood] = (dayDist[e.mood] || 0) + 1);
        let top = 'neutral', max = 0;
        Object.entries(dayDist).forEach(([m, c]) => { if (c > max) { max = c; top = m; } });
        dailyData.push(MOOD_ORDER.indexOf(top));
      } else {
        dailyData.push(null);
      }
    }

    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    this.drawLineChart(ctx, canvas.width, canvas.height, dailyData, dailyLabels, MOOD_CONFIG);
  }

  initMonthlyChart(history) {
    const canvas = this.container.querySelector('#monthly-canvas');
    if (!canvas) return;

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Group by week for last 4 weeks
    const weeklyData = [];
    const weeklyLabels = [];

    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (i * 7) - today.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekEntries = history.filter(e => e.timestamp >= weekStart.getTime() && e.timestamp <= weekEnd.getTime());

      weeklyLabels.push(`Week ${4 - i}`);

      if (weekEntries.length > 0) {
        const weekDist = {};
        weekEntries.forEach(e => weekDist[e.mood] = (weekDist[e.mood] || 0) + 1);
        let top = 'neutral', max = 0;
        Object.entries(weekDist).forEach(([m, c]) => { if (c > max) { max = c; top = m; } });
        weeklyData.push(MOOD_ORDER.indexOf(top));
      } else {
        weeklyData.push(null);
      }
    }

    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    this.drawLineChart(ctx, canvas.width, canvas.height, weeklyData, weeklyLabels, MOOD_CONFIG);
  }

  initSourceChart(history) {
    const canvas = this.container.querySelector('#source-canvas');
    if (!canvas) return;

    const sources = ['confirmed', 'manual', 'conversation', 'confirmation', 'predicted'];
    const sourceLabels = ['Confirmed', 'Manual', 'From Chat', 'Confirmed Detection', 'AI Predicted'];
    const sourceColors = ['#22c55e', '#844eff', '#0ea5e9', '#f59e0b', '#9ca3af'];

    const data = sources.map(s => history.filter(e => e.source === s).length);

    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    this.drawDoughnutChart(ctx, canvas.width, canvas.height, data, sourceLabels, sourceColors);
  }

  drawDoughnutChart(ctx, width, height, data, labels, colors) {
    const total = data.reduce((a, b) => a + b, 0);
    if (total === 0) return;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;
    const innerRadius = radius * 0.6;

    let currentAngle = -Math.PI / 2;

    data.forEach((value, i) => {
      const sliceAngle = (value / total) * 2 * Math.PI;

      // Draw slice
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();

      currentAngle += sliceAngle;
    });

    // Draw center text
    ctx.fillStyle = this.themeManager.isDark() ? '#f5f0ff' : '#1e1b2e';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), centerX, centerY - 8);

    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = this.themeManager.isDark() ? '#c4b5d4' : '#5c5470';
    ctx.fillText('entries', centerX, centerY + 16);
  }

  drawLineChart(ctx, width, height, values, labels) {
    const padding = 50;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const validValues = values.filter(v => v !== null);
    const maxValue = validValues.length > 0 ? Math.max(...validValues) : 6;
    const minValue = validValues.length > 0 ? Math.min(...validValues) : 0;
    const valueRange = maxValue - minValue || 1;

    const isDark = this.themeManager.isDark();
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(124,58,237,0.1)';
    const textColor = isDark ? '#c4b5d4' : '#5c5470';
    const lineColor = '#844eff';
    const pointColor = '#844eff';

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw Y-axis labels (mood names)
    ctx.fillStyle = textColor;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const moodIndex = maxValue - (valueRange / 5) * i;
      const closestMood = MOOD_ORDER[Math.round(Math.max(0, Math.min(6, moodIndex)))];
      const moodLabel = CHART_MOOD_CONFIG[closestMood]?.label || '';
      const y = padding + (chartHeight / 5) * i;
      ctx.fillText(moodLabel, padding - 10, y);
    }

    // Draw line
    if (validValues.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      values.forEach((value, i) => {
        if (value === null) return;
        const x = padding + (chartWidth / (values.length - 1)) * i;
        const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;

        if (i === 0 || values[i - 1] === null) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw points
      ctx.fillStyle = pointColor;
      values.forEach((value, i) => {
        if (value === null) return;
        const x = padding + (chartWidth / (values.length - 1)) * i;
        const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();

        // White center
        ctx.fillStyle = isDark ? '#1a1625' : '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = pointColor;
      });
    }

    // Draw X-axis labels
    ctx.fillStyle = textColor;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    labels.forEach((label, i) => {
      const x = padding + (chartWidth / (labels.length - 1)) * i;
      ctx.fillText(label, x, height - padding + 8);
    });
  }

  setupListeners() {
    this.unsubscribes.push(
      this.stateManager.on('mood.history.change', () => this.render())
    );
    this.unsubscribes.push(
      this.stateManager.on('theme.change', () => this.render())
    );
  }

  destroy() {
    this.unsubscribes.forEach(unsub => unsub());
  }
}