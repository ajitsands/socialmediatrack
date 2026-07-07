/**
 * InfluX Portal — i18n Module
 * Supports English (en) and Arabic (ar)
 * Default: English | RTL applied on Arabic
 */
window.App = window.App || {};

App.i18n = (function () {
  'use strict';

  var _lang = localStorage.getItem('influx_lang') || 'en';

  var translations = {
    en: {
      /* ── Navigation ─────────────────── */
      dashboard:       'Dashboard',
      influencers:     'Influencers',
      products:        'Products',
      campaigns:       'Campaigns',
      analytics:       'Analytics',
      points:          'Points',
      wallet:          'Wallet',
      settings:        'Settings',
      logout:          'Logout',
      my_campaigns:    'My Campaigns',
      my_wallet:       'My Wallet',

      /* ── Common ─────────────────────── */
      save:            'Save',
      cancel:          'Cancel',
      delete:          'Delete',
      edit:            'Edit',
      add:             'Add',
      create:          'Create',
      update:          'Update',
      search:          'Search',
      filter:          'Filter',
      actions:         'Actions',
      status:          'Status',
      active:          'Active',
      inactive:        'Inactive',
      yes:             'Yes',
      no:              'No',
      confirm:         'Confirm',
      close:           'Close',
      loading:         'Loading...',
      no_data:         'No data found',
      success:         'Success',
      error:           'Error',
      warning:         'Warning',
      info:            'Info',
      copy:            'Copy',
      copied:          'Copied!',
      generate:        'Generate',
      view:            'View',
      export:          'Export',
      total:           'Total',
      name:            'Name',
      email:           'Email',
      phone:           'Phone',
      password:        'Password',
      platform:        'Platform',
      social_handle:   'Social Handle',
      country_code:    'Country Code',
      category:        'Category',
      price:           'Price',
      currency:        'Currency',
      description:     'Description',
      image_url:       'Image URL',
      product_url:     'Product URL',
      demo_url:        'Demo URL',
      created_at:      'Created At',
      updated_at:      'Updated At',

      /* ── Dashboard ──────────────────── */
      total_influencers:   'Total Influencers',
      total_products:      'Total Products',
      total_campaigns:     'Active Campaigns',
      total_clicks:        'Total Clicks',
      total_conversions:   'Total Conversions',
      conversion_rate:     'Conversion Rate',
      recent_activity:     'Recent Activity',
      top_influencers:     'Top Influencers',
      live_stats:          'Live Stats',

      /* ── Influencers ────────────────── */
      add_influencer:      'Add Influencer',
      edit_influencer:     'Edit Influencer',
      delete_influencer:   'Delete Influencer',
      influencer_name:     'Influencer Name',
      confirm_delete_inf:  'Are you sure you want to delete this influencer?',

      /* ── Products ───────────────────── */
      add_product:         'Add Product',
      edit_product:        'Edit Product',
      delete_product:      'Delete Product',
      confirm_delete_prod: 'Are you sure you want to delete this product?',

      /* ── Campaigns ──────────────────── */
      select_product:      'Select Product',
      select_influencers:  'Select Influencers',
      offer_code:          'Offer Code',
      tracking_link:       'Tracking Link',
      discount_type:       'Discount Type',
      discount_value:      'Discount Value',
      discount_percent:    'Percentage (%)',
      discount_fixed:      'Fixed Amount',
      generate_codes:      'Generate Tracking Codes',
      generated_codes:     'Generated Codes',
      copy_link:           'Copy Link',
      no_campaigns:        'No campaigns found',

      /* ── Analytics ──────────────────── */
      clicks:              'Clicks',
      conversions:         'Conversions',
      skips:               'Skips',
      date_range:          'Date Range',
      last_7_days:         '7 Days',
      last_30_days:        '30 Days',
      all_time:            'All Time',

      /* ── Points & Wallet ─────────────── */
      points_config:       'Points Configuration',
      conversions_per_point: 'Conversions Per Point',
      value_per_point:     'Value Per Point',
      total_points:        'Total Points',
      total_earnings:      'Total Earnings',
      pending_amount:      'Pending Amount',
      paid_amount:         'Paid Amount',
      transfer:            'Transfer Payment',
      transfer_amount:     'Transfer Amount',
      note:                'Note',
      payment_note:        'Payment Reference / Note',
      wallet_balance:      'Wallet Balance',
      transaction_history: 'Transaction History',
      payout:              'Payout',
      credited:            'Credited',
      debited:             'Debited',
      pending:             'Pending',
      paid:                'Paid',

      /* ── Landing Page ────────────────── */
      landing_title:       'Exclusive Offer Just For You!',
      landing_subtitle:    'You've been invited by an exclusive partner',
      your_name:           'Your Full Name',
      your_phone:          'Your Phone Number',
      promo_code:          'Promo Code',
      claim_discount:      'Claim My Discount & Continue',
      skip_warning:        'Skip & View Product',
      skip_msg:            'If you skip, you will lose your exclusive discount offer! Are you sure?',
      skip_confirm:        'Yes, skip the discount',
      skip_cancel:         'No, claim my discount',
      book_demo:           'Book a Demo',
      go_to_product:       'Go to Product',
      discount_badge:      'OFF',
      offer_expires:       'Limited Time Offer',
    },

    ar: {
      /* ── Navigation ─────────────────── */
      dashboard:       'لوحة التحكم',
      influencers:     'المؤثرون',
      products:        'المنتجات',
      campaigns:       'الحملات',
      analytics:       'التحليلات',
      points:          'النقاط',
      wallet:          'المحفظة',
      settings:        'الإعدادات',
      logout:          'تسجيل الخروج',
      my_campaigns:    'حملاتي',
      my_wallet:       'محفظتي',

      /* ── Common ─────────────────────── */
      save:            'حفظ',
      cancel:          'إلغاء',
      delete:          'حذف',
      edit:            'تعديل',
      add:             'إضافة',
      create:          'إنشاء',
      update:          'تحديث',
      search:          'بحث',
      filter:          'تصفية',
      actions:         'الإجراءات',
      status:          'الحالة',
      active:          'نشط',
      inactive:        'غير نشط',
      yes:             'نعم',
      no:              'لا',
      confirm:         'تأكيد',
      close:           'إغلاق',
      loading:         'جارٍ التحميل...',
      no_data:         'لا توجد بيانات',
      success:         'تم بنجاح',
      error:           'خطأ',
      warning:         'تحذير',
      info:            'معلومة',
      copy:            'نسخ',
      copied:          'تم النسخ!',
      generate:        'توليد',
      view:            'عرض',
      export:          'تصدير',
      total:           'الإجمالي',
      name:            'الاسم',
      email:           'البريد الإلكتروني',
      phone:           'الهاتف',
      password:        'كلمة المرور',
      platform:        'المنصة',
      social_handle:   'معرّف التواصل',
      country_code:    'رمز الدولة',
      category:        'الفئة',
      price:           'السعر',
      currency:        'العملة',
      description:     'الوصف',
      image_url:       'رابط الصورة',
      product_url:     'رابط المنتج',
      demo_url:        'رابط التجربة',
      created_at:      'تاريخ الإنشاء',
      updated_at:      'تاريخ التحديث',

      /* ── Dashboard ──────────────────── */
      total_influencers:   'إجمالي المؤثرين',
      total_products:      'إجمالي المنتجات',
      total_campaigns:     'الحملات النشطة',
      total_clicks:        'إجمالي النقرات',
      total_conversions:   'إجمالي التحويلات',
      conversion_rate:     'معدل التحويل',
      recent_activity:     'النشاط الأخير',
      top_influencers:     'أفضل المؤثرين',
      live_stats:          'الإحصائيات المباشرة',

      /* ── Influencers ────────────────── */
      add_influencer:      'إضافة مؤثر',
      edit_influencer:     'تعديل المؤثر',
      delete_influencer:   'حذف المؤثر',
      influencer_name:     'اسم المؤثر',
      confirm_delete_inf:  'هل أنت متأكد من حذف هذا المؤثر؟',

      /* ── Products ───────────────────── */
      add_product:         'إضافة منتج',
      edit_product:        'تعديل المنتج',
      delete_product:      'حذف المنتج',
      confirm_delete_prod: 'هل أنت متأكد من حذف هذا المنتج؟',

      /* ── Campaigns ──────────────────── */
      select_product:      'اختر المنتج',
      select_influencers:  'اختر المؤثرين',
      offer_code:          'رمز العرض',
      tracking_link:       'رابط التتبع',
      discount_type:       'نوع الخصم',
      discount_value:      'قيمة الخصم',
      discount_percent:    'نسبة مئوية (%)',
      discount_fixed:      'مبلغ ثابت',
      generate_codes:      'توليد رموز التتبع',
      generated_codes:     'الرموز المولّدة',
      copy_link:           'نسخ الرابط',
      no_campaigns:        'لا توجد حملات',

      /* ── Analytics ──────────────────── */
      clicks:              'نقرات',
      conversions:         'تحويلات',
      skips:               'تخطّيات',
      date_range:          'نطاق التاريخ',
      last_7_days:         '٧ أيام',
      last_30_days:        '٣٠ يوماً',
      all_time:            'الكل',

      /* ── Points & Wallet ─────────────── */
      points_config:       'إعدادات النقاط',
      conversions_per_point: 'تحويلات لكل نقطة',
      value_per_point:     'قيمة النقطة',
      total_points:        'إجمالي النقاط',
      total_earnings:      'إجمالي الأرباح',
      pending_amount:      'المبلغ المعلّق',
      paid_amount:         'المبلغ المدفوع',
      transfer:            'تحويل الدفعة',
      transfer_amount:     'مبلغ التحويل',
      note:                'ملاحظة',
      payment_note:        'مرجع الدفع / ملاحظة',
      wallet_balance:      'رصيد المحفظة',
      transaction_history: 'سجل المعاملات',
      payout:              'صرف',
      credited:            'مضاف',
      debited:             'مخصوم',
      pending:             'معلّق',
      paid:                'مدفوع',

      /* ── Landing Page ────────────────── */
      landing_title:       'عرض حصري خصيصاً لك!',
      landing_subtitle:    'دُعيتَ من قِبَل شريك مميز',
      your_name:           'اسمك الكامل',
      your_phone:          'رقم هاتفك',
      promo_code:          'رمز العرض الترويجي',
      claim_discount:      'احصل على خصمي وتابع',
      skip_warning:        'تخطّي وعرض المنتج',
      skip_msg:            'إذا تخطّيت، ستفقد عرض الخصم الحصري! هل أنت متأكد؟',
      skip_confirm:        'نعم، تخطّ الخصم',
      skip_cancel:         'لا، احصل على خصمي',
      book_demo:           'احجز عرضاً توضيحياً',
      go_to_product:       'انتقل إلى المنتج',
      discount_badge:      'خصم',
      offer_expires:       'عرض لفترة محدودة',
    },
  };

  function t(key) {
    return (translations[_lang] && translations[_lang][key]) || translations['en'][key] || key;
  }

  function setLang(lang) {
    if (!translations[lang]) return;
    _lang = lang;
    localStorage.setItem('influx_lang', lang);
    $('html').attr('lang', lang).attr('dir', lang === 'ar' ? 'rtl' : 'ltr');
    $('body').toggleClass('rtl', lang === 'ar');
    // Re-translate all elements with data-i18n
    $('[data-i18n]').each(function () {
      var key = $(this).data('i18n');
      var attr = $(this).data('i18n-attr');
      if (attr) { $(this).attr(attr, t(key)); }
      else { $(this).text(t(key)); }
    });
    // Re-translate placeholders
    $('[data-i18n-ph]').each(function () {
      $(this).attr('placeholder', t($(this).data('i18n-ph')));
    });
  }

  function getLang() { return _lang; }
  function isRtl()   { return _lang === 'ar'; }

  return { t, setLang, getLang, isRtl };
}());
