/**
 * Influencer Portal — Wallet Ledger Module
 * Allows influencers to monitor their earned points, paid transactions, and pending balance ledger.
 */
window.App = window.App || {};
App.Influencer = App.Influencer || {};

App.Influencer.Wallet = (function ($) {
  'use strict';

  var _walletTable = null;

  function init() {
    if (!App.auth.requireAuth('influencer')) return;
    renderLayout();
    loadBalanceAndStats();
    loadTransactions();
  }

  function renderLayout() {
    $('#page-content').html(`
      <div class="page-header">
        <div>
          <h2>💰 My Wallet Ledger & Payouts</h2>
          <p class="page-subtitle">Track points earned, pending balance, and payout statement history.</p>
        </div>
      </div>

      <!-- KPI Summary Row -->
      <div class="stats-grid" style="margin-bottom:24px">
        <div class="stat-card purple">
          <div class="stat-icon">🎯</div>
          <div class="stat-info">
            <div class="stat-value" id="inf-wal-points">—</div>
            <div class="stat-label">Total Points Earned</div>
          </div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <div class="stat-value" id="inf-wal-balance">—</div>
            <div class="stat-label">Current Balance (Pending)</div>
          </div>
        </div>
        <div class="stat-card coral">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-value" id="inf-wal-paid">—</div>
            <div class="stat-label">Total Paid Out</div>
          </div>
        </div>
      </div>

      <!-- Transaction Ledger Card -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">📋 Transaction Payout Statements</span>
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-inf-wallet-history" class="dataTable" style="width:100%">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Points Impact</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Note / Details</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colspan="6" style="text-align:center;padding:16px;color:var(--text-muted)">Loading statements...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  }

  function loadBalanceAndStats() {
    App.api.points.myPoints()
      .done(function (res) {
        var d = res.data;
        $('#inf-wal-points').text((d.total_points || 0).toLocaleString());
        $('#inf-wal-balance').text((d.currency || 'BHD') + ' ' + parseFloat(d.pending_amount || 0).toFixed(3));
        $('#inf-wal-paid').text((d.currency || 'BHD') + ' ' + parseFloat(d.paid_amount || 0).toFixed(3));
      });
  }

  function loadTransactions() {
    if (_walletTable) {
      _walletTable.destroy();
    }

    App.api.wallet.myTransactions()
      .done(function (res) {
        var items = res.data || [];
        var tbody = '';

        items.forEach(function (t) {
          var pts = t.points ? parseFloat(t.points).toFixed(2) : '0.00';
          var amt = t.amount ? parseFloat(t.amount).toFixed(3) : '0.000';
          
          var ptsPrefix = t.type === 'credit' ? '+' : '-';
          var ptsColor = t.type === 'credit' ? '#22C55E' : '#EF4444';
          var ptsDisplay = `<span style="font-weight:600;color:${ptsColor}">${ptsPrefix}${pts} pts</span>`;

          var amtPrefix = t.type === 'credit' ? '+' : '-';
          var amtColor = t.type === 'credit' ? '#22C55E' : '#EF4444';
          var amtDisplay = `<strong style="color:${amtColor}">${amtPrefix}${amt} BHD</strong>`;

          var typeBadge = t.type === 'credit' 
            ? '<span class="badge" style="background:#D1FAE5;color:#22C55E;font-size:0.75rem;padding:3px 8px;border-radius:6px">CREDIT</span>'
            : '<span class="badge" style="background:#FEE2E2;color:#EF4444;font-size:0.75rem;padding:3px 8px;border-radius:6px">DEBIT</span>';
          
          var statusBadge = t.status === 'paid'
            ? '<span class="badge" style="background:#22C55E;color:#fff;font-size:0.75rem;padding:3px 8px;border-radius:6px">Paid</span>'
            : '<span class="badge" style="background:#F59E0B;color:#fff;font-size:0.75rem;padding:3px 8px;border-radius:6px">Pending</span>';

          var date = new Date(t.created_at).toLocaleString();

          tbody += `
            <tr>
              <td>${date}</td>
              <td>${typeBadge}</td>
              <td>${ptsDisplay}</td>
              <td>${amtDisplay}</td>
              <td>${statusBadge}</td>
              <td style="color:var(--text-muted);font-size:0.88rem">${t.note || '—'}</td>
            </tr>
          `;
        });

        $('#tbl-inf-wallet-history tbody').html(tbody || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">No statements recorded yet.</td></tr>');

        if (tbody) {
          _walletTable = $('#tbl-inf-wallet-history').DataTable({
            order: [[0, 'desc']],
            pageLength: 10,
            dom: 'rftip'
          });
        }
      })
      .fail(App.api.handleError);
  }

  return { init };
}(jQuery));
