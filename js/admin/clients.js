/**
 * Admin — Clients Module
 * Handles client creation, management, wallets and transaction ledgers.
 */
window.App = window.App || {};
App.Admin = App.Admin || {};

App.Admin.Clients = (function ($) {
  'use strict';

  var _editId = null;
  var _activeClientIdForWallet = null;

  function init() {
    if (!App.auth.requireAuth('admin')) return;
    render();
    loadTable();
    bindEvents();
  }

  function render() {
    $('#page-content').html(`
      <div class="page-header">
        <div>
          <h2>🏢 Manage Clients</h2>
          <p class="page-subtitle">Configure client login accounts, associate products, and manage wallet credits ledger.</p>
        </div>
        <button class="btn btn-primary" id="btn-add-client">
          ➕ Add New Client
        </button>
      </div>

      <div class="kpi-grid grid-3" style="margin-bottom:24px">
        <div class="kpi-card glass">
          <div class="kpi-icon" style="background:rgba(108,99,255,0.1);color:#6C63FF">🏢</div>
          <div class="kpi-info">
            <div class="kpi-value" id="kpi-total-clients">-</div>
            <div class="kpi-label">Total Clients</div>
          </div>
        </div>
        <div class="kpi-card glass">
          <div class="kpi-icon" style="background:rgba(34,197,94,0.1);color:#22C55E">✅</div>
          <div class="kpi-info">
            <div class="kpi-value" id="kpi-active-clients">-</div>
            <div class="kpi-label">Active Clients</div>
          </div>
        </div>
        <div class="kpi-card glass">
          <div class="kpi-icon" style="background:rgba(234,179,8,0.1);color:#EAB308">💰</div>
          <div class="kpi-info">
            <div class="kpi-value" id="kpi-total-balance">-</div>
            <div class="kpi-label">Total Client Funds</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-clients" class="dataTable" style="width:100%">
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Products</th>
                  <th>Wallet Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="tbl-clients-body">
                <tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">Loading clients...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Add/Edit Client Modal -->
      <div id="modal-client" class="custom-modal" style="display:none">
        <div class="modal-overlay">
          <div class="modal-box">
            <div class="modal-header">
              <span class="modal-title" id="modal-client-title">Add Client</span>
              <button class="modal-close" id="btn-close-modal-client">✕</button>
            </div>
            <div class="modal-body">
              <form id="form-client" autocomplete="off">
                <input type="hidden" id="client-id">
                <div class="form-group">
                  <label class="form-label">Company / Client Name <span class="req">*</span></label>
                  <input type="text" class="form-control" id="client-name" placeholder="Enter company name" required>
                </div>
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">Email Address <span class="req">*</span></label>
                    <input type="email" class="form-control" id="client-email" placeholder="client@example.com" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Password <span class="req" id="client-pass-req">*</span></label>
                    <input type="password" class="form-control" id="client-password" placeholder="Min 6 characters">
                  </div>
                </div>
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">Phone Number</label>
                    <input type="text" class="form-control" id="client-phone" placeholder="e.g. 33334444">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Country Code</label>
                    <select class="form-control" id="client-country-code"></select>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Account Status</label>
                  <select class="form-control" id="client-status">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div class="modal-footer" style="padding-top:16px">
                  <button type="button" class="btn btn-secondary" id="btn-cancel-client">Cancel</button>
                  <button type="submit" class="btn btn-primary">Save Client</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <!-- Ledger / Wallet Transaction Modal -->
      <div id="modal-wallet" class="custom-modal" style="display:none">
        <div class="modal-overlay" style="background:rgba(0,0,0,0.6)">
          <div class="modal-box" style="max-width:900px; width:95%">
            <div class="modal-header">
              <span class="modal-title">💰 Client Wallet Ledger & Transaction Log</span>
              <button class="modal-close" id="btn-close-modal-wallet">✕</button>
            </div>
            <div class="modal-body">
              <div class="grid-2" style="grid-template-columns: 1fr 1.6fr; gap: 24px">
                
                <!-- Left panel: Add funds credit form -->
                <div style="border-right: 1px solid var(--border); padding-right:24px">
                  <div class="card" style="background:var(--card-bg); border:1px solid var(--border); margin-bottom:16px">
                    <div class="card-body" style="padding:16px; text-align:center">
                      <div class="kpi-label">Current Ledger Balance</div>
                      <div class="kpi-value" id="wallet-modal-balance" style="color:#22C55E; font-size:2rem; margin:8px 0">0.000 BHD</div>
                      <div class="kpi-label" id="wallet-modal-client-name" style="font-weight:bold">-</div>
                    </div>
                  </div>

                  <h3 style="font-size:1.1rem; margin-bottom:12px; color:var(--text)">➕ Add Credit Funds</h3>
                  <form id="form-wallet-add-funds">
                    <div class="form-group">
                      <label class="form-label">Amount (BHD) <span class="req">*</span></label>
                      <input type="number" step="0.001" min="0.001" class="form-control" id="wallet-amount" placeholder="e.g. 50.000" required style="font-size:1.1rem; font-weight:bold">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Collection Payment Method <span class="req">*</span></label>
                      <select class="form-control" id="wallet-payment-method" required>
                        <option value="cash">💵 Cash Payment</option>
                        <option value="bank_transfer">🏦 Bank Transfer</option>
                        <option value="cheque">✍️ Cheque Payment</option>
                        <option value="qr_pay">📱 QR Pay / BenefitPay</option>
                        <option value="system">⚙️ System Adjust (Debit/Credit)</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Note / Reference ID</label>
                      <textarea class="form-control" id="wallet-note" rows="2" placeholder="e.g. Reference No / Cheque No / Cash receipt details"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center; padding:12px">
                      💰 Record Transaction (Credit)
                    </button>
                  </form>
                </div>

                <!-- Right panel: Ledger transactions list -->
                <div>
                  <h3 style="font-size:1.1rem; margin-bottom:12px; color:var(--text)">📋 Ledger Transactions</h3>
                  <div style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border); border-radius:8px">
                    <table class="dataTable" style="width:100%; font-size:0.88rem; margin:0">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Method</th>
                          <th>Amount</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody id="wallet-ledger-body">
                        <tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">No transactions found</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    // Populate country codes dropdown using App.countries.renderSelect helper
    App.countries.renderSelect('client-country-code', '+973');
  }

  function loadTable() {
    App.api.clients.list()
      .done(function (res) {
        var clientsList = res.data;
        
        // Calculate KPI summaries
        var total = clientsList.length;
        var active = clientsList.filter(function(c){ return c.status === 'active'; }).length;
        var totalBal = clientsList.reduce(function(acc, c){ return acc + parseFloat(c.wallet_balance || 0); }, 0);

        $('#kpi-total-clients').text(total);
        $('#kpi-active-clients').text(active);
        $('#kpi-total-balance').text(totalBal.toFixed(3) + ' BHD');

        var rowsHtml = '';
        if (clientsList.length === 0) {
          rowsHtml = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">No clients registered. Click Add New Client to start!</td></tr>`;
        } else {
          clientsList.forEach(function (c) {
            var statusBadge = c.status === 'active' 
              ? `<span class="badge badge-success">Active</span>` 
              : `<span class="badge badge-danger">Inactive</span>`;
            
            var balanceVal = parseFloat(c.wallet_balance || 0);
            var balanceColor = balanceVal >= 0.100 ? '#22C55E' : '#EF4444';
            var balanceHtml = `<span style="font-weight:bold;color:${balanceColor}">${balanceVal.toFixed(3)} BHD</span>`;

            rowsHtml += `
              <tr data-id="${c.id}">
                <td>Client #${c.id}</td>
                <td>
                  <strong style="color:var(--primary); font-size:0.95rem">${c.name}</strong>
                  <div style="font-size:0.75rem; color:var(--text-muted)">Joined ${new Date(c.created_at).toLocaleDateString()}</div>
                </td>
                <td>${c.email}</td>
                <td>${c.country_code} ${c.phone || '-'}</td>
                <td>
                  <span class="badge badge-info" style="font-size:0.85rem">${c.total_products} Products</span>
                </td>
                <td>${balanceHtml}</td>
                <td>
                  <label class="switch-toggle" style="cursor:pointer">
                    <input type="checkbox" class="toggle-client-status" ${c.status === 'active' ? 'checked' : ''}>
                    <span class="switch-slider"></span>
                  </label>
                </td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn-icon btn-wallet" title="Client Wallet Ledger" style="background:#EAB308;color:#fff">💰</button>
                    <button class="btn-icon btn-edit" title="Edit Profile" style="background:#6C63FF;color:#fff">✏️</button>
                    <button class="btn-icon btn-delete" title="Delete Account" style="background:#EF4444;color:#fff">🗑️</button>
                  </div>
                </td>
              </tr>
            `;
          });
        }
        $('#tbl-clients-body').html(rowsHtml);
      })
      .fail(function (err) {
        App.api.handleError(err);
      });
  }

  function bindEvents() {
    // Add Client modal show
    $('#btn-add-client').on('click', function () {
      _editId = null;
      $('#form-client')[0].reset();
      $('#client-id').val('');
      $('#modal-client-title').text('🏢 Add New Client Account');
      $('#client-pass-req').show();
      $('#client-password').prop('required', true);
      $('#modal-client').show();
    });

    // Close modals
    $('#btn-close-modal-client, #btn-cancel-client').on('click', function () {
      $('#modal-client').hide();
    });

    $('#btn-close-modal-wallet').on('click', function () {
      $('#modal-wallet').hide();
    });

    // Submit Client form
    $('#form-client').on('submit', function (e) {
      e.preventDefault();
      var data = {
        id:           _editId,
        name:         $('#client-name').val().trim(),
        email:        $('#client-email').val().trim(),
        password:     $('#client-password').val(),
        phone:        $('#client-phone').val().trim(),
        country_code: $('#client-country-code').val(),
        status:       $('#client-status').val(),
      };

      var actionPromise = _editId 
        ? App.api.clients.update(data) 
        : App.api.clients.create(data);

      actionPromise
        .done(function (res) {
          Swal.fire({ icon: 'success', title: 'Success', text: res.message, timer: 1200, showConfirmButton: false });
          $('#modal-client').hide();
          loadTable();
        })
        .fail(function (err) {
          App.api.handleError(err);
        });
    });

    // Edit Client button click
    $(document).on('click', '#tbl-clients .btn-edit', function () {
      var id = $(this).closest('tr').data('id');
      App.api.clients.get(id)
        .done(function (res) {
          var c = res.data;
          _editId = c.id;
          $('#client-id').val(c.id);
          $('#client-name').val(c.name);
          $('#client-email').val(c.email);
          $('#client-password').val('');
          $('#client-password').prop('required', false);
          $('#client-pass-req').hide();
          $('#client-phone').val(c.phone || '');
          $('#client-country-code').val(c.country_code || '+973');
          $('#client-status').val(c.status);

          $('#modal-client-title').text('✏️ Edit Client: ' + c.name);
          $('#modal-client').show();
        })
        .fail(function (err) {
          App.api.handleError(err);
        });
    });

    // Toggle Status change
    $(document).on('change', '#tbl-clients .toggle-client-status', function () {
      var id = $(this).closest('tr').data('id');
      App.api.clients.toggleStatus(id)
        .done(function (res) {
          Swal.fire({ icon: 'success', title: 'Success', text: res.message, timer: 1000, showConfirmButton: false });
          loadTable();
        })
        .fail(function (err) {
          App.api.handleError(err);
        });
    });

    // Delete Client
    $(document).on('click', '#tbl-clients .btn-delete', function () {
      var id = $(this).closest('tr').data('id');
      Swal.fire({
        title: 'Delete Client account?',
        text: 'All associated products will lose their client reference! This action is permanent.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Yes, Delete',
      }).then(function (res) {
        if (res.isConfirmed) {
          App.api.clients.delete(id)
            .done(function (resMsg) {
              Swal.fire('Deleted!', 'Client account has been removed.', 'success');
              loadTable();
            })
            .fail(function (err) {
              App.api.handleError(err);
            });
        }
      });
    });

    // Open Wallet / Ledger Modal
    $(document).on('click', '#tbl-clients .btn-wallet', function () {
      var id = $(this).closest('tr').data('id');
      _activeClientIdForWallet = id;

      $('#form-wallet-add-funds')[0].reset();
      $('#wallet-modal-client-name').text('Loading...');
      $('#wallet-modal-balance').text('0.000 BHD');
      $('#wallet-ledger-body').html('<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">Loading transactions...</td></tr>');
      
      // Load details & ledger
      loadLedgerDetails(id);
      $('#modal-wallet').show();
    });

    // Submit Add Funds (Credit Wallet Ledger)
    $('#form-wallet-add-funds').on('submit', function (e) {
      e.preventDefault();
      var amount = parseFloat($('#wallet-amount').val());
      var method = $('#wallet-payment-method').val();
      var note = $('#wallet-note').val().trim();

      if (amount <= 0 || isNaN(amount)) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Please enter a valid positive amount.' });
        return;
      }

      App.api.clients.addFunds({
        client_id:      _activeClientIdForWallet,
        amount:         amount,
        payment_method: method,
        note:           note
      }).done(function (res) {
        Swal.fire({ icon: 'success', title: 'Funds Credited', text: 'Credit transaction logged successfully.', timer: 1200, showConfirmButton: false });
        $('#form-wallet-add-funds')[0].reset();
        loadLedgerDetails(_activeClientIdForWallet);
        loadTable(); // Refresh balance in main table
      }).fail(function (err) {
        App.api.handleError(err);
      });
    });
  }

  function loadLedgerDetails(clientId) {
    // 1. Get Client balance & name
    App.api.clients.get(clientId).done(function (res) {
      var c = res.data;
      $('#wallet-modal-client-name').text(c.name);
      var balanceVal = parseFloat(c.wallet_balance || 0);
      var balanceColor = balanceVal >= 0.100 ? '#22C55E' : '#EF4444';
      $('#wallet-modal-balance').text(balanceVal.toFixed(3) + ' BHD').css('color', balanceColor);
    });

    // 2. Load Ledger
    App.api.clients.ledger(clientId).done(function (res) {
      var logs = res.data;
      var html = '';
      if (logs.length === 0) {
        html = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">No ledger logs.</td></tr>`;
      } else {
        var paymentMethodLabels = {
          cash: '💵 Cash',
          bank_transfer: '🏦 Bank Transfer',
          cheque: '✍️ Cheque',
          qr_pay: '📱 BenefitPay / QR',
          system: '⚙️ System Auto'
        };

        logs.forEach(function (l) {
          var isCredit = l.type === 'credit';
          var amountColor = isCredit ? '#22C55E' : '#EF4444';
          var typeBadge = isCredit 
            ? `<span class="badge badge-success" style="font-size:0.75rem">Credit</span>` 
            : `<span class="badge badge-danger" style="font-size:0.75rem">Debit</span>`;
          
          var amountPrefix = isCredit ? '+' : '-';
          var paymentMethodName = paymentMethodLabels[l.payment_method] || l.payment_method;

          html += `
            <tr>
              <td>
                <div style="font-size:0.8rem; font-weight:500">${new Date(l.created_at).toLocaleDateString()}</div>
                <div style="font-size:0.7rem; color:var(--text-muted)">${new Date(l.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              </td>
              <td>${typeBadge}</td>
              <td><span style="font-size:0.8rem">${paymentMethodName}</span></td>
              <td>
                <strong style="color:${amountColor}">${amountPrefix}${parseFloat(l.amount).toFixed(3)}</strong>
              </td>
              <td style="max-width:180px; word-wrap:break-word; font-size:0.8rem">${l.note || '-'}</td>
            </tr>
          `;
        });
      }
      $('#wallet-ledger-body').html(html);
    });
  }

  return { init };
}(jQuery));
