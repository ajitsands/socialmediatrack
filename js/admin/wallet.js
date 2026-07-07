/**
 * Admin — Wallet Management Module
 */
window.App = window.App || {};
App.Admin = App.Admin || {};

App.Admin.Wallet = (function ($) {
  'use strict';
  var _dt = null;

  function init() {
    if (!App.auth.requireAuth('admin')) return;
    render();
    loadWallets();
    bindEvents();
  }

  function render() {
    var t = App.i18n.t.bind(App.i18n);
    $('#page-content').html(`
      <div class="page-header">
        <div><h2>💰 ${t('wallet')}</h2><p class="page-subtitle">Manage influencer earnings and payouts</p></div>
      </div>

      <!-- Summary -->
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

      <!-- Wallet Table -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-header"><span class="card-title">👛 Influencer Wallets</span></div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-wallets" class="dataTable" style="width:100%">
              <thead>
                <tr>
                  <th>#</th><th>Influencer</th><th>Platform</th>
                  <th>Conversions</th><th>Points</th><th>Total Earned</th>
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
        <div class="card-header"><span class="card-title">📋 ${t('transaction_history')}</span></div>
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

      <!-- Transfer Modal -->
      <div id="modal-transfer" style="display:none">
        <div class="modal-overlay">
          <div class="modal-box">
            <div class="modal-header">
              <span class="modal-title">💸 ${t('transfer')}</span>
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
                  <label class="form-label">${t('transfer_amount')} <span class="req">*</span></label>
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
        order: [[7,'desc']],
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

    // Load transactions
    App.api.wallet.transactions(0).done(function(res){
      var dt2 = $('#tbl-transactions');
      if ($.fn.DataTable.isDataTable(dt2)) dt2.DataTable().destroy();
      dt2.DataTable({
        data: res.data, pageLength: 10, order: [[7,'desc']],
        columns: [
          { data: null, render: function(d,t,r,m){ return m.row+1; }, orderable:false },
          { data: 'influencer_name' },
          { data: 'points', render: function(d){ return d>0?`🎯 ${parseFloat(d).toFixed(2)}`:'—'; }},
          { data: 'amount', render: function(d){ return `<strong>${parseFloat(d).toFixed(3)}</strong>`; }},
          { data: 'type', render: function(d){
              return d==='credit'
                ? `<span class="badge badge-success">➕ Credit</span>`
                : `<span class="badge badge-danger">➖ Debit</span>`;
            }
          },
          { data: 'status', render: function(d){ return d==='paid'?`<span class="badge badge-success">Paid</span>`:`<span class="badge badge-warning">Pending</span>`; }},
          { data: 'note', render: function(d){ return d||'—'; }},
          { data: 'created_at', render: function(d){ return d?new Date(d).toLocaleDateString():'—'; }},
        ]
      });
    });
  }

  function bindEvents() {
    $(document).on('click','.btn-transfer', function(){
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

    $(document).on('click','#btn-close-transfer, #btn-cancel-transfer', function(){ $('#modal-transfer').hide(); });

    $(document).on('click','#btn-confirm-transfer', function(){
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
