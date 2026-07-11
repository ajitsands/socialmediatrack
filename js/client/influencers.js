/**
 * Client Portal — Discover Influencers Module
 * Shows influencers belonging to the client's category in the first block,
 * and groups/lists the rest of the influencers under category sections.
 */
window.App = window.App || {};
App.Client = App.Client || {};

App.Client.Influencers = (function ($) {
  'use strict';

  function init() {
    if (!App.auth.requireAuth('client')) return;
    renderLayout();
    loadInfluencersData();
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
          border-color: rgba(108, 99, 255, 0.3);
        }
        .influencer-avatar {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid var(--border-light);
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          font-weight: bold;
          color: #fff;
          background: linear-gradient(135deg, #6C63FF, #FF6584);
          box-shadow: 0 4px 10px rgba(108,99,255,0.2);
        }
        .influencer-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        .influencer-name {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 6px 0;
        }
        .influencer-followers {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--primary);
          background: rgba(108,99,255,0.08);
          padding: 4px 12px;
          border-radius: 50px;
          margin-bottom: 12px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .category-section-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text);
          margin: 0 0 16px 0;
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
    `);
  }

  function loadInfluencersData() {
    App.api.clientProducts.influencers()
      .done(function (res) {
        var data = res.data || {};
        var clientCat = data.client_category || '';
        var influencers = data.influencers || [];

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
          👥 <span>${inf.followers.toLocaleString()}</span>
        </div>
        <div style="display:flex; gap:4px; flex-wrap:wrap; justify-content:center">
          ${badgesHtml}
        </div>
      </div>
    `;
  }

  return { init };
})(jQuery);
