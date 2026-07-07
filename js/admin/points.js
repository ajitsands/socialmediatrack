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
      <div class="card" style="margin-bottom:24px;max-width:600px">
        <div class="card-header"><span class="card-title">⚙️ ${t('points_config')}</span></div>
        <div class="card-body">
          <div class="grid-2" style="margin-bottom:20px">
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Conversions Per Point</label>
              <input type="number" class="form-control" id="cfg-cpp" min="1" placeholder="e.g. 100">
              <div class="form-hint">Every X conversions = 1 point</div>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Value Per Point</label>
              <div class="input-group">
                <select class="form-control" id="cfg-currency" style="max-width:90px">
                  <option value="BHD">BHD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="SAR">SAR</option>
                  <option value="AED">AED</option>
                  <option value="INR">INR</option>
                </select>
                <input type="number" class="form-control" id="cfg-vpp" min="0.001" step="0.001" placeholder="e.g. 1.000">
              </div>
              <div class="form-hint">1 point = X currency units</div>
            </div>
          </div>

          <!-- Calculation Preview -->
          <div style="background:linear-gradient(135deg,rgba(108,99,255,0.08),rgba(255,101,132,0.06));border:1px solid var(--primary-light);border-radius:12px;padding:16px;margin-bottom:20px" id="points-preview">
            <div style="font-size:0.8rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">💡 Preview</div>
            <div style="font-size:0.95rem;color:var(--text);font-weight:600" id="preview-text">Loading…</div>
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
                  <th>Campaigns</th><th>Conversions</th>
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
      $('#cfg-currency').val(d.currency);
      updatePreview(d.conversions_per_point, d.value_per_point, d.currency);
    });
  }

  function updatePreview(cpp, vpp, cur) {
    cpp = parseInt(cpp) || 100;
    vpp = parseFloat(vpp) || 1;
    cur = cur || 'BHD';
    var msg = `${cpp} conversions = 1 point = <strong>${vpp.toFixed(3)} ${cur}</strong>
      &nbsp;|&nbsp; 1,000 conversions = <strong>${Math.floor(1000/cpp)} points</strong> = <strong>${(Math.floor(1000/cpp)*vpp).toFixed(3)} ${cur}</strong>`;
    $('#preview-text').html(msg);
  }

  function loadInfluencerPoints() {
    App.api.points.influencerPoints().done(function(res){
      var dt = $('#tbl-inf-points');
      if ($.fn.DataTable.isDataTable(dt)) dt.DataTable().destroy();
      dt.DataTable({
        data: res.data,
        pageLength: 15,
        order: [[6,'desc']],
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
    $(document).on('input', '#cfg-cpp, #cfg-vpp, #cfg-currency', function(){
      updatePreview($('#cfg-cpp').val(), $('#cfg-vpp').val(), $('#cfg-currency').val());
    });

    $(document).on('click','#btn-save-points', function(){
      var data = {
        conversions_per_point: parseInt($('#cfg-cpp').val()),
        value_per_point: parseFloat($('#cfg-vpp').val()),
        currency: $('#cfg-currency').val(),
      };
      if (!data.conversions_per_point || data.conversions_per_point < 1) {
        Swal.fire({icon:'warning',title:'Invalid',text:'Conversions per point must be at least 1.',confirmButtonColor:'#6C63FF'}); return;
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
