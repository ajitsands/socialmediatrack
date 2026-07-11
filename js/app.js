/**
 * InfluX Portal — Main App Router & Layout
 * Hash-based SPA routing
 */
window.App = window.App || {};

App.router = (function ($) {
  'use strict';

  var _current = null;

  var routes = {
    'login':               renderLogin,
    'admin/dashboard':     function(){ App.Admin.Dashboard.init(); },
    'admin/influencers':   function(){ App.Admin.Influencers.init(); },
    'admin/clients':       function(){ App.Admin.Clients.init(); },
    'admin/products':      function(){ App.Admin.Products.init(); },
    'admin/campaigns':     function(){ App.Admin.Campaigns.init(); },
    'admin/analytics':     function(){ App.Admin.Analytics.init(); },
    'admin/points':        function(){ App.Admin.Points.init(); },
    'admin/wallet':        function(){ App.Admin.Wallet.init(); },
    'influencer/dashboard':function(){ App.Influencer.Dashboard.init(); },
    'influencer/campaigns':function(){ App.Influencer.Campaigns.init(); },
    'influencer/wallet':   function(){ App.Influencer.Wallet.init(); },
    'influencer/profile':  function(){ App.Influencer.Profile.init(); },
    'client/dashboard':    function(){ App.Client.Dashboard.init(); },
    'client/products':     function(){ App.Client.Products.init(); },
    'client/wallet':       function(){ App.Client.Wallet.init(); },
    'client/crm':          function(){ App.Client.Crm.init(); },
    'client/influencers':  function(){ App.Client.Influencers.init(); },
  };

  function go(route) {
    window.location.hash = '#/' + route;
  }

  function getHash() {
    return window.location.hash.replace(/^#\//, '') || 'login';
  }

  function handleRoute() {
    var route = getHash();

    // Redirect logged-in users away from login
    if (route === 'login' && App.auth.isLoggedIn()) {
      var defaultRoute = 'influencer/dashboard';
      if (App.auth.isAdmin()) defaultRoute = 'admin/dashboard';
      else if (App.auth.isClient()) defaultRoute = 'client/dashboard';
      go(defaultRoute); return;
    }

    // Redirect to login if not authenticated
    if (route !== 'login' && !App.auth.isLoggedIn()) {
      go('login'); return;
    }

    // Admin-only routes
    if (route.startsWith('admin/') && !App.auth.isAdmin()) {
      var fallback = App.auth.isClient() ? 'client/dashboard' : 'influencer/dashboard';
      go(fallback); return;
    }

    // Influencer-only routes
    if (route.startsWith('influencer/') && !App.auth.isInfluencer() && !App.auth.isAdmin()) {
      var fallback = App.auth.isClient() ? 'client/dashboard' : 'login';
      go(fallback); return;
    }

    // Client-only routes
    if (route.startsWith('client/') && !App.auth.isClient() && !App.auth.isAdmin()) {
      var fallback = App.auth.isInfluencer() ? 'influencer/dashboard' : 'login';
      go(fallback); return;
    }

    _current = route;

    // Stop background intervals when switching away from admin dashboard
    if (route !== 'admin/dashboard' && App.Admin.Dashboard && typeof App.Admin.Dashboard.destroy === 'function') {
      App.Admin.Dashboard.destroy();
    }

    if (route === 'login') {
      showLogin();
      return;
    }

    showApp(route);

    var handler = routes[route];
    if (handler) {
      $('#page-content').html('<div class="page-loader"><div class="spinner"></div><p>' + App.i18n.t('loading') + '</p></div>');
      setTimeout(handler, 50);
    } else {
      $('#page-content').html('<div class="empty-state"><div class="empty-icon">🔍</div><h3>Page Not Found</h3><p>The page you are looking for does not exist.</p></div>');
    }

    // Update active nav item
    $('.nav-item').removeClass('active');
    $('.nav-item[data-route="' + route + '"]').addClass('active');
  }

  function showLogin() {
    $('body').removeClass('has-sidebar');
    $('#app-shell').hide();
    $('#login-page').show();
  }

  function showApp(route) {
    $('body').addClass('has-sidebar');
    $('#login-page').hide();
    $('#app-shell').show();

    // Build sidebar based on role
    buildSidebar();

    // Update topbar title
    var titles = {
      'admin/dashboard':     App.i18n.t('dashboard'),
      'admin/influencers':   App.i18n.t('influencers'),
      'admin/clients':       'Manage Clients',
      'admin/products':      App.i18n.t('products'),
      'admin/campaigns':     App.i18n.t('campaigns'),
      'admin/analytics':     App.i18n.t('analytics'),
      'admin/points':        App.i18n.t('points'),
      'admin/wallet':        App.i18n.t('wallet'),
      'influencer/dashboard':App.i18n.t('dashboard'),
      'influencer/campaigns':App.i18n.t('my_campaigns'),
      'influencer/wallet':   App.i18n.t('my_wallet'),
      'influencer/profile':  'Profile Settings',
      'client/dashboard':    'Client Dashboard',
      'client/products':     'Manage My Products',
      'client/wallet':       'My Wallet Ledger',
      'client/crm':          'Important Leads CRM',
      'client/influencers':  'Discover Influencers',
    };
    $('#topbar-title').text(titles[route] || route);
  }

  function buildSidebar() {
    var isAdmin    = App.auth.isAdmin();
    var isClient   = App.auth.isClient();
    var user       = App.auth.getUser();
    var navHtml    = '';

    if (isAdmin) {
      navHtml = `
        <div class="nav-section-label">Main Menu</div>
        <a class="nav-item" data-route="admin/dashboard" href="#/admin/dashboard">
          <span class="nav-icon">📊</span><span data-i18n="dashboard">${App.i18n.t('dashboard')}</span>
        </a>
        <a class="nav-item" data-route="admin/influencers" href="#/admin/influencers">
          <span class="nav-icon">⭐</span><span data-i18n="influencers">${App.i18n.t('influencers')}</span>
        </a>
        <a class="nav-item" data-route="admin/clients" href="#/admin/clients">
          <span class="nav-icon">🏢</span><span>Clients Portal</span>
        </a>
        <a class="nav-item" data-route="admin/products" href="#/admin/products">
          <span class="nav-icon">📦</span><span data-i18n="products">${App.i18n.t('products')}</span>
        </a>
        <a class="nav-item" data-route="admin/campaigns" href="#/admin/campaigns">
          <span class="nav-icon">🔗</span><span data-i18n="campaigns">${App.i18n.t('campaigns')}</span>
        </a>
        <div class="nav-section-label">Reports</div>
        <a class="nav-item" data-route="admin/analytics" href="#/admin/analytics">
          <span class="nav-icon">📈</span><span data-i18n="analytics">${App.i18n.t('analytics')}</span>
        </a>
        <div class="nav-section-label">Finance</div>
        <a class="nav-item" data-route="admin/points" href="#/admin/points">
          <span class="nav-icon">🎯</span><span data-i18n="points">${App.i18n.t('points')}</span>
        </a>
        <a class="nav-item" data-route="admin/wallet" href="#/admin/wallet">
          <span class="nav-icon">💰</span><span data-i18n="wallet">${App.i18n.t('wallet')}</span>
        </a>
      `;
    } else if (isClient) {
      navHtml = `
        <div class="nav-section-label">Client Menu</div>
        <a class="nav-item" data-route="client/dashboard" href="#/client/dashboard">
          <span class="nav-icon">📊</span><span>Dashboard</span>
        </a>
        <a class="nav-item" data-route="client/influencers" href="#/client/influencers">
          <span class="nav-icon">⭐</span><span>Discover Influencers</span>
        </a>
        <a class="nav-item" data-route="client/products" href="#/client/products">
          <span class="nav-icon">📦</span><span>My Products</span>
        </a>
        <a class="nav-item" data-route="client/crm" href="#/client/crm">
          <span class="nav-icon">📞</span><span>CRM & Follow-ups</span>
        </a>
        <a class="nav-item" data-route="client/wallet" href="#/client/wallet">
          <span class="nav-icon">💰</span><span>Wallet Ledger</span>
        </a>
      `;
    } else {
      navHtml = `
        <div class="nav-section-label">Menu</div>
        <a class="nav-item" data-route="influencer/dashboard" href="#/influencer/dashboard">
          <span class="nav-icon">📊</span><span data-i18n="dashboard">${App.i18n.t('dashboard')}</span>
        </a>
        <a class="nav-item" data-route="influencer/campaigns" href="#/influencer/campaigns">
          <span class="nav-icon">🔗</span><span data-i18n="my_campaigns">${App.i18n.t('my_campaigns')}</span>
        </a>
        <a class="nav-item" data-route="influencer/wallet" href="#/influencer/wallet">
          <span class="nav-icon">💰</span><span data-i18n="my_wallet">${App.i18n.t('my_wallet')}</span>
        </a>
        <a class="nav-item" data-route="influencer/profile" href="#/influencer/profile">
          <span class="nav-icon">👤</span><span>Profile Settings</span>
        </a>
      `;
    }

    $('#sidebar-nav').html(navHtml);

    // User info in sidebar
    var initials = user.name.split(' ').map(function(p){return p[0];}).join('').substring(0,2).toUpperCase();
    $('#user-avatar-initials').text(initials);
    $('#user-display-name').text(user.name);
    
    var roleBadge = 'Influencer';
    if (isAdmin) roleBadge = 'Admin';
    else if (isClient) roleBadge = 'Client';
    $('#user-role-badge').text(roleBadge);

    // Highlight current
    $('.nav-item[data-route="' + _current + '"]').addClass('active');
  }

  function renderLogin() {}

  function init() {
    // Apply saved theme
    var theme = localStorage.getItem('influx_theme') || 'light';
    $('html').attr('data-theme', theme);
    $('#theme-toggle-btn').html(theme === 'dark' ? '☀️ Light' : '🌙 Dark');

    // Apply saved language
    App.i18n.setLang(App.i18n.getLang());

    // Theme toggle
    $(document).on('click', '#theme-toggle-btn', function () {
      var current = $('html').attr('data-theme');
      var newTheme = current === 'dark' ? 'light' : 'dark';
      $('html').attr('data-theme', newTheme);
      localStorage.setItem('influx_theme', newTheme);
      $(this).html(newTheme === 'dark' ? '☀️ Light' : '🌙 Dark');
    });

    // Language toggle
    $(document).on('click', '#lang-toggle-btn', function () {
      var newLang = App.i18n.getLang() === 'en' ? 'ar' : 'en';
      App.i18n.setLang(newLang);
      $(this).text(newLang === 'ar' ? 'EN' : 'عربي');
    });

    // Logout
    $(document).on('click', '#btn-logout', function () {
      Swal.fire({
        title: App.i18n.t('logout'),
        text: 'Are you sure you want to log out?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: App.i18n.t('yes') + ', Logout',
        cancelButtonText: App.i18n.t('cancel'),
        confirmButtonColor: '#ef4444',
      }).then(function(r) {
        if (r.isConfirmed) App.auth.logout();
      });
    });

    // Mobile sidebar toggle
    $(document).on('click', '#sidebar-toggle', function () {
      $('.sidebar').toggleClass('open');
      $('.sidebar-backdrop').toggleClass('show');
    });
    $(document).on('click', '.sidebar-backdrop', function () {
      $('.sidebar').removeClass('open');
      $('.sidebar-backdrop').removeClass('show');
    });
    $(document).on('click', '.nav-item', function () {
      if ($(window).width() <= 991) {
        $('.sidebar').removeClass('open');
        $('.sidebar-backdrop').removeClass('show');
      }
    });

    // Login form handlers
    $(document).on('submit', '#form-login', handleLogin);
    $(document).on('click', '.login-tab-btn', function () {
      $('.login-tab-btn').removeClass('active');
      $(this).addClass('active');
      var role = $(this).data('role');
      if (role === 'admin') {
        $('#login-email').val('admin@influx.com');
        $('#login-password').val('admin@123');
      } else if (role === 'client') {
        $('#login-email').val('client@influx.com');
        $('#login-password').val('client@123');
      } else {
        $('#login-email').val('ajit.kumar@gmail.com');
        $('#login-password').val('inf@123');
      }
    });

    // Hash change routing
    $(window).on('hashchange', handleRoute);
    handleRoute();
  }

  function handleLogin(e) {
    e.preventDefault();
    var email = $('#login-email').val().trim();
    var pass  = $('#login-password').val().trim();

    if (!email || !pass) {
      Swal.fire({ icon: 'warning', title: App.i18n.t('warning'), text: 'Please enter email and password.', confirmButtonColor: '#6C63FF' });
      return;
    }

    var $btn = $('#btn-login');
    $btn.prop('disabled', true).html('<span class="spinner"></span> Signing in...');

    App.api.auth.login({ email, password: pass })
      .done(function (res) {
        App.auth.setUser(res.data);
        var route = 'influencer/dashboard';
        if (res.data.role === 'admin') route = 'admin/dashboard';
        else if (res.data.role === 'client') route = 'client/dashboard';
        
        Swal.fire({
          icon: 'success', title: 'Welcome back, ' + res.data.name + '! 👋',
          showConfirmButton: false, timer: 1200,
        }).then(function(){ go(route); });
      })
      .fail(function (err) {
        App.api.handleError(err);
      })
      .always(function () {
        $btn.prop('disabled', false).html('🔐 Sign In');
      });
  }

  return { init, go, getHash };
}(jQuery));

// ── Boot ─────────────────────────────────────────
$(function () {
  App.auth.init();
  App.router.init();
  $('#lang-toggle-btn').text(App.i18n.getLang() === 'ar' ? 'EN' : 'عربي');
});
