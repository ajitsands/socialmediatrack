/**
 * Admin — Dashboard Module
 */
window.App = window.App || {};
App.Admin = App.Admin || {};

App.Admin.Dashboard = (function ($) {
  'use strict';

  var _liveInterval = null;
  var _recentTable  = null;

  function init() {
    if (!App.auth.requireAuth('admin')) return;
    _recentTable = null; // Reset on init
    render();

    // Default date range: current week (Sunday to today)
    var now = new Date();
    var day = now.getDay();
    var sunday = new Date(now.setDate(now.getDate() - day));
    
    var yyyy_s = sunday.getFullYear();
    var mm_s = String(sunday.getMonth() + 1).padStart(2, '0');
    var dd_s = String(sunday.getDate()).padStart(2, '0');
    var firstDay = yyyy_s + '-' + mm_s + '-' + dd_s;
    
    var todayDate = new Date();
    var yyyy_t = todayDate.getFullYear();
    var mm_t = String(todayDate.getMonth() + 1).padStart(2, '0');
    var dd_t = String(todayDate.getDate()).padStart(2, '0');
    var today = yyyy_t + '-' + mm_t + '-' + dd_t;

    $('#activity-date-from').val(firstDay);
    $('#activity-date-to').val(today);

    // Event listener for date range filters
    $(document).off('change', '#activity-date-from, #activity-date-to').on('change', '#activity-date-from, #activity-date-to', function () {
      loadRecentEvents();
    });

    loadStats();
  }

  function render() {
    var t = App.i18n.t.bind(App.i18n);
    $('#page-content').html(`
      <div class="page-header">
        <div>
          <h2>📊 ${t('dashboard')}</h2>
          <p class="page-subtitle">Welcome back, <strong>${App.auth.getUser().name}</strong>! Here's what's happening.</p>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="live-dot"></span>
          <span style="font-size:0.82rem;color:var(--text-muted);font-weight:600">${t('live_stats')}</span>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid" id="stats-grid">
        ${statSkeleton('purple','👥',t('total_influencers'),'influencers')}
        ${statSkeleton('coral','📦',t('total_products'),'products')}
        ${statSkeleton('green','🔗',t('total_campaigns'),'campaigns')}
        ${statSkeleton('amber','👆',t('total_clicks'),'clicks')}
        ${statSkeleton('blue','✅',t('total_conversions'),'conversions')}
        ${statSkeleton('rose','📊',t('conversion_rate'),'conversion_rate')}
      </div>

      <!-- Charts row -->
      <div class="grid-2" style="margin-bottom:24px">
        <div class="card">
          <div class="card-header"><span class="card-title">📈 Clicks vs Conversions (30 days)</span></div>
          <div class="card-body" style="height:260px">
            <canvas id="chart-daily"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">🏆 ${t('top_influencers')}</span></div>
          <div class="card-body" id="top-influencers-list" style="padding:12px">
            <div class="page-loader"><div class="spinner"></div></div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="card-title">⚡ ${t('recent_activity')}</span>
            <span class="badge badge-primary" id="activity-count">Loading…</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;font-size:0.85rem">
            <span style="font-weight:600;color:var(--text-secondary)">Date:</span>
            <input type="date" id="activity-date-from" class="form-control" style="font-size:0.82rem;padding:4px 8px;width:135px;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text)">
            <span style="color:var(--text-muted)">—</span>
            <input type="date" id="activity-date-to" class="form-control" style="font-size:0.82rem;padding:4px 8px;width:135px;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text)">
          </div>
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper">
            <table id="tbl-recent-events" class="dataTable" style="width:100%">
              <thead>
                <tr>
                  <th>Time</th><th>Type</th><th>Campaign</th>
                  <th>Influencer</th><th>Visitor</th><th>Promo</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  }

  function statSkeleton(color, icon, label, key) {
    return `
      <div class="stat-card ${color}">
        <div class="stat-icon">${icon}</div>
        <div class="stat-info">
          <div class="stat-value counter-anim" id="stat-${key}"><span class="spinner" style="width:18px;height:18px;border-width:2px"></span></div>
          <div class="stat-label">${label}</div>
        </div>
      </div>`;
  }

  function loadStats() {
    // Load overview
    App.api.analytics.overview()
      .done(function (res) {
        var d = res.data;
        animateCounter('stat-influencers',    d.total_influencers);
        animateCounter('stat-products',       d.total_products);
        animateCounter('stat-campaigns',      d.total_campaigns);
        animateCounter('stat-clicks',         d.total_clicks);
        animateCounter('stat-conversions',    d.total_conversions);
        $('#stat-conversion_rate').text(d.conversion_rate + '%');
      })
      .fail(App.api.handleError);

    // Load chart
    App.api.analytics.chartDaily(30).done(loadChart).fail(App.api.handleError);

    // Load top influencers
    App.api.analytics.byInfluencer()
      .done(function (res) {
        var rows = res.data.slice(0, 5);
        var html = rows.length === 0
          ? '<div class="empty-state" style="padding:20px"><p>No data yet</p></div>'
          : rows.map(function (r, i) {
              var bar = r.total_conversions > 0
                ? Math.round((r.total_conversions / (rows[0].total_conversions || 1)) * 100)
                : 0;
              return `
                <div style="padding:10px 12px;border-radius:10px;margin-bottom:8px;background:var(--table-stripe)">
                  <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                    <span style="font-weight:800;color:var(--primary);width:20px;text-align:center">#${i+1}</span>
                    <span style="font-weight:600;font-size:0.9rem">${r.name}</span>
                    <span class="badge badge-muted" style="font-size:0.7rem">${r.platform}</span>
                    <span style="margin-left:auto;font-size:0.8rem;color:var(--success);font-weight:700">${r.total_conversions} conv.</span>
                  </div>
                  <div class="progress"><div class="progress-bar" style="width:${bar}%"></div></div>
                </div>`;
            }).join('');
        $('#top-influencers-list').html(html);
      })
      .fail(App.api.handleError);

    // Load recent events
    loadRecentEvents();

    // Auto-refresh every 30s
    if (_liveInterval) clearInterval(_liveInterval);
    _liveInterval = setInterval(function(){ loadStats(); }, 30000);
  }

  function loadRecentEvents() {
    var dateFrom = $('#activity-date-from').val() || '';
    var dateTo = $('#activity-date-to').val() || '';

    App.api.analytics.recentEvents(100, dateFrom, dateTo)
      .done(function (res) {
        var events = res.data;
        $('#activity-count').text(events.length + (dateFrom ? ' filtered' : ' recent'));

        if (_recentTable) {
          // Update data smoothly without destroying the DOM structure
          _recentTable.clear().rows.add(events).draw(false);
        } else {
          _recentTable = $('#tbl-recent-events').DataTable({
            data: events,
            paging: true,
            searching: true,
            info: true,
            pageLength: 10,
            order: [[0, 'desc']],
            columns: [
              { 
                data: 'timestamp', 
                render: function(d, type){ 
                  if (type === 'sort' || type === 'type') {
                    return d ? new Date(d).getTime() : 0;
                  }
                  return d ? new Date(d).toLocaleString() : '—'; 
                }
              },
              { data: 'type', render: function(d){
                  var cls = {click:'badge-info',conversion:'badge-success',skip:'badge-muted'};
                  return '<span class="badge '+cls[d]+'">' + d + '</span>';
                }
              },
              { data: 'product_name' },
              { data: 'influencer_name' },
              { data: 'visitor_name', render: function(d){ return d || '<span class="badge badge-muted">Anonymous</span>'; }},
              { data: 'promo_entered', render: function(d){ return d ? '<code style="background:var(--badge-bg);padding:2px 6px;border-radius:4px">'+d+'</code>' : '—'; }},
            ]
          });
        }
      })
      .fail(App.api.handleError);
  }

  function loadChart(res) {
    var ctx = document.getElementById('chart-daily');
    if (!ctx) return;
    var data  = res.data;
    var labels = data.map(function(r){ return r.date; });
    var clicks = data.map(function(r){ return parseInt(r.clicks); });
    var convs  = data.map(function(r){ return parseInt(r.conversions); });

    if (window._dashChart) window._dashChart.destroy();
    window._dashChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Clicks',      data: clicks, borderColor: '#6C63FF', backgroundColor: 'rgba(108,99,255,0.08)', fill: true, tension: 0.4, pointRadius: 3 },
          { label: 'Conversions', data: convs,  borderColor: '#FF6584', backgroundColor: 'rgba(255,101,132,0.08)', fill: true, tension: 0.4, pointRadius: 3 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } }
        }
      }
    });
  }

  function animateCounter(id, end) {
    var $el  = $('#' + id);
    var start = 0;
    var duration = 1000;
    var step = Math.ceil(end / (duration / 16));
    var timer = setInterval(function () {
      start = Math.min(start + step, end);
      $el.text(start.toLocaleString());
      if (start >= end) clearInterval(timer);
    }, 16);
  }

  function destroy() {
    if (_liveInterval) {
      clearInterval(_liveInterval);
      _liveInterval = null;
    }
  }

  return { init, destroy };
}(jQuery));
