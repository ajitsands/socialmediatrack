/**
 * Client Portal — Dashboard View
 * Features: KPIs summary, Product performance table, Influencer leaderboard, and filtered Visitor Leads lists.
 */
window.App = window.App || {};
App.Client = App.Client || {};

App.Client.Dashboard = (function ($) {
  'use strict';

  var _leadsTable = null;
  var platformIcons = { instagram:'📸 Instagram', tiktok:'🎵 TikTok', youtube:'▶️ YouTube', facebook:'👍 Facebook', twitter:'🐦 Twitter', other:'🌐 Other' };

  function init() {
    if (!App.auth.requireAuth('client')) return;
    renderLayout();
    loadOverview();
    loadProductsTable();
    loadInfluencersLeaderboard();
    loadLeadsFilter();
    loadLeadsLog();
    bindEvents();
  }

  function renderLayout() {
    $('#page-content').html(`
      <div class="page-header">
        <div>
          <h2>📊 Client Dashboard Overview</h2>
          <p class="page-subtitle">Track your active products, engaged influencers, lead lists, and real-time conversions.</p>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid grid-5" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px">
        <div class="kpi-card glass">
          <div class="kpi-icon" style="background:rgba(108,99,255,0.1);color:#6C63FF">💰</div>
          <div class="kpi-info">
            <div class="kpi-value" id="client-kpi-balance">-</div>
            <div class="kpi-label">Wallet Balance</div>
          </div>
        </div>
        <div class="kpi-card glass">
          <div class="kpi-icon" style="background:rgba(234,179,8,0.1);color:#EAB308">👥</div>
          <div class="kpi-info">
            <div class="kpi-value" id="client-kpi-influencers">-</div>
            <div class="kpi-label">Engaged Influencers</div>
          </div>
        </div>
        <div class="kpi-card glass">
          <div class="kpi-icon" style="background:rgba(59,130,246,0.1);color:#3B82F6">📦</div>
          <div class="kpi-info">
            <div class="kpi-value" id="client-kpi-products">-</div>
            <div class="kpi-label">Active Products</div>
          </div>
        </div>
        <div class="kpi-card glass">
          <div class="kpi-icon" style="background:rgba(16,185,129,0.1);color:#10B981">📈</div>
          <div class="kpi-info">
            <div class="kpi-value" id="client-kpi-clicks">-</div>
            <div class="kpi-label">Total Clicks</div>
          </div>
        </div>
        <div class="kpi-card glass">
          <div class="kpi-icon" style="background:rgba(239,68,68,0.1);color:#EF4444">🎯</div>
          <div class="kpi-info">
            <div class="kpi-value" id="client-kpi-conversions">-</div>
            <div class="kpi-label">Total Leads (Convs.)</div>
          </div>
        </div>
      </div>

      <div class="grid-2" style="display:grid; grid-template-columns: 1.5fr 1fr; gap: 24px; margin-bottom:24px">
        <!-- Products Performance Table -->
        <div class="card">
          <div class="card-header">
            <h3 style="font-size:1.1rem; margin:0">📦 Product-wise Performance</h3>
          </div>
          <div class="card-body" style="padding:0">
            <div class="table-wrapper">
              <table id="tbl-client-products" class="dataTable" style="width:100%">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>CPC Rate</th>
                    <th>CPL Rate</th>
                    <th>Campaigns</th>
                    <th>Clicks</th>
                    <th>Leads</th>
                  </tr>
                </thead>
                <tbody id="tbl-client-products-body">
                  <tr><td colspan="7" style="text-align:center;padding:16px;color:var(--text-muted)">Loading products...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Best Performing Influencers Leaderboard -->
        <div class="card">
          <div class="card-header">
            <h3 style="font-size:1.1rem; margin:0">👑 Top Performing Influencers</h3>
          </div>
          <div class="card-body" style="padding:0">
            <div class="table-wrapper">
              <table id="tbl-client-influencers" class="dataTable" style="width:100%">
                <thead>
                  <tr>
                    <th>Influencer</th>
                    <th>Clicks</th>
                    <th>Leads</th>
                  </tr>
                </thead>
                <tbody id="tbl-client-influencers-body">
                  <tr><td colspan="3" style="text-align:center;padding:16px;color:var(--text-muted)">Loading influencers...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Visitor Details Leads list -->
      <div class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px">
          <h3 style="font-size:1.1rem; margin:0">
            👥 Visitor Lead Details Log
            <span id="unread-leads-badge" style="display:none; margin-left:8px; background:#EF4444; color:#fff; font-size:0.75rem; font-weight:700; padding:2px 9px; border-radius:999px; vertical-align:middle">0 New</span>
          </h3>
          <div style="display:flex; gap:8px; align-items:center">
            <label style="font-size:0.85rem; font-weight:600; color:var(--text-muted)">Filter by Product:</label>
            <select class="form-control" id="client-leads-product-filter" style="width:200px; padding:4px 8px">
              <option value="">— All Products —</option>
            </select>
          </div>
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-client-leads" class="dataTable" style="width:100%">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Visitor Name</th>
                  <th>Contact Number</th>
                  <th>Campaign Code</th>
                  <th>Platform</th>
                  <th>Product Promoted</th>
                  <th>Influencer Referrer</th>
                  <th>Date &amp; Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  }

  function loadOverview() {
    App.api.clientAnalytics.overview()
      .done(function (res) {
        var d = res.data;
        var balanceVal = parseFloat(d.wallet_balance || 0);
        var balanceColor = balanceVal >= 0.100 ? '#22C55E' : '#EF4444';
        $('#client-kpi-balance').text(balanceVal.toFixed(3) + ' BHD').css('color', balanceColor);
        $('#client-kpi-influencers').text(d.engaged_influencers);
        $('#client-kpi-products').text(d.active_products);
        $('#client-kpi-clicks').text(d.total_clicks);
        $('#client-kpi-conversions').text(d.total_conversions);
      })
      .fail(App.api.handleError);
  }

  function loadProductsTable() {
    App.api.clientAnalytics.byProduct()
      .done(function (res) {
        var list = res.data;
        var html = '';
        if (list.length === 0) {
          html = '<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--text-muted)">No active products assigned.</td></tr>';
        } else {
          list.forEach(function (p) {
            html += '<tr>' +
              '<td><strong>' + p.name + '</strong><br><small style="color:var(--text-muted)">' + p.category + '</small></td>' +
              '<td><strong>' + p.currency + ' ' + parseFloat(p.price).toFixed(3) + '</strong></td>' +
              '<td>' + parseFloat(p.cpc_rate).toFixed(3) + ' BHD</td>' +
              '<td>' + parseFloat(p.cpl_rate).toFixed(3) + ' BHD</td>' +
              '<td><span class="badge badge-info">' + p.campaigns_count + '</span></td>' +
              '<td><strong style="color:var(--info)">' + p.total_clicks + '</strong></td>' +
              '<td><strong style="color:var(--success)">' + p.total_conversions + '</strong></td>' +
              '</tr>';
          });
        }
        $('#tbl-client-products-body').html(html);
      })
      .fail(App.api.handleError);
  }

  function loadInfluencersLeaderboard() {
    App.api.clientAnalytics.byInfluencer()
      .done(function (res) {
        var list = res.data;
        var html = '';
        if (list.length === 0) {
          html = '<tr><td colspan="3" style="text-align:center;padding:16px;color:var(--text-muted)">No influencers engaged yet.</td></tr>';
        } else {
          list.forEach(function (inf, index) {
            var crown = index === 0 ? '🥇 ' : (index === 1 ? '🥈 ' : (index === 2 ? '🥉 ' : ''));
            html += '<tr>' +
              '<td><strong>' + crown + inf.name + '</strong><div style="font-size:0.75rem; color:var(--text-muted)">' + (inf.social_handle || '-') + '</div></td>' +
              '<td><span style="color:var(--info); font-weight:600">' + inf.total_clicks + '</span></td>' +
              '<td><span style="color:var(--success); font-weight:bold">' + inf.total_conversions + '</span></td>' +
              '</tr>';
          });
        }
        $('#tbl-client-influencers-body').html(html);
      })
      .fail(App.api.handleError);
  }

  function loadLeadsFilter() {
    App.api.clientAnalytics.byProduct()
      .done(function (res) {
        var opts = '<option value="">— All Products —</option>' +
          res.data.map(function (p) {
            return '<option value="' + p.id + '">' + p.name + '</option>';
          }).join('');
        $('#client-leads-product-filter').html(opts);
      });
  }

  function loadLeadsLog(pId) {
    if (_leadsTable) { _leadsTable.destroy(); _leadsTable = null; }

    App.api.clientAnalytics.visitorLeads(pId)
      .done(function (res) {
        var leads = res.data;

        // Count unread and update badge
        var unreadCount = leads.filter(function(l){ return parseInt(l.is_read) === 0; }).length;
        if (unreadCount > 0) {
          $('#unread-leads-badge').text(unreadCount + ' New').show();
        } else {
          $('#unread-leads-badge').hide();
        }

        _leadsTable = $('#tbl-client-leads').DataTable({
          data: leads,
          pageLength: 10,
          order: [[0, 'asc'], [7, 'desc']],
          columns: [
            {
              data: 'is_read',
              render: function(d) {
                return parseInt(d) === 0
                  ? '<span class="badge" style="background:#EF4444;color:#fff;font-size:0.75rem;padding:3px 8px;border-radius:6px">🔴 New</span>'
                  : '<span class="badge" style="background:var(--border);color:var(--text-muted);font-size:0.75rem;padding:3px 8px;border-radius:6px">✅ Read</span>';
              }
            },
            {
              data: 'visitor_name',
              render: function(d, t, r) {
                var star = parseInt(r.is_important) === 1 ? ' <span style="color:#F59E0B" title="Important">⭐</span>' : '';
                var style = parseInt(r.is_read) === 0 ? 'font-weight:700;color:var(--text)' : 'color:var(--text-muted)';
                return '<span style="' + style + '">' + (d || 'Unknown') + star + '</span>';
              }
            },
            {
              data: null,
              render: function(d, t, r) {
                var style = parseInt(r.is_read) === 0 ? 'font-weight:600' : 'color:var(--text-muted)';
                return '<span style="' + style + '">' + (r.visitor_country_code || '') + ' ' + (r.visitor_phone || '') + '</span>';
              }
            },
            {
              data: 'offer_code',
              render: function(d) {
                return '<code style="font-size:0.9rem;background:var(--primary-light);color:var(--primary);padding:3px 6px;border-radius:4px">' + d + '</code>';
              }
            },
            {
              data: 'platform',
              render: function(d) {
                return '<span style="font-size:0.85rem">' + (platformIcons[d] || d || '🌐 Link') + '</span>';
              }
            },
            { data: 'product_name',     render: function(d){ return '<span style="font-weight:600;color:var(--text)">' + d + '</span>'; } },
            { data: 'influencer_name',  render: function(d){ return '<span style="color:var(--primary);font-weight:500">' + d + '</span>'; } },
            { data: 'timestamp',        render: function(d){ return '<span style="font-size:0.85rem">' + new Date(d).toLocaleString() + '</span>'; } },
            {
              data: null,
              orderable: false,
              render: function(d, t, r) {
                if (parseInt(r.is_read) === 0) {
                  return '<button class="btn btn-secondary btn-sm btn-mark-read" data-id="' + r.id + '" style="font-size:0.78rem;padding:4px 10px;white-space:nowrap">✅ Mark Read</button>';
                }
                var starText = parseInt(r.is_important) === 1 ? '⭐ Important' : '☆ Make Important';
                var starClass = parseInt(r.is_important) === 1 ? 'btn-warning' : 'btn-secondary';
                return '<button class="btn ' + starClass + ' btn-sm btn-toggle-important" data-id="' + r.id + '" style="font-size:0.78rem;padding:4px 10px;white-space:nowrap">' + starText + '</button>';
              }
            }
          ],
          createdRow: function(row, data) {
            if (parseInt(data.is_read) === 0) {
              $(row).css({ 'border-left': '3px solid #EF4444', 'background': 'rgba(239,68,68,0.04)' });
            } else if (parseInt(data.is_important) === 1) {
              $(row).css({ 'border-left': '3px solid #F59E0B', 'background': 'rgba(245,158,11,0.04)' });
            }
          }
        });
      })
      .fail(App.api.handleError);
  }

  function bindEvents() {
    // Filter changed
    $('#client-leads-product-filter').off('change').on('change', function () {
      loadLeadsLog($(this).val());
    });

    // Mark as Read button — delegated for DataTables pagination compatibility
    $(document).on('click', '.btn-mark-read', function () {
      var $btn = $(this);
      var eventId = $btn.data('id');
      $btn.prop('disabled', true).text('…');

      App.api.clientAnalytics.markRead(eventId)
        .done(function () {
          // Refresh table while preserving current product filter
          var pId = $('#client-leads-product-filter').val();
          loadLeadsLog(pId);
        })
        .fail(function (err) {
          $btn.prop('disabled', false).text('✅ Mark Read');
          App.api.handleError(err);
        });
    });

    // Toggle Important button — delegated for DataTables pagination compatibility
    $(document).on('click', '.btn-toggle-important', function () {
      var $btn = $(this);
      var eventId = $btn.data('id');
      $btn.prop('disabled', true).text('…');

      App.api.clientAnalytics.toggleImportant(eventId)
        .done(function () {
          // Refresh table while preserving current product filter
          var pId = $('#client-leads-product-filter').val();
          loadLeadsLog(pId);
        })
        .fail(function (err) {
          $btn.prop('disabled', false);
          App.api.handleError(err);
        });
    });
  }

  return { init };
}(jQuery));
