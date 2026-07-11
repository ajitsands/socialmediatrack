/**
 * Client Portal — Discover Influencers Module
 * Shows influencers belonging to the client's category in the first block,
 * and groups/lists the rest of the influencers under category sections.
 */
window.App = window.App || {};
App.Client = App.Client || {};

App.Client.Influencers = (function ($) {
  'use strict';

  var _influencers = [];
  var _products = [];

  function init() {
    if (!App.auth.requireAuth('client')) return;
    _influencers = [];
    _products = [];
    renderLayout();
    loadInfluencersData();
    loadClientProducts();
    bindEvents();
  }

  // Format follower count → 1.2K / 170K / 1.5M
  function fmtFollowers(n) {
    n = parseInt(n) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'M';
    if (n >= 1000)    return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
    return n.toString();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function renderLayout() {
    $('#page-content').html(`
      <style>
        .influencer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }
        .influencer-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 24px 16px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .influencer-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(108, 99, 255, 0.12);
        }
        .influencer-avatar {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--primary-light));
          color: #fff;
          font-size: 1.5rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          border: 3px solid var(--border-light);
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(108,99,255,0.15);
        }
        .influencer-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .influencer-name {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 4px 0;
        }
        .influencer-followers {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .category-section-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text);
          margin: 0 0 20px 0;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1.5px solid var(--border);
          padding-bottom: 8px;
        }
      </style>

      <div class="page-header">
        <div>
          <h2>⭐ Discover Influencers</h2>
          <p class="page-subtitle">Find and connect with influencers who fit your brand category and target audience.</p>
        </div>
      </div>

      <!-- Recommended section (Client category match) -->
      <div class="card" style="margin-bottom:32px">
        <div class="card-header" style="background:rgba(108,99,255,0.04)">
          <h3 style="font-size:1.15rem; margin:0; display:flex; align-items:center; gap:8px">
            🎯 Recommended for Your Niche 
            <span class="badge badge-primary" id="client-niche-badge" style="font-size:0.75rem; text-transform:uppercase">Loading niche...</span>
          </h3>
        </div>
        <div class="card-body" style="padding:24px" id="niche-influencers-container">
          <div style="text-align:center; padding:32px; color:var(--text-muted)">
            <div class="spinner" style="margin: 0 auto 12px auto"></div>
            Loading recommendations...
          </div>
        </div>
      </div>

      <!-- General browse section grouped by category -->
      <div id="other-categories-container">
        <!-- Grouped by category sections dynamically -->
      </div>

      <!-- Assign to Product Modal -->
      <div id="modal-assign-influencer" class="custom-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:1000; align-items:center; justify-content:center">
        <div class="card" style="width:100%; max-width:500px; margin:20px; border-radius:12px">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding:16px 20px">
            <span class="card-title" style="margin:0; font-size:1.2rem; font-weight:700">✨ Assign to Product</span>
            <button class="modal-close btn-close-assign-modal" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color:var(--text-muted)">✕</button>
          </div>
          <div class="card-body" style="padding:20px">
            <form id="form-assign-influencer" autocomplete="off">
              <input type="hidden" id="assign-influencer-id" />
              
              <div class="form-group" style="margin-bottom:16px">
                <label class="form-label" style="font-weight:600">Influencer</label>
                <input type="text" class="form-control" id="assign-influencer-name-display" readonly style="background:var(--border-light); font-weight:700; color:var(--primary)" />
              </div>

              <div class="form-group" style="margin-bottom:16px">
                <label class="form-label" style="font-weight:600">Select Your Product <span class="req">*</span></label>
                <select class="form-control" id="assign-product-id" required style="font-weight:600"></select>
              </div>

              <div class="form-group" style="margin-bottom:16px">
                <label class="form-label" style="font-weight:600">Target Social Account / Platform <span class="req">*</span></label>
                <select class="form-control" id="assign-platform" required style="font-weight:600"></select>
              </div>

              <div class="grid-2" style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:12px; margin-bottom:16px">
                <div class="form-group">
                  <label class="form-label" style="font-weight:600">Offer Campaign Discount Value <span class="req">*</span></label>
                  <input type="number" step="0.01" min="0" class="form-control" id="assign-discount-value" placeholder="e.g. 10" required />
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-weight:600">Discount Type <span class="req">*</span></label>
                  <select class="form-control" id="assign-discount-type" required style="font-weight:600">
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (BHD)</option>
                  </select>
                </div>
              </div>

              <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:12px; border-top:1px solid var(--border); padding-top:16px; margin-top:16px">
                <button type="button" class="btn btn-secondary btn-close-assign-modal">Cancel</button>
                <button type="submit" class="btn btn-primary" style="font-weight:600">✉️ Send Request</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
  }

  function loadInfluencersData() {
    App.api.clientProducts.influencers()
      .done(function (res) {
        var data = res.data || {};
        var clientCat = data.client_category || '';
        var influencers = data.influencers || [];
        _influencers = influencers;

        // Set Niche Badge
        $('#client-niche-badge').text(clientCat || 'General Niche');

        // Split influencers into "niche matches" and "all influencers grouped by category"
        var nicheMatches = [];
        var categoryMap = {};

        influencers.forEach(function (inf) {
          // Check if influencer has matching category
          var isNicheMatch = false;
          if (clientCat) {
            var normClientCat = clientCat.toLowerCase().trim();
            isNicheMatch = inf.categories.some(function(cat) {
              return cat.toLowerCase().trim() === normClientCat;
            });
          }

          if (isNicheMatch) {
            nicheMatches.push(inf);
          }

          // Group all influencers into categoryMap
          if (inf.categories.length === 0) {
            if (!categoryMap['General / Other']) {
              categoryMap['General / Other'] = [];
            }
            categoryMap['General / Other'].push(inf);
          } else {
            inf.categories.forEach(function(cat) {
              if (!categoryMap[cat]) {
                categoryMap[cat] = [];
              }
              categoryMap[cat].push(inf);
            });
          }
        });

        // 1. Render Niche Matches Block
        renderNicheBlock(nicheMatches, clientCat);

        // 2. Render Other categories Block
        renderOtherCategoriesBlock(categoryMap, clientCat);
      })
      .fail(function(err) {
        $('#niche-influencers-container').html(`
          <div style="text-align:center; padding:32px; color:var(--danger)">
            ⚠️ Failed to load influencers list.
          </div>
        `);
      });
  }

  function loadClientProducts() {
    App.api.clientProducts.list()
      .done(function (res) {
        _products = res.data || [];
      });
  }

  function renderNicheBlock(matches, clientCat) {
    var $container = $('#niche-influencers-container');
    if (matches.length === 0) {
      $container.html(`
        <div style="text-align:center; padding:32px 16px; color:var(--text-muted)">
          <div style="font-size:2.5rem; margin-bottom:12px">🔍</div>
          <h4 style="margin:0 0 6px 0; color:var(--text)">No exact niche matches found</h4>
          <p style="margin:0; font-size:0.88rem">There are no active influencers registered under your category ("${clientCat || 'General'}") yet. Browse other categories below!</p>
        </div>
      `);
      return;
    }

    var cardsHtml = '<div class="influencer-grid">';
    matches.forEach(function(inf) {
      cardsHtml += buildInfluencerCard(inf);
    });
    cardsHtml += '</div>';
    $container.html(cardsHtml);
  }

  function renderOtherCategoriesBlock(categoryMap, clientCat) {
    var $container = $('#other-categories-container');
    var html = '';

    var categories = Object.keys(categoryMap).sort();
    if (categories.length === 0) {
      $container.html(`
        <div class="card" style="padding:48px; text-align:center; color:var(--text-muted)">
          No other categories found.
        </div>
      `);
      return;
    }

    categories.forEach(function(cat) {
      var infList = categoryMap[cat] || [];
      if (infList.length === 0) return;

      var emoji = '🏷️';
      // extract emoji if present
      var m = cat.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
      if (m) {
        emoji = m[0];
      }

      html += `
        <div style="margin-bottom:40px">
          <h3 class="category-section-title">
            <span>${cat}</span>
            <span style="font-size:0.85rem; font-weight:600; color:var(--text-muted); background:var(--border-light); padding:2px 8px; border-radius:12px">${infList.length}</span>
          </h3>
          <div class="influencer-grid">
      `;

      infList.forEach(function(inf) {
        html += buildInfluencerCard(inf);
      });

      html += `
          </div>
        </div>
      `;
    });

    $container.html(html);
  }

  function buildInfluencerCard(inf) {
    var initials = inf.name.split(' ').map(function(p){return p[0];}).join('').substring(0,2).toUpperCase();
    var avatarHtml = inf.avatar 
      ? `<div class="influencer-avatar"><img src="${inf.avatar}" /></div>`
      : `<div class="influencer-avatar">${initials}</div>`;

    var badgesHtml = '';
    inf.categories.forEach(function(c) {
      badgesHtml += `<span class="badge" style="background:var(--border-light); color:var(--text-muted); font-size:0.7rem; padding:2px 6px">${c}</span>`;
    });

    return `
      <div class="influencer-card">
        ${avatarHtml}
        <h4 class="influencer-name">${inf.name}</h4>
        <div class="influencer-followers">
          👥 <span>${fmtFollowers(inf.followers)} followers</span>
        </div>
        <div style="display:flex; gap:4px; flex-wrap:wrap; justify-content:center; margin-bottom:12px">
          ${badgesHtml}
        </div>
        <div style="width:100%; margin-top:auto">
          <button class="btn btn-primary btn-sm btn-assign-influencer" data-id="${inf.id}" data-name="${escapeHtml(inf.name)}" style="width:100%; font-weight:600">✨ Assign to Product</button>
        </div>
      </div>
    `;
  }

  function bindEvents() {
    // Assign click
    $(document).off('click', '.btn-assign-influencer').on('click', '.btn-assign-influencer', function (e) {
      e.preventDefault();
      var infId = parseInt($(this).data('id'));
      var infName = $(this).data('name');
      
      // Find influencer in cached list
      var inf = _influencers.find(function (i) { return i.id === infId; });
      if (!inf) return;
      
      $('#assign-influencer-id').val(inf.id);
      $('#assign-influencer-name-display').val(inf.name);
      
      // Populate products select
      var prodOpts = '<option value="">— Select Product —</option>';
      _products.forEach(function (p) {
        prodOpts += `<option value="${p.id}">${p.name} (${p.category})</option>`;
      });
      $('#assign-product-id').html(prodOpts);
      
      // Populate platforms select based on influencer platforms
      var platOpts = '';
      var plats = inf.platforms || [];
      if (plats.length === 0) {
        // Fallback platforms
        plats = ['instagram', 'tiktok', 'youtube', 'facebook'];
      }
      plats.forEach(function (pl) {
        var labels = {instagram:'📸 Instagram', tiktok:'🎵 TikTok', youtube:'▶️ YouTube', facebook:'👍 Facebook', twitter:'🐦 Twitter', other:'🌐 Other'};
        var label = labels[pl] || pl.toUpperCase();
        platOpts += `<option value="${pl}">${label}</option>`;
      });
      $('#assign-platform').html(platOpts);
      
      // Reset form fields
      $('#assign-discount-value').val('');
      $('#assign-discount-type').val('percent');
      
      $('#modal-assign-influencer').css('display', 'flex');
    });

    // Close modal
    $(document).off('click', '.btn-close-assign-modal').on('click', '.btn-close-assign-modal', function (e) {
      e.preventDefault();
      $('#modal-assign-influencer').hide();
    });

    // Form submit
    $(document).off('submit', '#form-assign-influencer').on('submit', '#form-assign-influencer', function (e) {
      e.preventDefault();
      
      var data = {
        influencer_id: parseInt($('#assign-influencer-id').val()),
        product_id: parseInt($('#assign-product-id').val()),
        platform: $('#assign-platform').val(),
        discount_type: $('#assign-discount-type').val(),
        discount_value: parseFloat($('#assign-discount-value').val() || 0)
      };

      if (!data.product_id) {
        Swal.fire({ icon: 'error', title: 'Product Required', text: 'Please select a product to assign.' });
        return;
      }
      if (data.discount_value < 0) {
        Swal.fire({ icon: 'error', title: 'Invalid Discount', text: 'Discount value cannot be negative.' });
        return;
      }

      Swal.fire({
        title: 'Sending Request...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      App.api.campaigns.createRequest(data)
        .done(function (res) {
          Swal.fire({
            icon: 'success',
            title: 'Request Sent!',
            text: 'Your campaign request has been sent to the influencer. You will be notified once they approve it.',
            confirmButtonColor: '#6C63FF'
          });
          $('#modal-assign-influencer').hide();
        })
        .fail(App.api.handleError);
    });
  }

  return { init };
})(jQuery);
