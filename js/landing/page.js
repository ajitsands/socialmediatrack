/**
 * InfluX Portal — Public Landing Page JS
 * Handles: click tracking, form validation, conversion, skip
 */
(function ($) {
  'use strict';

  var _ref      = '';
  var _campaign = null;
  var _lang     = localStorage.getItem('influx_lang') || 'en';
  var _theme    = localStorage.getItem('influx_theme') || 'light';

  // ── Messages ─────────────────────────────────────
  var msgs = {
    en: {
      skip_title:   'Skip Your Discount?',
      skip_text:    '⚠️ If you skip, you will LOSE your exclusive discount offer! Enter your details to claim it.',
      skip_confirm: 'Yes, skip anyway',
      skip_cancel:  'No, claim my discount! 🎁',
      success_title:'🎉 Discount Code Activated!',
      success_text: 'You\'re being redirected to the product page.',
      redirect_btn: '→ Go to Product Page Now',
      name_ph:      'Enter your full name',
      phone_ph:     'Enter phone number',
      promo_ph:     'Promo code',
      submit_btn:   'Claim My Discount & Continue →',
      skip_btn:     'Skip & View Product (no discount)',
      invalid_link: 'Invalid or expired tracking link.',
      fill_required:'Please enter your name and phone number.',
    },
    ar: {
      skip_title:   'تخطّي الخصم؟',
      skip_text:    '⚠️ إذا تخطّيت، ستفقد عرض الخصم الحصري! أدخل بياناتك للحصول عليه.',
      skip_confirm: 'نعم، تخطّي',
      skip_cancel:  'لا، احصل على خصمي! 🎁',
      success_title:'🎉 تم تفعيل رمز الخصم!',
      success_text: 'جارٍ إعادة توجيهك إلى صفحة المنتج.',
      redirect_btn: '→ انتقل إلى صفحة المنتج الآن',
      name_ph:      'أدخل اسمك الكامل',
      phone_ph:     'أدخل رقم الهاتف',
      promo_ph:     'رمز الترويج',
      submit_btn:   'احصل على خصمي وتابع →',
      skip_btn:     'تخطّي وعرض المنتج (بدون خصم)',
      invalid_link: 'رابط التتبع غير صالح أو منتهي الصلاحية.',
      fill_required:'الرجاء إدخال اسمك ورقم هاتفك.',
    }
  };

  function m(key) { return (msgs[_lang] && msgs[_lang][key]) || msgs['en'][key] || key; }

  // ── Init ─────────────────────────────────────────
  $(function () {
    // Apply theme + lang
    $('html').attr('data-theme', _theme);
    $('html').attr('lang', _lang).attr('dir', _lang === 'ar' ? 'rtl' : 'ltr');
    $('body').toggleClass('rtl', _lang === 'ar');

    // Theme toggle
    $('#lp-theme-toggle').on('click', function () {
      _theme = _theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('influx_theme', _theme);
      $('html').attr('data-theme', _theme);
      $(this).text(_theme === 'dark' ? '☀️' : '🌙');
    });
    $('#lp-theme-toggle').text(_theme === 'dark' ? '☀️' : '🌙');

    // Lang toggle
    $('#lp-lang-toggle').on('click', function () {
      _lang = _lang === 'ar' ? 'en' : 'ar';
      localStorage.setItem('influx_lang', _lang);
      location.reload();
    });
    $('#lp-lang-toggle').text(_lang === 'ar' ? 'EN' : 'عربي');

    // Country code
    App.countries.renderSelect('lp-country-code', '+973');

    // Get ref from URL
    var urlParams = new URLSearchParams(window.location.search);
    _ref = urlParams.get('ref') || '';

    if (!_ref) {
      showError(m('invalid_link'));
      return;
    }

    // Apply placeholders
    $('#lp-name').attr('placeholder', m('name_ph'));
    $('#lp-phone').attr('placeholder', m('phone_ph'));
    $('#lp-promo').attr('placeholder', m('promo_ph'));
    $('#btn-submit').text(m('submit_btn'));
    $('#btn-skip').text(m('skip_btn'));

    // Load campaign info — send ref via POST body to bypass server GET param filtering
    $.ajax({
      url: 'api/landing.php',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ action: 'info', ref: _ref }),
      dataType: 'json'
    }).done(function (res) {
      if (!res.success) { showError(res.message); return; }
      _campaign = res.data;
      populatePage(_campaign);

      // Check if already unlocked locally or in session
      var savedUnlock = localStorage.getItem('unlocked_camp_' + _campaign.id);
      if (_campaign.already_converted || savedUnlock) {
        var offerCode = _campaign.offer_code;
        var redirUrl = _campaign.product_url || '#';
        if (parseFloat(_campaign.discount_value) > 0) {
          var sep = redirUrl.indexOf('?') !== -1 ? '&' : '?';
          redirUrl += sep + 'promo=' + encodeURIComponent(offerCode) + '&discount=' + encodeURIComponent(_campaign.discount_value);
        }
        if (savedUnlock) {
          try {
            var parsed = JSON.parse(savedUnlock);
            offerCode = parsed.offer_code || offerCode;
            redirUrl = parsed.redirect_url || redirUrl;
          } catch(e){}
        }
        showSuccess(offerCode, redirUrl);
        return;
      }

      // Record click
      $.ajax({ url: 'api/landing.php', type: 'POST', contentType: 'application/json', data: JSON.stringify({ action: 'click', ref: _ref }) });

      // Auto-fill promo code
      $('#lp-promo').val(_campaign.offer_code);
    }).fail(function (xhr) {
      var res; try { res = JSON.parse(xhr.responseText); } catch(e){ res = {}; }
      showError(res.message || m('invalid_link'));
    });

    // Submit form
    $(document).on('click', '#btn-submit', handleSubmit);

    // Skip
    $(document).on('click', '#btn-skip', handleSkip);
  });

  // ── Populate Page ─────────────────────────────────
  function populatePage(c) {
    // Product info
    $('#lp-product-name').text(c.product_name);
    $('#lp-product-desc').text(c.product_desc || '');
    $('#lp-influencer-name').text(c.influencer_name);
    $('#lp-platform-name').text(c.platform);

    // Product image
    if (c.image_url) {
      $('#lp-product-image').html(`<img src="${c.image_url}" alt="${c.product_name}" onerror="this.parentNode.innerHTML='📦'">`);
    } else {
      var icons = { software:'💻', food:'🍔', clothing:'👗', electronics:'📱', services:'🛠️', other:'📦' };
      $('#lp-product-image').html(icons[c.category] || '📦');
    }

    // Platform icon
    var platIcons = { instagram:'📸', tiktok:'🎵', youtube:'▶️', facebook:'👍', twitter:'🐦', other:'🌐' };
    $('#lp-platform-icon').text(platIcons[c.platform] || '🌐');

    // Discount badge
    if (c.discount_value && c.discount_value > 0) {
      var discText = c.discount_type === 'percent'
        ? c.discount_value + '% OFF'
        : c.currency + ' ' + parseFloat(c.discount_value).toFixed(3) + ' OFF';
      $('#lp-discount-badge').text('🎁 ' + discText).show();
    } else {
      $('#lp-discount-badge').hide();
    }

    // Price
    $('#lp-price').text(c.currency + ' ' + parseFloat(c.price).toFixed(3));

    // Live stats
    var displayClicks = parseInt(c.total_clicks || 0);
    if (!c.already_clicked) {
      displayClicks += 1;
    }
    $('#lp-click-count').text(displayClicks);
    $('#lp-conv-count').text(c.total_conversions || 0);

    // Demo button
    if (c.demo_url) {
      $('#btn-book-demo').attr('href', c.demo_url).show();
    } else {
      $('#btn-book-demo').hide();
    }

    // Page title
    document.title = '🎁 ' + c.product_name + ' — Exclusive Offer';
  }

  // ── Handle Submit (Conversion) ───────────────────
  function handleSubmit() {
    var name    = $('#lp-name').val().trim();
    var phone   = $('#lp-phone').val().trim();
    var cc      = $('#lp-country-code').val();
    var promo   = $('#lp-promo').val().trim();

    if (!name || !phone) {
      Swal.fire({ icon: 'warning', title: 'Required', text: m('fill_required'), confirmButtonColor: '#6C63FF' });
      return;
    }

    var $btn = $('#btn-submit').prop('disabled', true).text('Processing...');

    $.ajax({
      url: 'api/landing.php',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        action: 'convert',
        ref: _ref,
        visitor_name: name,
        visitor_phone: phone,
        visitor_country_code: cc,
        promo_code: promo,
      }),
      dataType: 'json'
    }).done(function (res) {
      if (!res.success) {
        Swal.fire({ icon: 'error', title: 'Error', text: res.message }); return;
      }
      // Save unlock status locally
      localStorage.setItem('unlocked_camp_' + _campaign.id, JSON.stringify({
        offer_code: res.data.offer_code,
        redirect_url: res.data.redirect_url
      }));
      launchConfetti();
      showSuccess(res.data.offer_code, res.data.redirect_url);
    }).fail(function (xhr) {
      var msg = 'Something went wrong. Please try again.';
      try {
        var res = JSON.parse(xhr.responseText);
        if (res && res.message) {
          msg = res.message;
        }
      } catch (e) {}
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
      $btn.prop('disabled', false).text(m('submit_btn'));
    });
  }

  // ── Handle Skip ───────────────────────────────────
  function handleSkip() {
    Swal.fire({
      icon: 'warning',
      title: m('skip_title'),
      html: '<p style="font-size:1rem;margin-bottom:8px">' + m('skip_text') + '</p>',
      showCancelButton: true,
      confirmButtonText: m('skip_confirm'),
      cancelButtonText: m('skip_cancel'),
      confirmButtonColor: '#6b7280',
      cancelButtonColor: '#6C63FF',
      reverseButtons: true,
    }).then(function (result) {
      if (result.isConfirmed) {
        $.ajax({
          url: 'api/landing.php', type: 'POST', contentType: 'application/json',
          data: JSON.stringify({ action: 'skip', ref: _ref }), dataType: 'json'
        }).always(function (res) {
          var url = (res && res.data && res.data.redirect_url) ? res.data.redirect_url : (_campaign && _campaign.product_url) || '#';
          if (url && url !== '#') window.location.href = url;
        });
      }
    });
  }

  // ── Show Success Overlay ──────────────────────────
  function showSuccess(code, redirectUrl) {
    var html = `
      <div class="lp-success-overlay">
        <div class="lp-success-card">
          <div class="success-check">✓</div>
          <div class="success-title">${m('success_title')}</div>
          <p class="success-msg">${m('success_text')}</p>
          <div class="success-code">${code}</div>
          <button class="success-redirect-btn" onclick="window.location.href='${redirectUrl}'">${m('redirect_btn')}</button>
        </div>
      </div>`;
    $('body').append(html);

    // Auto-redirect after 4s
    setTimeout(function () {
      if (redirectUrl && redirectUrl !== '#') window.location.href = redirectUrl;
    }, 4000);
  }

  // ── Confetti ──────────────────────────────────────
  function launchConfetti() {
    var colors = ['#6C63FF','#FF6584','#22c55e','#f59e0b','#3b82f6','#ec4899'];
    for (var i = 0; i < 60; i++) {
      (function(delay) {
        setTimeout(function () {
          var el = document.createElement('div');
          el.className = 'confetti-piece';
          el.style.cssText = [
            'left:' + Math.random()*100 + 'vw',
            'background:' + colors[Math.floor(Math.random()*colors.length)],
            'width:' + (6+Math.random()*8) + 'px',
            'height:' + (6+Math.random()*8) + 'px',
            'animation-duration:' + (1.5+Math.random()*1.5) + 's',
            'animation-delay:0s',
          ].join(';');
          document.body.appendChild(el);
          setTimeout(function(){ el.remove(); }, 3500);
        }, delay);
      }(i * 35));
    }
  }

  // ── Show Error ────────────────────────────────────
  function showError(msg) {
    $('#lp-main-card').html(`
      <div style="padding:60px;text-align:center">
        <div style="font-size:4rem;margin-bottom:16px">🔗</div>
        <h2 style="color:#1a1a2e;margin-bottom:8px">Link Error</h2>
        <p style="color:#6b7280">${msg}</p>
      </div>
    `);
  }

}(jQuery));
