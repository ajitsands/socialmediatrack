/**
 * Admin — Products Module
 * Active products + Deactivated products with safe delete
 */
window.App = window.App || {};
App.Admin = App.Admin || {};

App.Admin.Products = (function ($) {
  'use strict';
  var _dtActive      = null;
  var _dtDeactivated = null;
  var _categories    = [];
  var _pointsCfg     = null;

  function catIcon(name) {
    if (!name) return '📦';
    var m = name.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
    return m ? m[0] : '📦';
  }

  function init() {
    if (!App.auth.requireAuth('admin')) return;
    render();
    loadCategories();
    loadClients();
    loadPointsConfig();
    loadTables();
    bindEvents();
  }

  function loadPointsConfig() {
    App.api.points.config().done(function (res) {
      _pointsCfg = res.data || {};
      var dfltCpc = parseFloat(_pointsCfg.click_value_per_point || 0).toFixed(3);
      var dfltCpl = parseFloat(_pointsCfg.vendor_conversion_value_per_point || 0).toFixed(3);
      var cur = _pointsCfg.currency || 'BHD';
      $('#prod-cpc-rate').attr('placeholder', 'Default: ' + dfltCpc + ' ' + cur);
      $('#prod-cpl-rate').attr('placeholder', 'Default: ' + dfltCpl + ' ' + cur);
      $('#lbl-cpc-hint').text('(System default: ' + dfltCpc + ' ' + cur + ')');
      $('#lbl-cpl-hint').text('(System default: ' + dfltCpl + ' ' + cur + ')');
    });
  }

  function loadCategories() {
    return App.api.users.categories().done(function(res) {
      _categories = res.data || [];
      var opts = '<option value="">— Select category —</option>' +
        _categories.map(function(c) {
          return '<option value="' + c.name + '">' + c.name + '</option>';
        }).join('');
      if (!_categories.length) opts += '<option value="other">📦 Other</option>';
      $('#prod-category').html(opts);
    });
  }

  function loadClients() {
    return App.api.clients.list().done(function(res) {
      var opts = '<option value="">— Internal Product (No Client) —</option>' +
        res.data.map(function(c) {
          return `<option value="${c.id}">${c.name}</option>`;
        }).join('');
      $('#prod-client').html(opts);
    });
  }

  function render() {
    var t = App.i18n.t.bind(App.i18n);
    $('#page-content').html(`
      <div class="page-header">
        <div><h2>📦 ${t('products')}</h2><p class="page-subtitle">Manage products available for campaigns</p></div>
        <button class="btn btn-primary" id="btn-add-product">➕ ${t('add_product')}</button>
      </div>

      <!-- Active Products -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-header" style="display:flex;align-items:center;gap:10px">
          <span class="card-title">✅ Active Products</span>
          <span id="active-count" class="badge badge-success" style="font-size:0.8rem"></span>
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-active-products" class="dataTable" style="width:100%">
              <thead>
                <tr>
                  <th>#</th><th>${t('name')}</th><th>${t('category')}</th>
                  <th>${t('price')}</th><th>Campaigns</th><th>Clicks</th><th>Convs.</th>
                  <th>${t('actions')}</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Deactivated Products -->
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;gap:10px">
          <span class="card-title">🚫 Deactivated Products</span>
          <span id="deactivated-count" class="badge badge-danger" style="font-size:0.8rem"></span>
          <span style="font-size:0.8rem;color:var(--text-muted);margin-left:auto">Products here are hidden from campaigns. You can activate or permanently delete them.</span>
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-deactivated-products" class="dataTable" style="width:100%">
              <thead>
                <tr>
                  <th>#</th><th>${t('name')}</th><th>${t('category')}</th>
                  <th>${t('price')}</th><th>Campaigns</th><th>Clicks</th><th>Convs.</th>
                  <th>${t('actions')}</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Product Modal -->
      <div id="modal-product" style="display:none">
        <div class="modal-overlay">
          <div class="modal-box modal-lg">
            <div class="modal-header">
              <span class="modal-title" id="modal-prod-title">${t('add_product')}</span>
              <button class="modal-close" id="btn-close-modal-prod">✕</button>
            </div>
            <div class="modal-body">
              <form id="form-product" autocomplete="off">
                <input type="hidden" id="prod-id">
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">${t('name')} <span class="req">*</span></label>
                    <input type="text" class="form-control" id="prod-name" placeholder="Product name" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">${t('category')}</label>
                    <select class="form-control" id="prod-category">
                       <option value="">Loading categories…</option>
                     </select>
                  </div>
                </div>
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">Client Owner (Wallet Account)</label>
                    <select class="form-control" id="prod-client">
                       <option value="">— Internal Product (No Client) —</option>
                     </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">${t('status')}</label>
                    <select class="form-control" id="prod-status">
                      <option value="active">✅ Active</option>
                      <option value="inactive">❌ Inactive</option>
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">${t('description')}</label>
                  <textarea class="form-control" id="prod-desc" placeholder="Product description..." rows="3"></textarea>
                </div>
                <div class="grid-3" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
                  <div class="form-group">
                    <label class="form-label">${t('price')} <span class="req">*</span></label>
                    <div class="input-group">
                      <select class="form-control" id="prod-currency" style="max-width:80px;padding:4px">
                        <option value="BHD">BHD</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="SAR">SAR</option>
                        <option value="AED">AED</option>
                        <option value="INR">INR</option>
                        <option value="PKR">PKR</option>
                      </select>
                      <input type="number" class="form-control" id="prod-price" placeholder="0.000" min="0" step="0.001" style="flex:1">
                    </div>
                  </div>
                 <div class="form-group">
                    <label class="form-label">CPC Rate (BHD) <span style="font-size:0.75rem; color:#6C63FF; font-weight:600" id="lbl-cpc-hint"></span></label>
                    <input type="number" class="form-control" id="prod-cpc-rate" placeholder="0 = use system default" min="0" step="0.001">
                    <p class="form-helper" style="font-size:0.72rem;color:var(--text-muted);margin-top:3px">Set 0 to use the platform-wide default from Points Config</p>
                  </div>
                  <div class="form-group">
                    <label class="form-label">CPL Rate (BHD) <span style="font-size:0.75rem; color:#22C55E; font-weight:600" id="lbl-cpl-hint"></span></label>
                    <input type="number" class="form-control" id="prod-cpl-rate" placeholder="0 = use system default" min="0" step="0.001">
                    <p class="form-helper" style="font-size:0.72rem;color:var(--text-muted);margin-top:3px">Set 0 to use the platform-wide default from Points Config</p>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">${t('image_url')}</label>
                  <input type="url" class="form-control" id="prod-image" placeholder="https://...">
                </div>
                <div class="form-group">
                  <label class="form-label">Target Social Media Display Platform <span class="req">*</span></label>
                  <select class="form-control" id="prod-display-platform" required style="font-weight:600; color:var(--primary)">
                    <option value="instagram">Instagram Post / Feed (1:1 Square)</option>
                    <option value="facebook">Facebook Post / Feed (1:1 Square)</option>
                    <option value="tiktok">TikTok / Reels (9:16 Vertical)</option>
                    <option value="youtube">YouTube (16:9 Landscape)</option>
                    <option value="other">Other (1:1 Square)</option>
                  </select>
                </div>
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">${t('product_url')} <span class="req">*</span></label>
                    <input type="url" class="form-control" id="prod-url" placeholder="https://..." required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">${t('demo_url')} <span style="font-size:0.75rem;color:var(--text-muted)">(optional)</span></label>
                    <input type="url" class="form-control" id="prod-demo" placeholder="https://...">
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="btn-cancel-prod">${t('cancel')}</button>
              <button class="btn btn-primary" id="btn-save-prod">💾 ${t('save')}</button>
            </div>
          </div>
        </div>
      </div>
    `);
  }

  function _nameCell(r) {
    var icon = catIcon(r.category);
    var clientLabel = r.client_name
      ? `<div style="font-size:0.72rem;color:#6C63FF;font-weight:500">🏢 ${r.client_name}</div>`
      : `<div style="font-size:0.72rem;color:var(--text-muted)">Internal</div>`;
    var cfg = _pointsCfg || {};
    var dfltCpc = parseFloat(cfg.click_value_per_point || 0);
    var dfltCpl = parseFloat(cfg.vendor_conversion_value_per_point || 0);
    var effCpc  = parseFloat(r.cpc_rate) > 0 ? parseFloat(r.cpc_rate) : dfltCpc;
    var effCpl  = parseFloat(r.cpl_rate) > 0 ? parseFloat(r.cpl_rate) : dfltCpl;
    var cpcLabel = parseFloat(r.cpc_rate) > 0
      ? '<strong>' + effCpc.toFixed(3) + '</strong>'
      : '<strong>' + effCpc.toFixed(3) + '</strong> <span style="color:#6C63FF;font-size:0.65rem">(⚡default)</span>';
    var cplLabel = parseFloat(r.cpl_rate) > 0
      ? '<strong>' + effCpl.toFixed(3) + '</strong>'
      : '<strong>' + effCpl.toFixed(3) + '</strong> <span style="color:#22C55E;font-size:0.65rem">(⚡default)</span>';
    var ratesLabel = '<div style="font-size:0.72rem;color:var(--text-muted)">CPC: ' + cpcLabel + ' | CPL: ' + cplLabel + '</div>';
    return `<div style="display:flex;align-items:center;gap:10px">
      <div style="width:38px;height:38px;border-radius:10px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">${icon}</div>
      <div><div style="font-weight:600">${r.name}</div>${clientLabel}${ratesLabel}</div>
    </div>`;
  }

  function loadTables() {
    App.api.products.list().done(function(res) {
      var all          = res.data || [];
      var active       = all.filter(function(p){ return p.status === 'active'; });
      var deactivated  = all.filter(function(p){ return p.status !== 'active'; });

      $('#active-count').text(active.length);
      $('#deactivated-count').text(deactivated.length);

      // ── Active Table ──────────────────────────
      if (_dtActive) { _dtActive.destroy(); _dtActive = null; }
      _dtActive = $('#tbl-active-products').DataTable({
        data: active,
        pageLength: 10,
        order: [[0,'asc']],
        columns: [
          { data: null, render: function(d,t,r,m){ return m.row+1; }, orderable:false, width:'40px' },
          { data: 'name',   render: function(d,t,r){ return _nameCell(r); } },
          { data: 'category', render: function(d){ return `<span class="badge badge-primary">${catIcon(d)} ${d}</span>`; }},
          { data: 'price',  render: function(d,t,r){ return `<strong>${r.currency} ${parseFloat(d).toFixed(3)}</strong>`; }},
          { data: 'campaign_count',    render: function(d){ return '<strong>'+d+'</strong>'; }},
          { data: 'total_clicks',      render: function(d){ return '<span style="color:var(--info);font-weight:700">'+d+'</span>'; }},
          { data: 'total_conversions', render: function(d){ return '<span style="color:var(--success);font-weight:700">'+d+'</span>'; }},
          { data: null, orderable:false, render: function(d,t,r){
              return `<div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-sm btn-edit-prod" data-id="${r.id}" title="Edit">✏️</button>
                <button class="btn btn-warning btn-sm btn-deactivate-prod" data-id="${r.id}" data-name="${r.name}" title="Deactivate" style="background:#f59e0b;color:#fff;border-color:#f59e0b">⛔ Deactivate</button>
              </div>`;
            }
          },
        ]
      });

      // ── Deactivated Table ─────────────────────
      if (_dtDeactivated) { _dtDeactivated.destroy(); _dtDeactivated = null; }
      _dtDeactivated = $('#tbl-deactivated-products').DataTable({
        data: deactivated,
        pageLength: 10,
        order: [[0,'asc']],
        language: { emptyTable: 'No deactivated products.' },
        columns: [
          { data: null, render: function(d,t,r,m){ return m.row+1; }, orderable:false, width:'40px' },
          { data: 'name',   render: function(d,t,r){ return _nameCell(r); } },
          { data: 'category', render: function(d){ return `<span class="badge badge-muted">${catIcon(d)} ${d}</span>`; }},
          { data: 'price',  render: function(d,t,r){ return `<strong>${r.currency} ${parseFloat(d).toFixed(3)}</strong>`; }},
          { data: 'campaign_count',    render: function(d){ return '<strong>'+d+'</strong>'; }},
          { data: 'total_clicks',      render: function(d){ return '<span style="color:var(--info);font-weight:700">'+d+'</span>'; }},
          { data: 'total_conversions', render: function(d){ return '<span style="color:var(--success);font-weight:700">'+d+'</span>'; }},
          { data: null, orderable:false, render: function(d,t,r){
              return `<div style="display:flex;gap:6px">
                <button class="btn btn-success btn-sm btn-activate-prod" data-id="${r.id}" data-name="${r.name}" title="Activate" style="font-size:0.8rem">✅ Activate</button>
                <button class="btn btn-secondary btn-sm btn-edit-prod" data-id="${r.id}" title="Edit">✏️</button>
                <button class="btn btn-danger btn-sm btn-del-prod" data-id="${r.id}" data-name="${r.name}" data-camps="${r.campaign_count}" title="Permanently Delete">🗑️</button>
              </div>`;
            }
          },
        ]
      });

    }).fail(App.api.handleError);
  }

  function openModal(r) {
    if (r) {
      $('#modal-prod-title').text(App.i18n.t('edit_product'));
      $('#prod-id').val(r.id);
      $('#prod-name').val(r.name);
      $('#prod-category').val(r.category);
      $('#prod-desc').val(r.description);
      $('#prod-price').val(r.price);
      $('#prod-currency').val(r.currency);
      $('#prod-image').val(r.image_url);
      $('#prod-url').val(r.product_url);
      $('#prod-demo').val(r.demo_url);
      $('#prod-status').val(r.status);
      $('#prod-client').val(r.client_id || '');
      $('#prod-cpc-rate').val(parseFloat(r.cpc_rate).toFixed(3));
      $('#prod-cpl-rate').val(parseFloat(r.cpl_rate).toFixed(3));
      $('#prod-display-platform').val(r.display_platform || 'instagram');
    } else {
      $('#modal-prod-title').text(App.i18n.t('add_product'));
      $('#form-product')[0].reset();
      $('#prod-id').val('');
      $('#prod-cpc-rate').val('0.000');
      $('#prod-cpl-rate').val('0.000');
      $('#prod-client').val('');
      $('#prod-display-platform').val('instagram');
    }
    $('#modal-product').show();
  }

  function bindEvents() {
    // Add product
    $(document).off('click', '#btn-add-product').on('click','#btn-add-product', function(){
      openModal(null);
    });

    // Edit product
    $(document).off('click', '.btn-edit-prod').on('click','.btn-edit-prod', function(){
      var id = $(this).data('id');
      App.api.products.get(id).done(function(res){ openModal(res.data); }).fail(App.api.handleError);
    });

    // Close modal
    $(document).off('click', '#btn-close-modal-prod, #btn-cancel-prod').on('click','#btn-close-modal-prod, #btn-cancel-prod', function(){
      $('#modal-product').hide();
    });

    // Save product
    $(document).off('click', '#btn-save-prod').on('click','#btn-save-prod', function(){
      var data = {
        id: $('#prod-id').val()||null,
        name: $('#prod-name').val(),
        category: $('#prod-category').val(),
        description: $('#prod-desc').val(),
        price: $('#prod-price').val(),
        currency: $('#prod-currency').val(),
        image_url: $('#prod-image').val(),
        product_url: $('#prod-url').val(),
        demo_url: $('#prod-demo').val(),
        status: $('#prod-status').val(),
        client_id: $('#prod-client').val() || null,
        cpc_rate: $('#prod-cpc-rate').val() || 0,
        cpl_rate: $('#prod-cpl-rate').val() || 0,
        display_platform: $('#prod-display-platform').val() || 'instagram',
      };
      var action = data.id ? App.api.products.update(data) : App.api.products.create(data);
      var $btn = $(this).prop('disabled',true).html('<span class="spinner"></span>');
      action.done(function(res){
        $('#modal-product').hide();
        Swal.fire({ icon:'success', title:res.message, showConfirmButton:false, timer:1500 });
        loadTables();
      }).fail(App.api.handleError).always(function(){ $btn.prop('disabled',false).html('💾 '+App.i18n.t('save')); });
    });

    // Deactivate (from active list)
    $(document).off('click', '.btn-deactivate-prod').on('click','.btn-deactivate-prod', function(){
      var id   = $(this).data('id');
      var name = $(this).data('name');
      Swal.fire({
        icon: 'warning',
        title: 'Deactivate Product?',
        html: `<strong>${name}</strong> will be moved to the Deactivated list.<br><br>
               All active tracking links for this product will stop working.<br>
               <span style="color:var(--success);font-size:0.85rem">✅ Wallet & earnings records are not affected.</span>`,
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        confirmButtonText: '⛔ Yes, Deactivate',
        cancelButtonText: 'Cancel'
      }).then(function(r){
        if (r.isConfirmed) {
          App.api.products.toggleStatus(id).done(function(){
            Swal.fire({ icon:'success', title:'Product Deactivated', showConfirmButton:false, timer:1200 });
            loadTables();
          }).fail(App.api.handleError);
        }
      });
    });

    // Activate (from deactivated list)
    $(document).off('click', '.btn-activate-prod').on('click','.btn-activate-prod', function(){
      var id   = $(this).data('id');
      var name = $(this).data('name');
      Swal.fire({
        icon: 'question',
        title: 'Activate Product?',
        html: `<strong>${name}</strong> will be moved back to the Active list.<br>New tracking links can be generated for it.`,
        showCancelButton: true,
        confirmButtonColor: '#22c55e',
        confirmButtonText: '✅ Yes, Activate'
      }).then(function(r){
        if (r.isConfirmed) {
          App.api.products.toggleStatus(id).done(function(){
            Swal.fire({ icon:'success', title:'Product Activated', showConfirmButton:false, timer:1200 });
            loadTables();
          }).fail(App.api.handleError);
        }
      });
    });

    // Permanent Delete (only from deactivated list)
    $(document).off('click', '.btn-del-prod').on('click','.btn-del-prod', function(){
      var id    = $(this).data('id');
      var name  = $(this).data('name');
      var camps = $(this).data('camps');
      Swal.fire({
        icon: 'warning',
        title: 'Permanently Delete Product?',
        html: `<strong>${name}</strong> will be permanently deleted.<br><br>
               ${camps > 0
                 ? `<span style="color:#ef4444">⚠️ ${camps} campaign(s) and all their click/conversion history will also be deleted.</span><br><br>`
                 : ''}
               <span style="color:var(--success);font-size:0.85rem">✅ All vendor wallet deductions and influencer earnings records are preserved.</span>`,
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: '🗑️ Yes, Delete Permanently',
        cancelButtonText: 'Cancel',
        input: camps > 0 ? 'checkbox' : undefined,
        inputValue: 0,
        inputPlaceholder: camps > 0 ? 'I understand the campaign history will be deleted' : undefined,
        preConfirm: camps > 0 ? function(checked){
          if (!checked) {
            Swal.showValidationMessage('Please confirm you understand campaign history will be deleted.');
          }
        } : undefined
      }).then(function(r){
        if (r.isConfirmed) {
          App.api.products.delete(id).done(function(){
            Swal.fire({ icon:'success', title:'Product Deleted', text:'All financial records preserved.', showConfirmButton:false, timer:1800 });
            loadTables();
          }).fail(App.api.handleError);
        }
      });
    });
  }

  return { init };
}(jQuery));
