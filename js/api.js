/**
 * InfluX Portal — jQuery AJAX API Wrapper
 * All server communication goes through App.api.*
 * Returns jQuery Deferred promises
 */
window.App = window.App || {};

App.api = (function ($) {
  'use strict';

  const BASE = 'api/';

  function _request(endpoint, action, data, method) {
    method = method || 'POST';
    var url = BASE + endpoint + '.php?action=' + action;

    var options = {
      url: url,
      type: method,
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
    };

    if (method === 'GET') {
      if (data && Object.keys(data).length) {
        var params = $.param(data);
        options.url += '&' + params;
      }
    } else {
      options.data = JSON.stringify(data || {});
    }

    var deferred = $.Deferred();

    $.ajax(options)
      .done(function (res) {
        if (res && res.success === false) {
          deferred.reject(res);
        } else {
          deferred.resolve(res);
        }
      })
      .fail(function (xhr) {
        var res;
        try { res = JSON.parse(xhr.responseText); } catch (e) { res = {}; }
        deferred.reject({
          success: false,
          message: res.message || 'Server error. Please try again.',
        });
      });

    return deferred.promise();
  }

  /* ── Auth ─────────────────────────────────── */
  var auth = {
    login:  function (d) { return _request('auth', 'login',  d, 'POST'); },
    logout: function ()  { return _request('auth', 'logout', {}, 'POST'); },
    me:     function ()  { return _request('auth', 'me',     {}, 'GET'); },
    updateProfile: function (d) { return _request('auth', 'update_profile', d, 'POST'); },
    changePassword: function (d) { return _request('auth', 'change_password', d, 'POST'); },
  };

  /* ── Users / Influencers ─────────────────── */
  var users = {
    list:          function ()  { return _request('users', 'list', {}, 'GET'); },
    get:           function (id){ return _request('users', 'get', {id: id}, 'GET'); },
    create:        function (d) { return _request('users', 'create', d, 'POST'); },
    update:        function (d) { return _request('users', 'update', d, 'POST'); },
    delete:        function (id){ return _request('users', 'delete', {id: id}, 'POST'); },
    toggleStatus:  function (id){ return _request('users', 'toggle_status', {id: id}, 'POST'); },
    categories:    function ()  { return _request('users', 'categories', {}, 'GET'); },
    createCategory:function (name){ return _request('users', 'create_category', {name: name}, 'POST'); },
  };

  /* ── Products ────────────────────────────── */
  var products = {
    list:         function ()  { return _request('products', 'list', {}, 'GET'); },
    get:          function (id){ return _request('products', 'get', {id: id}, 'GET'); },
    create:       function (d) { return _request('products', 'create', d, 'POST'); },
    update:       function (d) { return _request('products', 'update', d, 'POST'); },
    delete:       function (id){ return _request('products', 'delete', {id: id}, 'POST'); },
    toggleStatus: function (id){ return _request('products', 'toggle_status', {id: id}, 'POST'); },
  };

  /* ── Campaigns ───────────────────────────── */
  var campaigns = {
    list:         function ()  { return _request('campaigns', 'list', {}, 'GET'); },
    get:          function (id){ return _request('campaigns', 'get', {id: id}, 'GET'); },
    generate:     function (d) { return _request('campaigns', 'generate', d, 'POST'); },
    updateStatus: function (d) { return _request('campaigns', 'update_status', d, 'POST'); },
    delete:       function (id){ return _request('campaigns', 'delete', {id: id}, 'POST'); },
    deleteBulk:   function (ids){ return _request('campaigns', 'delete', {ids: ids}, 'POST'); },
  };

  /* ── Clients ─────────────────────────────── */
  var clients = {
    list:          function ()  { return _request('clients', 'list', {}, 'GET'); },
    get:           function (id){ return _request('clients', 'get', {id: id}, 'GET'); },
    create:        function (d) { return _request('clients', 'create', d, 'POST'); },
    update:        function (d) { return _request('clients', 'update', d, 'POST'); },
    delete:        function (id){ return _request('clients', 'delete', {id: id}, 'POST'); },
    toggleStatus:  function (id){ return _request('clients', 'toggle_status', {id: id}, 'POST'); },
    ledger:        function (id, dateFrom, dateTo){ return _request('clients', 'wallet_transactions', {client_id: id, date_from: dateFrom||'', date_to: dateTo||''}, 'GET'); },
    addFunds:      function (d) { return _request('clients', 'add_funds', d, 'POST'); },
  };

  /* ── Client Analytics (Portal) ───────────── */
  var clientAnalytics = {
    overview:      function ()     { return _request('client_analytics', 'overview', {}, 'GET'); },
    byProduct:     function ()     { return _request('client_analytics', 'by_product', {}, 'GET'); },
    byInfluencer:  function ()     { return _request('client_analytics', 'by_influencer', {}, 'GET'); },
    visitorLeads:  function (pId)  { return _request('client_analytics', 'visitor_leads', {product_id: pId||0}, 'GET'); },
    walletHistory: function ()     { return _request('client_analytics', 'wallet_history', {}, 'GET'); },
    markRead:      function (eId)  { return _request('client_analytics', 'mark_read', {event_id: eId}, 'POST'); },
    toggleImportant: function (eId) { return _request('client_analytics', 'toggle_important', {event_id: eId}, 'POST'); },
    crmLeads:      function (pId)  { return _request('client_analytics', 'crm_leads', {product_id: pId||0}, 'GET'); },
    logCall:       function (d)    { return _request('client_analytics', 'log_call', d, 'POST'); },
    callHistory:   function (eId)  { return _request('client_analytics', 'call_history', {event_id: eId}, 'GET'); },
  };

  /* ── Analytics ───────────────────────────── */
  var analytics = {
    overview:      function ()     { return _request('analytics', 'overview',      {}, 'GET'); },
    byCampaign:    function ()     { return _request('analytics', 'by_campaign',   {}, 'GET'); },
    byInfluencer:  function ()     { return _request('analytics', 'by_influencer', {}, 'GET'); },
    byProduct:     function ()     { return _request('analytics', 'by_product',    {}, 'GET'); },
    recentEvents:  function (lim)  { return _request('analytics', 'recent_events', {limit: lim||20}, 'GET'); },
    chartDaily:    function (days) { return _request('analytics', 'chart_daily',   {days: days||30}, 'GET'); },
    visitorLeads:  function (pId)  { return _request('analytics', 'visitor_leads',  {product_id: pId||0}, 'GET'); },
  };

  /* ── Points ──────────────────────────────── */
  var points = {
    config:            function ()  { return _request('points', 'config', {}, 'GET'); },
    updateConfig:      function (d) { return _request('points', 'update_config', d, 'POST'); },
    influencerPoints:  function ()  { return _request('points', 'influencer_points', {}, 'GET'); },
    myPoints:          function ()  { return _request('points', 'my_points', {}, 'GET'); },
  };

  /* ── Wallet ──────────────────────────────── */
  var wallet = {
    overview:       function ()    { return _request('wallet', 'overview', {}, 'GET'); },
    transactions:   function (id)  { return _request('wallet', 'transactions', {influencer_id: id||0}, 'GET'); },
    myTransactions: function ()    { return _request('wallet', 'my_transactions', {}, 'GET'); },
    transfer:       function (d)   { return _request('wallet', 'transfer', d, 'POST'); },
  };

  /* ── Landing (public) ────────────────────── */
  var landing = {
    info:    function (ref) { return _request('landing', 'info',    {ref: ref}, 'GET'); },
    click:   function (d)   { return _request('landing', 'click',   d, 'POST'); },
    convert: function (d)   { return _request('landing', 'convert', d, 'POST'); },
    skip:    function (d)   { return _request('landing', 'skip',    d, 'POST'); },
  };

  /* ── Global error handler helper ─────────── */
  function handleError(err, showAlert) {
    var msg = (err && err.message) ? err.message : 'An unexpected error occurred.';
    if (showAlert !== false) {
      Swal.fire({ icon: 'error', title: App.i18n.t('error'), text: msg, confirmButtonColor: '#6C63FF' });
    }
    console.error('[App.api]', msg, err);
    return msg;
  }

  return { auth, users, products, campaigns, analytics, points, wallet, landing, clients, clientAnalytics, handleError };

}(jQuery));
