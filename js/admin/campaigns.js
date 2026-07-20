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
  var _allInfluencers = [];
  var _selectedInfluencers = [];

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
            <label class="form-label" style="font-weight:700;margin-bottom:12px">👥 ${t('select_influencers')} & Target Platforms</label>
            
            <div class="grid-2" style="gap:15px;margin-bottom:15px">
              <div>
                <input type="text" class="form-control" id="inf-search" placeholder="🔍 Search influencer by name or handle...">
              </div>
              <div>
                <select class="form-control" id="inf-cat-filter">
                  <option value="">🏷️ All Categories / Niches</option>
                </select>
              </div>
            </div>

            <div id="influencer-search-results" style="display:flex;flex-wrap:wrap;gap:8px;max-height:120px;overflow-y:auto;margin-bottom:20px;padding:8px;border:1.5px solid var(--border);border-radius:10px;background:var(--table-stripe)">
              <span style="color:var(--text-muted);font-size:0.9rem;padding:4px">Loading influencers...</span>
            </div>

            <!-- Table of Selected Influencers -->
            <div style="margin-top:15px">
              <h4 style="margin-bottom:10px;font-size:0.95rem;font-weight:700;color:var(--text-muted)">Selected Influencers for Campaign Link Generation:</h4>
              <div class="table-wrapper" style="border:1.5px solid var(--border);border-radius:10px;overflow:hidden">
                <table class="dataTable" id="tbl-selected-influencers" style="width:100%;margin:0">
                  <thead>
                    <tr style="background:var(--primary-light)">
                      <th style="font-weight:700">Name</th>
                      <th style="font-weight:700">Categories</th>
                      <th style="font-weight:700">Check Platforms to Generate Links</th>
                      <th style="width:60px;text-align:center;font-weight:700">Remove</th>
                    </tr>
                  </thead>
                  <tbody id="selected-influencers-body">
                    <tr>
                      <td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px">No influencers selected yet. Add them from the search results above.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;margin-top:20px">
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
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;width:100%">
          <span class="card-title">📋 All Campaigns</span>
          <button class="btn btn-danger btn-sm" id="btn-bulk-delete" style="display:none;align-items:center;gap:6px;padding:6px 12px;font-weight:600">
            🗑️ Delete Selected (<span id="bulk-delete-count">0</span>)
          </button>
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-campaigns" class="dataTable" style="width:100%">
              <thead>
                <tr>
                  <th style="width:30px;text-align:center;padding:10px 5px"><input type="checkbox" id="chk-select-all-campaigns" style="width:16px;height:16px;accent-color:var(--primary)"></th>
                  <th>#</th><th>Influencer</th><th>Product</th>
                  <th>Offer Code</th><th>Clicks</th><th>Conversions</th>
                  <th>Discount</th><th>Platform</th><th>Status</th><th>Actions</th>
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
    App.api.users.categories().done(function(cRes){
      var catOpts = cRes.data.map(function(c){ return `<option value="${c.name}">${c.name}</option>`; }).join('');
      $('#inf-cat-filter').html('<option value="">🏷️ All Categories / Niches</option>').append(catOpts);

      App.api.users.list().done(function(res){
        _allInfluencers = (res.data || []).filter(function(u){ return u && u.status==='active'; });
        filterAndRenderSearch();
      }).fail(function(err){
        console.error('[loadInfluencers list error]', err);
        $('#influencer-search-results').html('<span style="color:var(--danger)">Failed to load influencers list.</span>');
      });
    }).fail(function(err){
      console.error('[loadInfluencers categories error]', err);
      $('#influencer-search-results').html('<span style="color:var(--danger)">Failed to load categories.</span>');
    });
  }

  function filterAndRenderSearch() {
    try {
      var query = $('#inf-search').val().toLowerCase().trim();
      var cat = $('#inf-cat-filter').val();

      var filtered = _allInfluencers.filter(function(u){
        if (!u) return false;
        var uName = u.name || '';
        var matchQuery = !query || uName.toLowerCase().indexOf(query) !== -1 || (u.platforms_list && u.platforms_list.toLowerCase().indexOf(query) !== -1);
        
        var matchCat = true;
        if (cat) {
          matchCat = u.categories_list && u.categories_list.indexOf(cat) !== -1;
        }

        var notSelected = _selectedInfluencers.indexOf(parseInt(u.id)) === -1;

        return matchQuery && matchCat && notSelected;
      });

      var html = filtered.map(function(u){
        var cats = u.categories_list ? u.categories_list.split(',').map(function(c){ return `<span style="font-size:0.7rem;background:var(--primary-light);color:var(--primary);padding:2px 6px;border-radius:4px">${c}</span>`; }).join(' ') : '';
        return `
          <button type="button" class="btn btn-secondary btn-sm btn-add-selected-inf" data-id="${u.id}" style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:20px;border:1px solid var(--border);background:#fff">
            <strong>＋ ${u.name}</strong> ${cats}
          </button>`;
      }).join('');

      $('#influencer-search-results').html(html || '<span style="color:var(--text-muted);font-size:0.9rem;padding:4px">No matching influencers found...</span>');
    } catch (err) {
      console.error('[filterAndRenderSearch Error]', err);
      $('#influencer-search-results').html('<span style="color:var(--danger);font-size:0.9rem;padding:4px">Error rendering search: ' + err.message + '</span>');
    }
  }

  function renderSelectedInfluencers() {
    if (_selectedInfluencers.length === 0) {
      $('#selected-influencers-body').html(`
        <tr>
          <td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px">No influencers selected yet. Add them from the search results above.</td>
        </tr>`);
      return;
    }

    var html = '';
    _selectedInfluencers.forEach(function(infId){
      var u = _allInfluencers.find(function(item){ return parseInt(item.id) === infId; });
      if (!u) return;

      var categoryBadges = u.categories_list ? u.categories_list.split(',').map(function(c){
        return `<span class="badge" style="background:var(--primary-light);color:var(--primary);font-size:0.75rem;padding:2px 6px">${c}</span>`;
      }).join(' ') : '<span style="color:var(--text-muted)">—</span>';

      // Build platform checkboxes
      var platformsHtml = '';
      if (u.platforms_list) {
        u.platforms_list.split(',').forEach(function(platItem){
          var parts = platItem.split(':');
          var plat = parts[0];
          var handle = parts[1] || '';
          if (plat) {
            var icon = platformIcons[plat] || '🌐';
            platformsHtml += `
              <label style="display:inline-flex;align-items:center;gap:6px;margin-right:15px;cursor:pointer;font-weight:600">
                <input type="checkbox" class="target-platform-check" value="${u.id}" data-platform="${plat}" style="width:16px;height:16px;accent-color:var(--primary)" checked>
                <span>${icon} ${plat.toUpperCase()} (${handle})</span>
              </label>`;
          }
        });
      } else {
        platformsHtml = `
          <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:600">
            <input type="checkbox" class="target-platform-check" value="${u.id}" data-platform="other" style="width:16px;height:16px;accent-color:var(--primary)" checked>
            <span>🌐 OTHER</span>
          </label>`;
      }

      html += `
        <tr data-inf-row-id="${u.id}">
          <td style="font-weight:600;padding:12px">${u.name}</td>
          <td style="padding:12px">${categoryBadges}</td>
          <td style="padding:12px">${platformsHtml}</td>
          <td style="text-align:center;padding:12px">
            <button type="button" class="btn btn-danger btn-sm btn-remove-selected-inf" data-id="${u.id}" style="padding:4px 8px">✕</button>
          </td>
        </tr>`;
    });

    $('#selected-influencers-body').html(html);
  }

  function updateBulkDeleteButton() {
    var checked = $('.campaign-bulk-chk:checked').length;
    if (checked > 0) {
      $('#bulk-delete-count').text(checked);
      $('#btn-bulk-delete').css('display', 'inline-flex');
    } else {
      $('#btn-bulk-delete').css('display', 'none');
    }
  }

  function loadTable() {
    App.api.campaigns.list().done(function(res){
      if (_dt) { _dt.destroy(); _dt = null; }
      $('#chk-select-all-campaigns').prop('checked', false);
      updateBulkDeleteButton();

      _dt = $('#tbl-campaigns').DataTable({
        data: res.data,
        pageLength: 15,
        order: [[1,'desc']],
        columns: [
          { data: null, orderable:false, width:'30px', className:'text-center', render: function(d,t,r){
              return `<input type="checkbox" class="campaign-bulk-chk" data-id="${r.id}" style="width:16px;height:16px;accent-color:var(--primary)">`;
            }
          },
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
              return `<div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-secondary btn-sm btn-copy-link" data-token="${r.ref_token}" title="Copy Link">📋</button>
                <button class="btn btn-danger btn-sm btn-del-camp" data-id="${r.id}" title="Delete">🗑️</button>
              </div>`;
            }
          },
        ]
      });
    }).fail(App.api.handleError);
  }

  function bindEvents() {
    // Search filter input typing
    $(document).off('input', '#inf-search').on('input', '#inf-search', function(){
      filterAndRenderSearch();
    });

    // Category filter select changes
    $(document).off('change', '#inf-cat-filter').on('change', '#inf-cat-filter', function(){
      filterAndRenderSearch();
    });

    // Add search result to selected table
    $(document).off('click', '.btn-add-selected-inf').on('click', '.btn-add-selected-inf', function(){
      var id = parseInt($(this).data('id'));
      if (_selectedInfluencers.indexOf(id) === -1) {
        _selectedInfluencers.push(id);
        renderSelectedInfluencers();
        filterAndRenderSearch();
      }
    });

    // Remove selected influencer from list
    $(document).off('click', '.btn-remove-selected-inf').on('click', '.btn-remove-selected-inf', function(){
      var id = parseInt($(this).data('id'));
      _selectedInfluencers = _selectedInfluencers.filter(function(item){ return item !== id; });
      renderSelectedInfluencers();
      filterAndRenderSearch();
    });

    // Generate link action
    $(document).off('click','#btn-generate').on('click','#btn-generate', function(){
      var productId = $('#gen-product').val();
      var targets = [];
      $('.target-platform-check:checked').each(function(){
        targets.push({
          influencer_id: $(this).val(),
          platform: $(this).data('platform')
        });
      });
      var discType  = $('#gen-discount-type').val();
      var discVal   = parseFloat($('#gen-discount-value').val()) || 0;

      if (!productId) { Swal.fire({icon:'warning',title:App.i18n.t('warning'),text:'Please select a product.',confirmButtonColor:'#6C63FF'}); return; }
      if (!targets.length) { Swal.fire({icon:'warning',title:App.i18n.t('warning'),text:'Please select at least one influencer and platform.',confirmButtonColor:'#6C63FF'}); return; }

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
          
          // Clear current selection after generation
          _selectedInfluencers = [];
          renderSelectedInfluencers();
          filterAndRenderSearch();
          
          Swal.fire({ icon:'success', title:res.message, showConfirmButton:false, timer:2000 });
          loadTable();
        })
        .fail(App.api.handleError)
        .always(function(){ $btn.prop('disabled',false).html('⚡ ' + App.i18n.t('generate') + ' Tracking Links'); });
    });

    // Copy link — works on both HTTP and HTTPS
    function copyToClipboard(text, onSuccess) {
      if (navigator.clipboard && window.isSecureContext) {
        // HTTPS / localhost: use modern API
        navigator.clipboard.writeText(text).then(onSuccess).catch(function() {
          _execCommandCopy(text, onSuccess);
        });
      } else {
        // HTTP (e.g. local IP): use legacy execCommand
        _execCommandCopy(text, onSuccess);
      }
    }
    function _execCommandCopy(text, onSuccess) {
      var el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      try {
        document.execCommand('copy');
        onSuccess();
      } catch(e) {
        prompt('Copy this link:', text);
      }
      document.body.removeChild(el);
    }

    $(document).off('click', '.btn-copy-link').on('click','.btn-copy-link', function(){
      var token = $(this).data('token') || $(this).attr('data-token');
      var base  = window.location.origin + window.location.pathname.replace(/\/?(index\.php)?$/, '/');
      var link  = token ? (base + 'landing.php?ref=' + encodeURIComponent(token)) : $(this).data('link');
      copyToClipboard(link, function(){
        Swal.fire({ icon:'success', title:'Link Copied!', text: link, showConfirmButton:false, timer:2500 });
      });
    });

    // Delete campaign
    $(document).off('click', '.btn-del-camp').on('click','.btn-del-camp', function(){
      var id = $(this).data('id');
      Swal.fire({ icon:'warning', title:'Delete Campaign?', text:'This will permanently delete the campaign and all tracking data.', showCancelButton:true, confirmButtonColor:'#ef4444', confirmButtonText:'Yes, Delete' })
        .then(function(r){ if(r.isConfirmed) App.api.campaigns.delete(id).done(function(){ Swal.fire({icon:'success',title:'Deleted!',showConfirmButton:false,timer:1200}); loadTable(); }).fail(App.api.handleError); });
    });

    // Select all checkbox change
    $(document).off('change', '#chk-select-all-campaigns').on('change', '#chk-select-all-campaigns', function(){
      var isChecked = $(this).is(':checked');
      $('.campaign-bulk-chk').prop('checked', isChecked);
      updateBulkDeleteButton();
    });

    // Row checkbox change
    $(document).off('change', '.campaign-bulk-chk').on('change', '.campaign-bulk-chk', function(){
      var allChecked = $('.campaign-bulk-chk').length === $('.campaign-bulk-chk:checked').length;
      $('#chk-select-all-campaigns').prop('checked', allChecked);
      updateBulkDeleteButton();
    });

    // Bulk delete action
    $(document).off('click', '#btn-bulk-delete').on('click', '#btn-bulk-delete', function(){
      var ids = [];
      $('.campaign-bulk-chk:checked').each(function(){
        ids.push(parseInt($(this).data('id')));
      });
      if (!ids.length) return;

      Swal.fire({
        icon: 'warning',
        title: 'Delete Selected Campaigns?',
        text: 'This will permanently delete ' + ids.length + ' selected campaign(s) and all their tracking data.',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Yes, Delete All'
      }).then(function(r){
        if (r.isConfirmed) {
          App.api.campaigns.deleteBulk(ids).done(function(){
            Swal.fire({icon:'success', title:'Deleted!', showConfirmButton:false, timer:1200});
            loadTable();
          }).fail(App.api.handleError);
        }
      });
    });
  }

  return { init };
}(jQuery));
