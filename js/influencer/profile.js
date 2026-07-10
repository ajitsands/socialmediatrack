/**
 * Influencer Portal — Profile Settings & Avatar Cropping Module
 */
window.App = window.App || {};
App.Influencer = App.Influencer || {};

App.Influencer.Profile = (function ($) {
  'use strict';

  var _cropper = null;
  var _croppedImageBase64 = null;

  function init() {
    if (!App.auth.requireAuth('influencer')) return;
    renderLayout();
    loadProfileDetails();
    bindEvents();
  }

  function renderLayout() {
    var user = App.auth.getUser();
    var initials = user.name.split(' ').map(function(p){return p[0];}).join('').substring(0,2).toUpperCase();

    $('#page-content').html(`
      <style>
        .profile-avatar-container {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto 20px auto;
        }
        .profile-avatar-img {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid var(--primary-light);
          background: var(--border-light);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.2rem;
          font-weight: 700;
          color: var(--primary);
        }
        .profile-avatar-overlay {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--primary);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          transition: background 0.2s;
        }
        .profile-avatar-overlay:hover {
          background: var(--primary-dark);
        }
        .cropper-container-wrapper {
          max-width: 100%;
          max-height: 400px;
          margin: 0 auto;
          overflow: hidden;
          background: #1a1a2e;
          border-radius: 8px;
        }
      </style>

      <div class="page-header">
        <div>
          <h2>👤 My Profile Settings</h2>
          <p class="page-subtitle">Update your personal details, crop profile avatar, and change password.</p>
        </div>
      </div>

      <div class="grid-2" style="display:grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: start">
        
        <!-- Left Panel: Profile Details -->
        <div class="card">
          <div class="card-header"><span class="card-title">👤 Edit Profile Details</span></div>
          <div class="card-body">
            
            <!-- Avatar Upload & Preview -->
            <div class="profile-avatar-container">
              <div id="profile-avatar-view" class="profile-avatar-img">
                ${user.avatar ? `<img src="${user.avatar}?t=${new Date().getTime()}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" />` : initials}
              </div>
              <label for="profile-avatar-input" class="profile-avatar-overlay" title="Upload Avatar">
                📷
              </label>
              <input type="file" id="profile-avatar-input" accept="image/*" style="display:none" />
            </div>

            <div class="form-group" style="margin-bottom:16px">
              <label class="form-label">Full Name <span class="req">*</span></label>
              <input type="text" class="form-control" id="profile-name" required placeholder="Your full name" style="width:100%">
            </div>

            <div class="form-group" style="margin-bottom:16px">
              <label class="form-label">Email Address (Read-only)</label>
              <input type="email" class="form-control" id="profile-email" readonly disabled style="width:100%;background:var(--border-light);cursor:not-allowed">
            </div>

            <div class="grid-2" style="display:grid; grid-template-columns: 80px 1fr; gap: 12px; margin-bottom:16px">
              <div class="form-group">
                <label class="form-label">Code</label>
                <input type="text" class="form-control" id="profile-country-code" placeholder="+973" style="width:100%">
              </div>
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input type="text" class="form-control" id="profile-phone" placeholder="33004455" style="width:100%">
              </div>
            </div>

            <div class="grid-2" style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom:24px">
              <div class="form-group">
                <label class="form-label">Primary Platform</label>
                <select class="form-control" id="profile-platform" style="width:100%">
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="facebook">Facebook</option>
                  <option value="twitter">Twitter</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Social Handle</label>
                <input type="text" class="form-control" id="profile-social-handle" placeholder="@username" style="width:100%">
              </div>
            </div>

            <button class="btn btn-primary" id="btn-save-profile" style="width:100%;font-weight:600">💾 Save Profile Details</button>
          </div>
        </div>

        <!-- Right Panel: Reset Password -->
        <div class="card">
          <div class="card-header"><span class="card-title">🔒 Change Account Password</span></div>
          <div class="card-body">
            
            <div class="form-group" style="margin-bottom:16px">
              <label class="form-label">Current Password <span class="req">*</span></label>
              <input type="password" class="form-control" id="pwd-old" required placeholder="Enter current password" style="width:100%">
            </div>

            <div class="form-group" style="margin-bottom:16px">
              <label class="form-label">New Password <span class="req">*</span></label>
              <input type="password" class="form-control" id="pwd-new" required placeholder="At least 6 characters" style="width:100%">
            </div>

            <div class="form-group" style="margin-bottom:24px">
              <label class="form-label">Confirm New Password <span class="req">*</span></label>
              <input type="password" class="form-control" id="pwd-confirm" required placeholder="Confirm new password" style="width:100%">
            </div>

            <button class="btn btn-warning" id="btn-change-pwd" style="width:100%;font-weight:600">🔒 Change Password</button>
          </div>
        </div>

      </div>

      <!-- Image Cropping Modal Backdrop -->
      <div class="modal-backdrop" id="modal-avatar-crop" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:10000; align-items:center; justify-content:center">
        <div class="card" style="width:100%; max-width:550px; margin:20px; border-radius:12px; box-shadow:0 8px 30px rgba(0,0,0,0.3)">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding:16px 20px">
            <span class="card-title" style="margin:0; font-size:1.1rem">✂️ Crop Profile Image</span>
            <button class="btn btn-sm btn-secondary btn-close-crop-modal" style="padding:4px 8px; font-size:1.2rem; cursor:pointer; background:none; border:none; color:var(--text-muted)">&times;</button>
          </div>
          <div class="card-body" style="padding:20px">
            
            <div class="cropper-container-wrapper" style="margin-bottom:20px">
              <img id="cropper-target-image" style="max-width:100%; display:block" />
            </div>

            <div style="display:flex; gap:12px">
              <button class="btn btn-secondary btn-close-crop-modal" style="flex:1">Cancel</button>
              <button class="btn btn-primary" id="btn-apply-crop" style="flex:1.5; font-weight:600">✂️ Crop & Set Avatar</button>
            </div>

          </div>
        </div>
      </div>
    `);
  }

  function loadProfileDetails() {
    App.api.auth.me()
      .done(function (res) {
        var user = res.data;
        $('#profile-name').val(user.name);
        $('#profile-email').val(user.email);
        $('#profile-country-code').val(user.country_code || '+973');
        $('#profile-phone').val(user.phone || '');
        $('#profile-platform').val(user.platform || 'instagram');
        $('#profile-social-handle').val(user.social_handle || '');
      })
      .fail(App.api.handleError);
  }

  function bindEvents() {
    // Choice of file
    $('#profile-avatar-input').off('change').on('change', function (e) {
      var files = e.target.files;
      if (!files || !files.length) return;

      var file = files[0];
      if (!file.type.match(/^image\//)) {
        Swal.fire({ icon: 'warning', title: 'Invalid File', text: 'Please select an image file.' });
        return;
      }

      var reader = new FileReader();
      reader.onload = function (evt) {
        // Destroy existing cropper if active
        if (_cropper) {
          _cropper.destroy();
          _cropper = null;
        }

        $('#cropper-target-image').attr('src', evt.target.result);
        $('#modal-avatar-crop').css('display', 'flex');

        // Initialise Cropper
        var image = document.getElementById('cropper-target-image');
        _cropper = new Cropper(image, {
          aspectRatio: 1,
          viewMode: 1,
          autoCropArea: 0.9,
          dragMode: 'move',
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false
        });
      };
      reader.readAsDataURL(file);
    });

    // Close Crop Modal
    $('.btn-close-crop-modal').off('click').on('click', function () {
      $('#modal-avatar-crop').hide();
      $('#profile-avatar-input').val(''); // Reset file selection
      if (_cropper) {
        _cropper.destroy();
        _cropper = null;
      }
    });

    // Apply Crop Selection
    $('#btn-apply-crop').off('click').on('click', function () {
      if (!_cropper) return;

      var canvas = _cropper.getCroppedCanvas({
        width: 250,
        height: 250
      });

      _croppedImageBase64 = canvas.toDataURL('image/jpeg');

      // Update Preview
      $('#profile-avatar-view').html(`<img src="${_croppedImageBase64}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" />`);
      
      // Close Modal
      $('#modal-avatar-crop').hide();
      if (_cropper) {
        _cropper.destroy();
        _cropper = null;
      }
    });

    // Save Profile Settings
    $('#btn-save-profile').off('click').on('click', function () {
      var data = {
        name: $('#profile-name').val(),
        phone: $('#profile-phone').val(),
        country_code: $('#profile-country-code').val(),
        platform: $('#profile-platform').val(),
        social_handle: $('#profile-social-handle').val(),
        avatar_base64: _croppedImageBase64
      };

      if (!data.name) {
        Swal.fire({ icon: 'warning', title: 'Required Field', text: 'Please fill in your name.' });
        return;
      }

      var $btn = $(this);
      $btn.prop('disabled', true).text('Saving…');

      App.api.auth.updateProfile(data)
        .done(function (res) {
          $btn.prop('disabled', false).html('💾 Save Profile Details');
          
          // Update Session User object with new values
          var curUser = App.auth.getUser();
          var updated = res.data;
          
          // Re-render session user
          App.auth.setUser(updated);
          _croppedImageBase64 = null; // Clear local state

          Swal.fire({ icon: 'success', title: 'Profile Updated! 🎉', text: 'Your details have been saved successfully.', timer: 2000, showConfirmButton: false });
        })
        .fail(function (err) {
          $btn.prop('disabled', false).html('💾 Save Profile Details');
          App.api.handleError(err);
        });
    });

    // Change Password Action
    $('#btn-change-pwd').off('click').on('click', function () {
      var data = {
        old_password: $('#pwd-old').val(),
        new_password: $('#pwd-new').val(),
        confirm_password: $('#pwd-confirm').val()
      };

      if (!data.old_password || !data.new_password || !data.confirm_password) {
        Swal.fire({ icon: 'warning', title: 'Validation Warning', text: 'Please fill in all password fields.' });
        return;
      }

      if (data.new_password.length < 6) {
        Swal.fire({ icon: 'warning', title: 'Validation Warning', text: 'New password must be at least 6 characters long.' });
        return;
      }

      if (data.new_password !== data.confirm_password) {
        Swal.fire({ icon: 'warning', title: 'Validation Warning', text: 'New password and confirmation password do not match.' });
        return;
      }

      var $btn = $(this);
      $btn.prop('disabled', true).text('Changing Password…');

      App.api.auth.changePassword(data)
        .done(function () {
          $btn.prop('disabled', false).html('🔒 Change Password');
          $('#pwd-old').val('');
          $('#pwd-new').val('');
          $('#pwd-confirm').val('');

          Swal.fire({ icon: 'success', title: 'Password Updated! 🔒', text: 'Your password has been changed successfully.', timer: 2000, showConfirmButton: false });
        })
        .fail(function (err) {
          $btn.prop('disabled', false).html('🔒 Change Password');
          App.api.handleError(err);
        });
    });
  }

  return { init };
}(jQuery));
