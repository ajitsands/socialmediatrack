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

  var _categories = [];

  function init() {
    if (!App.auth.requireAuth('admin')) return;
    render();
    loadCategories().done(function(){
      loadTable();
    });
    bindEvents();
  }

  function loadCategories() {
    return App.api.users.categories().done(function(res){
      _categories = res.data;
    });
  }

  function renderCategoryCheckboxes(selectedIds) {
    selectedIds = selectedIds || [];
    var html = _categories.map(function(cat){
      var checked = selectedIds.indexOf(parseInt(cat.id)) !== -1 ? 'checked' : '';
      return `
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.88rem;user-select:none">
          <input type="checkbox" class="inf-cat-checkbox" value="${cat.id}" ${checked} style="width:16px;height:16px;accent-color:var(--primary)">
          <span>${cat.name}</span>
        </label>`;
    }).join('');
    $('#categories-checkboxes-container').html(html || '<span style="color:var(--text-muted)">No categories defined</span>');
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
                  <th>${t('phone')}</th><th>Categories</th><th>${t('platform')}</th>
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
                
                <div class="form-group" style="margin-top:16px">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                    <label class="form-label" style="margin-bottom:0;font-weight:700">🏷️ Categories / Niches</label>
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-create-category-prompt" style="padding:2px 8px;font-size:0.75rem">➕ Create Category</button>
                  </div>
                  <div id="categories-checkboxes-container" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;padding:10px;border:1.5px solid var(--border);border-radius:8px;max-height:150px;overflow-y:auto;background:var(--table-stripe)">
                    <!-- Dynamic checkboxes -->
                  </div>
                </div>

                <div style="border-top:1px solid var(--border);margin-top:20px;padding-top:20px;margin-bottom:16px">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                    <label class="form-label" style="margin-bottom:0;font-weight:700">📱 Social Media Accounts</label>
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-add-platform-row">➕ Add Account</button>
                  </div>
                  <div id="platform-rows-container" style="display:flex;flex-direction:column;gap:10px">
                    <!-- Dynamic platform rows go here -->
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">${t('status')}</label>
                  <select class="form-control" id="inf-status">
                    <option value="active">✅ Active</option>
                    <option value="inactive">❌ Inactive</option>
                  </select>
                </div>
                <div class="form-group" style="margin-top:16px">
                  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;font-weight:600;color:var(--text)">
                    <input type="checkbox" id="inf-profile-locked" style="width:18px;height:18px;accent-color:var(--primary)">
                    <span>🔒 Lock Name/Details (Verified)</span>
                  </label>
                  <p class="form-helper" style="font-size:0.75rem;color:var(--text-muted);margin:4px 0 0 26px">When checked, the influencer cannot modify their full name in settings.</p>
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
                
                // Extract first platform's handle as subtitle
                var subtitle = '';
                if (r.platforms_list) {
                  var firstPlat = r.platforms_list.split(',')[0];
                  if (firstPlat) subtitle = firstPlat.split(':')[1] || '';
                }

                return `<div style="display:flex;align-items:center;gap:10px">
                  <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#6C63FF,#FF6584);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.75rem;flex-shrink:0">${initials}</div>
                  <div><div style="font-weight:600">${r.name}</div><div style="font-size:0.75rem;color:var(--text-muted)">${subtitle}</div></div>
                </div>`;
              }
            },
            { data: 'email' },
            { data: 'phone', render: function(d,t,r){ return (r.country_code||'')+' '+(d||'—'); }},
            { data: 'categories_list', render: function(d){
                if (!d) return '<span class="badge badge-muted">—</span>';
                return `<div style="display:flex;gap:4px;flex-wrap:wrap">` + d.split(',').map(function(c){
                  return `<span class="badge" style="background:var(--primary-light);color:var(--primary);font-size:0.75rem;padding:2px 6px">${c}</span>`;
                }).join('') + `</div>`;
              }
            },
            { data: 'platforms_list', render: function(d){
                if (!d) return '<span class="badge badge-muted">None</span>';
                var html = '<div style="display:flex;gap:4px;flex-wrap:wrap">';
                d.split(',').forEach(function(platItem){
                  var parts = platItem.split(':');
                  var plat = parts[0];
                  var handle = parts[1] || '';
                  var followers = parts[2] ? parseInt(parts[2]) : 0;
                  if (plat) {
                    var icon = platformIcons[plat] || '🌐';
                    var folText = followers > 0 ? ` (${followers.toLocaleString()})` : '';
                    html += `<span class="badge platform-${plat}" title="${handle}" style="font-size:0.75rem;padding:2px 8px">${icon} ${plat}${folText}</span>`;
                  }
                });
                html += '</div>';
                return html;
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

  function addPlatformRow(plat, handle, followers) {
    plat = plat || 'instagram';
    handle = handle || '';
    followers = followers !== undefined ? followers : '';
    var rowHtml = `
      <div class="platform-row" style="display:flex;gap:10px;align-items:center">
        <select class="form-control row-platform" style="flex:1.2">
          <option value="instagram" ${plat === 'instagram' ? 'selected' : ''}>📸 Instagram</option>
          <option value="tiktok" ${plat === 'tiktok' ? 'selected' : ''}>🎵 TikTok</option>
          <option value="youtube" ${plat === 'youtube' ? 'selected' : ''}>▶️ YouTube</option>
          <option value="facebook" ${plat === 'facebook' ? 'selected' : ''}>👍 Facebook</option>
          <option value="twitter" ${plat === 'twitter' ? 'selected' : ''}>🐦 Twitter / X</option>
          <option value="other" ${plat === 'other' ? 'selected' : ''}>🌐 Other</option>
        </select>
        <input type="text" class="form-control row-handle" style="flex:1.2" placeholder="@username" value="${handle}">
        <input type="number" class="form-control row-followers" style="width:110px" placeholder="Followers" min="0" value="${followers}">
        <button type="button" class="btn btn-danger btn-sm btn-remove-platform-row" style="padding:6px 10px">✕</button>
      </div>`;
    $('#platform-rows-container').append(rowHtml);
  }

  function bindEvents() {
    // Add platform row button
    $(document).off('click', '#btn-add-platform-row').on('click', '#btn-add-platform-row', function(){
      addPlatformRow();
    });

    // Remove platform row button
    $(document).off('click', '.btn-remove-platform-row').on('click', '.btn-remove-platform-row', function(){
      $(this).closest('.platform-row').remove();
    });

    // Create custom category prompt
    $(document).off('click', '#btn-create-category-prompt').on('click', '#btn-create-category-prompt', function(){
      Swal.fire({
        title: 'Create New Category',
        text: 'Enter the category name (you can include an emoji at the start, e.g. 🎬 Entertainment):',
        input: 'text',
        inputPlaceholder: 'e.g. ✈️ Travel or ⚽ Sports',
        showCancelButton: true,
        confirmButtonText: 'Create',
        confirmButtonColor: '#6C63FF',
        inputValidator: function(value) {
          if (!value || !value.trim()) {
            return 'Category name cannot be empty!';
          }
        }
      }).then(function(result) {
        if (result.isConfirmed && result.value) {
          var newName = result.value.trim();
          App.api.users.createCategory(newName)
            .done(function(res) {
              Swal.fire({ icon: 'success', title: res.message, showConfirmButton: false, timer: 1500 });
              
              // Remember currently checked categories in the modal
              var checkedIds = [];
              $('.inf-cat-checkbox:checked').each(function(){
                checkedIds.push(parseInt($(this).val()));
              });

              // Reload all categories and re-render checkboxes
              loadCategories().done(function(){
                renderCategoryCheckboxes(checkedIds);
              });
            })
            .fail(App.api.handleError);
        }
      });
    });

    // Open add modal
    $(document).off('click', '#btn-add-influencer').on('click', '#btn-add-influencer', function(){
      _editId = null;
      $('#modal-inf-title').text(App.i18n.t('add_influencer'));
      $('#form-influencer')[0].reset();
      $('#inf-id').val('');
      $('#platform-rows-container').empty();
      addPlatformRow(); // Add one initial blank platform row
      renderCategoryCheckboxes([]); // Clear selected categories
      $('#pass-req').show(); $('#pass-hint').hide();
      App.countries.renderSelect('inf-country-code', '+973');
      $('#inf-profile-locked').prop('checked', false);
      $('#modal-influencer').show();
    });

    // Edit
    $(document).off('click', '.btn-edit-inf').on('click', '.btn-edit-inf', function(){
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
        $('#inf-status').val(r.status);
        $('#inf-password').val('');
        $('#pass-req').hide(); $('#pass-hint').show();
        App.countries.renderSelect('inf-country-code', r.country_code || '+973');
        $('#inf-profile-locked').prop('checked', parseInt(r.profile_locked) === 1);

        // Populate categories
        renderCategoryCheckboxes(r.categories || []);

        // Populate platforms
        $('#platform-rows-container').empty();
        if (r.platforms && r.platforms.length > 0) {
          r.platforms.forEach(function(plat){
            addPlatformRow(plat.platform, plat.handle, plat.followers);
          });
        } else {
          addPlatformRow();
        }

        $('#modal-influencer').show();
      }).fail(App.api.handleError);
    });

    // Close modal
    $(document).off('click', '#btn-close-modal-inf, #btn-cancel-inf').on('click', '#btn-close-modal-inf, #btn-cancel-inf', function(){ $('#modal-influencer').hide(); });

    // Save
    $(document).off('click', '#btn-save-inf').on('click', '#btn-save-inf', function(){
      // Collect platforms
      var platformsList = [];
      $('.platform-row').each(function(){
        var pName = $(this).find('.row-platform').val();
        var pHand = $(this).find('.row-handle').val().trim();
        var pFollowers = parseInt($(this).find('.row-followers').val() || 0);
        if (pName) {
          platformsList.push({ platform: pName, handle: pHand, followers: pFollowers });
        }
      });

      // Collect categories
      var categoriesList = [];
      $('.inf-cat-checkbox:checked').each(function(){
        categoriesList.push($(this).val());
      });

      var data = {
        id:           $('#inf-id').val() || null,
        name:         $('#inf-name').val(),
        email:        $('#inf-email').val(),
        password:     $('#inf-password').val(),
        phone:        $('#inf-phone').val(),
        country_code: $('#inf-country-code').val(),
        status:       $('#inf-status').val(),
        platforms:    platformsList,
        categories:   categoriesList,
        profile_locked: $('#inf-profile-locked').is(':checked') ? 1 : 0
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
    $(document).off('click', '.btn-del-inf').on('click', '.btn-del-inf', function(){
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
    $(document).off('click', '[data-toggle-id]').on('click', '[data-toggle-id]', function(){
      var id = $(this).data('toggle-id');
      App.api.users.toggleStatus(id).done(function(res){
        loadTable();
        Swal.fire({ icon:'success', title:'Status updated to: ' + res.data.status, showConfirmButton:false, timer:1000 });
      }).fail(App.api.handleError);
    });
  }

  return { init };
}(jQuery));
