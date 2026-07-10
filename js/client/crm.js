/**
 * Client Portal — CRM Follow-ups & Call Logs Module
 * Allows clients to filter/view leads marked as important, log calls, and view follow-up timelines.
 */
window.App = window.App || {};
App.Client = App.Client || {};

App.Client.Crm = (function ($) {
  'use strict';

  var _crmTable = null;

  var statusLabels = {
    pending: '<span class="badge" style="background:#6B7280;color:#fff;font-size:0.75rem;padding:3px 8px;border-radius:6px">⏳ Pending</span>',
    no_answer: '<span class="badge" style="background:#EF4444;color:#fff;font-size:0.75rem;padding:3px 8px;border-radius:6px">🔴 No Answer</span>',
    busy: '<span class="badge" style="background:#F59E0B;color:#fff;font-size:0.75rem;padding:3px 8px;border-radius:6px">🟡 Busy</span>',
    wrong_number: '<span class="badge" style="background:#374151;color:#fff;font-size:0.75rem;padding:3px 8px;border-radius:6px">❌ Wrong Number</span>',
    interested: '<span class="badge" style="background:#10B981;color:#fff;font-size:0.75rem;padding:3px 8px;border-radius:6px">🟢 Interested</span>',
    not_interested: '<span class="badge" style="background:#F97316;color:#fff;font-size:0.75rem;padding:3px 8px;border-radius:6px">⚠️ Not Interested</span>',
    completed: '<span class="badge" style="background:#06B6D4;color:#fff;font-size:0.75rem;padding:3px 8px;border-radius:6px">✅ Completed</span>'
  };

  var statusTimelineBadges = {
    pending: '<span class="badge" style="background:#6B7280;color:#fff;font-size:0.7rem;padding:2px 6px;border-radius:4px">Pending</span>',
    no_answer: '<span class="badge" style="background:#EF4444;color:#fff;font-size:0.7rem;padding:2px 6px;border-radius:4px">No Answer</span>',
    busy: '<span class="badge" style="background:#F59E0B;color:#fff;font-size:0.7rem;padding:2px 6px;border-radius:4px">Busy</span>',
    wrong_number: '<span class="badge" style="background:#374151;color:#fff;font-size:0.7rem;padding:2px 6px;border-radius:4px">Wrong Number</span>',
    interested: '<span class="badge" style="background:#10B981;color:#fff;font-size:0.7rem;padding:2px 6px;border-radius:4px">Interested</span>',
    not_interested: '<span class="badge" style="background:#F97316;color:#fff;font-size:0.7rem;padding:2px 6px;border-radius:4px">Not Interested</span>',
    completed: '<span class="badge" style="background:#06B6D4;color:#fff;font-size:0.7rem;padding:2px 6px;border-radius:4px">Completed</span>'
  };

  var statusColors = {
    pending: '#6B7280',
    no_answer: '#EF4444',
    busy: '#F59E0B',
    wrong_number: '#374151',
    interested: '#10B981',
    not_interested: '#F97316',
    completed: '#06B6D4'
  };

  var platformIcons = {
    instagram: '📸 Instagram',
    tiktok: '🎵 TikTok',
    youtube: '📺 YouTube',
    snapchat: '👻 Snapchat',
    twitter: '🐦 Twitter'
  };

  function init() {
    if (!App.auth.requireAuth('client')) return;
    renderLayout();
    loadProductsFilter();
    loadCrmLeads(0);
    bindEvents();
  }

  function renderLayout() {
    $('#page-content').html(`
      <div class="page-header">
        <div>
          <h2>📞 CRM & Call Follow-ups</h2>
          <p class="page-subtitle">Track conversation history, schedule call outcomes, and manage important leads.</p>
        </div>
        <div>
          <select class="form-control" id="crm-leads-product-filter" style="width:200px">
            <option value="0">All Products</option>
          </select>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">📞 Lead CRM List</span></div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-client-crm-leads" class="dataTable" style="width:100%">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Visitor Name</th>
                  <th>Contact Info</th>
                  <th>Campaign Promo</th>
                  <th>Platform</th>
                  <th>Product</th>
                  <th>Lead Date</th>
                  <th>Last Call</th>
                  <th style="width:90px">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colspan="9" style="text-align:center;padding:16px;color:var(--text-muted)">Loading CRM leads...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal Backdrop for Logging Call outcome -->
      <div class="modal-backdrop" id="modal-crm-call" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; align-items:center; justify-content:center">
        <div class="card" style="width:100%; max-width:800px; margin:20px; max-height:90vh; overflow-y:auto; border-radius:12px; box-shadow:0 8px 30px rgba(0,0,0,0.3)">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding:16px 20px">
            <span class="card-title" style="margin:0; font-size:1.1rem">📞 Log Call follow-up</span>
            <button class="btn btn-sm btn-secondary btn-close-crm-modal" style="padding:4px 8px; font-size:1.2rem; cursor:pointer; background:none; border:none; color:var(--text-muted)">&times;</button>
          </div>
          <div class="card-body" style="padding:20px">
            
            <!-- Lead Details Summary Card -->
            <div style="background:var(--border-light); border:1px solid var(--border); border-radius:8px; padding:12px 16px; margin-bottom:20px; display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; font-size:0.88rem">
              <div><strong>Visitor Name:</strong> <span id="crm-lead-name">—</span></div>
              <div><strong>Visitor Phone:</strong> <span id="crm-lead-phone">—</span></div>
              <div><strong>Promo Code:</strong> <span id="crm-lead-promo">—</span></div>
              <div><strong>Registered On:</strong> <span id="crm-lead-date">—</span></div>
            </div>

            <div class="grid-2" style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px">
              
              <!-- Left Column: Add entry -->
              <div>
                <h4 style="margin-top:0; margin-bottom:12px; font-size:1rem; color:var(--primary)">📋 Log Call Details</h4>
                <input type="hidden" id="crm-lead-event-id">
                
                <div class="form-group" style="margin-bottom:16px">
                  <label class="form-label" style="font-weight:600">Call Status</label>
                  <select class="form-control" id="crm-call-status" style="width:100%">
                    <option value="pending">⏳ Pending (Not Called)</option>
                    <option value="no_answer">🔴 No Answer</option>
                    <option value="busy">🟡 Busy</option>
                    <option value="wrong_number">❌ Wrong Number</option>
                    <option value="interested">🟢 Interested</option>
                    <option value="not_interested">⚠️ Not Interested</option>
                    <option value="completed">✅ Completed / Follow-up Scheduled</option>
                  </select>
                </div>

                <div class="form-group" style="margin-bottom:20px">
                  <label class="form-label" style="font-weight:600">Conversation Feedback Notes</label>
                  <textarea class="form-control" id="crm-call-feedback" rows="5" placeholder="Write feedback notes from the conversation here..." style="resize:vertical; width:100%"></textarea>
                </div>

                <button class="btn btn-primary" id="btn-save-crm-call" style="width:100%; font-weight:600">💾 Save Call Log</button>
              </div>

              <!-- Right Column: Timeline history -->
              <div>
                <h4 style="margin-top:0; margin-bottom:12px; font-size:1rem; color:var(--text-muted)">⏳ Follow-up History Timeline</h4>
                
                <div style="max-height:280px; overflow-y:auto; padding-right:8px" id="crm-call-history-container">
                  <div style="text-align:center; padding:20px; color:var(--text-muted)">Loading timeline...</div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    `);
  }

  function loadProductsFilter() {
    App.api.clientAnalytics.byProduct()
      .done(function (res) {
        var $sel = $('#crm-leads-product-filter');
        $sel.html('<option value="0">All Products</option>');
        res.forEach(function (p) {
          $sel.append('<option value="' + p.product_id + '">' + p.product_name + '</option>');
        });
      });
  }

  function loadCrmLeads(productId) {
    if (_crmTable) {
      _crmTable.destroy();
    }

    App.api.clientAnalytics.crmLeads(productId)
      .done(function (res) {
        var tbody = '';
        res.forEach(function (r) {
          var statusBadge = statusLabels[r.last_call_status || 'pending'];
          var contact = (r.visitor_country_code || '') + ' ' + (r.visitor_phone || '');
          var lastCall = r.last_call_date ? new Date(r.last_call_date).toLocaleString() : 'Never Called';
          var promo = '<code style="font-size:0.9rem;background:var(--primary-light);color:var(--primary);padding:3px 6px;border-radius:4px">' + r.offer_code + '</code>';
          var source = '<span style="font-size:0.85rem">' + (platformIcons[r.platform] || r.platform || '🌐 Link') + '</span>';
          var date = new Date(r.timestamp).toLocaleString();

          tbody += `
            <tr>
              <td>\${statusBadge}</td>
              <td style="font-weight:600;color:var(--text)">\${r.visitor_name || 'Unknown'}</td>
              <td>\${contact}</td>
              <td>\${promo}</td>
              <td>\${source}</td>
              <td style="font-weight:500">\${r.product_name}</td>
              <td style="font-size:0.85rem">\${date}</td>
              <td style="font-size:0.85rem;color:var(--text-muted)">\${lastCall}</td>
              <td>
                <button class="btn btn-primary btn-sm btn-open-call" 
                        data-id="\${r.id}" 
                        data-name="\${r.visitor_name || 'Unknown'}" 
                        data-phone="\${contact}" 
                        data-promo="\${r.product_name} (\${r.offer_code})" 
                        data-date="\${date}" 
                        data-status="\${r.last_call_status || 'pending'}"
                        style="font-size:0.78rem;padding:4px 10px;white-space:nowrap">
                  📞 Call Log
                </button>
              </td>
            </tr>
          `;
        });

        $('#tbl-client-crm-leads tbody').html(tbody || '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted)">No important leads available. Mark leads as important on the dashboard to track calls.</td></tr>');

        if (tbody) {
          _crmTable = $('#tbl-client-crm-leads').DataTable({
            order: [[6, 'desc']],
            pageLength: 10,
            dom: 'rftip'
          });
        }
      })
      .fail(App.api.handleError);
  }

  function loadCallHistory(eventId) {
    var $container = $('#crm-call-history-container');
    $container.html('<div style="text-align:center;padding:20px;color:var(--text-muted)">Loading timeline...</div>');

    App.api.clientAnalytics.callHistory(eventId)
      .done(function (res) {
        if (!res.length) {
          $container.html('<div style="text-align:center;padding:32px 10px;color:var(--text-muted);font-size:0.9rem">💡 No calls logged yet. Select a status and add feedback to register your first follow-up entry!</div>');
          return;
        }

        var html = '<div class="crm-timeline" style="position:relative; padding-left:20px; border-left:2px solid var(--border); margin-left:12px; margin-top:8px">';
        
        res.forEach(function (c) {
          var badge = statusTimelineBadges[c.status || 'pending'];
          var color = statusColors[c.status || 'pending'] || '#6B7280';
          var date = new Date(c.created_at).toLocaleString();
          var note = c.feedback ? c.feedback.replace(/\\n/g, '<br>') : '<span style="font-style:italic;color:var(--text-muted)">No notes recorded.</span>';

          html += `
            <div style="position:relative; margin-bottom:20px">
              <div style="position:absolute; left:-27px; top:3px; width:12px; height:12px; border-radius:50%; background:\${color}; border:2px solid #fff; box-shadow: 0 0 0 2px \${color}33"></div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-muted); margin-bottom:4px">
                \${badge}
                <span>\${date}</span>
              </div>
              <div style="font-size:0.83rem; color:var(--text); background:rgba(0,0,0,0.02); padding:8px 12px; border-radius:6px; border:1px solid var(--border)">
                \${note}
              </div>
            </div>
          `;
        });

        html += '</div>';
        $container.html(html);
      })
      .fail(function (err) {
        $container.html('<div style="text-align:center;padding:20px;color:#EF4444">Error loading history.</div>');
      });
  }

  function bindEvents() {
    // Filter change
    $('#crm-leads-product-filter').off('change').on('change', function () {
      loadCrmLeads($(this).val());
    });

    // Open Modal button
    $(document).off('click', '.btn-open-call').on('click', '.btn-open-call', function () {
      var $btn = $(this);
      var eId = $btn.data('id');
      
      $('#crm-lead-event-id').val(eId);
      $('#crm-lead-name').text($btn.data('name'));
      $('#crm-lead-phone').text($btn.data('phone'));
      $('#crm-lead-promo').text($btn.data('promo'));
      $('#crm-lead-date').text($btn.data('date'));
      
      $('#crm-call-status').val($btn.data('status'));
      $('#crm-call-feedback').val('');

      $('#modal-crm-call').css('display', 'flex');
      loadCallHistory(eId);
    });

    // Close Modal button
    $(document).off('click', '.btn-close-crm-modal').on('click', '.btn-close-crm-modal', function () {
      $('#modal-crm-call').hide();
    });

    // Close Modal on backdrop click
    $('#modal-crm-call').off('click').on('click', function (e) {
      if (e.target === this) {
        $(this).hide();
      }
    });

    // Save Call Log
    $('#btn-save-crm-call').off('click').on('click', function () {
      var eId = $('#crm-lead-event-id').val();
      var status = $('#crm-call-status').val();
      var feedback = $('#crm-call-feedback').val();

      if (!status) {
        alert('Please select a call status.');
        return;
      }

      var $btn = $(this);
      $btn.prop('disabled', true).text('Saving…');

      App.api.clientAnalytics.logCall({ event_id: eId, status: status, feedback: feedback })
        .done(function () {
          $btn.prop('disabled', false).html('💾 Save Call Log');
          $('#crm-call-feedback').val('');
          
          // Refresh details & list
          loadCallHistory(eId);
          
          var pId = $('#crm-leads-product-filter').val();
          loadCrmLeads(pId);
        })
        .fail(function (err) {
          $btn.prop('disabled', false).html('💾 Save Call Log');
          App.api.handleError(err);
        });
    });
  }

  return { init };
}(jQuery));
