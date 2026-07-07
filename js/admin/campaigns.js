/**
 * Admin — Campaigns Module
 * Generate offer codes + tracking links
 */
window.App = window.App || {};
App.Admin = App.Admin || {};

App.Admin.Campaigns = (function ($) {
  'use strict';
  var _dt = null;
  var platformIcons = { instagram:'📸', tiktok:'🎵', youtube:'▶️', facebook:'👍', twitter:'🐦', other:'🌐' };

  function init() {
    if (!App.auth.requireAuth('admin')) return;
    render();
    loadProducts();
    loadInfluencers();
    loadTable();
    bindEvents();
  }

  function render() {
    var t = App.i18n.t.bind(App.i18n);
    $('#page-content').html(`
      <div class="page-header">
        <div><h2>🔗 ${t('campaigns')}</h2><p class="page-subtitle">Generate encrypted tracking links for influencers</p></div>
      </div>

      <!-- Generator Card -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-header">
          <span class="card-title">🎯 ${t('generate_codes')}</span>
        </div>
        <div class="card-body">
          <div class="grid-2" style="margin-bottom:20px">
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">${t('select_product')} <span class="req">*</span></label>
              <select class="form-control" id="gen-product">
                <option value="">— Select a product —</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">${t('discount_type')}</label>
              <div style="display:flex;gap:10px">
                <select class="form-control" id="gen-discount-type" style="max-width:160px">
                  <option value="percent">% Percent</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
                <input type="number" class="form-control" id="gen-discount-value" placeholder="e.g. 10" min="0">
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">${t('select_influencers')} <span class="req">*</span></label>
            <div style="display:flex;gap:10px;margin-bottom:10px">
              <button class="btn btn-secondary btn-sm" id="btn-select-all-inf">☑️ Select All</button>
              <button class="btn btn-secondary btn-sm" id="btn-clear-all-inf">☐ Clear All</button>
            </div>
            <div id="influencer-checkboxes" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;max-height:280px;overflow-y:auto;padding:4px">
              <div class="page-loader" style="padding:20px"><div class="spinner"></div></div>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end">
            <button class="btn btn-primary btn-lg" id="btn-generate">
              ⚡ ${t('generate')} Tracking Links
            </button>
          </div>
        </div>
      </div>

      <!-- Generated Codes Preview -->
      <div id="generated-results" style="display:none;margin-bottom:24px">
        <div class="card">
          <div class="card-header"><span class="card-title">✅ ${t('generated_codes')}</span></div>
          <div class="card-body" id="generated-codes-list"></div>
        </div>
      </div>

      <!-- All Campaigns Table -->
      <div class="card">
        <div class="card-header"><span class="card-title">📋 All Campaigns</span></div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-campaigns" class="dataTable" style="width:100%">
              <thead>
                <tr>
                  <th>#</th><th>Influencer</th><th>Product</th>
                  <th>Offer Code</th><th>Clicks</th><th>Conversions</th>
                  <th>Discount</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  }

  function loadProducts() {
    App.api.products.list().done(function(res){
      var opts = res.data.filter(function(p){ return p.status==='active'; })
        .map(function(p){ return `<option value="${p.id}">${p.name} (${p.currency} ${parseFloat(p.price).toFixed(3)})</option>`; }).join('');
      $('#gen-product').append(opts);
    });
  }

  function loadInfluencers() {
    App.api.users.list().done(function(res){
      var html = '';
      res.data.filter(function(u){ return u.status==='active'; }).forEach(function(u){
        if (u.platforms_list) {
          u.platforms_list.split(',').forEach(function(platItem){
            var parts = platItem.split(':');
            var platName = parts[0];
            var handle = parts[1] || '';
            if (platName) {
              var icon = platformIcons[platName] || '🌐';
              html += `
                <label style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:10px;border:1.5px solid var(--border);cursor:pointer;transition:all 0.2s;background:var(--card)" class="inf-check-card">
                  <input type="checkbox" class="inf-checkbox" value="${u.id}" data-platform="${platName}" style="width:16px;height:16px;accent-color:var(--primary)">
                  <div>
                    <div style="font-weight:600;font-size:0.88rem">${u.name}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">${icon} ${platName.toUpperCase()} • ${handle}</div>
                  </div>
                </label>`;
            }
          });
        } else {
          html += `
            <label style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:10px;border:1.5px solid var(--border);cursor:pointer;transition:all 0.2s;background:var(--card)" class="inf-check-card">
              <input type="checkbox" class="inf-checkbox" value="${u.id}" data-platform="other" style="width:16px;height:16px;accent-color:var(--primary)">
              <div>
                <div style="font-weight:600;font-size:0.88rem">${u.name}</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">🌐 Other</div>
              </div>
            </label>`;
        }
      });
      $('#influencer-checkboxes').html(html || '<p style="color:var(--text-muted);padding:12px">No active influencers found</p>');
    });
  }

  function loadTable() {
    App.api.campaigns.list().done(function(res){
      if (_dt) { _dt.destroy(); _dt = null; }
      _dt = $('#tbl-campaigns').DataTable({
        data: res.data,
        pageLength: 15,
        order: [[0,'desc']],
        columns: [
          { data: null, render: function(d,t,r,m){ return m.row+1; }, orderable:false, width:'40px' },
          { data: 'influencer_name', render: function(d,t,r){ return `<strong>${d}</strong>`; }},
          { data: 'product_name', render: function(d,t,r){ return `<strong>${d}</strong><br><small class="badge badge-muted">${r.product_category||''}</small>`; }},
          { data: 'offer_code', render: function(d){ return `<code style="background:var(--badge-bg);padding:4px 8px;border-radius:6px;font-size:0.85rem;font-weight:700;color:var(--primary)">${d}</code>`; }},
          { data: 'total_clicks', render: function(d){ return '<span style="color:var(--info);font-weight:700">'+d+'</span>'; }},
          { data: 'total_conversions', render: function(d){ return '<span style="color:var(--success);font-weight:700">'+d+'</span>'; }},
          { data: 'discount_value', render: function(d,t,r){
              if (!d || d==0) return '<span class="badge badge-muted">None</span>';
              return `<span class="badge badge-accent">${r.discount_type==='percent'?d+'%':'BHD '+d}</span>`;
            }
          },
          { data: 'platform', render: function(d){
              var icon = platformIcons[d] || '🌐';
              return `<span class="badge platform-${d}">${icon} ${d}</span>`;
            }
          },
          { data: 'status', render: function(d){
              var cls = {active:'badge-success',paused:'badge-warning',expired:'badge-danger'};
              return `<span class="badge ${cls[d]||'badge-muted'}">${d}</span>`;
            }
          },
          { data: null, orderable:false, render: function(d,t,r){
              var landingUrl = 'landing.php?ref=' + encodeURIComponent(r.ref_token);
              return `<div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-secondary btn-sm btn-copy-link" data-link="${landingUrl}" title="Copy Link">📋</button>
                <button class="btn btn-danger btn-sm btn-del-camp" data-id="${r.id}" title="Delete">🗑️</button>
              </div>`;
            }
          },
        ]
      });
    }).fail(App.api.handleError);
  }

  function bindEvents() {
    $(document).on('change', '.inf-check-card input', function(){
      var $card = $(this).closest('.inf-check-card');
      $card.css({ borderColor: this.checked ? 'var(--primary)' : 'var(--border)', background: this.checked ? 'var(--primary-light)' : 'var(--card)' });
    });

    $(document).on('click','#btn-select-all-inf', function(){
      $('.inf-checkbox').prop('checked', true).trigger('change');
    });
    $(document).on('click','#btn-clear-all-inf', function(){
      $('.inf-checkbox').prop('checked', false).trigger('change');
    });

    $(document).on('click','#btn-generate', function(){
      var productId = $('#gen-product').val();
      var targets = [];
      $('.inf-checkbox:checked').each(function(){
        targets.push({
          influencer_id: $(this).val(),
          platform: $(this).data('platform')
        });
      });
      var discType  = $('#gen-discount-type').val();
      var discVal   = parseFloat($('#gen-discount-value').val()) || 0;

      if (!productId) { Swal.fire({icon:'warning',title:App.i18n.t('warning'),text:'Please select a product.',confirmButtonColor:'#6C63FF'}); return; }
      if (!targets.length) { Swal.fire({icon:'warning',title:App.i18n.t('warning'),text:'Please select at least one influencer platform account.',confirmButtonColor:'#6C63FF'}); return; }

      var $btn = $(this).prop('disabled',true).html('<span class="spinner"></span> Generating...');

      App.api.campaigns.generate({ product_id: productId, targets: targets, discount_type: discType, discount_value: discVal })
        .done(function(res){
          var codes = res.data;
          var html = codes.map(function(c){
            var fullUrl = window.location.origin + window.location.pathname.replace('index.php','') + 'landing.php?ref=' + c.ref_token;
            var icon = platformIcons[c.platform] || '🌐';
            return `
              <div style="margin-bottom:16px;padding:16px;border-radius:12px;border:1.5px solid var(--border);background:var(--table-stripe)">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
                  <strong style="font-size:1rem">${c.influencer_name}</strong>
                  <span class="badge platform-${c.platform}" style="font-size:0.75rem;padding:2px 8px">${icon} ${c.platform}</span>
                  <span style="color:var(--text-muted)">→</span>
                  <strong style="color:var(--primary)">${c.product_name}</strong>
                  <code style="background:var(--primary-light);color:var(--primary);padding:4px 10px;border-radius:8px;font-size:0.85rem;font-weight:800">${c.offer_code}</code>
                  ${c.discount_value > 0 ? `<span class="badge badge-accent">${c.discount_type==='percent'?c.discount_value+'%':'BHD '+c.discount_value} OFF</span>` : ''}
                </div>
                <div class="link-display">
                  <span class="link-text" title="${fullUrl}">${fullUrl}</span>
                  <button class="copy-btn btn-copy-link" data-link="${fullUrl}">📋 Copy Link</button>
                </div>
              </div>`;
          }).join('');

          $('#generated-results').show();
          $('#generated-codes-list').html(html);
          Swal.fire({ icon:'success', title:res.message, showConfirmButton:false, timer:2000 });
          loadTable();
        })
        .fail(App.api.handleError)
        .always(function(){ $btn.prop('disabled',false).html('⚡ ' + App.i18n.t('generate') + ' Tracking Links'); });
    });

    // Copy link
    $(document).on('click','.btn-copy-link', function(){
      var link = $(this).data('link');
      navigator.clipboard.writeText(link).then(function(){
        Swal.fire({ icon:'success', title:'Link Copied!', text:'Tracking link copied to clipboard.', showConfirmButton:false, timer:1500 });
      }).catch(function(){ prompt('Copy this link:', link); });
    });

    // Delete campaign
    $(document).on('click','.btn-del-camp', function(){
      var id = $(this).data('id');
      Swal.fire({ icon:'warning', title:'Delete Campaign?', text:'This will permanently delete the campaign and all tracking data.', showCancelButton:true, confirmButtonColor:'#ef4444', confirmButtonText:'Yes, Delete' })
        .then(function(r){ if(r.isConfirmed) App.api.campaigns.delete(id).done(function(){ Swal.fire({icon:'success',title:'Deleted!',showConfirmButton:false,timer:1200}); loadTable(); }).fail(App.api.handleError); });
    });
  }

  return { init };
}(jQuery));
