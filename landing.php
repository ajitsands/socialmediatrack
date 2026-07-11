<?php
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
?>
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Exclusive offer — Claim your discount now!">
  <title>Exclusive Offer — Loading…</title>

  <!-- Stylesheets -->
  <link rel="stylesheet" href="css/landing.css">

  <!-- Open Graph (social preview) -->
  <meta property="og:title" content="Exclusive Offer Just For You! 🎁">
  <meta property="og:description" content="You've been invited for an exclusive discount. Click to claim!">
  <meta property="og:type" content="website">

  <!-- Favicon -->
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎁</text></svg>">
</head>
<body class="landing-body">

<!-- Animated background -->
<div class="lp-bg"></div>
<div class="lp-particles" id="lp-particles"></div>

<!-- Theme + Lang toggles -->
<div class="lp-topbar">
  <button class="lp-toggle" id="lp-lang-toggle">عربي</button>
  <button class="lp-toggle" id="lp-theme-toggle">🌙</button>
</div>

<!-- Main Card -->
<div class="lp-container">
  <div class="lp-card" id="lp-main-card">

    <!-- Product Header -->
    <div class="lp-product-header">
      <div class="lp-influencer-badge">
        <span class="platform-icon" id="lp-platform-icon">📸</span>
        <span>Shared by <strong id="lp-influencer-name">Loading…</strong> on <span id="lp-platform-name"></span></span>
      </div>
      <div class="lp-product-image-wrap" id="lp-product-image">⏳</div>
      <h1 class="lp-product-name" id="lp-product-name">Loading…</h1>
      <p class="lp-product-desc" id="lp-product-desc"></p>
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap">
        <div style="font-size:1.1rem;font-weight:700;color:rgba(255,255,255,0.9)" id="lp-price"></div>
        <div class="lp-discount-badge" id="lp-discount-badge" style="display:none"></div>
      </div>
    </div>

    <!-- Live Stats Strip -->
    <div class="lp-stats-strip">
      <div class="lp-stat-item">
        <div class="lp-stat-value" id="lp-click-count">—</div>
        <div class="lp-stat-label">👆 Clicks</div>
      </div>
      <div class="lp-stat-item">
        <div class="lp-stat-value" id="lp-conv-count">—</div>
        <div class="lp-stat-label">✅ Claimed</div>
      </div>
      <div class="lp-stat-item">
        <div class="lp-stat-value" style="color:#ff6584">🔥 Live</div>
        <div class="lp-stat-label">Offer Active</div>
      </div>
    </div>

    <!-- Form Area -->
    <div class="lp-form-area">
      <h2 class="lp-form-title">🎁 Claim Your Exclusive Discount!</h2>
      <p class="lp-form-subtitle">Enter your details below to unlock your special offer</p>

      <!-- Warning -->
      <div class="lp-warning-banner">
        <span class="lp-warning-icon">⚠️</span>
        <div class="lp-warning-text">
          <span class="lp-warning-strong">Don't skip this!</span> Entering your details gives you access to an exclusive discount that is not available to regular visitors.
        </div>
      </div>

      <!-- Name -->
      <div class="lp-form-group">
        <label class="lp-label" for="lp-name">👤 Your Full Name</label>
        <input type="text" class="lp-input" id="lp-name" autocomplete="name" inputmode="text">
      </div>

      <!-- Phone -->
      <div class="lp-form-group">
        <label class="lp-label" for="lp-phone">📱 Phone Number</label>
        <div class="lp-phone-group">
          <select class="lp-input lp-country-select" id="lp-country-code"></select>
          <input type="tel" class="lp-input lp-phone-input" id="lp-phone" autocomplete="tel" inputmode="numeric">
        </div>
      </div>

      <!-- Promo Code -->
      <div class="lp-form-group">
        <label class="lp-label" for="lp-promo">🏷️ Promo Code</label>
        <div class="lp-promo-wrap">
          <span class="lp-promo-icon">🏷️</span>
          <input type="text" class="lp-input lp-promo-input" id="lp-promo" readonly
                 style="padding-left:42px;cursor:default" title="Auto-filled from your invite link">
        </div>
      </div>

      <!-- CTA Buttons -->
      <button class="lp-btn-claim" id="btn-submit" type="button">
        🎁 Claim My Discount &amp; Continue →
      </button>

      <div style="display:flex;gap:10px;margin-top:4px">
        <button class="lp-btn-skip" id="btn-skip" type="button" style="flex:1">
          ⏭️ Skip &amp; View Product
        </button>
        <a href="#" class="lp-btn-skip" id="btn-book-demo" style="flex:1;text-align:center;text-decoration:none" target="_blank">
          📅 Book a Demo
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div class="lp-footer">
      🔒 Your information is secure and will only be used to process your discount.
      <br>Powered by <strong style="color:#6C63FF; cursor:pointer; text-decoration:underline" class="trigger-sandslab-modal">SaNDS Lab</strong>
    </div>

  </div><!-- /lp-main-card -->
</div><!-- /lp-container -->

<!-- Scripts -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="js/countries.js?v=1.0.4"></script>
<script src="js/landing/page.js?v=1.0.5"></script>

<script>
// ── Generate floating particles ─────────────────
(function() {
  var container = document.getElementById('lp-particles');
  if (!container) return;
  for (var i = 0; i < 15; i++) {
    var p = document.createElement('div');
    p.className = 'particle';
    var size = 8 + Math.random() * 20;
    p.style.cssText = [
      'width:' + size + 'px',
      'height:' + size + 'px',
      'left:' + Math.random() * 100 + '%',
      'animation-duration:' + (8 + Math.random() * 15) + 's',
      'animation-delay:' + Math.random() * 10 + 's',
      'opacity:' + (0.1 + Math.random() * 0.3),
    ].join(';');
    container.appendChild(p);
  }
}());
</script>
<!-- SaNDS Lab Info Modal -->
<div id="modal-sandslab" class="custom-modal" style="display:none; position:relative; z-index:99999;">
  <div class="modal-overlay" style="background:rgba(0,0,0,0.7); backdrop-filter:blur(5px); position:fixed; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; z-index:99999;">
    <div class="modal-box" style="max-width:420px; width:90%; padding:32px; text-align:center; border-radius:20px; border:1px solid rgba(0,0,0,0.15); box-shadow:0 20px 40px rgba(0,0,0,0.3); background:#ffffff; color:#1a1a2e; position:relative">
      <button class="modal-close" id="btn-close-sandslab" style="position:absolute; top:16px; right:16px; font-size:1.25rem; background:none; border:none; color:#9ca3af; cursor:pointer;">✕</button>
      <div style="margin-bottom:20px;">
        <img src="logos/sandslab_logo.png" alt="SaNDS Lab Logo" style="max-width:280px; height:auto; margin:0 auto; display:block;">
      </div>
      <h2 style="font-size:1.6rem; font-weight:800; margin:0 0 6px 0; color:#1a1a2e">SaNDS Lab</h2>
      <p style="font-size:0.95rem; margin:0 0 16px 0; color:#6b7280; font-weight:500;">Custom Software Developer</p>
      <div style="display:inline-block; background:linear-gradient(135deg, #6C63FF, #3B82F6); color:#fff; font-size:0.75rem; font-weight:800; padding:6px 16px; border-radius:50px; text-transform:uppercase; letter-spacing:1px; box-shadow:0 4px 10px rgba(108,99,255,0.3); margin-bottom:28px;">
        ⚡ AI Powered
      </div>
      <div style="display:flex; flex-direction:column; gap:12px;">
        <a href="https://www.sandslab.com" target="_blank" class="lp-btn-claim" style="background:linear-gradient(135deg, #6C63FF, #4F46E5); color:#fff; justify-content:center; padding:12px; font-weight:700; border-radius:10px; text-decoration:none; display:flex; align-items:center; gap:8px; border:none; transition:transform 0.2s;">
          🌐 Visit Our Site
        </a>
        <a href="https://wa.me/97335078079" target="_blank" class="lp-btn-claim" style="background:linear-gradient(135deg, #25D366, #128C7E); color:#fff; justify-content:center; padding:12px; font-weight:700; border-radius:10px; text-decoration:none; display:flex; align-items:center; gap:8px; border:none; transition:transform 0.2s;">
          💬 Chat With Us
        </a>
      </div>
    </div>
  </div>
</div>

<script>
$(document).on('click', '.trigger-sandslab-modal', function(e) {
  e.preventDefault();
  $('#modal-sandslab').show();
});
$(document).on('click', '#btn-close-sandslab, #modal-sandslab .modal-overlay', function(e) {
  if (e.target === this || this.id === 'btn-close-sandslab') {
    $('#modal-sandslab').hide();
  }
});
</script>

</body>
</html>
