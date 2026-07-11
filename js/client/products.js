/**
 * Client — Products Module
 */
window.App = window.App || {};
App.Client = App.Client || {};

App.Client.Products = (function ($) {
  'use strict';

  var _dt = null;
  var _editId = null;
  var _cropper = null;
  var _activeSlotIndex = null;
  var _imagesBase64 = [null, null, null];
  var _videoFile = null;

  var _adminCpcRate = 0;
  var _adminCplRate = 0;

  function init() {
    render();
    loadCategories();
    loadAdminRates();
    loadTable();
    bindEvents();
  }

  function loadAdminRates() {
    App.api.points.clientRates()
      .done(function (res) {
        var d = res.data || {};
        _adminCpcRate = parseFloat(d.cpc_rate || 0);
        _adminCplRate = parseFloat(d.cpl_rate || 0);
        var cur = d.currency || 'BHD';
        $('#prod-cpc-display').text(_adminCpcRate.toFixed(3) + ' ' + cur + ' per click');
        $('#prod-cpl-display').text(_adminCplRate.toFixed(3) + ' ' + cur + ' per lead');
      });
  }

  function loadCategories() {
    App.api.users.categories()
      .done(function (res) {
        var opts = '<option value="">— Select Category —</option>';
        (res.data || []).forEach(function (c) {
          opts += '<option value="' + c.name + '">' + c.name + '</option>';
        });
        $('#prod-category').html(opts);
      });
  }

  function render() {
    $('#page-content').html(`
      <div class="page-header">
        <div>
          <h2>📦 My Products</h2>
          <p class="page-subtitle">Add and manage products you wish to promote via influencer campaigns</p>
        </div>
        <button class="btn btn-primary" id="btn-add-product">➕ Add New Product</button>
      </div>

      <div class="card">
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="padding:16px">
            <table id="tbl-client-products" class="dataTable" style="width:100%">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Display Target</th>
                  <th>Campaigns</th>
                  <th>Clicks</th>
                  <th>Conversions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="tbl-client-products-body">
                <tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted)">Loading products...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Add/Edit Product Modal -->
      <div id="modal-product" class="custom-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:1000; align-items:center; justify-content:center">
        <div class="card" style="width:100%; max-width:750px; margin:20px; border-radius:12px; max-height:90vh; overflow-y:auto">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding:16px 20px">
            <span class="card-title" id="modal-product-title" style="margin:0; font-size:1.2rem">📦 Add Product</span>
            <button class="modal-close btn-close-modal" style="background:none; border:none; font-size:1.2rem; cursor:pointer">✕</button>
          </div>
          <div class="card-body" style="padding:20px">
            <form id="form-product" autocomplete="off">
              <input type="hidden" id="prod-id" />
              
              <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px">
                <div class="form-group">
                  <label class="form-label">Product Name <span class="req">*</span></label>
                  <input type="text" class="form-control" id="prod-name" required placeholder="e.g. Premium Leather Jacket" />
                </div>
                <div class="form-group">
                  <label class="form-label">Category <span class="req">*</span></label>
                  <select class="form-control" id="prod-category" required>
                    <option value="">Loading categories...</option>
                  </select>
                </div>
              </div>

              <div class="form-group" style="margin-bottom:16px">
                <label class="form-label">Description</label>
                <textarea class="form-control" id="prod-desc" rows="3" placeholder="Describe your product..."></textarea>
              </div>


              <!-- Price Row -->
              <div class="grid-2" style="display:grid; grid-template-columns:1.2fr 1fr; gap:12px; margin-bottom:16px">
                <div class="form-group">
                  <label class="form-label">Product Price <span class="req">*</span></label>
                  <div style="display:flex; gap:6px">
                    <select class="form-control" id="prod-currency" style="max-width:80px; padding:4px">
                      <option value="BHD">BHD</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="SAR">SAR</option>
                      <option value="AED">AED</option>
                    </select>
                    <input type="number" step="0.001" min="0" class="form-control" id="prod-price" required placeholder="0.000" />
                  </div>
                </div>
              </div>

              <!-- CPC / CPL — Admin-Controlled, Read-Only -->

              <div style="background:rgba(108,99,255,0.06); border:1px solid rgba(108,99,255,0.2); border-radius:10px; padding:14px 16px; margin-bottom:16px">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px">
                  <span style="font-size:1rem">⚙️</span>
                  <strong style="color:var(--primary); font-size:0.9rem">Campaign Offer Rates — Set by Admin</strong>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:10px">
                  <div>
                    <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">💰 CPC Offer (per click)</div>
                    <div id="prod-cpc-display" style="font-size:1.1rem; font-weight:700; color:var(--primary); background:var(--card-bg); border:1px solid var(--border); border-radius:6px; padding:8px 12px">Loading...</div>
                  </div>
                  <div>
                    <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">🎯 CPL Offer (per lead)</div>
                    <div id="prod-cpl-display" style="font-size:1.1rem; font-weight:700; color:#22C55E; background:var(--card-bg); border:1px solid var(--border); border-radius:6px; padding:8px 12px">Loading...</div>
                  </div>
                </div>
                <div style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:flex-start; gap:6px; border-top:1px solid var(--border); padding-top:8px">
                  <span style="flex-shrink:0">⚠️</span>
                  <span>These rates are configured by the admin based on the platform's points system. <strong>Prices may vary based on market conditions.</strong> Contact your account manager for custom rates.</span>
                </div>
              </div>

              <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px">
                <div class="form-group">
                  <label class="form-label">Product / Store URL <span class="req">*</span></label>
                  <input type="url" class="form-control" id="prod-url" required placeholder="https://..." />
                </div>
                <div class="form-group">
                  <label class="form-label">Demo URL <span style="font-size:0.75rem; color:var(--text-muted)">(optional)</span></label>
                  <input type="url" class="form-control" id="prod-demo" placeholder="https://..." />
                </div>
              </div>

              <div class="form-group" style="margin-bottom:16px">
                <label class="form-label">Target Social Media Display Platform <span class="req">*</span></label>
                <select class="form-control" id="prod-display-platform" required style="font-weight:600; color:var(--primary)">
                  <option value="instagram">Instagram Post / Feed (1:1 Square)</option>
                  <option value="tiktok">TikTok / Reels (9:16 Vertical)</option>
                  <option value="youtube">YouTube (16:9 Landscape)</option>
                  <option value="other">Other (1:1 Square)</option>
                </select>
                <p class="form-helper" style="font-size:0.75rem; color:var(--text-muted); margin-top:4px">Choosing the platform locks the cropping shape of your images to fit that standard format.</p>
              </div>

              <!-- Media Upload Section -->
              <div style="border-top:1px solid var(--border); padding-top:16px; margin-top:16px">
                <h4 style="margin:0 0 12px 0; color:var(--text)">🖼️ Product Images & Video</h4>
                
                <label class="form-label">Product Images <span class="req">*</span> <span style="font-size:0.75rem; color:var(--text-muted)">(3 Images, Max 1 MB each. Click a slot to upload and crop)</span></label>
                <div style="display:flex; gap:16px; margin-bottom:16px">
                  <!-- Slot 1 -->
                  <div class="image-upload-slot" data-index="1" style="width:110px; height:110px; border:2px dashed var(--border); border-radius:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; overflow:hidden; position:relative">
                    <span class="slot-placeholder" style="font-size:1.6rem">📸</span>
                    <span class="slot-text" style="font-size:0.7rem; color:var(--text-muted); font-weight:600">Image 1</span>
                    <img class="slot-preview" style="display:none; width:100%; height:100%; object-fit:cover" />
                  </div>
                  <!-- Slot 2 -->
                  <div class="image-upload-slot" data-index="2" style="width:110px; height:110px; border:2px dashed var(--border); border-radius:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; overflow:hidden; position:relative">
                    <span class="slot-placeholder" style="font-size:1.6rem">📸</span>
                    <span class="slot-text" style="font-size:0.7rem; color:var(--text-muted); font-weight:600">Image 2</span>
                    <img class="slot-preview" style="display:none; width:100%; height:100%; object-fit:cover" />
                  </div>
                  <!-- Slot 3 -->
                  <div class="image-upload-slot" data-index="3" style="width:110px; height:110px; border:2px dashed var(--border); border-radius:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; overflow:hidden; position:relative">
                    <span class="slot-placeholder" style="font-size:1.6rem">📸</span>
                    <span class="slot-text" style="font-size:0.7rem; color:var(--text-muted); font-weight:600">Image 3</span>
                    <img class="slot-preview" style="display:none; width:100%; height:100%; object-fit:cover" />
                  </div>
                </div>

                <!-- Hidden Image Input -->
                <input type="file" id="prod-media-input" accept="image/*" style="display:none" />

                <!-- Video Input -->
                <div class="form-group" style="margin-bottom:16px">
                  <label class="form-label">Product Video <span style="font-size:0.75rem; color:var(--text-muted)">(Max 72 MB, mp4/webm/mov)</span></label>
                  <input type="file" id="prod-video-input" class="form-control" accept="video/*" />
                  <div id="video-file-info" style="font-size:0.78rem; color:#6C63FF; margin-top:4px; font-weight:600; display:none"></div>
                  <div id="existing-video-indicator" style="font-size:0.78rem; color:var(--text-muted); margin-top:4px; display:none">
                    <span>🎥 Currently has saved video.</span>
                    <label style="margin-left:12px; color:#EF4444; cursor:pointer; font-weight:600">
                      <input type="checkbox" id="delete-video-chk" /> Delete existing video
                    </label>
                  </div>
                </div>
              </div>

              <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:12px; border-top:1px solid var(--border); padding-top:16px; margin-top:16px">
                <button type="button" class="btn btn-secondary btn-close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">💾 Save Product</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Image Cropping Modal -->
      <div id="modal-crop-image" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75); z-index:2000; align-items:center; justify-content:center">
        <div class="card" style="width:100%; max-width:600px; margin:20px; border-radius:12px">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding:16px 20px">
            <span class="card-title" style="margin:0; font-size:1.1rem">✂️ Crop Product Image</span>
            <button id="btn-close-crop" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color:var(--text-muted)">&times;</button>
          </div>
          <div class="card-body" style="padding:20px">
            <div style="max-height:400px; overflow:hidden; background:#1e1e2f; display:flex; align-items:center; justify-content:center; border-radius:8px; margin-bottom:20px">
              <img id="crop-image-target" style="max-width:100%; max-height:400px; display:block" />
            </div>
            <div style="display:flex; gap:12px">
              <button type="button" id="btn-cancel-crop" class="btn btn-secondary" style="flex:1">Cancel</button>
              <button type="button" id="btn-apply-crop" class="btn btn-primary" style="flex:1.5; font-weight:600">✂️ Apply Crop</button>
            </div>
          </div>
        </div>
      </div>
    `);
  }

  function loadTable() {
    App.api.clientProducts.list()
      .done(function (res) {
        var data = res.data || [];
        var rows = '';

        if (data.length === 0) {
          rows = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted)">You have not added any products. Click Add New Product above!</td></tr>`;
        } else {
          data.forEach(function (p, idx) {
            var platformLabels = {
              'instagram': '📸 Instagram (1:1)',
              'tiktok': '🎵 TikTok (9:16)',
              'youtube': '📺 YouTube (16:9)',
              'other': '📦 Other (1:1)'
            };

            var platformName = platformLabels[p.display_platform] || p.display_platform || 'Instagram (1:1)';

            rows += `
              <tr data-id="${p.id}">
                <td>${idx + 1}</td>
                <td>
                  <div style="display:flex; align-items:center; gap:10px">
                    <img src="${p.image_url || 'assets/images/default_product.png'}" style="width:40px; height:40px; border-radius:8px; object-fit:cover; border:1px solid var(--border)" />
                    <div>
                      <strong style="color:var(--primary)">${p.name}</strong>
                      <div style="font-size:0.72rem; color:var(--text-muted)">CPC: ${parseFloat(p.cpc_rate).toFixed(3)} BHD | CPL: ${parseFloat(p.cpl_rate).toFixed(3)} BHD</div>
                    </div>
                  </div>
                </td>
                <td><span class="badge badge-primary">${p.category}</span></td>
                <td><strong>${p.currency} ${parseFloat(p.price).toFixed(3)}</strong></td>
                <td><span class="badge badge-info" style="font-weight:600">${platformName}</span></td>
                <td><strong>${p.campaign_count}</strong></td>
                <td><span style="color:var(--info); font-weight:bold">${p.total_clicks}</span></td>
                <td><span style="color:var(--success); font-weight:bold">${p.total_conversions}</span></td>
                <td>
                  <div style="display:flex; gap:6px">
                    <button class="btn-icon btn-edit" title="Edit Product" style="background:#6C63FF; color:#fff">✏️</button>
                    <button class="btn-icon btn-delete" title="Delete Product" style="background:#EF4444; color:#fff">🗑️</button>
                  </div>
                </td>
              </tr>
            `;
          });
        }

        if (_dt) {
          _dt.destroy();
        }
        $('#tbl-client-products-body').html(rows);
        _dt = $('#tbl-client-products').DataTable({
          pageLength: 10,
          retrieve: true
        });
      })
      .fail(App.api.handleError);
  }

  function bindEvents() {
    // Add Product click
    $('#btn-add-product').on('click', function () {
      _editId = null;
      _imagesBase64 = [null, null, null];
      _videoFile = null;
      $('#form-product')[0].reset();
      $('#prod-id').val('');
      $('#modal-product-title').text('📦 Add New Product');
      
      // Reset upload preview slots
      $('.image-upload-slot').each(function () {
        $(this).find('.slot-placeholder').show();
        $(this).find('.slot-text').show();
        $(this).find('.slot-preview').hide().attr('src', '');
      });
      $('#video-file-info').hide().text('');
      $('#existing-video-indicator').hide();
      $('#delete-video-chk').prop('checked', false);

      $('#modal-product').css('display', 'flex');
    });

    // Close modals
    $('.btn-close-modal').on('click', function () {
      $('#modal-product').hide();
    });

    // Open file selector on slot click
    $('.image-upload-slot').on('click', function () {
      _activeSlotIndex = $(this).data('index');
      $('#prod-media-input').trigger('click');
    });

    // Handle Image upload selection
    $('#prod-media-input').on('change', function (e) {
      var files = e.target.files;
      if (!files || !files.length) return;

      var file = files[0];
      if (!file.type.match(/^image\//)) {
        Swal.fire({ icon: 'warning', title: 'Invalid File', text: 'Please select an image file.' });
        return;
      }

      // Validate Image Size: <= 1 MB (1048576 bytes)
      if (file.size > 1048576) {
        Swal.fire({ icon: 'error', title: 'File Too Large', text: 'Each product image must not exceed 1 MB.' });
        $(this).val('');
        return;
      }

      var reader = new FileReader();
      reader.onload = function (evt) {
        if (_cropper) {
          _cropper.destroy();
          _cropper = null;
        }

        $('#crop-image-target').attr('src', evt.target.result);
        $('#modal-crop-image').css('display', 'flex');

        // Dynamically configure crop aspect ratio based on selected display platform
        var platform = $('#prod-display-platform').val();
        var aspectRatio = 1; // Instagram 1:1
        if (platform === 'tiktok') {
          aspectRatio = 9 / 16;
        } else if (platform === 'youtube') {
          aspectRatio = 16 / 9;
        }

        var image = document.getElementById('crop-image-target');
        _cropper = new Cropper(image, {
          aspectRatio: aspectRatio,
          viewMode: 1,
          autoCropArea: 0.9,
          dragMode: 'move',
          cropBoxMovable: true,
          cropBoxResizable: true
        });
      };
      reader.readAsDataURL(file);
    });

    // Apply Crop selection
    $('#btn-apply-crop').on('click', function () {
      if (!_cropper) return;

      var platform = $('#prod-display-platform').val();
      var canvasOptions = { width: 400, height: 400 }; // square
      if (platform === 'tiktok') {
        canvasOptions = { width: 360, height: 640 }; // 9:16 vertical
      } else if (platform === 'youtube') {
        canvasOptions = { width: 640, height: 360 }; // 16:9 landscape
      }

      var canvas = _cropper.getCroppedCanvas(canvasOptions);
      var base64 = canvas.toDataURL('image/jpeg');

      // Save locally
      _imagesBase64[_activeSlotIndex - 1] = base64;

      // Update slot UI preview
      var $slot = $(`.image-upload-slot[data-index="${_activeSlotIndex}"]`);
      $slot.find('.slot-placeholder').hide();
      $slot.find('.slot-text').hide();
      $slot.find('.slot-preview').show().attr('src', base64);

      // Clean up cropper
      $('#modal-crop-image').hide();
      $('#prod-media-input').val('');
      if (_cropper) {
        _cropper.destroy();
        _cropper = null;
      }
    });

    // Close crop modal
    $('#btn-close-crop, #btn-cancel-crop').on('click', function () {
      $('#modal-crop-image').hide();
      $('#prod-media-input').val('');
      if (_cropper) {
        _cropper.destroy();
        _cropper = null;
      }
    });

    // Validate Video size
    $('#prod-video-input').on('change', function (e) {
      var files = e.target.files;
      if (!files || !files.length) {
        _videoFile = null;
        $('#video-file-info').hide().text('');
        return;
      }

      var file = files[0];
      // Size limit: 72 MB = 75497472 bytes
      if (file.size > 75497472) {
        Swal.fire({ icon: 'error', title: 'File Too Large', text: 'The product video must not exceed 72 MB.' });
        $(this).val('');
        _videoFile = null;
        $('#video-file-info').hide().text('');
        return;
      }

      _videoFile = file;
      var mbSize = (file.size / (1024 * 1024)).toFixed(1);
      $('#video-file-info').show().html(`✅ Selected video: <strong>${file.name}</strong> (${mbSize} MB)`);
    });

    // Form submission
    $('#form-product').on('submit', function (e) {
      e.preventDefault();

      // Check if at least one image is uploaded (Image 1 is mandatory)
      if (!_imagesBase64[0] && !_editId) {
        Swal.fire({ icon: 'warning', title: 'Media Required', text: 'Please upload and crop at least Image 1 for the product.' });
        return;
      }

      var fd = new FormData();
      if (_editId) {
        fd.append('id', _editId);
      }
      fd.append('name', $('#prod-name').val().trim());
      fd.append('category', $('#prod-category').val());
      fd.append('description', $('#prod-desc').val().trim());
      fd.append('price', $('#prod-price').val());
      fd.append('currency', $('#prod-currency').val());
      fd.append('cpc_rate', $('#prod-cpc').val());
      fd.append('cpl_rate', $('#prod-cpl').val());
      fd.append('product_url', $('#prod-url').val().trim());
      fd.append('demo_url', $('#prod-demo').val().trim());
      fd.append('display_platform', $('#prod-display-platform').val());

      // Append base64 images
      if (_imagesBase64[0]) fd.append('image_1', _imagesBase64[0]);
      if (_imagesBase64[1]) fd.append('image_2', _imagesBase64[1]);
      if (_imagesBase64[2]) fd.append('image_3', _imagesBase64[2]);

      // Append video file
      if (_videoFile) {
        fd.append('video', _videoFile);
      }

      if ($('#delete-video-chk').is(':checked')) {
        fd.append('delete_video', '1');
      }

      var $btn = $(this).find('button[type="submit"]');
      $btn.prop('disabled', true).text('Saving...');

      var actionPromise = _editId 
        ? App.api.clientProducts.update(fd)
        : App.api.clientProducts.create(fd);

      actionPromise
        .done(function (res) {
          Swal.fire({ icon: 'success', title: 'Success', text: res.message, timer: 1200, showConfirmButton: false });
          $('#modal-product').hide();
          loadTable();
        })
        .fail(function (err) {
          App.api.handleError(err);
        })
        .always(function () {
          $btn.prop('disabled', false).text('💾 Save Product');
        });
    });

    // Edit product click
    $(document).on('click', '#tbl-client-products .btn-edit', function () {
      var id = $(this).closest('tr').data('id');
      App.api.clientProducts.get(id)
        .done(function (res) {
          var p = res.data;
          _editId = p.id;
          _imagesBase64 = [p.image_url_1, p.image_url_2, p.image_url_3];
          _videoFile = null;

          $('#prod-id').val(p.id);
          $('#prod-name').val(p.name);
          $('#prod-category').val(p.category);
          $('#prod-desc').val(p.description || '');
          $('#prod-currency').val(p.currency);
          $('#prod-price').val(parseFloat(p.price).toFixed(3));
          $('#prod-cpc').val(parseFloat(p.cpc_rate).toFixed(3));
          $('#prod-cpl').val(parseFloat(p.cpl_rate).toFixed(3));
          $('#prod-url').val(p.product_url);
          $('#prod-demo').val(p.demo_url || '');
          $('#prod-display-platform').val(p.display_platform || 'instagram');

          // Render slot previews
          for (var i = 1; i <= 3; i++) {
            var $slot = $(`.image-upload-slot[data-index="${i}"]`);
            var val = _imagesBase64[i - 1];
            if (val) {
              $slot.find('.slot-placeholder').hide();
              $slot.find('.slot-text').hide();
              $slot.find('.slot-preview').show().attr('src', val);
            } else {
              $slot.find('.slot-placeholder').show();
              $slot.find('.slot-text').show();
              $slot.find('.slot-preview').hide().attr('src', '');
            }
          }

          // Video configuration
          $('#prod-video-input').val('');
          $('#video-file-info').hide().text('');
          if (p.video_url) {
            $('#existing-video-indicator').show();
            $('#delete-video-chk').prop('checked', false);
          } else {
            $('#existing-video-indicator').hide();
          }

          $('#modal-product-title').text('✏️ Edit Product');
          $('#modal-product').css('display', 'flex');
        })
        .fail(App.api.handleError);
    });

    // Delete product click
    $(document).on('click', '#tbl-client-products .btn-delete', function () {
      var id = $(this).closest('tr').data('id');
      Swal.fire({
        title: 'Are you sure?',
        text: 'This product will be permanently deleted!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6C63FF',
        confirmButtonText: 'Yes, delete it!'
      }).then(function (result) {
        if (result.isConfirmed) {
          App.api.clientProducts.delete(id)
            .done(function (res) {
              Swal.fire({ icon: 'success', title: 'Deleted!', text: res.message, timer: 1000, showConfirmButton: false });
              loadTable();
            })
            .fail(App.api.handleError);
        }
      });
    });
  }

  return { init };

}(jQuery));
