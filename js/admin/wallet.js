/**
 * Admin — Wallet Management Module
 */
window.App = window.App || {};
App.Admin = App.Admin || {};

App.Admin.Wallet = (function ($) {
  'use strict';
  var _dt = null;
  var _dtClient = null;
  var _dtTx = null;
  var _dtTxClient = null;
  var _dtPendingClient = null;

  var paymentMethodLabels = {
    cash: '💵 Cash',
    bank_transfer: '🏦 Bank Transfer',
    cheque: '✍️ Cheque',
    qr_pay: '📱 BenefitPay / QR',
    system: '⚙️ System Auto'
  };

  function init() {
    if (!App.auth.requireAuth('admin')) return;
    render();
    loadWallets();
    loadClientWallets();
    populateFilters();
    bindEvents();
  }

  function render() {
    var t = App.i18n.t.bind(App.i18n);
    $('#page-content').html(`
      <div class="page-header">
        <div><h2>💰 ${t('wallet')} & Ledgers</h2><p class="page-subtitle">Track influencer points balance, payments, and client wallet statement ledgers.</p></div>
      </div>

      <!-- Tabs Navigation -->
      <div style="display:flex;gap:12px;margin-bottom:24px;border-bottom:2px solid var(--border);padding-bottom:12px">
        <button class="btn btn-primary tab-trigger" data-target="panel-influencer" style="font-weight:600">👤 Influencer Ledger</button>
        <button class="btn btn-secondary tab-trigger" data-target="panel-client" style="font-weight:600">🏢 Vendor (Client) Ledger <span id="pending-topup-badge" style="display:none;background:#EF4444;color:#fff;border-radius:50%;width:20px;height:20px;font-size:0.72rem;font-weight:700;display:inline-flex;align-items:center;justify-content:center;margin-left:6px;vertical-align:middle">0</span></button>
      </div>

      <!-- INFLUENCER PANEL -->
      <div id="panel-influencer" class="tab-panel">
        <!-- Summary Stats -->
        <div class="stats-grid" style="margin-bottom:24px">
          <div class="stat-card amber">
            <div class="stat-icon">⏳</div>
            <div class="stat-info">
              <div class="stat-value" id="wal-total-pending">—</div>
              <div class="stat-label">Total Pending</div>
            </div>
          </div>
          <div class="stat-card green">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
              <div class="stat-value" id="wal-total-paid">—</div>
              <div class="stat-label">Total Paid</div>
            </div>
          </div>
        </div>

        <!-- Wallets Table -->
        <div class="card" style="margin-bottom:24px">
          <div class="card-header"><span class="card-title">👛 Influencer Wallets Balance</span></div>
          <div class="card-body" style="padding:0">
            <div class="table-wrapper" style="padding:16px">
              <table id="tbl-wallets" class="dataTable" style="width:100%">
                <thead>
                  <tr>
                    <th>#</th><th>Influencer</th><th>Platform</th>
                    <th>Clicks</th><th>Conversions</th><th>Points</th><th>Total Earned</th>
                    <th>Paid</th><th>Pending</th><th>Action</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Transaction History -->
        <div class="card">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
            <span class="card-title">📋 Influencer Payout History</span>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:0.85rem;color:var(--text-muted)">Filter Influencer:</span>
              <select class="form-control" id="filter-influencer-select" style="width:200px"></select>
            </div>
          </div>
          <div class="card-body" style="padding:0">
            <div class="table-wrapper" style="padding:16px">
              <table id="tbl-transactions" class="dataTable" style="width:100%">
                <thead>
                  <tr><th>#</th><th>Influencer</th><th>Points</th><th>Amount</th><th>Type</th><th>Status</th><th>Note</th><th>Date</th></tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- CLIENT PANEL -->
      <div id="panel-client" class="tab-panel" style="display:none">
        <!-- Client Wallets Table -->
        <div class="card" style="margin-bottom:24px">
          <div class="card-header"><span class="card-title">👛 Vendor Accounts Balance</span></div>
          <div class="card-body" style="padding:0">
            <div class="table-wrapper" style="padding:16px">
              <table id="tbl-client-wallets" class="dataTable" style="width:100%">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Vendor Name</th>
                    <th>Email Address</th>
                    <th>Contact Phone</th>
                    <th>Ledger Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Pending Top Up Requests -->
        <div class="card" style="margin-bottom:24px; border:1px solid #F59E0B">
          <div class="card-header" style="background:rgba(245,158,11,0.05); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px">
            <span class="card-title" style="color:#D97706">📋 Pending Credit / Top-Up Requests</span>
            <button class="btn btn-secondary btn-sm" id="btn-goto-payment-config" style="font-size:0.8rem;padding:5px 12px" title="Configure bank details, QR code, and cheque instructions shown to clients">⚙️ Configure Payment Methods</button>
          </div>
          <div class="card-body" style="padding:0">
            <div class="table-wrapper" style="padding:16px">
              <table id="tbl-client-pending-requests" class="dataTable" style="width:100%">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Vendor Name</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Uploaded Receipt</th>
                    <th>Transaction Note</th>
                    <th>Submitted Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colspan="8" style="text-align:center;padding:16px;color:var(--text-muted)">Loading pending requests...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Client Statements History -->
        <div class="card">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
            <span class="card-title">📋 Vendor Statements Ledger</span>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:0.85rem;color:var(--text-muted)">Filter Vendor:</span>
              <select class="form-control" id="filter-client-select" style="width:200px"></select>
            </div>
          </div>
          <div class="card-body" style="padding:0">
            <div class="table-wrapper" style="padding:16px">
              <table id="tbl-client-transactions" class="dataTable" style="width:100%">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Vendor Name</th>
                    <th>Ledger Impact</th>
                    <th>Payment Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Transaction Note</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Payout Transfer Modal -->
      <div id="modal-transfer" style="display:none">
        <div class="modal-overlay">
          <div class="modal-box">
            <div class="modal-header">
              <span class="modal-title">💸 Payout Transfer</span>
              <button class="modal-close" id="btn-close-transfer">✕</button>
            </div>
            <div class="modal-body">
              <div style="background:var(--table-stripe);border-radius:10px;padding:16px;margin-bottom:20px" id="transfer-inf-info"></div>
              <input type="hidden" id="transfer-inf-id">
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Points to Deduct</label>
                  <input type="number" class="form-control" id="transfer-points" min="0" step="0.01" placeholder="0">
                </div>
                <div class="form-group">
                  <label class="form-label">Transfer Amount <span class="req">*</span></label>
                  <input type="number" class="form-control" id="transfer-amount" min="0.001" step="0.001" placeholder="0.000">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">${t('payment_note')}</label>
                <input type="text" class="form-control" id="transfer-note" placeholder="e.g. Bank transfer ref #1234">
              </div>
              <div class="alert alert-warning">
                ⚠️ This action will record a <strong>paid debit</strong> from the influencer's wallet. This cannot be undone.
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="btn-cancel-transfer">${t('cancel')}</button>
              <button class="btn btn-success" id="btn-confirm-transfer">✅ Confirm Transfer</button>
            </div>
          </div>
        </div>
      </div>
    `);
  }

  function loadWallets() {
    App.api.wallet.overview().done(function(res){
      var d = res.data;
      var cur = d.currency || 'BHD';
      $('#wal-total-pending').text(cur + ' ' + parseFloat(d.total_pending||0).toFixed(3));
      $('#wal-total-paid').text(cur + ' ' + parseFloat(d.total_paid||0).toFixed(3));

      if (_dt) { _dt.destroy(); _dt = null; }
      _dt = $('#tbl-wallets').DataTable({
        data: d.wallets,
        pageLength: 15,
        order: [[8,'desc']],
        columns: [
          { data: null, render: function(d,t,r,m){ return m.row+1; }, orderable:false },
          { data: 'name', render: function(d,t,r){
              var initials = r.name.split(' ').map(function(p){return p[0];}).join('').substring(0,2).toUpperCase();
              return `<div style="display:flex;align-items:center;gap:10px">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--grad-primary);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.75rem">${initials}</div>
                <strong>${d}</strong>
              </div>`;
            }
          },
          { data: 'platform', render: function(d){ return `<span class="badge platform-${d}">${d}</span>`; }},
          { data: 'total_clicks',      render: function(d){ return `<span style="color:var(--info)">${d}</span>`; }},
          { data: 'total_conversions', render: function(d){ return `<strong style="color:var(--success)">${d}</strong>`; }},
          { data: 'total_points', render: function(d){ return d>0?`<span class="badge badge-primary">🎯 ${d} pts</span>`:`<span class="badge badge-muted">0</span>`; }},
          { data: 'total_earnings', render: function(d,t,r){ return `<strong>${r.currency} ${parseFloat(d).toFixed(3)}</strong>`; }},
          { data: 'paid_amount',    render: function(d,t,r){ return `<span style="color:var(--success)">${r.currency} ${parseFloat(d).toFixed(3)}</span>`; }},
          { data: 'pending_amount', render: function(d,t,r){
              return d > 0
                ? `<strong style="color:var(--warning)">${r.currency} ${parseFloat(d).toFixed(3)}</strong>`
                : `<span style="color:var(--text-muted)">—</span>`;
            }
          },
          { data: null, orderable:false, render: function(d,t,r){
              return r.pending_amount > 0
                ? `<button class="btn btn-success btn-sm btn-transfer" data-id="${r.influencer_id}" data-name="${r.name}" data-pending="${r.pending_amount}" data-points="${r.total_points}" data-cur="${r.currency}">💸 Pay</button>`
                : `<span class="badge badge-muted">Settled</span>`;
            }
          },
        ]
      });
    }).fail(App.api.handleError);

    // Initial load of payout history
    loadPayoutHistory(0);
  }

  function loadPayoutHistory(influencerId) {
    App.api.wallet.transactions(influencerId).done(function(res){
      var data = res.data || [];
      if (_dtTx) { _dtTx.destroy(); }
      _dtTx = $('#tbl-transactions').DataTable({
        data: data,
        pageLength: 10,
        order: [[7,'desc']],
        columns: [
          { data: null, render: function(d,t,r,m){ return m.row+1; }, orderable:false },
          { data: 'influencer_name', render: function(d){ return `<strong>${d}</strong>`; } },
          { data: 'points', render: function(d){ return d>0?`🎯 ${parseFloat(d).toFixed(2)}`:'—'; }},
          { data: 'amount', render: function(d){ return `<strong>${parseFloat(d).toFixed(3)} BHD</strong>`; }},
          { data: 'type', render: function(d){
              return d==='credit'
                ? `<span class="badge badge-success">➕ Credit</span>`
                : `<span class="badge badge-danger">➖ Payout</span>`;
            }
          },
          { data: 'status', render: function(d){ return d==='paid'?`<span class="badge badge-success">Paid</span>`:`<span class="badge badge-warning">Pending</span>`; }},
          { data: 'note', render: function(d){ return d||'—'; }},
          { 
            data: 'created_at', 
            render: function(d, type){ 
              if (type === 'sort' || type === 'type') {
                return d ? new Date(d).getTime() : 0;
              }
              return d ? new Date(d).toLocaleString() : '—'; 
            }
          },
        ]
      });
    });
  }

  function loadClientWallets() {
    App.api.clients.list().done(function(res){
      var data = res.data || [];
      if (_dtClient) { _dtClient.destroy(); }
      _dtClient = $('#tbl-client-wallets').DataTable({
        data: data,
        pageLength: 10,
        order: [[4,'desc']],
        columns: [
          { data: null, render: function(d,t,r,m){ return m.row+1; }, orderable:false },
          { data: 'name', render: function(d){ return `<strong>${d}</strong>`; } },
          { data: 'email' },
          { data: 'phone', render: function(d,t,r){ return (r.country_code || '') + ' ' + (d || ''); } },
          { data: 'wallet_balance', render: function(d){ 
              return parseFloat(d) >= 0.100 
                ? `<strong style="color:#22C55E">${parseFloat(d).toFixed(3)} BHD</strong>` 
                : `<strong style="color:#EF4444">${parseFloat(d).toFixed(3)} BHD</strong>`;
            } 
          },
          { data: 'status', render: function(d){ 
              return d==='active'
                ? `<span class="badge badge-success">Active</span>`
                : `<span class="badge badge-danger">Inactive</span>`;
            } 
          }
        ]
      });
    });

    loadClientTransactions(0);
  }

  function loadClientTransactions(clientId) {
    App.api.clients.ledger(clientId).done(function(res){
      var allData = res.data || [];
      
      // Filter pending credits
      var pendingData = allData.filter(function(tx) {
        return tx.type === 'credit' && tx.status === 'pending';
      });

      // 1. Populate Pending Credit Requests
      if ($.fn.DataTable.isDataTable('#tbl-client-pending-requests')) {
        $('#tbl-client-pending-requests').DataTable().destroy();
      }
      $('#tbl-client-pending-requests tbody').empty();

      // Update pending badge on tab button
      var pendingCount = pendingData.length;
      if (pendingCount > 0) {
        $('#pending-topup-badge').text(pendingCount).css('display', 'inline-flex');
      } else {
        $('#pending-topup-badge').css('display', 'none');
      }

      _dtPendingClient = $('#tbl-client-pending-requests').DataTable({
        data: pendingData,
        pageLength: 5,
        order: [[6, 'asc']],
        columns: [
          { data: null, render: function(d,t,r,m){ return m.row+1; }, orderable:false },
          { data: 'client_name', render: function(d){ return `<strong>${d}</strong>`; } },
          { data: 'amount', render: function(d){ return `<strong style="color:#22C55E">+${parseFloat(d).toFixed(3)} BHD</strong>`; } },
          { data: 'payment_method', render: function(d){ return paymentMethodLabels[d] || d || '—'; } },
          { data: 'screenshot_url', render: function(d){
              return d 
                ? `<a href="${d}" target="_blank" class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:3px 8px;font-weight:700">🖼️ View Receipt ↗</a>`
                : `<span style="color:var(--text-muted);font-size:0.8rem">No receipt file</span>`;
            }
          },
          { data: 'note', render: function(d){ return `<span style="color:var(--text-muted);font-size:0.88rem">${d||'—'}</span>`; } },
          { 
            data: 'created_at', 
            render: function(d, type){ 
              if (type === 'sort' || type === 'type') return d ? new Date(d).getTime() : 0;
              return d ? new Date(d).toLocaleString() : '—'; 
            } 
          },
          { data: null, orderable:false, render: function(d,t,r){
              return `
                <div style="display:flex;gap:6px">
                  <button class="btn btn-success btn-sm btn-approve-topup" data-id="${r.id}" data-client="${r.client_name}" data-amount="${r.amount}">Approve</button>
                  <button class="btn btn-danger btn-sm btn-reject-topup" data-id="${r.id}">Reject</button>
                </div>
              `;
            }
          }
        ]
      });

      // 2. Populate Main ledger history
      if (_dtTxClient) { _dtTxClient.destroy(); }
      _dtTxClient = $('#tbl-client-transactions').DataTable({
        data: allData,
        pageLength: 10,
        order: [[7,'desc']],
        columns: [
          { data: null, render: function(d,t,r,m){ return m.row+1; }, orderable:false },
          { data: 'client_name', render: function(d){ return `<strong>${d}</strong>`; } },
          { data: 'type', render: function(d){
              return d==='credit'
                ? `<span class="badge" style="background:rgba(34,197,94,0.1);color:#22C55E;font-size:0.75rem;padding:3px 8px;border-radius:6px">➕ Deposit</span>`
                : `<span class="badge" style="background:rgba(239,68,68,0.1);color:#EF4444;font-size:0.75rem;padding:3px 8px;border-radius:6px">➖ Debit Cut</span>`;
            }
          },
          { data: 'payment_method', render: function(d){ return paymentMethodLabels[d] || d || '—'; } },
          { data: 'amount', render: function(d,t,r){ 
              var prefix = r.type === 'credit' ? '+' : '-';
              var color = r.type === 'credit' ? '#22C55E' : '#EF4444';
              return `<span style="font-weight:700;color:${color}">${prefix}${parseFloat(d).toFixed(3)} BHD</span>`; 
            } 
          },
          { data: 'status', render: function(d,t,r){
              if (r.type === 'debit') return '<span class="badge badge-muted">Auto</span>';
              if (d === 'approved') return '<span class="badge badge-success">Approved</span>';
              if (d === 'rejected') return '<span class="badge badge-danger">Rejected</span>';
              return '<span class="badge" style="background:#F59E0B;color:#fff">Pending Approval</span>';
            }
          },
          { data: 'note', render: function(d,t,r){ 
              var html = `<span style="color:var(--text-muted);font-size:0.88rem">${d||'—'}</span>`; 
              if (r.screenshot_url) {
                html += `<br><a href="${r.screenshot_url}" target="_blank" style="font-size:0.75rem;color:var(--primary);font-weight:700;text-decoration:none">🖼️ View Receipt ↗</a>`;
              }
              return html;
            } 
          },
          { 
            data: 'created_at', 
            render: function(d, type){ 
              if (type === 'sort' || type === 'type') {
                return d ? new Date(d).getTime() : 0;
              }
              return d ? new Date(d).toLocaleString() : '—'; 
            } 
          }
        ]
      });
    });
  }

  function populateFilters() {
    // Populate influencer dropdown
    App.api.users.list().done(function(res){
      var data = res.data || [];
      var $sel = $('#filter-influencer-select');
      $sel.html('<option value="0">All Influencers</option>');
      data.forEach(function(i){
        $sel.append(`<option value="${i.id}">${i.name}</option>`);
      });
    });

    // Populate client dropdown
    App.api.clients.list().done(function(res){
      var data = res.data || [];
      var $sel = $('#filter-client-select');
      $sel.html('<option value="0">All Vendors</option>');
      data.forEach(function(c){
        $sel.append(`<option value="${c.id}">${c.name}</option>`);
      });
    });
  }

  function bindEvents() {
    // Tab switching
    $(document).off('click', '.tab-trigger').on('click', '.tab-trigger', function(){
      var $btn = $(this);
      var target = $btn.data('target');
      
      $('.tab-trigger').removeClass('btn-primary').addClass('btn-secondary');
      $btn.removeClass('btn-secondary').addClass('btn-primary');
      
      $('.tab-panel').hide();
      $('#' + target).show();
    });

    // Navigate to Points Config (payment methods setup)
    $(document).off('click', '#btn-goto-payment-config').on('click', '#btn-goto-payment-config', function(){
      if (window.App && App.router) {
        App.router.navigate('points');
      } else {
        // Fallback: trigger nav click
        $('[data-page="points"], [href*="points"], .nav-item[data-route="points"]').first().click();
      }
      Swal.fire({
        icon: 'info',
        title: 'Payment Configuration',
        html: 'Scroll down to the <strong>💳 Vendor Payment Details</strong> section to set:<br><br>🏦 Bank Transfer Details<br>📱 BenefitPay QR Code<br>✍️ Cheque Instructions',
        confirmButtonColor: '#6C63FF',
        confirmButtonText: 'Got it'
      });
    });

    // Influencer transactions filter
    $('#filter-influencer-select').off('change').on('change', function(){
      loadPayoutHistory($(this).val());
    });

    // Client transactions filter
    $('#filter-client-select').off('change').on('change', function(){
      loadClientTransactions($(this).val());
    });

    // Approve Top Up Credit Request
    $(document).off('click', '.btn-approve-topup').on('click', '.btn-approve-topup', function() {
      var txId = $(this).data('id');
      var client = $(this).data('client');
      var amount = parseFloat($(this).data('amount'));

      Swal.fire({
        title: 'Approve Top-Up Credit?',
        text: `Are you sure you want to approve the credit request of BHD ${amount.toFixed(3)} for ${client}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '✅ Yes, Approve',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#22C55E',
        cancelButtonColor: '#6b7280'
      }).then(function(result) {
        if (result.isConfirmed) {
          $.ajax({
            url: 'api/clients.php?action=approve_reject_topup',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ tx_id: txId, status: 'approved' }),
            dataType: 'json'
          }).done(function(res) {
            Swal.fire({ icon: 'success', title: 'Approved!', text: res.message, timer: 1500, showConfirmButton: false });
            loadClientWallets(); // Refresh balance tables
          }).fail(App.api.handleError);
        }
      });
    });

    // Reject Top Up Credit Request
    $(document).off('click', '.btn-reject-topup').on('click', '.btn-reject-topup', function() {
      var txId = $(this).data('id');

      Swal.fire({
        title: 'Reject Top-Up Credit?',
        text: 'Are you sure you want to reject this payment credit request?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '✕ Yes, Reject',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6b7280'
      }).then(function(result) {
        if (result.isConfirmed) {
          $.ajax({
            url: 'api/clients.php?action=approve_reject_topup',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ tx_id: txId, status: 'rejected' }),
            dataType: 'json'
          }).done(function(res) {
            Swal.fire({ icon: 'success', title: 'Rejected', text: res.message, timer: 1500, showConfirmButton: false });
            loadClientWallets(); // Refresh balance tables
          }).fail(App.api.handleError);
        }
      });
    });

    $(document).off('click','.btn-transfer').on('click','.btn-transfer', function(){
      var $b    = $(this);
      var id      = $b.data('id');
      var name    = $b.data('name');
      var pending = parseFloat($b.data('pending'));
      var points  = parseFloat($b.data('points'));
      var cur     = $b.data('cur');

      $('#transfer-inf-id').val(id);
      $('#transfer-amount').val(pending.toFixed(3));
      $('#transfer-points').val(points);
      $('#transfer-inf-info').html(`
        <div style="font-weight:700;font-size:1rem;margin-bottom:6px">${name}</div>
        <div style="color:var(--text-secondary);font-size:0.88rem">Pending amount: <strong style="color:var(--warning)">${cur} ${pending.toFixed(3)}</strong></div>
        <div style="color:var(--text-secondary);font-size:0.88rem">Total points: <strong>${points}</strong></div>
      `);
      $('#modal-transfer').show();
    });

    $(document).off('click','#btn-close-transfer, #btn-cancel-transfer').on('click','#btn-close-transfer, #btn-cancel-transfer', function(){ $('#modal-transfer').hide(); });

    $(document).off('click','#btn-confirm-transfer').on('click','#btn-confirm-transfer', function(){
      var data = {
        influencer_id: $('#transfer-inf-id').val(),
        amount: parseFloat($('#transfer-amount').val()),
        points: parseFloat($('#transfer-points').val()) || 0,
        note:   $('#transfer-note').val(),
      };
      if (!data.amount || data.amount <= 0) {
        Swal.fire({icon:'warning',title:'Invalid Amount',text:'Please enter a valid amount.',confirmButtonColor:'#6C63FF'}); return;
      }
      var $btn = $(this).prop('disabled',true).html('<span class="spinner"></span>');
      App.api.wallet.transfer(data)
        .done(function(res){
          $('#modal-transfer').hide();
          Swal.fire({ icon:'success', title:'Payment Transferred! 🎉', text:res.message, showConfirmButton:false, timer:2000 });
          loadWallets();
        })
        .fail(App.api.handleError)
        .always(function(){ $btn.prop('disabled',false).html('✅ Confirm Transfer'); });
    });
  }

  return { init };
}(jQuery));
