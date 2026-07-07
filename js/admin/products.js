/**
 * Admin — Products Module
 */
window.App = window.App || {};
App.Admin = App.Admin || {};

App.Admin.Products = (function ($) {
  'use strict';
  var _dt = null;
  var _categories = [];

  // Extract leading emoji from a category name like "🍔 Foodies" → "🍔"
  function catIcon(name) {
    if (!name) return '📦';
    var m = name.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
    return m ? m[0] : '📦';
  }

  function init() {
    if (!App.auth.requireAuth('admin')) return;
    render();
    loadCategories();
    loadTable();
    bindEvents();
  }

  function loadCategories() {
    return App.api.users.categories().done(function(res) {
      _categories = res.data || [];
      var opts = '<option value="">— Select category —</option>' +
        _categories.map(function(c) {
          return '<option value="' + c.name + '">' + c.name + '</option>';
        }).join('');
      // Also append a plain fallback if list is empty
      if (!_categories.length) {
        opts += '<option value="other">📦 Other</option>';
      }
      $('#prod-category').html(opts);
    });
  }

  function render() {
    var t = App.i18n.t.bind(App.i18n);
    $('#page-content').html(`
      <div class="page-header">
        <div><h2>📦 ${t('products')}</h2><p class="page-subtitle">Manage products available for campaigns</p></div>
        <button class="btn btn-primary" id="btn-add-product">➕ ${t('add_product')}</button>
      </div>
      <div class="card">
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-products" class="dataTable" style="width:100%">
              <thead>
                <tr>
                  <th>#</th><th>${t('name')}</th><th>${t('category')}</th>
                  <th>${t('price')}</th><th>Campaigns</th><th>Clicks</th><th>Convs.</th>
                  <th>${t('status')}</th><th>${t('actions')}</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>

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
                <div class="form-group">
                  <label class="form-label">${t('description')}</label>
                  <textarea class="form-control" id="prod-desc" placeholder="Product description..." rows="3"></textarea>
                </div>
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">${t('price')} <span class="req">*</span></label>
                    <div class="input-group">
                      <select class="form-control" id="prod-currency" style="max-width:90px">
                        <option value="BHD">BHD</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="SAR">SAR</option>
                        <option value="AED">AED</option>
                        <option value="INR">INR</option>
                        <option value="PKR">PKR</option>
                      </select>
                      <input type="number" class="form-control" id="prod-price" placeholder="0.000" min="0" step="0.001">
                    </div>
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
                  <label class="form-label">${t('image_url')}</label>
                  <input type="url" class="form-control" id="prod-image" placeholder="https://...">
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

  function loadTable() {
    App.api.products.list().done(function(res){
      if (_dt) { _dt.destroy(); _dt = null; }
      _dt = $('#tbl-products').DataTable({
        data: res.data,
        pageLength: 10,
        order: [[0,'asc']],
        columns: [
          { data: null, render: function(d,t,r,m){ return m.row+1; }, orderable:false, width:'40px' },
          { data: 'name', render: function(d,t,r){
              var icon = catIcon(r.category);
              return `<div style="display:flex;align-items:center;gap:10px">
                <div style="width:38px;height:38px;border-radius:10px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">${icon}</div>
                <div><div style="font-weight:600">${r.name}</div><div style="font-size:0.75rem;color:var(--text-muted)">${r.description ? r.description.substring(0,40)+'…' : ''}</div></div>
              </div>`;
            }
          },
          { data: 'category', render: function(d){ return `<span class="badge badge-primary">${catIcon(d)} ${d}</span>`; }},
          { data: 'price', render: function(d,t,r){ return `<strong>${r.currency} ${parseFloat(d).toFixed(3)}</strong>`; }},
          { data: 'campaign_count', render: function(d){ return '<strong>'+d+'</strong>'; }},
          { data: 'total_clicks', render: function(d){ return '<span style="color:var(--info);font-weight:700">'+d+'</span>'; }},
          { data: 'total_conversions', render: function(d){ return '<span style="color:var(--success);font-weight:700">'+d+'</span>'; }},
          { data: 'status', render: function(d,t,r){
              var cls = d==='active'?'badge-success':'badge-danger';
              return `<span class="badge ${cls}" style="cursor:pointer" data-toggle-prod-id="${r.id}">${d}</span>`;
            }
          },
          { data: null, orderable:false, render: function(d,t,r){
              return `<div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-sm btn-edit-prod" data-id="${r.id}">✏️</button>
                <button class="btn btn-danger btn-sm btn-del-prod" data-id="${r.id}">🗑️</button>
              </div>`;
            }
          },
        ]
      });
    }).fail(App.api.handleError);
  }

  function bindEvents() {
    $(document).on('click','#btn-add-product', function(){
      $('#modal-prod-title').text(App.i18n.t('add_product'));
      $('#form-product')[0].reset();
      $('#prod-id').val('');
      $('#modal-product').show();
    });

    $(document).on('click','.btn-edit-prod', function(){
      var id = $(this).data('id');
      App.api.products.get(id).done(function(res){
        var r = res.data;
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
        $('#modal-product').show();
      }).fail(App.api.handleError);
    });

    $(document).on('click','#btn-close-modal-prod, #btn-cancel-prod', function(){ $('#modal-product').hide(); });

    $(document).on('click','#btn-save-prod', function(){
      var data = {
        id: $('#prod-id').val()||null, name: $('#prod-name').val(),
        category: $('#prod-category').val(), description: $('#prod-desc').val(),
        price: $('#prod-price').val(), currency: $('#prod-currency').val(),
        image_url: $('#prod-image').val(), product_url: $('#prod-url').val(),
        demo_url: $('#prod-demo').val(), status: $('#prod-status').val(),
      };
      var action = data.id ? App.api.products.update(data) : App.api.products.create(data);
      var $btn = $(this).prop('disabled',true).html('<span class="spinner"></span>');
      action.done(function(res){
        $('#modal-product').hide();
        Swal.fire({ icon:'success', title:res.message, showConfirmButton:false, timer:1500 });
        loadTable();
      }).fail(App.api.handleError).always(function(){ $btn.prop('disabled',false).html('💾 '+App.i18n.t('save')); });
    });

    $(document).on('click','.btn-del-prod', function(){
      var id = $(this).data('id');
      Swal.fire({ icon:'warning', title:App.i18n.t('delete_product'), text:App.i18n.t('confirm_delete_prod'), showCancelButton:true, confirmButtonColor:'#ef4444', confirmButtonText:App.i18n.t('delete') })
        .then(function(r){ if(r.isConfirmed) App.api.products.delete(id).done(function(){ Swal.fire({icon:'success',title:'Deleted!',showConfirmButton:false,timer:1200}); loadTable(); }).fail(App.api.handleError); });
    });

    $(document).on('click','[data-toggle-prod-id]', function(){
      var id = $(this).data('toggle-prod-id');
      App.api.products.toggleStatus(id).done(function(res){ loadTable(); Swal.fire({icon:'success',title:'Status: '+res.data.status,showConfirmButton:false,timer:1000}); }).fail(App.api.handleError);
    });
  }

  return { init };
}(jQuery));
