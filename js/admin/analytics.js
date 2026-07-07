/**
 * Admin — Analytics Module
 */
window.App = window.App || {};
App.Admin = App.Admin || {};

App.Admin.Analytics = (function ($) {
  'use strict';

  function init() {
    if (!App.auth.requireAuth('admin')) return;
    render();
    loadAll();
    bindEvents();
  }

  function render() {
    $('#page-content').html(`
      <div class="page-header">
        <div><h2>📈 Analytics</h2><p class="page-subtitle">Track performance across all campaigns</p></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm tab-analytics-btn active" data-tab="campaigns">By Campaign</button>
          <button class="btn btn-secondary btn-sm tab-analytics-btn" data-tab="influencers">By Influencer</button>
          <button class="btn btn-secondary btn-sm tab-analytics-btn" data-tab="products">By Product</button>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="stats-grid" style="margin-bottom:24px" id="analytics-stats">
        <div class="stat-card purple"><div class="stat-icon">👆</div><div class="stat-info"><div class="stat-value" id="an-clicks">—</div><div class="stat-label">Total Clicks</div></div></div>
        <div class="stat-card green"><div class="stat-icon">✅</div><div class="stat-info"><div class="stat-value" id="an-convs">—</div><div class="stat-label">Total Conversions</div></div></div>
        <div class="stat-card amber"><div class="stat-icon">⏭️</div><div class="stat-info"><div class="stat-value" id="an-skips">—</div><div class="stat-label">Skips</div></div></div>
        <div class="stat-card coral"><div class="stat-icon">📊</div><div class="stat-info"><div class="stat-value" id="an-rate">—</div><div class="stat-label">Conversion Rate</div></div></div>
      </div>

      <!-- Chart -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-header">
          <span class="card-title">📆 Daily Performance</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-secondary chart-range-btn active" data-days="7">7D</button>
            <button class="btn btn-sm btn-secondary chart-range-btn" data-days="30">30D</button>
            <button class="btn btn-sm btn-secondary chart-range-btn" data-days="90">90D</button>
          </div>
        </div>
        <div class="card-body" style="height:280px">
          <canvas id="analytics-chart"></canvas>
        </div>
      </div>

      <!-- Data Tables -->
      <div class="card" id="analytics-tab-campaigns" style="display:block">
        <div class="card-header"><span class="card-title">📋 Campaign Analytics</span></div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-analytics-campaigns" class="dataTable" style="width:100%">
              <thead>
                <tr><th>#</th><th>Campaign Code</th><th>Product</th><th>Influencer</th><th>Clicks</th><th>Conversions</th><th>Skips</th><th>Conv. Rate</th><th>Status</th></tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card" id="analytics-tab-influencers" style="display:none">
        <div class="card-header"><span class="card-title">⭐ Influencer Analytics</span></div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-analytics-influencers" class="dataTable" style="width:100%">
              <thead>
                <tr><th>#</th><th>Influencer</th><th>Platform</th><th>Campaigns</th><th>Clicks</th><th>Conversions</th><th>Skips</th><th>Conv. Rate</th></tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card" id="analytics-tab-products" style="display:none">
        <div class="card-header"><span class="card-title">📦 Product Analytics</span></div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-analytics-products" class="dataTable" style="width:100%">
              <thead>
                <tr><th>#</th><th>Product</th><th>Category</th><th>Price</th><th>Campaigns</th><th>Clicks</th><th>Conversions</th><th>Conv. Rate</th></tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  }

  function loadAll() {
    // Load overview stats
    App.api.analytics.overview().done(function(res){
      var d = res.data;
      $('#an-clicks').text(parseInt(d.total_clicks||0).toLocaleString());
      $('#an-convs').text(parseInt(d.total_conversions||0).toLocaleString());
      $('#an-skips').text(parseInt(d.total_skips||0).toLocaleString());
      $('#an-rate').text((d.conversion_rate||0) + '%');
    });

    // Chart
    loadChart(7);

    // Campaign analytics
    App.api.analytics.byCampaign().done(function(res){
      var dt = $('#tbl-analytics-campaigns');
      if ($.fn.DataTable.isDataTable(dt)) dt.DataTable().destroy();
      dt.DataTable({
        data: res.data, pageLength: 15, order: [[4,'desc']],
        columns: [
          { data: null, render: function(d,t,r,m){ return m.row+1; }, orderable:false },
          { data: 'offer_code', render: function(d){ return `<code style="background:var(--badge-bg);padding:3px 8px;border-radius:6px;font-weight:700;color:var(--primary)">${d}</code>`; }},
          { data: 'product_name' },
          { data: 'influencer_name' },
          { data: 'total_clicks',       render: function(d){ return `<strong style="color:var(--info)">${d}</strong>`; }},
          { data: 'total_conversions',  render: function(d){ return `<strong style="color:var(--success)">${d}</strong>`; }},
          { data: 'total_skips',        render: function(d){ return `<strong style="color:var(--text-muted)">${d}</strong>`; }},
          { data: null, render: function(d,t,r){
              var rate = r.total_clicks > 0 ? ((r.total_conversions/r.total_clicks)*100).toFixed(1) : 0;
              var color = rate >= 10 ? 'var(--success)' : rate >= 5 ? 'var(--warning)' : 'var(--danger)';
              return `<span style="color:${color};font-weight:700">${rate}%</span>`;
            }
          },
          { data: 'status', render: function(d){ var cls={active:'badge-success',paused:'badge-warning',expired:'badge-danger'}; return `<span class="badge ${cls[d]||'badge-muted'}">${d}</span>`; }},
        ]
      });
    });

    // Influencer analytics
    App.api.analytics.byInfluencer().done(function(res){
      var dt = $('#tbl-analytics-influencers');
      if ($.fn.DataTable.isDataTable(dt)) dt.DataTable().destroy();
      dt.DataTable({
        data: res.data, pageLength: 15, order: [[4,'desc']],
        columns: [
          { data: null, render: function(d,t,r,m){ return m.row+1; }, orderable:false },
          { data: 'name', render: function(d,t,r){ return `<strong>${d}</strong><br><small style="color:var(--text-muted)">${r.social_handle||''}</small>`; }},
          { data: 'platform', render: function(d){ return `<span class="badge platform-${d}">${d}</span>`; }},
          { data: 'campaigns' },
          { data: 'total_clicks',      render: function(d){ return `<strong style="color:var(--info)">${d}</strong>`; }},
          { data: 'total_conversions', render: function(d){ return `<strong style="color:var(--success)">${d}</strong>`; }},
          { data: 'total_skips' },
          { data: null, render: function(d,t,r){
              var rate = r.total_clicks > 0 ? ((r.total_conversions/r.total_clicks)*100).toFixed(1) : 0;
              var color = rate >= 10 ? 'var(--success)' : rate >= 5 ? 'var(--warning)' : 'var(--danger)';
              return `<span style="color:${color};font-weight:700">${rate}%</span>`;
            }
          },
        ]
      });
    });

    // Product analytics
    App.api.analytics.byProduct().done(function(res){
      var dt = $('#tbl-analytics-products');
      if ($.fn.DataTable.isDataTable(dt)) dt.DataTable().destroy();
      dt.DataTable({
        data: res.data, pageLength: 15, order: [[5,'desc']],
        columns: [
          { data: null, render: function(d,t,r,m){ return m.row+1; }, orderable:false },
          { data: 'name' },
          { data: 'category', render: function(d){ return `<span class="badge badge-primary">${d}</span>`; }},
          { data: 'price', render: function(d,t,r){ return r.currency+' '+parseFloat(d).toFixed(3); }},
          { data: 'campaigns' },
          { data: 'total_clicks',      render: function(d){ return `<strong style="color:var(--info)">${d}</strong>`; }},
          { data: 'total_conversions', render: function(d){ return `<strong style="color:var(--success)">${d}</strong>`; }},
          { data: null, render: function(d,t,r){
              var rate = r.total_clicks > 0 ? ((r.total_conversions/r.total_clicks)*100).toFixed(1) : 0;
              return `<span style="font-weight:700;color:${rate>=10?'var(--success)':rate>=5?'var(--warning)':'var(--danger)'}">${rate}%</span>`;
            }
          },
        ]
      });
    });
  }

  function loadChart(days) {
    App.api.analytics.chartDaily(days).done(function(res){
      var data   = res.data;
      var labels = data.map(function(r){ return r.date; });
      var clicks = data.map(function(r){ return parseInt(r.clicks); });
      var convs  = data.map(function(r){ return parseInt(r.conversions); });
      var ctx = document.getElementById('analytics-chart');
      if (!ctx) return;
      if (window._analyticsChart) window._analyticsChart.destroy();
      window._analyticsChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            { label: 'Clicks', data: clicks, backgroundColor: 'rgba(108,99,255,0.6)', borderColor: '#6C63FF', borderWidth: 1, borderRadius: 4 },
            { label: 'Conversions', data: convs, backgroundColor: 'rgba(34,197,94,0.6)', borderColor: '#22c55e', borderWidth: 1, borderRadius: 4 },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
        }
      });
    });
  }

  function bindEvents() {
    $(document).on('click', '.tab-analytics-btn', function(){
      var tab = $(this).data('tab');
      $('.tab-analytics-btn').removeClass('active');
      $(this).addClass('active');
      $('#analytics-tab-campaigns, #analytics-tab-influencers, #analytics-tab-products').hide();
      $('#analytics-tab-' + tab).show();
      // Re-draw DataTable
      var tableId = '#tbl-analytics-' + tab;
      if ($.fn.DataTable.isDataTable(tableId)) { $(tableId).DataTable().columns.adjust().draw(); }
    });

    $(document).on('click', '.chart-range-btn', function(){
      var days = $(this).data('days');
      $('.chart-range-btn').removeClass('active');
      $(this).addClass('active');
      loadChart(days);
    });
  }

  return { init };
}(jQuery));
