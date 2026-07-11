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
  <meta name="description" content="InfluX Portal — Social Media Influencer Marketing & Tracking Platform">
  <meta name="robots" content="noindex,nofollow">
  <title>InfluX Portal — Influencer Marketing Platform</title>

  <!-- Stylesheets -->
  <link rel="stylesheet" href="css/main.css">

  <!-- DataTables CSS -->
  <link rel="stylesheet" href="https://cdn.datatables.net/1.13.7/css/jquery.dataTables.min.css">
  <link rel="stylesheet" href="https://cdn.datatables.net/responsive/2.5.0/css/responsive.dataTables.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css">

  <!-- Favicon -->
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">

  <style>
    #login-page  { display: none; }
    #app-shell   { display: none; }
  </style>
</head>
<body>

<!-- ══════════════════════════════════════════════
     LOGIN PAGE
════════════════════════════════════════════════ -->
<div id="login-page">
  <div class="login-card">
    <div class="login-logo">
      <div class="login-logo-icon">⚡</div>
      <h1 class="login-title">InfluX Portal</h1>
      <p class="login-subtitle">Social Media Influencer Marketing Platform</p>
    </div>

    <!-- Role tabs -->
    <div class="login-tabs" style="margin-bottom:24px">
      <button class="login-tab-btn active" data-role="admin">🛡️ Admin</button>
      <button class="login-tab-btn" data-role="influencer">⭐ Influencer</button>
      <button class="login-tab-btn" data-role="client">🏢 Client</button>
    </div>

    <!-- Login Form -->
    <form id="form-login" autocomplete="off">
      <div class="form-group">
        <label class="form-label" for="login-email">📧 Email Address</label>
        <input type="email" class="form-control" id="login-email"
               value="admin@influx.com" placeholder="email@example.com" required
               style="font-size:1rem;padding:12px 16px">
      </div>
      <div class="form-group">
        <label class="form-label" for="login-password">🔒 Password</label>
        <input type="password" class="form-control" id="login-password"
               value="admin@123" placeholder="Enter password" required
               style="font-size:1rem;padding:12px 16px">
      </div>
      <button type="submit" id="btn-login" class="btn btn-primary btn-lg" style="width:100%;margin-top:8px">
        🔐 Sign In
      </button>
    </form>

    <!-- Theme + Lang -->
    <div style="display:flex;justify-content:center;gap:10px;margin-top:24px">
      <button class="toggle-btn" id="theme-toggle-btn">🌙 Dark</button>
      <button class="toggle-btn" id="lang-toggle-btn">عربي</button>
    </div>

    <p style="text-align:center;font-size:0.78rem;color:var(--text-muted);margin-top:16px">
      InfluX Portal v1.0 &copy; 2025 | Powered by <strong style="color:var(--primary); cursor:pointer; text-decoration:underline" class="trigger-sandslab-modal">SaNDS Lab</strong>
    </p>
  </div>
</div>

<!-- ══════════════════════════════════════════════
     APP SHELL (Sidebar + Main)
════════════════════════════════════════════════ -->
<div id="app-shell">

  <!-- Sidebar Backdrop (mobile) -->
  <div class="sidebar-backdrop"></div>

  <!-- Sidebar -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">⚡</div>
      <span class="sidebar-logo-text">InfluX</span>
    </div>

    <nav class="sidebar-nav" id="sidebar-nav">
      <!-- Populated by app.js -->
    </nav>

    <div class="sidebar-user">
      <div class="user-avatar" id="user-avatar-initials">?</div>
      <div class="user-info">
        <div class="user-name" id="user-display-name">Loading…</div>
        <div class="user-role" id="user-role-badge">—</div>
      </div>
      <button class="btn-logout" id="btn-logout" title="Logout">🚪</button>
    </div>
  </aside>

  <!-- Main Content -->
  <div class="main-content">

    <!-- Topbar -->
    <header class="topbar">
      <button class="sidebar-toggle" id="sidebar-toggle">☰</button>
      <span class="topbar-title" id="topbar-title">Dashboard</span>
      <div class="topbar-actions">
        <button class="toggle-btn" id="theme-toggle-btn">🌙 Dark</button>
        <button class="toggle-btn" id="lang-toggle-btn">عربي</button>
      </div>
    </header>

    <!-- Dynamic Page Content -->
    <main class="page-content" id="page-content">
      <div class="page-loader">
        <div class="spinner"></div>
        <p>Loading…</p>
      </div>
    </main>

    <!-- Global App Footer -->
    <footer class="app-footer" style="text-align:center; padding:16px; font-size:0.85rem; color:var(--text-muted); border-top:1px solid var(--border); background:var(--card-bg)">
      Powered by <strong style="color:var(--primary); cursor:pointer; text-decoration:underline" class="trigger-sandslab-modal">SaNDS Lab</strong>
    </footer>

  </div><!-- /main-content -->
</div><!-- /app-shell -->

<!-- ══════════════════════════════════════════════
     SCRIPTS
════════════════════════════════════════════════ -->
<!-- jQuery -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>

<!-- DataTables -->
<script src="https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/responsive/2.5.0/js/dataTables.responsive.min.js"></script>

<!-- SweetAlert2 -->
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<!-- Cropper.js -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js"></script>

<!-- Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

<!-- App modules -->
<script src="js/i18n.js?v=1.2.5"></script>
<script src="js/countries.js?v=1.2.5"></script>
<script src="js/auth.js?v=1.2.5"></script>
<script src="js/api.js?v=1.2.5"></script>

<!-- Admin modules -->
<script src="js/admin/dashboard.js?v=1.2.5"></script>
<script src="js/admin/influencers.js?v=1.2.5"></script>
<script src="js/admin/clients.js?v=1.2.5"></script>
<script src="js/admin/products.js?v=1.2.5"></script>
<script src="js/admin/campaigns.js?v=1.2.5"></script>
<script src="js/admin/analytics.js?v=1.2.5"></script>
<script src="js/admin/points.js?v=1.2.5"></script>
<script src="js/admin/wallet.js?v=1.2.5"></script>

<!-- Influencer modules -->
<script src="js/influencer/dashboard.js?v=1.2.5"></script>
<script src="js/influencer/wallet.js?v=1.2.5"></script>
<script src="js/influencer/profile.js?v=1.2.5"></script>

<!-- Client modules -->
<script src="js/client/dashboard.js?v=1.2.5"></script>
<script src="js/client/crm.js?v=1.2.5"></script>
<script src="js/client/wallet.js?v=1.2.5"></script>

<!-- Router (boot last) -->
<script src="js/app.js?v=1.2.5"></script>

<!-- SaNDS Lab Info Modal -->
<div id="modal-sandslab" class="custom-modal" style="display:none; position:relative; z-index:99999;">
  <div class="modal-overlay" style="background:rgba(0,0,0,0.7); backdrop-filter:blur(5px); z-index:99999;">
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
        <a href="https://www.sandslab.com" target="_blank" class="btn" style="background:linear-gradient(135deg, #6C63FF, #4F46E5); color:#fff; justify-content:center; padding:12px; font-weight:700; border-radius:10px; text-decoration:none; display:flex; align-items:center; gap:8px; border:none; transition:transform 0.2s;">
          🌐 Visit Our Site
        </a>
        <a href="https://wa.me/97335078079" target="_blank" class="btn" style="background:linear-gradient(135deg, #25D366, #128C7E); color:#fff; justify-content:center; padding:12px; font-weight:700; border-radius:10px; text-decoration:none; display:flex; align-items:center; gap:8px; border:none; transition:transform 0.2s;">
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
