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
      <div class="page-header">
        <div><h2>🎯 ${t('points')}</h2><p class="page-subtitle">Configure how influencers earn points and rewards</p></div>
      </div>

      <!-- Config Card -->
      <div class="card" style="margin-bottom:24px;max-width:700px">
        <div class="card-header"><span class="card-title">⚙️ ${t('points_config')}</span></div>
        <div class="card-body">
          
          <h3 style="margin-top:0;margin-bottom:12px;font-size:1.05rem;color:var(--primary)">📢 Influencer Reward Rates</h3>
          <div class="grid-2" style="margin-bottom:16px">
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Conversions Per Point</label>
              <input type="number" class="form-control" id="cfg-cpp" min="1" placeholder="e.g. 100">
              <div class="form-hint">Every X conversions = 1 point</div>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Value Per Point</label>
              <input type="number" class="form-control" id="cfg-vpp" min="0.001" step="0.001" placeholder="e.g. 1.000">
              <div class="form-hint">1 point = X currency units</div>
            </div>
          </div>
          
          <div class="grid-2" style="margin-bottom:24px">
            <div class="form-group" style="margin-bottom:0">
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

          <h3 style="margin-top:0;margin-bottom:12px;font-size:1.05rem;color:#FF6584">🏢 Vendor Charge Rates (Cuts)</h3>
          <div class="grid-2" style="margin-bottom:16px">
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Clicks Per Point (Vendor)</label>
              <input type="number" class="form-control" id="cfg-vendor-clicks-pp" min="1" placeholder="e.g. 1000">
              <div class="form-hint">Every X clicks cut = 1 point</div>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Value Per Click Point (Vendor)</label>
              <input type="number" class="form-control" id="cfg-vendor-click-vpp" min="0.001" step="0.001" placeholder="e.g. 1.000">
              <div class="form-hint">1 click point cut = X currency units</div>
            </div>
          </div>

          <div class="grid-2" style="margin-bottom:20px">
            <div class="form-group" style="margin-bottom:0">
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
