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
      InfluX Portal v1.0 &copy; 2025
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
<script src="js/i18n.js?v=1.2.1"></script>
<script src="js/countries.js?v=1.2.1"></script>
<script src="js/auth.js?v=1.2.1"></script>
<script src="js/api.js?v=1.2.1"></script>

<!-- Admin modules -->
<script src="js/admin/dashboard.js?v=1.2.1"></script>
<script src="js/admin/influencers.js?v=1.2.1"></script>
<script src="js/admin/clients.js?v=1.2.1"></script>
<script src="js/admin/products.js?v=1.2.1"></script>
<script src="js/admin/campaigns.js?v=1.2.1"></script>
<script src="js/admin/analytics.js?v=1.2.1"></script>
<script src="js/admin/points.js?v=1.2.1"></script>
<script src="js/admin/wallet.js?v=1.2.1"></script>

<!-- Influencer modules -->
<script src="js/influencer/dashboard.js?v=1.2.1"></script>
<script src="js/influencer/wallet.js?v=1.2.1"></script>
<script src="js/influencer/profile.js?v=1.2.1"></script>

<!-- Client modules -->
<script src="js/client/dashboard.js?v=1.2.1"></script>
<script src="js/client/crm.js?v=1.2.1"></script>
<script src="js/client/wallet.js?v=1.2.1"></script>

<!-- Router (boot last) -->
<script src="js/app.js?v=1.2.1"></script>

</body>
</html>
