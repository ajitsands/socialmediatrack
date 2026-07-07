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
      <br>Powered by <strong>InfluX Portal</strong>
    </div>

  </div><!-- /lp-main-card -->
</div><!-- /lp-container -->

<!-- Scripts -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="js/countries.js"></script>
<script src="js/landing/page.js"></script>

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

</body>
</html>
