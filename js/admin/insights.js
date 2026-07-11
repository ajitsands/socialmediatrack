/**
 * Admin — Transaction Insights Module
 */
window.App = window.App || {};
App.Admin = App.Admin || {};

App.Admin.Insights = (function ($) {
  'use strict';

  var _dtTx = null;
  var _dtInfluencers = null;
  var _dtClients = null;

  var eventTypeLabels = {
    click: '👆 Click',
    conversion: '✅ Lead'
  };

  function init() {
    if (!App.auth.requireAuth('admin')) return;
    _dtTx = null;
    _dtInfluencers = null;
    _dtClients = null;
    render();

    // Default date range: current month (1st of month to today)
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    $('#insights-date-from').val(y + '-' + m + '-01');
    $('#insights-date-to').val(y + '-' + m + '-' + d);

    loadFilters();
    loadData();
    bindEvents();
  }

  function render() {
    $('#page-content').html(`
      <div class="page-header">
        <div>
          <h2>💡 Transaction Insights & Profitability</h2>
          <p class="page-subtitle">Full dashboard tracking active campaigns, vendor cuts, influencer payouts, and net admin profit.</p>
        </div>
      </div>

      <!-- Filters Panel -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-body" style="padding:16px; display:flex; gap:16px; flex-wrap:wrap; align-items:flex-end">
          <div class="form-group" style="margin:0; width:150px">
            <label class="form-label" style="font-size:0.75rem; font-weight:700">From Date</label>
            <input type="date" id="insights-date-from" class="form-control" style="font-size:0.85rem; padding:6px 12px">
          </div>
          <div class="form-group" style="margin:0; width:150px">
            <label class="form-label" style="font-size:0.75rem; font-weight:700">To Date</label>
            <input type="date" id="insights-date-to" class="form-control" style="font-size:0.85rem; padding:6px 12px">
          </div>
          <div class="form-group" style="margin:0; width:200px">
            <label class="form-label" style="font-size:0.75rem; font-weight:700">Filter Client (Vendor)</label>
            <select id="insights-filter-client" class="form-control" style="font-size:0.85rem; padding:6px 12px">
              <option value="0">All Clients</option>
            </select>
          </div>
          <div class="form-group" style="margin:0; width:200px">
            <label class="form-label" style="font-size:0.75rem; font-weight:700">Filter Influencer</label>
            <select id="insights-filter-influencer" class="form-control" style="font-size:0.85rem; padding:6px 12px">
              <option value="0">All Influencers</option>
            </select>
          </div>
          <button class="btn btn-secondary" id="btn-reset-insights" style="padding:8px 16px; font-size:0.85rem; height:36px; margin-right:auto">✕ Reset</button>
          
          <div class="form-group" style="margin:0; width:170px">
            <label class="form-label" style="font-size:0.75rem; font-weight:700; color:#319795">Total Active Influencers</label>
            <div id="insights-active-influencers-badge" class="form-control" style="font-size:0.9rem; font-weight:700; padding:6px 12px; background:#E6FFFA; border-color:#B2F5EA; color:#234E52; text-align:center; height:36px; line-height:22px">0</div>
          </div>
          <div class="form-group" style="margin:0; width:140px">
            <label class="form-label" style="font-size:0.75rem; font-weight:700; color:#3182CE">Total Active Clients</label>
            <div id="insights-active-clients-badge" class="form-control" style="font-size:0.9rem; font-weight:700; padding:6px 12px; background:#EBF8FF; border-color:#BEE3F8; color:#2B6CB0; text-align:center; height:36px; line-height:22px">0</div>
          </div>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="stats-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px">
        
        <div class="stat-card coral">
          <div class="stat-icon">🔗</div>
          <div class="stat-info">
            <div class="stat-value" id="kpi-running-campaigns">0</div>
            <div class="stat-label">Running Campaigns</div>
          </div>
        </div>

        <div class="stat-card blue">
          <div class="stat-icon">🏢</div>
          <div class="stat-info">
            <div class="stat-value" id="kpi-funded-clients" style="font-size:1.45rem">0.000<span style="font-size:0.7em; font-weight:500; margin-left:3px; opacity:0.8">BHD</span></div>
            <div class="stat-label">Total Clients Balance</div>
          </div>
        </div>

        <div class="stat-card green">
          <div class="stat-icon">📥</div>
          <div class="stat-info">
            <div class="stat-value" id="kpi-client-charge" style="font-size:1.45rem">0.000<span style="font-size:0.7em; font-weight:500; margin-left:3px; opacity:0.8">BHD</span></div>
            <div class="stat-label">Client Cuts Charged</div>
          </div>
        </div>

        <div class="stat-card rose">
          <div class="stat-icon">📤</div>
          <div class="stat-info">
            <div class="stat-value" id="kpi-influencer-payout" style="font-size:1.45rem">0.000<span style="font-size:0.7em; font-weight:500; margin-left:3px; opacity:0.8">BHD</span></div>
            <div class="stat-label">Payouts to Influencer</div>
          </div>
        </div>

        <div class="stat-card purple" style="border: 2px solid var(--primary-light)">
          <div class="stat-icon">👑</div>
          <div class="stat-info">
            <div class="stat-value" id="kpi-admin-profit" style="font-size:1.6rem; color:var(--primary)">0.000<span style="font-size:0.7em; font-weight:500; margin-left:3px; opacity:0.8">BHD</span></div>
            <div class="stat-label" style="font-weight:700">Admin Net Profit</div>
          </div>
        </div>

      </div>

      <!-- Detail tables grid -->
      <div class="grid-2" style="display:grid; grid-template-columns:1fr 2.2fr; gap:24px; margin-bottom:24px">
        
        <!-- Left: Influencers Earnings summary + Client Balances -->
        <div style="display:flex; flex-direction:column; gap:24px">
          
          <!-- Influencers Payouts table -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">⭐ Accumulated Influencer Payouts</span>
            </div>
            <div class="card-body" style="padding:0">
              <div class="table-wrapper" style="padding:16px">
                <table id="tbl-insights-influencers" class="dataTable" style="width:100%; font-size:0.85rem">
                  <thead>
                    <tr>
                      <th>Influencer</th>
                      <th>Clicks</th>
                      <th>Leads</th>
                      <th>Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colspan="4" style="text-align:center;padding:16px;color:var(--text-muted)">Loading influencer payouts...</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Client Balances table -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">🏢 Client Wallet Balances</span>
            </div>
            <div class="card-body" style="padding:0">
              <div class="table-wrapper" style="padding:16px">
                <table id="tbl-insights-clients" class="dataTable" style="width:100%; font-size:0.85rem">
                  <thead>
                    <tr>
                      <th>Vendor (Client)</th>
                      <th>Company</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colspan="3" style="text-align:center;padding:16px;color:var(--text-muted)">Loading client balances...</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        <!-- Right: Transaction statement list -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">📋 Full Insight of All Transactions</span>
          </div>
          <div class="card-body" style="padding:0">
            <div class="table-wrapper" style="padding:16px">
              <table id="tbl-insights-transactions" class="dataTable" style="width:100%; font-size:0.82rem">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Type</th>
                    <th>Vendor (Client)</th>
                    <th>Influencer</th>
                    <th>Campaign / Product</th>
                    <th>Client Cut</th>
                    <th>Influencer Cut</th>
                    <th>Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colspan="8" style="text-align:center;padding:16px;color:var(--text-muted)">Loading transactions...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    `);
  }

  function loadFilters() {
    // 1. Load clients
    App.api.clients.list().done(function(res){
      var select = $('#insights-filter-client');
      res.data.forEach(function(c){
        select.append(`<option value="${c.id}">${c.name}</option>`);
      });
    });

    // 2. Load influencers
    App.api.users.list().done(function(res){
      var select = $('#insights-filter-influencer');
      res.data.forEach(function(u){
        if (u.role === 'influencer') {
          select.append(`<option value="${u.id}">${u.name} (${u.social_handle || 'no handle'})</option>`);
        }
      });
    });
  }

  function loadData() {
    var dateFrom     = $('#insights-date-from').val();
    var dateTo       = $('#insights-date-to').val();
    var clientId     = $('#insights-filter-client').val();
    var influencerId = $('#insights-filter-influencer').val();

    if (_dtTx) { _dtTx.destroy(); _dtTx = null; }
    if (_dtInfluencers) { _dtInfluencers.destroy(); _dtInfluencers = null; }
    if (_dtClients) { _dtClients.destroy(); _dtClients = null; }

    App.api.analytics.insights(dateFrom, dateTo, clientId, influencerId)
      .done(function(res){
        var d = res.data;
        var s = d.stats;

        var formatBHD = function(val) {
          return parseFloat(val).toFixed(3) + '<span style="font-size:0.7em; font-weight:500; margin-left:3px; opacity:0.75">BHD</span>';
        };

        // Populate KPI stats
        $('#kpi-running-campaigns').text(s.running_campaigns);
        $('#kpi-funded-clients').html(formatBHD(s.total_clients_balance));
        $('#kpi-client-charge').html(formatBHD(s.total_client_charge));
        $('#kpi-influencer-payout').html(formatBHD(s.total_influencer_payout));
        
        var profitVal = parseFloat(s.total_admin_profit);
        var profitColor = profitVal >= 0 ? '#22C55E' : '#EF4444';
        $('#kpi-admin-profit').html(formatBHD(profitVal)).css('color', profitColor);

        $('#insights-active-influencers-badge').text(s.active_influencers);
        $('#insights-active-clients-badge').text(s.active_clients);

        // 1. Initialize Influencers Payouts DataTable
        _dtInfluencers = $('#tbl-insights-influencers').DataTable({
          data: d.influencers_summary,
          pageLength: 5,
          order: [[3, 'desc']],
          columns: [
            { data: 'name', render: function(d){ return `<strong>${d}</strong>`; } },
            { data: 'clicks', render: function(d){ return `<span style="color:var(--info);font-weight:600">${d}</span>`; } },
            { data: 'conversions', render: function(d){ return `<strong style="color:var(--success)">${d}</strong>`; } },
            { data: 'earnings', render: function(d){ return `<strong style="color:var(--accent)">${parseFloat(d).toFixed(3)} BHD</strong>`; } }
          ]
        });

        // 2. Initialize Client Balances DataTable
        _dtClients = $('#tbl-insights-clients').DataTable({
          data: d.clients_summary,
          pageLength: 5,
          order: [[2, 'desc']],
          columns: [
            { data: 'name', render: function(d){ return `<strong>${d}</strong>`; } },
            { data: 'company_category', render: function(d){ return d ? `<span class="badge" style="background:var(--badge-bg);color:var(--text-secondary)">${d}</span>` : '—'; } },
            { data: 'wallet_balance', render: function(d){
                var val = parseFloat(d);
                var color = val >= 0.100 ? '#22C55E' : '#EF4444';
                return `<strong style="color:${color}">${val.toFixed(3)} BHD</strong>`;
              } 
            }
          ]
        });

        // 3. Initialize Transactions DataTable
        _dtTx = $('#tbl-insights-transactions').DataTable({
          data: d.transactions,
          pageLength: 15,
          order: [[0, 'desc']],
          columns: [
            { 
              data: 'timestamp',
              render: function(d, type){
                if (type === 'sort' || type === 'type') return d ? new Date(d).getTime() : 0;
                return d ? `<strong>${new Date(d).toLocaleString()}</strong>` : '—';
              }
            },
            { 
              data: 'type',
              render: function(d){
                var isLead = d === 'conversion';
                var cls = isLead ? 'badge-success' : 'badge-primary';
                return `<span class="badge ${cls}">${eventTypeLabels[d] || d}</span>`;
              }
            },
            { data: 'client_name', render: function(d){ return `<strong>${d}</strong>`; } },
            { data: 'influencer_name', render: function(d){ return `<strong>${d}</strong>`; } },
            { data: 'product_name' },
            { data: 'client_cut', render: function(d){ return `<span style="font-weight:600;color:#22C55E">+${parseFloat(d).toFixed(3)}</span>`; } },
            { data: 'influencer_cut', render: function(d){ return `<span style="font-weight:600;color:#EF4444">-${parseFloat(d).toFixed(3)}</span>`; } },
            { 
              data: 'profit',
              render: function(d){
                var val = parseFloat(d);
                var color = val >= 0 ? 'var(--primary)' : '#EF4444';
                var prefix = val >= 0 ? '+' : '';
                return `<strong style="color:${color}">${prefix}${val.toFixed(3)}</strong>`;
              }
            }
          ]
        });
      })
      .fail(App.api.handleError);
  }

  function bindEvents() {
    $(document).off('change', '#insights-date-from, #insights-date-to, #insights-filter-client, #insights-filter-influencer')
               .on('change', '#insights-date-from, #insights-date-to, #insights-filter-client, #insights-filter-influencer', function(){
      loadData();
    });

    $(document).off('click', '#btn-reset-insights').on('click', '#btn-reset-insights', function(){
      var now = new Date();
      var y = now.getFullYear();
      var m = String(now.getMonth() + 1).padStart(2, '0');
      var d = String(now.getDate()).padStart(2, '0');
      $('#insights-date-from').val(y + '-' + m + '-01');
      $('#insights-date-to').val(y + '-' + m + '-' + d);

      $('#insights-filter-client').val('0');
      $('#insights-filter-influencer').val('0');
      loadData();
    });
  }

  return { init };
}(jQuery));
