/**
 * Admin — Influencers Module
 */
window.App = window.App || {};
App.Admin = App.Admin || {};

App.Admin.Influencers = (function ($) {
  'use strict';

  var _dt = null;
  var _editId = null;

  var platformIcons = { instagram:'📸', tiktok:'🎵', youtube:'▶️', facebook:'👍', twitter:'🐦', other:'🌐' };

  function init() {
    if (!App.auth.requireAuth('admin')) return;
    render();
    loadTable();
    bindEvents();
  }

  function render() {
    var t = App.i18n.t.bind(App.i18n);
    $('#page-content').html(`
      <div class="page-header">
        <div>
          <h2>⭐ ${t('influencers')}</h2>
          <p class="page-subtitle">Manage your influencer partners</p>
        </div>
        <button class="btn btn-primary" id="btn-add-influencer">
          ➕ ${t('add_influencer')}
        </button>
      </div>

      <div class="card">
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-influencers" class="dataTable" style="width:100%">
              <thead>
                <tr>
                  <th>#</th><th>${t('name')}</th><th>${t('email')}</th>
                  <th>${t('phone')}</th><th>${t('platform')}</th>
                  <th>Campaigns</th><th>Conversions</th>
                  <th>${t('status')}</th><th>${t('actions')}</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div id="modal-influencer" style="display:none">
        <div class="modal-overlay">
          <div class="modal-box">
            <div class="modal-header">
              <span class="modal-title" id="modal-inf-title">${t('add_influencer')}</span>
              <button class="modal-close" id="btn-close-modal-inf">✕</button>
            </div>
            <div class="modal-body">
              <form id="form-influencer" autocomplete="off">
                <input type="hidden" id="inf-id">
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">${t('name')} <span class="req">*</span></label>
                    <input type="text" class="form-control" id="inf-name" placeholder="Full name" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">${t('email')} <span class="req">*</span></label>
                    <input type="email" class="form-control" id="inf-email" placeholder="email@example.com" required>
                  </div>
                </div>
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">${t('password')} <span class="req" id="pass-req">*</span></label>
                    <input type="password" class="form-control" id="inf-password" placeholder="Min 6 characters">
                    <div class="form-hint" id="pass-hint" style="display:none">Leave blank to keep current password</div>
                  </div>
                  <div class="form-group">
                    <label class="form-label">${t('phone')}</label>
                    <div class="input-group">
                      <select class="form-control country-flag-select" id="inf-country-code" style="min-width:120px"></select>
                      <input type="text" class="form-control" id="inf-phone" placeholder="Phone number">
                    </div>
                  </div>
                </div>
                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">${t('platform')}</label>
                    <select class="form-control" id="inf-platform">
                      <option value="instagram">📸 Instagram</option>
                      <option value="tiktok">🎵 TikTok</option>
                      <option value="youtube">▶️ YouTube</option>
                      <option value="facebook">👍 Facebook</option>
                      <option value="twitter">🐦 Twitter / X</option>
                      <option value="other">🌐 Other</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">${t('social_handle')}</label>
                    <input type="text" class="form-control" id="inf-handle" placeholder="@username">
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">${t('status')}</label>
                  <select class="form-control" id="inf-status">
                    <option value="active">✅ Active</option>
                    <option value="inactive">❌ Inactive</option>
                  </select>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="btn-cancel-inf">${t('cancel')}</button>
              <button class="btn btn-primary" id="btn-save-inf">💾 ${t('save')}</button>
            </div>
          </div>
        </div>
      </div>
    `);

    App.countries.renderSelect('inf-country-code', '+973');
  }

  function loadTable() {
    App.api.users.list()
      .done(function (res) {
        var data = res.data;
        if (_dt) { _dt.destroy(); _dt = null; }

        _dt = $('#tbl-influencers').DataTable({
          data: data,
          pageLength: 10,
          order: [[0,'asc']],
          columns: [
            { data: null, render: function(d,t,r,m){ return m.row + 1; }, orderable: false, width: '40px' },
            { data: 'name', render: function(d,t,r){
                var initials = r.name.split(' ').map(function(p){return p[0];}).join('').substring(0,2).toUpperCase();
                return `<div style="display:flex;align-items:center;gap:10px">
                  <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#6C63FF,#FF6584);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.75rem;flex-shrink:0">${initials}</div>
                  <div><div style="font-weight:600">${r.name}</div><div style="font-size:0.75rem;color:var(--text-muted)">${r.social_handle||''}</div></div>
                </div>`;
              }
            },
            { data: 'email' },
            { data: 'phone', render: function(d,t,r){ return (r.country_code||'')+' '+(d||'—'); }},
            { data: 'platform', render: function(d){
                var icon = platformIcons[d] || '🌐';
                return `<span class="badge platform-${d}">${icon} ${d}</span>`;
              }
            },
            { data: 'total_campaigns', render: function(d){ return '<strong>'+d+'</strong>'; }},
            { data: 'total_conversions', render: function(d){ return '<strong style="color:var(--success)">'+d+'</strong>'; }},
            { data: 'status', render: function(d,t,r){
                var cls = d==='active' ? 'badge-success' : 'badge-danger';
                return `<span class="badge ${cls}" style="cursor:pointer" data-toggle-id="${r.id}">${d}</span>`;
              }
            },
            { data: null, orderable: false, render: function(d,t,r){
                return `<div style="display:flex;gap:6px">
                  <button class="btn btn-secondary btn-sm btn-edit-inf" data-id="${r.id}" title="Edit">✏️</button>
                  <button class="btn btn-danger btn-sm btn-del-inf" data-id="${r.id}" title="Delete">🗑️</button>
                </div>`;
              }
            },
          ]
        });
      })
      .fail(App.api.handleError);
  }

  function bindEvents() {
    // Open add modal
    $(document).on('click', '#btn-add-influencer', function(){
      _editId = null;
      $('#modal-inf-title').text(App.i18n.t('add_influencer'));
      $('#form-influencer')[0].reset();
      $('#inf-id').val('');
      $('#pass-req').show(); $('#pass-hint').hide();
      App.countries.renderSelect('inf-country-code', '+973');
      $('#modal-influencer').show();
    });

    // Edit
    $(document).on('click', '.btn-edit-inf', function(){
      var id = $(this).data('id');
      _editId = id;
      App.api.users.get(id).done(function(res){
        var r = res.data;
        _editId = r.id;
        $('#modal-inf-title').text(App.i18n.t('edit_influencer'));
        $('#inf-id').val(r.id);
        $('#inf-name').val(r.name);
        $('#inf-email').val(r.email);
        $('#inf-phone').val(r.phone);
        $('#inf-platform').val(r.platform);
        $('#inf-handle').val(r.social_handle);
        $('#inf-status').val(r.status);
        $('#inf-password').val('');
        $('#pass-req').hide(); $('#pass-hint').show();
        App.countries.renderSelect('inf-country-code', r.country_code || '+973');
        $('#modal-influencer').show();
      }).fail(App.api.handleError);
    });

    // Close modal
    $(document).on('click', '#btn-close-modal-inf, #btn-cancel-inf', function(){ $('#modal-influencer').hide(); });

    // Save
    $(document).on('click', '#btn-save-inf', function(){
      var data = {
        id:           $('#inf-id').val() || null,
        name:         $('#inf-name').val(),
        email:        $('#inf-email').val(),
        password:     $('#inf-password').val(),
        phone:        $('#inf-phone').val(),
        country_code: $('#inf-country-code').val(),
        platform:     $('#inf-platform').val(),
        social_handle:$('#inf-handle').val(),
        status:       $('#inf-status').val(),
      };
      var action = data.id ? App.api.users.update(data) : App.api.users.create(data);
      var $btn = $(this).prop('disabled', true).html('<span class="spinner"></span>');
      action
        .done(function(res){
          $('#modal-influencer').hide();
          Swal.fire({ icon:'success', title: res.message, showConfirmButton:false, timer:1500 });
          loadTable();
        })
        .fail(App.api.handleError)
        .always(function(){ $btn.prop('disabled',false).html('💾 ' + App.i18n.t('save')); });
    });

    // Delete
    $(document).on('click', '.btn-del-inf', function(){
      var id = $(this).data('id');
      Swal.fire({
        icon: 'warning', title: App.i18n.t('delete_influencer'),
        text: App.i18n.t('confirm_delete_inf'),
        showCancelButton: true,
        confirmButtonText: App.i18n.t('delete'),
        confirmButtonColor: '#ef4444',
      }).then(function(r){
        if (r.isConfirmed) {
          App.api.users.delete(id).done(function(){
            Swal.fire({ icon:'success', title:'Deleted!', showConfirmButton:false, timer:1200 });
            loadTable();
          }).fail(App.api.handleError);
        }
      });
    });

    // Toggle status
    $(document).on('click', '[data-toggle-id]', function(){
      var id = $(this).data('toggle-id');
      App.api.users.toggleStatus(id).done(function(res){
        loadTable();
        Swal.fire({ icon:'success', title:'Status updated to: ' + res.data.status, showConfirmButton:false, timer:1000 });
      }).fail(App.api.handleError);
    });
  }

  return { init };
}(jQuery));
