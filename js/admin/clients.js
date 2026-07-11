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
    loadCategories();
    bindEvents();
  }

  function loadCategories() {
    App.api.users.categories()
      .done(function (res) {
        var opts = '<option value="">— Select Category —</option>';
        (res.data || []).forEach(function (c) {
          opts += '<option value="' + c.name + '">' + c.name + '</option>';
        });
        $('#client-company-category').html(opts);
      });
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
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">Company / Client Name <span class="req">*</span></label>
                    <input type="text" class="form-control" id="client-name" placeholder="Enter company name" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Company Category <span class="req">*</span></label>
                    <select class="form-control" id="client-company-category" required>
                      <option value="">Loading categories...</option>
                    </select>
                  </div>
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
                <div class="form-group" style="margin-top:16px">
                  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;font-weight:600;color:var(--text)">
                    <input type="checkbox" id="client-profile-locked" style="width:18px;height:18px;accent-color:var(--primary)">
                    <span>🔒 Lock Name/Details (Verified)</span>
                  </label>
                  <p class="form-helper" style="font-size:0.75rem;color:var(--text-muted);margin:4px 0 0 26px">When checked, the vendor/client cannot modify their company name.</p>
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
          <div class="modal-box" style="max-width:1200px; width:95%">
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

                  <h3 style="font-size:1.1rem; margin-bottom:12px; color:var(--text)">➕ Add Transaction</h3>
                  <form id="form-wallet-add-funds">
                    <div class="form-group">
                      <label class="form-label">Amount (BHD) <span class="req">*</span></label>
                      <input type="number" step="0.001" min="0.001" class="form-control" id="wallet-amount" placeholder="e.g. 50.000" required style="font-size:1.1rem; font-weight:bold">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Payment Method <span class="req">*</span></label>
                      <select class="form-control" id="wallet-payment-method" required>
                        <option value="cash">💵 Cash Payment</option>
                        <option value="bank_transfer">🏦 Bank Transfer</option>
                        <option value="cheque">✍️ Cheque Payment</option>
                        <option value="qr_pay">📱 QR Pay / BenefitPay</option>
                        <option value="system">⚙️ System Adjust (Debit/Credit)</option>
                      </select>
                    </div>
                    <div class="form-group" id="system-adjust-type-row" style="display:none;background:rgba(108,99,255,0.07);border:1px solid rgba(108,99,255,0.2);border-radius:8px;padding:10px 14px">
                      <label class="form-label" style="margin-bottom:8px">Transaction Type</label>
                      <div style="display:flex;gap:16px">
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;color:#22C55E">
                          <input type="radio" name="system-tx-type" id="system-tx-credit" value="credit" checked style="accent-color:#22C55E"> ➕ Credit
                        </label>
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;color:#EF4444">
                          <input type="radio" name="system-tx-type" id="system-tx-debit" value="debit" style="accent-color:#EF4444"> ➖ Debit
                        </label>
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Note / Reference ID</label>
                      <textarea class="form-control" id="wallet-note" rows="2" placeholder="e.g. Reference No / Cheque No / Cash receipt details"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary" id="btn-wallet-submit" style="width:100%; justify-content:center; padding:12px">
                      💰 Record Transaction (Credit)
                    </button>
                  </form>
                </div>

                <!-- Right panel: Ledger transactions list -->
                <div>
                  <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
                    <h3 style="font-size:1.1rem;margin:0;color:var(--text);flex:1">📋 Ledger Transactions</h3>
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                      <label style="font-size:0.78rem;color:var(--text-muted);white-space:nowrap">From</label>
                      <input type="date" id="ledger-date-from" class="form-control" style="font-size:0.82rem;padding:5px 8px;width:135px">
                      <label style="font-size:0.78rem;color:var(--text-muted);white-space:nowrap">To</label>
                      <input type="date" id="ledger-date-to" class="form-control" style="font-size:0.82rem;padding:5px 8px;width:135px">
                    </div>
                  </div>

                  <!-- Summary Cards -->
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
                    <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:10px;padding:10px 12px;text-align:center">
                      <div style="font-size:0.72rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Total Collection</div>
                      <div id="ledger-total-credit" style="font-size:1.1rem;font-weight:700;color:#22C55E;margin-top:4px">0.000 BHD</div>
                    </div>
                    <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:10px;padding:10px 12px;text-align:center">
                      <div style="font-size:0.72rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Total Paid (Debits)</div>
                      <div id="ledger-total-debit" style="font-size:1.1rem;font-weight:700;color:#EF4444;margin-top:4px">0.000 BHD</div>
                    </div>
                  </div>

                  <div style="max-height: 320px; overflow-y: auto; border: 1px solid var(--border); border-radius:8px">
                    <table class="dataTable" style="width:100%; font-size:0.88rem; margin:0">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Method</th>
                          <th>Amount</th>
                          <th>Note</th>
                          <th style="width:40px"></th>
                        </tr>
                      </thead>
                      <tbody id="wallet-ledger-body">
                        <tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">No transactions found</td></tr>
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
                  <div style="font-size:0.75rem; color:var(--text-muted)">Joined ${new Date(c.created_at).toLocaleDateString()} | Category: <strong>${c.company_category || 'Other'}</strong></div>
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
      $('#client-company-category').val('');
      $('#modal-client-title').text('🏢 Add New Client Account');
      $('#client-pass-req').show();
      $('#client-password').prop('required', true);
      $('#client-profile-locked').prop('checked', false);
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
        id:             _editId,
        name:           $('#client-name').val().trim(),
        email:          $('#client-email').val().trim(),
        password:       $('#client-password').val(),
        phone:          $('#client-phone').val().trim(),
        country_code:   $('#client-country-code').val(),
        company_category: $('#client-company-category').val(),
        status:         $('#client-status').val(),
        profile_locked: $('#client-profile-locked').is(':checked') ? 1 : 0
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
          $('#client-company-category').val(c.company_category || '');
          $('#client-status').val(c.status);
          $('#client-profile-locked').prop('checked', parseInt(c.profile_locked) === 1);

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

      // Default date range: current month
      var now    = new Date();
      var y      = now.getFullYear();
      var m      = String(now.getMonth() + 1).padStart(2, '0');
      var d      = String(now.getDate()).padStart(2, '0');
      var firstDay = y + '-' + m + '-01';
      var today    = y + '-' + m + '-' + d;
      $('#ledger-date-from').val(firstDay);
      $('#ledger-date-to').val(today);

      $('#form-wallet-add-funds')[0].reset();
      $('#wallet-modal-client-name').text('Loading...');
      $('#wallet-modal-balance').text('0.000 BHD');
      $('#wallet-ledger-body').html('<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">Loading transactions...</td></tr>');

      // Load details & ledger
      loadLedgerDetails(id, firstDay, today);
      $('#modal-wallet').show();
    });

    // Date range filter change
    $(document).on('change', '#ledger-date-from, #ledger-date-to', function () {
      if (_activeClientIdForWallet) {
        loadLedgerDetails(_activeClientIdForWallet, $('#ledger-date-from').val(), $('#ledger-date-to').val());
      }
    });

    // Delete manual wallet transaction
    $(document).on('click', '.btn-delete-wallet-tx', function () {
      var txId = $(this).data('id');
      Swal.fire({
        title: 'Delete this transaction?',
        text: 'This will permanently remove the entry and reverse its effect on the wallet balance.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Yes, Delete'
      }).then(function (result) {
        if (result.isConfirmed) {
          App.api.clients.deleteWalletTx(txId)
            .done(function () {
              Swal.fire({ icon: 'success', title: 'Deleted', text: 'Transaction removed and balance reversed.', timer: 1200, showConfirmButton: false });
              loadLedgerDetails(_activeClientIdForWallet, $('#ledger-date-from').val(), $('#ledger-date-to').val());
              loadTable();
            })
            .fail(function (err) { App.api.handleError(err); });
        }
      });
    });

    // Show/hide Credit/Debit toggle for System Adjust
    $(document).on('change', '#wallet-payment-method', function () {
      var isSystem = $(this).val() === 'system';
      $('#system-adjust-type-row').toggle(isSystem);
      if (!isSystem) {
        $('#system-tx-credit').prop('checked', true);
        $('#btn-wallet-submit').text('💰 Record Transaction (Credit)').css('background', '');
      }
    });

    // Update button label when credit/debit radio changes
    $(document).on('change', 'input[name="system-tx-type"]', function () {
      var isDebit = $(this).val() === 'debit';
      $('#btn-wallet-submit')
        .text(isDebit ? '➖ Record Transaction (Debit)' : '💰 Record Transaction (Credit)')
        .css('background', isDebit ? '#EF4444' : '');
    });

    // Submit Add Funds (Credit/Debit Wallet Ledger)
    $('#form-wallet-add-funds').on('submit', function (e) {
      e.preventDefault();
      var amount = parseFloat($('#wallet-amount').val());
      var method = $('#wallet-payment-method').val();
      var note   = $('#wallet-note').val().trim();
      var txType = (method === 'system') ? $('input[name="system-tx-type"]:checked').val() : 'credit';

      if (amount <= 0 || isNaN(amount)) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Please enter a valid positive amount.' });
        return;
      }

      App.api.clients.addFunds({
        client_id:        _activeClientIdForWallet,
        amount:           amount,
        payment_method:   method,
        transaction_type: txType,
        note:             note
      }).done(function (res) {
        Swal.fire({ icon: 'success', title: 'Funds Credited', text: 'Credit transaction logged successfully.', timer: 1200, showConfirmButton: false });
        $('#form-wallet-add-funds')[0].reset();
        loadLedgerDetails(_activeClientIdForWallet, $('#ledger-date-from').val(), $('#ledger-date-to').val());
        loadTable(); // Refresh balance in main table
      }).fail(function (err) {
        App.api.handleError(err);
      });
    });
  }

  function loadLedgerDetails(clientId, dateFrom, dateTo) {
    // 1. Get Client balance & name
    App.api.clients.get(clientId).done(function (res) {
      var c = res.data;
      $('#wallet-modal-client-name').text(c.name);
      var balanceVal = parseFloat(c.wallet_balance || 0);
      var balanceColor = balanceVal >= 0.100 ? '#22C55E' : '#EF4444';
      $('#wallet-modal-balance').text(balanceVal.toFixed(3) + ' BHD').css('color', balanceColor);
    });

    // 2. Load Ledger (with optional date filter)
    App.api.clients.ledger(clientId, dateFrom || '', dateTo || '').done(function (res) {
      var logs = res.data;
      var html = '';

      // Calculate summary totals from filtered results
      var totalCredit = 0, totalDebit = 0;
      logs.forEach(function (l) {
        var amt = parseFloat(l.amount) || 0;
        if (l.type === 'credit') totalCredit += amt;
        else totalDebit += amt;
      });
      $('#ledger-total-credit').text(totalCredit.toFixed(3) + ' BHD');
      $('#ledger-total-debit').text(totalDebit.toFixed(3) + ' BHD');

      if (logs.length === 0) {
        html = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">No transactions found for this period.</td></tr>`;
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

          // Only show delete for manual entries (not auto CPC/CPL)
          var noteCheck = (l.note || '').toLowerCase();
          var isAutoEntry = (
            noteCheck.indexOf('cpc click') === 0 || 
            noteCheck.indexOf('cpl lead') === 0
          );
          var deleteBtn = isAutoEntry
            ? '<td></td>'
            : `<td><button class="btn-icon btn-delete-wallet-tx" data-id="${l.id}" title="Delete this entry" style="background:#EF4444;color:#fff;width:26px;height:26px;font-size:0.75rem;padding:0;display:flex;align-items:center;justify-content:center;border-radius:6px;border:none;cursor:pointer">🗑️</button></td>`;

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
              ${deleteBtn}
            </tr>
          `;
        });
      }
      $('#wallet-ledger-body').html(html);
    });
  }

  return { init };
}(jQuery));
