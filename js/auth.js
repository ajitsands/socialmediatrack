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
  function isLoggedIn() { return !!_user; }
  function isAdmin() { return _user && _user.role === 'admin'; }
  function isInfluencer() { return _user && _user.role === 'influencer'; }

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
      $('#user-role-badge').text(_user.role === 'admin' ? 'Admin' : 'Influencer');
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
      App.router.go('influencer/dashboard');
      return false;
    }
    if (role === 'influencer' && !isInfluencer() && !isAdmin()) {
      App.router.go('login');
      return false;
    }
    return true;
  }

  return { init, setUser, getUser, isLoggedIn, isAdmin, isInfluencer, logout, requireAuth };
}(jQuery));
