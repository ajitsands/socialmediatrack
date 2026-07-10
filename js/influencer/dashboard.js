/**
 * Influencer — Dashboard Module
 */
window.App = window.App || {};
App.Influencer = App.Influencer || {};

App.Influencer.Dashboard = (function ($) {
  'use strict';

  var _liveInterval = null;

  function init() {
    if (!App.auth.requireAuth('influencer')) return;
    render();
    loadStats();
    loadPointsInfo();
  }

  function render() {
    var t = App.i18n.t.bind(App.i18n);
    var user = App.auth.getUser();
    $('#page-content').html(`
      <div class="page-header">
        <div>
          <h2>👋 Welcome, ${user.name}!</h2>
          <p class="page-subtitle">Here's your performance overview</p>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="live-dot"></span>
          <span style="font-size:0.82rem;color:var(--text-muted);font-weight:600">${t('live_stats')}</span>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid" style="margin-bottom:24px">
        <div class="stat-card purple">
          <div class="stat-icon">🔗</div>
          <div class="stat-info">
            <div class="stat-value" id="inf-stat-campaigns">—</div>
            <div class="stat-label">Active Campaigns</div>
          </div>
        </div>
        <div class="stat-card amber">
          <div class="stat-icon">👆</div>
          <div class="stat-info">
            <div class="stat-value" id="inf-stat-clicks">—</div>
            <div class="stat-label">${t('total_clicks')}</div>
          </div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-value" id="inf-stat-convs">—</div>
            <div class="stat-label">${t('total_conversions')}</div>
          </div>
        </div>
        <div class="stat-card coral">
          <div class="stat-icon">📊</div>
          <div class="stat-info">
            <div class="stat-value" id="inf-stat-rate">—</div>
            <div class="stat-label">${t('conversion_rate')}</div>
          </div>
        </div>
      </div>

      <!-- Earnings Row -->
      <div class="grid-2" style="margin-bottom:24px">
        <div class="card" style="background:linear-gradient(135deg,#6C63FF,#FF6584);color:#fff;border:none">
          <div class="card-body">
            <div style="font-size:0.85rem;font-weight:600;opacity:0.85;margin-bottom:8px">🎯 Total Points Earned</div>
            <div style="font-size:2.5rem;font-weight:800;line-height:1" id="inf-points">—</div>
            <div style="font-size:0.8rem;opacity:0.8;margin-top:8px" id="inf-cpp-hint">— conversions = 1 point</div>
          </div>
        </div>
        <div class="card" style="background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none">
          <div class="card-body">
            <div style="font-size:0.85rem;font-weight:600;opacity:0.85;margin-bottom:8px">💰 ${t('wallet_balance')}</div>
            <div style="font-size:2.5rem;font-weight:800;line-height:1" id="inf-earnings">—</div>
            <div style="font-size:0.8rem;opacity:0.8;margin-top:8px" id="inf-paid-hint">— paid out</div>
          </div>
        </div>
      </div>

      <!-- My Campaigns Quick View -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">🔗 My Active Campaigns</span>
          <a href="#/influencer/campaigns" class="btn btn-secondary btn-sm">View All →</a>
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:12px">
            <table id="tbl-inf-dash-campaigns" class="dataTable" style="width:100%">
              <thead>
                <tr><th>Product</th><th>Platform</th><th>Offer Code</th><th>Clicks</th><th>Conversions</th><th>Link</th></tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  }

  function loadStats() {
    App.api.analytics.overview().done(function(res){
      var d = res.data;
      animateCounter('inf-stat-campaigns', d.total_campaigns);
      animateCounter('inf-stat-clicks',    d.total_clicks);
      animateCounter('inf-stat-convs',     d.total_conversions);
      $('#inf-stat-rate').text((d.conversion_rate||0) + '%');
    });

    App.api.campaigns.list().done(function(res){
      var dt = $('#tbl-inf-dash-campaigns');
      if ($.fn.DataTable.isDataTable(dt)) dt.DataTable().destroy();
      dt.DataTable({
        data: res.data.filter(function(c){ return c.status==='active'; }).slice(0,10),
        paging: false, info: false, searching: false,
        columns: [
          { data: 'product_name', render: function(d,t,r){ return `<strong>${d}</strong><br><small class="badge badge-muted">${r.product_category||''}</small>`; }},
          { data: 'platform', render: function(d){
              var icons = {instagram:'📸',tiktok:'🎵',youtube:'▶️',facebook:'👍',twitter:'🐦',other:'🌐'};
              var icon = icons[d] || '🌐';
              return `<span class="badge platform-${d}" style="font-size:0.8rem">${icon} ${(d||'').toUpperCase()}</span>`;
            }
          },
          { data: 'offer_code', render: function(d){ return `<code style="background:var(--badge-bg);padding:3px 8px;border-radius:6px;font-weight:700;color:var(--primary)">${d}</code>`; }},
          { data: 'total_clicks',      render: function(d){ return `<span style="color:var(--info);font-weight:700">${d}</span>`; }},
          { data: 'total_conversions', render: function(d){ return `<span style="color:var(--success);font-weight:700">${d}</span>`; }},
          { data: null, orderable:false, render: function(d,t,r){
              var url = 'landing.php?ref=' + encodeURIComponent(r.ref_token);
              var icons = {instagram:'📸',tiktok:'🎵',youtube:'▶️',facebook:'👍',twitter:'🐦',other:'🌐'};
              var icon = icons[r.platform] || '🌐';
              return `<button class="btn btn-secondary btn-sm btn-copy-dash-link" data-link="${url}">${icon} 📋 Copy</button>`;
            }
          },
        ]
      });
    });

    // Auto-refresh every 30s
    if (_liveInterval) clearInterval(_liveInterval);
    _liveInterval = setInterval(loadStats, 30000);
  }

  function loadPointsInfo() {
    App.api.points.myPoints().done(function(res){
      var d = res.data;
      animateCounter('inf-points', d.total_points);
      $('#inf-earnings').text(d.currency + ' ' + parseFloat(d.pending_amount||0).toFixed(3));
      $('#inf-cpp-hint').html(`${d.clicks_per_point} clicks = 1 pt | ${d.conversions_per_point} convs = 1 pt`);
      $('#inf-paid-hint').text(d.currency + ' ' + parseFloat(d.paid_amount||0).toFixed(3) + ' paid out');
    });
  }

  function animateCounter(id, end) {
    var $el = $('#' + id);
    var start = 0; var duration = 1000;
    var step = Math.ceil(end / (duration / 16));
    var timer = setInterval(function(){
      start = Math.min(start + step, end);
      $el.text(start.toLocaleString());
      if (start >= end) clearInterval(timer);
    }, 16);
  }

  // Bind copy links
  $(document).on('click', '.btn-copy-dash-link', function(){
    var link = $(this).data('link');
    navigator.clipboard.writeText(window.location.origin + window.location.pathname.replace('index.php','') + link).then(function(){
      Swal.fire({ icon:'success', title:'Link Copied!', showConfirmButton:false, timer:1200 });
    }).catch(function(){ prompt('Copy:', link); });
  });

  return { init };
}(jQuery));

/**
 * Influencer — Campaigns Module
 */
App.Influencer.Campaigns = (function ($) {
  'use strict';
  var _dt = null;

  function init() {
    if (!App.auth.requireAuth('influencer')) return;
    renderPage();
    loadCampaigns();
  }

  function renderPage() {
    $('#page-content').html(`
      <div class="page-header">
        <div><h2>🔗 My Campaigns</h2><p class="page-subtitle">All your active tracking links</p></div>
      </div>
      <div class="card">
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-my-campaigns" class="dataTable" style="width:100%">
              <thead>
                <tr><th>#</th><th>Product</th><th>Platform</th><th>Offer Code</th><th>Discount</th><th>Clicks</th><th>Conversions</th><th>Rate</th><th>Status</th><th>Link</th></tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  }

  function loadCampaigns() {
    App.api.campaigns.list().done(function(res){
      if (_dt) { _dt.destroy(); _dt = null; }
      _dt = $('#tbl-my-campaigns').DataTable({
        data: res.data,
        pageLength: 15,
        order: [[0,'desc']],
        columns: [
          { data: null, render: function(d,t,r,m){ return m.row+1; }, orderable:false },
          { data: 'product_name', render: function(d,t,r){ return `<strong>${d}</strong><br><small class="badge badge-muted">${r.product_category||''}</small>`; }},
          { data: 'platform', render: function(d){
              var icons = {instagram:'📸',tiktok:'🎵',youtube:'▶️',facebook:'👍',twitter:'🐦',other:'🌐'};
              var icon = icons[d] || '🌐';
              return `<span class="badge platform-${d}">${icon} ${(d||'').toUpperCase()}</span>`;
            }
          },
          { data: 'offer_code', render: function(d){ return `<code style="background:var(--badge-bg);padding:4px 10px;border-radius:6px;font-weight:800;color:var(--primary);font-size:0.9rem">${d}</code>`; }},
          { data: 'discount_value', render: function(d,t,r){
              if (!d||d==0) return '<span class="badge badge-muted">None</span>';
              return `<span class="badge badge-accent">${r.discount_type==='percent'?d+'%':'BHD '+d} OFF</span>`;
            }
          },
          { data: 'total_clicks',      render: function(d){ return `<span style="color:var(--info);font-weight:700">${d}</span>`; }},
          { data: 'total_conversions', render: function(d){ return `<span style="color:var(--success);font-weight:700">${d}</span>`; }},
          { data: null, render: function(d,t,r){
              var rate = r.total_clicks>0?((r.total_conversions/r.total_clicks)*100).toFixed(1):0;
              return `<span style="font-weight:700;color:${rate>=10?'var(--success)':rate>=5?'var(--warning)':'var(--danger)'}">${rate}%</span>`;
            }
          },
          { data: 'status', render: function(d,t,r){
              if (d === 'expired') {
                return '<span class="badge badge-danger">Expired</span>';
              }
              var checked = d === 'active' ? 'checked' : '';
              return `
                <div style="display:flex;align-items:center;gap:8px">
                  <label class="switch-toggle" style="cursor:pointer">
                    <input type="checkbox" class="toggle-camp-status" data-id="${r.id}" ${checked}>
                    <span class="switch-slider"></span>
                  </label>
                  <span style="font-size:0.8rem;font-weight:600;color:${d==='active'?'#22C55E':'#F59E0B'}">${d==='active'?'Running':'Not Running'}</span>
                </div>
              `;
            }
          },
          { data: null, orderable:false, render: function(d,t,r){
              var url = 'landing.php?ref=' + encodeURIComponent(r.ref_token);
              var icons = {instagram:'📸',tiktok:'🎵',youtube:'▶️',facebook:'👍',twitter:'🐦',other:'🌐'};
              var icon = icons[r.platform] || '🌐';
              return `<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start">
                <span class="badge platform-${r.platform}" style="font-size:0.75rem;margin-bottom:2px">${icon} ${(r.platform||'').toUpperCase()}</span>
                <button class="btn btn-primary btn-sm btn-copy-camp-link" data-link="${url}">📋 Copy Link</button>
              </div>`;
            }
          },
        ]
      });
    }).fail(App.api.handleError);
  }

  $(document).on('change', '.toggle-camp-status', function () {
    var $chk = $(this);
    var id = $chk.data('id');
    var isRunning = $chk.is(':checked');
    var newStatus = isRunning ? 'active' : 'paused';

    App.api.campaigns.updateStatus({ id: id, status: newStatus })
      .done(function (res) {
        Swal.fire({ icon: 'success', title: 'Campaign Status Updated', showConfirmButton: false, timer: 1000 });
        loadCampaigns();
      })
      .fail(function (err) {
        $chk.prop('checked', !isRunning);
        App.api.handleError(err);
      });
  });

  $(document).on('click','.btn-copy-camp-link', function(){
    var link = window.location.origin + window.location.pathname.replace('index.php','') + $(this).data('link');
    navigator.clipboard.writeText(link).then(function(){ Swal.fire({icon:'success',title:'Link Copied!',showConfirmButton:false,timer:1200}); }).catch(function(){ prompt('Copy link:', link); });
  });

  return { init };
}(jQuery));

/**
 * Influencer — Wallet Module
 */
App.Influencer.Wallet = (function ($) {
  'use strict';

  function init() {
    if (!App.auth.requireAuth('influencer')) return;
    renderPage();
    loadWallet();
  }

  function renderPage() {
    var t = App.i18n.t.bind(App.i18n);
    $('#page-content').html(`
      <div class="page-header">
        <div><h2>💰 ${t('my_wallet')}</h2><p class="page-subtitle">Your points and earnings summary</p></div>
      </div>

      <!-- Wallet Cards -->
      <div class="stats-grid" style="margin-bottom:24px">
        <div class="stat-card amber"><div class="stat-icon">👆</div><div class="stat-info"><div class="stat-value" id="wlt-clicks">—</div><div class="stat-label">Total Clicks</div></div></div>
        <div class="stat-card purple"><div class="stat-icon">✅</div><div class="stat-info"><div class="stat-value" id="wlt-convs">—</div><div class="stat-label">Total Conversions</div></div></div>
        <div class="stat-card blue"><div class="stat-icon">🎯</div><div class="stat-info"><div class="stat-value" id="wlt-pts">—</div><div class="stat-label">Total Points</div></div></div>
        <div class="stat-card coral"><div class="stat-icon">⏳</div><div class="stat-info"><div class="stat-value" id="wlt-pending">—</div><div class="stat-label">Pending Amount</div></div></div>
        <div class="stat-card green"><div class="stat-icon">💵</div><div class="stat-info"><div class="stat-value" id="wlt-paid">—</div><div class="stat-label">Paid Amount</div></div></div>
      </div>

      <!-- Earning Info -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-body">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <span style="font-size:1.5rem">💡</span>
            <div>
              <div style="font-weight:700;font-size:1rem">How you earn</div>
              <div style="color:var(--text-secondary)" id="earn-formula">Loading...</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Transaction History -->
      <div class="card">
        <div class="card-header"><span class="card-title">📋 ${t('transaction_history')}</span></div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-my-txns" class="dataTable" style="width:100%">
              <thead>
                <tr><th>#</th><th>Points</th><th>Amount</th><th>Type</th><th>Status</th><th>Note</th><th>Date</th></tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  }

  function loadWallet() {
    App.api.points.myPoints().done(function(res){
      var d = res.data;
      $('#wlt-clicks').text(d.total_clicks);
      $('#wlt-convs').text(d.total_conversions);
      $('#wlt-pts').text(d.total_points);
      $('#wlt-pending').text(d.currency + ' ' + parseFloat(d.pending_amount||0).toFixed(3));
      $('#wlt-paid').text(d.currency + ' ' + parseFloat(d.paid_amount||0).toFixed(3));
      $('#earn-formula').html(`
        - <strong>${d.clicks_per_point} clicks</strong> = 1 point = <strong>${parseFloat(d.click_value_per_point).toFixed(3)} ${d.currency}</strong><br>
        - <strong>${d.conversions_per_point} conversions</strong> = 1 point = <strong>${parseFloat(d.value_per_point).toFixed(3)} ${d.currency}</strong>
      `);
    });

    App.api.wallet.myTransactions().done(function(res){
      var dt = $('#tbl-my-txns');
      if ($.fn.DataTable.isDataTable(dt)) dt.DataTable().destroy();
      dt.DataTable({
        data: res.data,
        pageLength: 15,
        order: [[6,'desc']],
        columns: [
          { data: null, render: function(d,t,r,m){ return m.row+1; }, orderable:false },
          { data: 'points', render: function(d){ return d>0?`🎯 ${parseFloat(d).toFixed(2)}`:'—'; }},
          { data: 'amount', render: function(d){ return `<strong>${parseFloat(d).toFixed(3)}</strong>`; }},
          { data: 'type', render: function(d){ return d==='credit'?`<span class="badge badge-success">➕ Credit</span>`:`<span class="badge badge-danger">➖ Debit</span>`; }},
          { data: 'status', render: function(d){ return d==='paid'?`<span class="badge badge-success">Paid</span>`:`<span class="badge badge-warning">Pending</span>`; }},
          { data: 'note', render: function(d){ return d||'—'; }},
          { data: 'created_at', render: function(d){ return d?new Date(d).toLocaleDateString():'—'; }},
        ]
      });
    });
  }

  return { init };
}(jQuery));
