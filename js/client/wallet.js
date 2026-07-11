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

  var _config = null;

  function init() {
    if (!App.auth.requireAuth('client')) return;
    renderLayout();
    loadBalance();
    loadInstructions();
    loadLedger();
    bindEvents();
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

          <div class="card" style="margin-bottom:20px">
            <div class="card-header">
              <h3 style="font-size:1.05rem; margin:0">💳 How to Top Up Funds</h3>
            </div>
            <div class="card-body" style="font-size:0.88rem; line-height:1.6">
              <p>Select a payment method below to view payment instructions and submit your transfer proof:</p>
              
              <div class="form-group" style="margin-top:12px">
                <label class="form-label" style="font-weight:700">Select Payment Method</label>
                <select class="form-control" id="payout-method-select">
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="qr_pay">📱 BenefitPay / QR</option>
                  <option value="cheque">✍️ Cheque</option>
                </select>
              </div>

              <!-- Payout Instructions Details Display -->
              <div id="payout-instructions-wrap" style="background:var(--table-stripe); border:1px solid var(--border); border-radius:8px; padding:12px; margin-top:12px">
                <span style="font-size:0.82rem;color:var(--text-muted)">Loading payment details...</span>
              </div>
            </div>
          </div>

          <!-- Submit Top Up Form -->
          <div class="card">
            <div class="card-header">
              <h3 style="font-size:1.05rem; margin:0">📤 Submit Top-Up Request</h3>
            </div>
            <div class="card-body">
              <form id="form-submit-topup" enctype="multipart/form-data">
                <div class="form-group" style="margin-bottom:12px">
                  <label class="form-label">Amount (BHD) <span class="req">*</span></label>
                  <input type="number" class="form-control" id="topup-amount" step="0.001" min="0.001" placeholder="0.000" required>
                </div>
                <div class="form-group" style="margin-bottom:12px">
                  <label class="form-label">Note / Reference</label>
                  <input type="text" class="form-control" id="topup-note" placeholder="e.g. Transaction Ref No, Cheque No">
                </div>
                <div class="form-group" style="margin-bottom:16px" id="topup-file-group">
                  <label class="form-label">Upload Receipt Screenshot <span class="req">*</span></label>
                  <input type="file" class="form-control" id="topup-screenshot" accept="image/*,application/pdf" required>
                  <div class="form-hint">Upload a screenshot of the payment proof.</div>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%" id="btn-submit-topup">📤 Submit Top-Up Proof</button>
              </form>
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
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colspan="6" style="text-align:center;padding:16px;color:var(--text-muted)">Loading statement...</td></tr>
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

  function loadInstructions() {
    App.api.points.config().done(function(res) {
      _config = res.data;
      updateInstructionsDisplay();
    }).fail(App.api.handleError);
  }

  function updateInstructionsDisplay() {
    if (!_config) return;
    var method = $('#payout-method-select').val();
    var wrap = $('#payout-instructions-wrap');
    
    // Toggle screenshot required depending on method
    if (method === 'cheque') {
      $('#topup-screenshot').prop('required', false);
      $('#topup-file-group label .req').hide();
    } else {
      $('#topup-screenshot').prop('required', true);
      $('#topup-file-group label .req').show();
    }

    if (method === 'bank_transfer') {
      var details = _config.bank_details || 'No bank transfer details set by Administrator.';
      wrap.html(`
        <div style="font-weight:700;margin-bottom:4px;color:var(--primary)">🏦 Bank Account Details:</div>
        <div style="white-space:pre-wrap;font-size:0.85rem;color:var(--text-secondary);line-height:1.4">${details}</div>
      `);
    } else if (method === 'qr_pay') {
      var qrUrl = _config.benefit_qr_url;
      var imgHtml = qrUrl 
        ? `<div style="text-align:center;margin-top:8px"><img src="${qrUrl}" style="max-width:160px;height:auto;border:1px solid var(--border);border-radius:6px" title="Scan to Pay" /></div>`
        : '<div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px">No QR code image uploaded by Administrator.</div>';
      wrap.html(`
        <div style="font-weight:700;margin-bottom:4px;color:var(--primary)">📱 BenefitPay QR Code:</div>
        <div style="font-size:0.85rem;color:var(--text-secondary)">Scan the QR code below using your BenefitPay app to send the payment.</div>
        ${imgHtml}
      `);
    } else if (method === 'cheque') {
      var details = _config.cheque_details || 'No cheque details set by Administrator.';
      wrap.html(`
        <div style="font-weight:700;margin-bottom:4px;color:var(--primary)">✍️ Cheque Instructions:</div>
        <div style="white-space:pre-wrap;font-size:0.85rem;color:var(--text-secondary);line-height:1.4">${details}</div>
      `);
    }
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
          if (l.type === 'credit') {
            if (l.status === 'approved') {
              totalCredit += amt;
            }
          } else {
            totalDebit += amt;
          }
        });

        $('#client-ledger-total-credit').text(totalCredit.toFixed(3) + ' BHD');
        $('#client-ledger-total-debit').text(totalDebit.toFixed(3) + ' BHD');

        _walletTable = $('#tbl-client-wallet-history').DataTable({
          data: logs,
          pageLength: 10,
          order: [[0, 'desc']],
          columns: [
            { 
              data: 'created_at', 
              render: function(d, type){ 
                if (type === 'sort' || type === 'type') {
                  return new Date(d).getTime();
                }
                return `<strong>${new Date(d).toLocaleString()}</strong>`; 
              } 
            },
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
            { data: 'status', render: function(d,t,r){
                if (r.type === 'debit') return '<span class="badge badge-muted">Auto</span>';
                if (d === 'approved') return '<span class="badge badge-success">Approved</span>';
                if (d === 'rejected') return '<span class="badge badge-danger">Rejected</span>';
                return '<span class="badge" style="background:#F59E0B;color:#fff">Pending Approval</span>';
              }
            },
            { data: 'note', render: function(d,t,r){
                var html = d || '—';
                if (r.screenshot_url) {
                  html += `<br><a href="${r.screenshot_url}" target="_blank" style="font-size:0.75rem;color:var(--primary);font-weight:700;text-decoration:none">🖼️ View Receipt ↗</a>`;
                }
                return html;
              }
            }
          ]
        });
      })
      .fail(App.api.handleError);
  }

  function bindEvents() {
    $(document).on('change', '#client-ledger-date-from, #client-ledger-date-to', function () {
      loadLedger();
    });

    $(document).on('change', '#payout-method-select', function() {
      updateInstructionsDisplay();
    });

    $(document).off('submit', '#form-submit-topup').on('submit', '#form-submit-topup', function(e) {
      e.preventDefault();

      var method = $('#payout-method-select').val();
      var amount = $('#topup-amount').val();
      var note = $('#topup-note').val().trim();
      var fileInput = $('#topup-screenshot')[0];
      var file = fileInput.files[0];

      if (parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
        Swal.fire({ icon: 'warning', title: 'Invalid Amount', text: 'Please enter a valid positive amount.' });
        return;
      }

      if (method !== 'cheque' && !file) {
        Swal.fire({ icon: 'warning', title: 'Receipt Required', text: 'Please upload a receipt screenshot.' });
        return;
      }

      var formData = new FormData();
      formData.append('payment_method', method);
      formData.append('amount', amount);
      formData.append('note', note);
      if (file) {
        formData.append('screenshot', file);
      }

      var $btn = $('#btn-submit-topup').prop('disabled', true).text('Submitting...');

      $.ajax({
        url: 'api/clients.php?action=submit_topup',
        type: 'POST',
        data: formData,
        contentType: false,
        processData: false,
        dataType: 'json'
      }).done(function(res) {
        if (res.success) {
          Swal.fire({ icon: 'success', title: 'Proof Submitted! 🎉', text: res.message });
          $('#form-submit-topup')[0].reset();
          loadLedger();
          updateInstructionsDisplay();
        } else {
          Swal.fire({ icon: 'error', title: 'Failed', text: res.message });
        }
      }).fail(function() {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Something went wrong. Please try again.' });
      }).always(function() {
        $btn.prop('disabled', false).text('📤 Submit Top-Up Proof');
      });
    });
  }

  return { 
    init: init
  };
}(jQuery));
