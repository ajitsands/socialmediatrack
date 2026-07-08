/**
 * InfluX Portal — Auth Module
 * Handles login state, user session in sessionStorage
 */
window.App = window.App || {};

App.auth = (function ($) {
  'use strict';

  var _user = null;

  function init() {
    var stored = sessionStorage.getItem('influx_user');
    if (stored) {
      try { _user = JSON.parse(stored); } catch (e) { _user = null; }
    }
  }

  function setUser(user) {
    _user = user;
    sessionStorage.setItem('influx_user', JSON.stringify(user));
    _updateHeader();
  }

  function getUser() { return _user; }
  var isLoggedIn = function () { return !!_user; };
  var isAdmin = function () { return _user && _user.role === 'admin'; };
  var isInfluencer = function () { return _user && _user.role === 'influencer'; };
  var isClient = function () { return _user && _user.role === 'client'; };

  function logout() {
    App.api.auth.logout().always(function () {
      _user = null;
      sessionStorage.removeItem('influx_user');
      App.router.go('login');
    });
  }

  function _updateHeader() {
    if (_user) {
      $('#user-display-name').text(_user.name);
      var badgeText = 'Influencer';
      if (_user.role === 'admin') badgeText = 'Admin';
      else if (_user.role === 'client') badgeText = 'Client';
      $('#user-role-badge').text(badgeText);
      var initials = _user.name.split(' ').map(function (p) { return p[0]; }).join('').substring(0, 2).toUpperCase();
      $('#user-avatar-initials').text(initials);
    }
  }

  function requireAuth(role) {
    if (!isLoggedIn()) {
      App.router.go('login');
      return false;
    }
    if (role === 'admin' && !isAdmin()) {
      var defaultRoute = isClient() ? 'client/dashboard' : 'influencer/dashboard';
      App.router.go(defaultRoute);
      return false;
    }
    if (role === 'influencer' && !isInfluencer() && !isAdmin()) {
      App.router.go('login');
      return false;
    }
    if (role === 'client' && !isClient() && !isAdmin()) {
      App.router.go('login');
      return false;
    }
    return true;
  }

  return { init, setUser, getUser, isLoggedIn, isAdmin, isInfluencer, isClient, logout, requireAuth };
}(jQuery));
