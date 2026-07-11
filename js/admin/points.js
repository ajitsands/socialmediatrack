/**
 * Admin — Points Configuration Module
 */
window.App = window.App || {};
App.Admin = App.Admin || {};

App.Admin.Points = (function ($) {
  'use strict';

  function init() {
    if (!App.auth.requireAuth('admin')) return;
    render();
    loadConfig();
    loadInfluencerPoints();
    bindEvents();
  }

  function render() {
    var t = App.i18n.t.bind(App.i18n);
    $('#page-content').html(`
      <style>
        .points-config-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          margin-bottom: 24px;
        }
        .points-config-col-left {
          border-right: 1px solid var(--border);
          padding-right: 32px;
        }
        @media (max-width: 768px) {
          .points-config-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .points-config-col-left {
            border-right: none;
            padding-right: 0;
            border-bottom: 1px solid var(--border);
            padding-bottom: 20px;
          }
        }
      </style>

      <div class="page-header">
        <div><h2>🎯 ${t('points')}</h2><p class="page-subtitle">Configure how influencers earn points and rewards</p></div>
      </div>

      <!-- Config Card -->
      <div class="card" style="margin-bottom:24px;max-width:900px">
        <div class="card-header"><span class="card-title">⚙️ ${t('points_config')}</span></div>
        <div class="card-body">
          
          <div class="points-config-grid">
            <!-- Left Column: Influencer Reward Rates -->
            <div class="points-config-col-left">
              <h3 style="margin-top:0;margin-bottom:16px;font-size:1.05rem;color:var(--primary)">📢 Influencer Reward Rates</h3>
              
              <div class="form-group" style="margin-bottom:16px">
                <label class="form-label">Conversions Per Point</label>
                <input type="number" class="form-control" id="cfg-cpp" min="1" placeholder="e.g. 100">
                <div class="form-hint">Every X conversions = 1 point</div>
              </div>
              
              <div class="form-group" style="margin-bottom:16px">
                <label class="form-label">Value Per Point</label>
                <input type="number" class="form-control" id="cfg-vpp" min="0.001" step="0.001" placeholder="e.g. 1.000">
                <div class="form-hint">1 point = X currency units</div>
              </div>
              
              <div class="form-group" style="margin-bottom:16px">
                <label class="form-label">Clicks Per Point</label>
                <input type="number" class="form-control" id="cfg-clicks-pp" min="1" placeholder="e.g. 1000">
                <div class="form-hint">Every X clicks = 1 point</div>
              </div>
              
              <div class="form-group" style="margin-bottom:0">
                <label class="form-label">Value Per Click Point</label>
                <input type="number" class="form-control" id="cfg-click-vpp" min="0.001" step="0.001" placeholder="e.g. 1.000">
                <div class="form-hint">1 click point = X currency units</div>
              </div>
            </div>

            <!-- Right Column: Vendor Charge Rates -->
            <div>
              <h3 style="margin-top:0;margin-bottom:16px;font-size:1.05rem;color:#FF6584">🏢 Vendor Charge Rates (Cuts)</h3>
              
              <div class="form-group" style="margin-bottom:16px">
                <label class="form-label">Clicks Per Point (Vendor)</label>
                <input type="number" class="form-control" id="cfg-vendor-clicks-pp" min="1" placeholder="e.g. 1000">
                <div class="form-hint">Every X clicks cut = 1 point</div>
              </div>
              
              <div class="form-group" style="margin-bottom:16px">
                <label class="form-label">Value Per Click Point (Vendor)</label>
                <input type="number" class="form-control" id="cfg-vendor-click-vpp" min="0.001" step="0.001" placeholder="e.g. 1.000">
                <div class="form-hint">1 click point cut = X currency units</div>
              </div>
              
              <div class="form-group" style="margin-bottom:16px">
                <label class="form-label">Leads Per Point (Vendor)</label>
                <input type="number" class="form-control" id="cfg-vendor-convs-pp" min="1" placeholder="e.g. 100">
                <div class="form-hint">Every X leads cut = 1 point</div>
              </div>
              
              <div class="form-group" style="margin-bottom:0">
                <label class="form-label">Value Per Lead Point (Vendor)</label>
                <input type="number" class="form-control" id="cfg-vendor-conv-vpp" min="0.001" step="0.001" placeholder="e.g. 2.000">
                <div class="form-hint">1 lead point cut = X currency units</div>
              </div>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:20px">
            <label class="form-label">Currency</label>
            <select class="form-control" id="cfg-currency" style="max-width:120px">
              <option value="BHD">BHD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="SAR">SAR</option>
              <option value="AED">AED</option>
              <option value="INR">INR</option>
            </select>
          </div>

          <h3 style="margin-top:28px;margin-bottom:16px;font-size:1.1rem;color:var(--primary);border-bottom:2px solid var(--border);padding-bottom:8px">💳 Vendor Payment Details & Instructions</h3>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:20px">
            <div>
              <div class="form-group" style="margin-bottom:16px">
                <label class="form-label">🏦 Bank Transfer Details</label>
                <textarea class="form-control" id="cfg-bank-details" rows="4" placeholder="Enter Account Name, IBAN, Bank Name, Account Number..." style="font-family:inherit;font-size:0.88rem"></textarea>
                <div class="form-hint">Displayed to clients when selecting Bank Transfer.</div>
              </div>

              <div class="form-group">
                <label class="form-label">✍️ Cheque Submission Details</label>
                <textarea class="form-control" id="cfg-cheque-details" rows="4" placeholder="Enter instructions on cheque submission (where to drop/send cheques)..." style="font-family:inherit;font-size:0.88rem"></textarea>
                <div class="form-hint">Displayed to clients when selecting Cheque payment.</div>
              </div>
            </div>

            <div>
              <div class="form-group">
                <label class="form-label">📱 BenefitPay QR Image</label>
                <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
                  <div id="benefit-qr-preview" style="width:120px;height:120px;border:1px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--badge-bg);overflow:hidden">
                    <span style="font-size:0.75rem;color:var(--text-muted)">No QR Code</span>
                  </div>
                  <div style="display:flex;flex-direction:column;gap:8px">
                    <input type="file" id="btn-upload-qr-file" style="display:none" accept="image/*">
                    <button class="btn btn-secondary btn-sm" id="btn-trigger-upload-qr" type="button" style="padding:6px 12px;font-size:0.82rem">📤 Upload QR</button>
                    <button class="btn btn-danger btn-sm" id="btn-remove-qr" style="display:none;padding:6px 12px;font-size:0.82rem" type="button">✕ Remove</button>
                  </div>
                </div>
                <input type="hidden" id="cfg-benefit-qr-url">
                <div class="form-hint">Upload the QR Code image that clients scan to pay via BenefitPay.</div>
              </div>
            </div>
          </div>

          <!-- Calculation Preview -->
          <div style="background:linear-gradient(135deg,rgba(108,99,255,0.08),rgba(255,101,132,0.06));border:1px solid var(--primary-light);border-radius:12px;padding:16px;margin-bottom:20px" id="points-preview">
            <div style="font-size:0.8rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">💡 Preview</div>
            <div style="font-size:0.95rem;color:var(--text);font-weight:600;line-height:1.5" id="preview-text">Loading…</div>
          </div>

          <button class="btn btn-primary" id="btn-save-points">💾 Save Configuration</button>
        </div>
      </div>

      <!-- Influencer Points Table -->
      <div class="card">
        <div class="card-header"><span class="card-title">📊 Influencer Points Summary</span></div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-inf-points" class="dataTable" style="width:100%">
              <thead>
                <tr>
                  <th>#</th><th>Influencer</th><th>Platform</th>
                  <th>Campaigns</th><th>Clicks</th><th>Conversions</th>
                  <th>Points Earned</th><th>Total Earnings</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  }

  function loadConfig() {
    App.api.points.config().done(function(res){
      var d = res.data;
      $('#cfg-cpp').val(d.conversions_per_point);
      $('#cfg-vpp').val(d.value_per_point);
      $('#cfg-clicks-pp').val(d.clicks_per_point);
      $('#cfg-click-vpp').val(d.click_value_per_point);
      
      $('#cfg-vendor-clicks-pp').val(d.vendor_clicks_per_point);
      $('#cfg-vendor-click-vpp').val(d.vendor_click_value_per_point);
      $('#cfg-vendor-convs-pp').val(d.vendor_conversions_per_point);
      $('#cfg-vendor-conv-vpp').val(d.vendor_conversion_value_per_point);
      
      $('#cfg-currency').val(d.currency);
      
      $('#cfg-bank-details').val(d.bank_details || '');
      $('#cfg-cheque-details').val(d.cheque_details || '');
      $('#cfg-benefit-qr-url').val(d.benefit_qr_url || '');
      if (d.benefit_qr_url) {
        $('#benefit-qr-preview').html(`<img src="${d.benefit_qr_url}" style="width:100%;height:100%;object-fit:contain" />`);
        $('#btn-remove-qr').show();
      } else {
        $('#benefit-qr-preview').html('<span style="font-size:0.75rem;color:var(--text-muted)">No QR Code</span>');
        $('#btn-remove-qr').hide();
      }

      triggerPreview();
    });
  }

  function triggerPreview() {
    updatePreview(
      $('#cfg-cpp').val(), $('#cfg-vpp').val(),
      $('#cfg-clicks-pp').val(), $('#cfg-click-vpp').val(),
      $('#cfg-vendor-clicks-pp').val(), $('#cfg-vendor-click-vpp').val(),
      $('#cfg-vendor-convs-pp').val(), $('#cfg-vendor-conv-vpp').val(),
      $('#cfg-currency').val()
    );
  }

  function updatePreview(cpp, vpp, clicks_pp, click_vpp, v_clicks_pp, v_click_vpp, v_convs_pp, v_conv_vpp, cur) {
    cpp = parseInt(cpp) || 100;
    vpp = parseFloat(vpp) || 1;
    clicks_pp = parseInt(clicks_pp) || 1000;
    click_vpp = parseFloat(click_vpp) || 1;
    
    v_clicks_pp = parseInt(v_clicks_pp) || 1000;
    v_click_vpp = parseFloat(v_click_vpp) || 1;
    v_convs_pp = parseInt(v_convs_pp) || 100;
    v_conv_vpp = parseFloat(v_conv_vpp) || 2;
    
    cur = cur || 'BHD';
    
    var msg = `<strong>Influencer Earnings:</strong><br>
      - ${clicks_pp} Clicks = 1 click pt = <strong>${click_vpp.toFixed(3)} ${cur}</strong> (1 Click = <strong>${(click_vpp/clicks_pp).toFixed(3)} ${cur}</strong>)<br>
      - ${cpp} Conversions = 1 conversion pt = <strong>${vpp.toFixed(3)} ${cur}</strong> (1 Conversion = <strong>${(vpp/cpp).toFixed(3)} ${cur}</strong>)<br>
      <span style="display:block;margin-top:8px;border-top:1px dashed var(--border);padding-top:8px"></span>
      <strong>Vendor Charges (Cuts):</strong><br>
      - ${v_clicks_pp} Clicks = 1 pt = <strong>${v_click_vpp.toFixed(3)} ${cur}</strong> (1 Click cut = <strong>${(v_click_vpp/v_clicks_pp).toFixed(3)} ${cur}</strong>)<br>
      - ${v_convs_pp} Leads = 1 pt = <strong>${v_conv_vpp.toFixed(3)} ${cur}</strong> (1 Lead cut = <strong>${(v_conv_vpp/v_convs_pp).toFixed(3)} ${cur}</strong>)`;
    $('#preview-text').html(msg);
  }

  function loadInfluencerPoints() {
    App.api.points.influencerPoints().done(function(res){
      var dt = $('#tbl-inf-points');
      if ($.fn.DataTable.isDataTable(dt)) dt.DataTable().destroy();
      dt.DataTable({
        data: res.data,
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
          { data: 'campaigns' },
          { data: 'total_clicks', render: function(d){ return `<span style="color:var(--info);font-weight:700">${d}</span>`; }},
          { data: 'total_conversions', render: function(d){ return `<strong style="color:var(--success)">${d}</strong>`; }},
          { data: 'total_points', render: function(d){
              return d > 0
                ? `<span class="badge badge-primary" style="font-size:0.9rem;padding:5px 12px">🎯 ${d} pts</span>`
                : `<span class="badge badge-muted">0 pts</span>`;
            }
          },
          { data: 'total_earnings', render: function(d,t,r){
              return d > 0
                ? `<strong style="color:var(--accent);font-size:1rem">${r.currency} ${parseFloat(d).toFixed(3)}</strong>`
                : `<span style="color:var(--text-muted)">—</span>`;
            }
          },
        ]
      });
    });
  }

  function bindEvents() {
    $(document).on('input', 'input[id^="cfg-"], select#cfg-currency', function(){
      triggerPreview();
    });

    // Trigger QR Upload file picker
    $(document).on('click', '#btn-trigger-upload-qr', function() {
      $('#btn-upload-qr-file').click();
    });

    // Handle QR Upload
    $(document).on('change', '#btn-upload-qr-file', function() {
      var file = this.files[0];
      if (!file) return;

      var formData = new FormData();
      formData.append('qr_code', file);
      
      var $btn = $('#btn-trigger-upload-qr').prop('disabled', true).text('Uploading...');
      
      $.ajax({
        url: 'api/points.php?action=upload_qr',
        type: 'POST',
        data: formData,
        contentType: false,
        processData: false,
        dataType: 'json'
      }).done(function(res) {
        if (res.success) {
          var url = res.data.url;
          $('#cfg-benefit-qr-url').val(url);
          $('#benefit-qr-preview').html(`<img src="${url}" style="width:100%;height:100%;object-fit:contain" />`);
          $('#btn-remove-qr').show();
          Swal.fire({ icon:'success', title:'Uploaded!', text:'BenefitPay QR Code uploaded successfully.', timer:1500, showConfirmButton:false });
        } else {
          Swal.fire({ icon:'error', title:'Upload Failed', text:res.message });
        }
      }).fail(function(xhr) {
        Swal.fire({ icon:'error', title:'Error', text:'Failed to upload QR code image.' });
      }).always(function() {
        $btn.prop('disabled', false).text('📤 Upload QR');
      });
    });

    // Handle QR Remove
    $(document).on('click', '#btn-remove-qr', function() {
      $('#cfg-benefit-qr-url').val('');
      $('#benefit-qr-preview').html('<span style="font-size:0.75rem;color:var(--text-muted)">No QR Code</span>');
      $(this).hide();
      $('#btn-upload-qr-file').val('');
    });

    $(document).on('click','#btn-save-points', function(){
      var data = {
        conversions_per_point: parseInt($('#cfg-cpp').val()),
        value_per_point: parseFloat($('#cfg-vpp').val()),
        clicks_per_point: parseInt($('#cfg-clicks-pp').val()),
        click_value_per_point: parseFloat($('#cfg-click-vpp').val()),
        
        vendor_clicks_per_point: parseInt($('#cfg-vendor-clicks-pp').val()),
        vendor_click_value_per_point: parseFloat($('#cfg-vendor-click-vpp').val()),
        vendor_conversions_per_point: parseInt($('#cfg-vendor-convs-pp').val()),
        vendor_conversion_value_per_point: parseFloat($('#cfg-vendor-conv-vpp').val()),
        
        currency: $('#cfg-currency').val(),
        bank_details: $('#cfg-bank-details').val(),
        cheque_details: $('#cfg-cheque-details').val(),
        benefit_qr_url: $('#cfg-benefit-qr-url').val()
      };
      
      if (!data.conversions_per_point || data.conversions_per_point < 1 ||
          !data.clicks_per_point || data.clicks_per_point < 1 ||
          !data.vendor_clicks_per_point || data.vendor_clicks_per_point < 1 ||
          !data.vendor_conversions_per_point || data.vendor_conversions_per_point < 1) {
        Swal.fire({icon:'warning',title:'Invalid Input',text:'All counts per point must be at least 1.',confirmButtonColor:'#6C63FF'}); return;
      }
      
      var $btn = $(this).prop('disabled',true).html('<span class="spinner"></span> Saving...');
      App.api.points.updateConfig(data)
        .done(function(res){
          Swal.fire({ icon:'success', title:res.message, showConfirmButton:false, timer:1500 });
          loadInfluencerPoints();
        })
        .fail(App.api.handleError)
        .always(function(){ $btn.prop('disabled',false).html('💾 Save Configuration'); });
    });
  }

  return { init };
}(jQuery));
