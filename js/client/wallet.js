/**
 * Client Portal — Wallet Ledger Module
 * Allows clients to monitor ledger credits (top-ups) and automated debits (clicks/leads).
 */
window.App = window.App || {};
App.Client = App.Client || {};

App.Client.Wallet = (function ($) {
  'use strict';

  var _walletTable = null;
  var paymentMethodLabels = {
    cash: '💵 Cash Payment',
    bank_transfer: '🏦 Bank Transfer',
    cheque: '✍️ Cheque',
    qr_pay: '📱 BenefitPay / QR',
    system: '⚙️ System Auto'
  };

  function init() {
    if (!App.auth.requireAuth('client')) return;
    renderLayout();
    loadBalance();
    loadLedger();
  }

  function renderLayout() {
    $('#page-content').html(`
      <div class="page-header">
        <div>
          <h2>💰 My Wallet Ledger & Statements</h2>
          <p class="page-subtitle">Verify cash/bank credits and tracking link cost deductions in real-time.</p>
        </div>
      </div>

      <div class="grid-2" style="display:grid; grid-template-columns: 1fr 2fr; gap: 24px">
        
        <!-- Left Panel: Balance & Instructions -->
        <div>
          <div class="card glass" style="margin-bottom:20px; text-align:center; padding:32px 16px">
            <div class="kpi-label" style="font-size:1rem">Available Ledger Funds</div>
            <div class="kpi-value" id="client-wallet-balance" style="font-size:2.5rem; color:#22C55E; margin:12px 0">0.000 BHD</div>
            <div style="font-size:0.8rem; color:var(--text-muted)">
              Links will show as <strong style="color:#EF4444">Expired</strong> if balance falls below <strong>0.100 Fils</strong> (0.100 BHD).
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 style="font-size:1.05rem; margin:0">💳 How to Top Up Funds</h3>
            </div>
            <div class="card-body" style="font-size:0.88rem; line-height:1.6">
              <p>Please contact the system administrator to record a credit transaction. You can top up using any of these payment methods:</p>
              
              <div style="margin-top:12px">
                <strong>🏦 Bank Transfer:</strong><br>
                <span style="color:var(--text-muted)">Send transfers to local bank accounts. Provide receipt screenshot.</span>
              </div>
              
              <div style="margin-top:12px">
                <strong>📱 BenefitPay / QR Pay:</strong><br>
                <span style="color:var(--text-muted)">Scan the Admin's BenefitPay QR code and send payments instantly.</span>
              </div>

              <div style="margin-top:12px">
                <strong>💵 Cash / Cheque:</strong><br>
                <span style="color:var(--text-muted)">Hand over physical cash or cheques directly to the admin.</span>
              </div>

              <div class="warn-box" style="margin-top:16px; background:rgba(108,99,255,0.06); padding:10px; border-radius:6px; border-left:4px solid var(--primary)">
                💡 **Minimum Balance:** Keep your ledger balance above BHD 0.100 to ensure your tracking links remain active.
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Ledger Table -->
        <div class="card">
          <div class="card-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px">
            <h3 style="font-size:1.05rem; margin:0">📋 Statements & Transaction History</h3>
            <div style="display:flex; align-items:center; gap:8px">
              <label style="font-size:0.78rem; color:var(--text-muted)">From</label>
              <input type="date" id="client-ledger-date-from" class="form-control" style="font-size:0.8rem; padding:4px 8px; width:130px">
              <label style="font-size:0.78rem; color:var(--text-muted)">To</label>
              <input type="date" id="client-ledger-date-to" class="form-control" style="font-size:0.8rem; padding:4px 8px; width:130px">
            </div>
          </div>
          
          <!-- Summary Cards -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; padding:16px 16px 0 16px">
            <div style="background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.25); border-radius:10px; padding:10px; text-align:center">
              <div style="font-size:0.7rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:.5px">Total Credited</div>
              <div id="client-ledger-total-credit" style="font-size:1.15rem; font-weight:700; color:#22C55E; margin-top:3px">0.000 BHD</div>
            </div>
            <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:10px; padding:10px; text-align:center">
              <div style="font-size:0.7rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:.5px">Total Deductions</div>
              <div id="client-ledger-total-debit" style="font-size:1.15rem; font-weight:700; color:#EF4444; margin-top:3px">0.000 BHD</div>
            </div>
          </div>

          <div class="card-body" style="padding:0">
            <div class="table-wrapper" style="padding:16px">
              <table id="tbl-client-wallet-history" class="dataTable" style="width:100%">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Type</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colspan="5" style="text-align:center;padding:16px;color:var(--text-muted)">Loading statement...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    `);

    // Default dates to current month
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    $('#client-ledger-date-from').val(y + '-' + m + '-01');
    $('#client-ledger-date-to').val(y + '-' + m + '-' + d);
  }

  function loadBalance() {
    App.api.clientAnalytics.overview()
      .done(function (res) {
        var balanceVal = parseFloat(res.data.wallet_balance || 0);
        var balanceColor = balanceVal >= 0.100 ? '#22C55E' : '#EF4444';
        $('#client-wallet-balance').text(balanceVal.toFixed(3) + ' BHD').css('color', balanceColor);
      })
      .fail(App.api.handleError);
  }

  function loadLedger() {
    var dateFrom = $('#client-ledger-date-from').val();
    var dateTo   = $('#client-ledger-date-to').val();

    if (_walletTable) { _walletTable.destroy(); _walletTable = null; }

    App.api.clientAnalytics.walletHistory(dateFrom, dateTo)
      .done(function (res) {
        var logs = res.data;

        // Calculate credits & debits summary
        var totalCredit = 0, totalDebit = 0;
        logs.forEach(function (l) {
          var amt = parseFloat(l.amount) || 0;
          if (l.type === 'credit') totalCredit += amt;
          else totalDebit += amt;
        });

        $('#client-ledger-total-credit').text(totalCredit.toFixed(3) + ' BHD');
        $('#client-ledger-total-debit').text(totalDebit.toFixed(3) + ' BHD');

        _walletTable = $('#tbl-client-wallet-history').DataTable({
          data: logs,
          pageLength: 10,
          order: [[0, 'desc']],
          columns: [
            { data: 'created_at', render: function(d){ return `<strong>${new Date(d).toLocaleString()}</strong>`; } },
            { data: 'type', render: function(d){
                var isCredit = d === 'credit';
                var cls = isCredit ? 'badge-success' : 'badge-danger';
                return `<span class="badge ${cls}">${d.toUpperCase()}</span>`;
              }
            },
            { data: 'payment_method', render: function(d){ return paymentMethodLabels[d] || d; } },
            { data: null, render: function(d,t,r){
                var isCredit = r.type === 'credit';
                var color = isCredit ? '#22C55E' : '#EF4444';
                var prefix = isCredit ? '+' : '-';
                return `<strong style="color:${color}">${prefix}${parseFloat(r.amount).toFixed(3)} BHD</strong>`;
              }
            },
            { data: 'note', render: function(d){ return d || '-'; } }
          ]
        });
      })
      .fail(App.api.handleError);
  }

  function bindEvents() {
    $(document).on('change', '#client-ledger-date-from, #client-ledger-date-to', function () {
      loadLedger();
    });
  }

  return { 
    init: function() {
      if (!App.auth.requireAuth('client')) return;
      renderLayout();
      loadBalance();
      loadLedger();
      bindEvents();
    }
  };
}(jQuery));
