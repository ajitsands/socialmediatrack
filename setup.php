<?php
// ─────────────────────────────────────────────
//  Setup Script — Run ONCE to initialise DB
//  http://localhost/setup.php
//  DELETE or rename after running!
// ─────────────────────────────────────────────
require_once __DIR__ . '/config/database.php';

header('Content-Type: text/html; charset=utf-8');
$db = getDB();
$log = [];
$errors = [];

function run(PDO $db, string $sql, string $label, array &$log, array &$errors): void {
    try {
        $db->exec($sql);
        $log[] = "✅ $label";
    } catch (PDOException $e) {
        $errors[] = "❌ $label — " . $e->getMessage();
    }
}

// ─── Create Tables ────────────────────────────

run($db, "
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `name`          VARCHAR(200)  NOT NULL,
  `email`         VARCHAR(200)  UNIQUE NOT NULL,
  `password`      VARCHAR(255)  NOT NULL,
  `role`          ENUM('admin','influencer') DEFAULT 'influencer',
  `phone`         VARCHAR(50),
  `country_code`  VARCHAR(10)   DEFAULT '+973',
  `social_handle` VARCHAR(100),
  `platform`      ENUM('instagram','tiktok','youtube','facebook','twitter','other') DEFAULT 'instagram',
  `status`        ENUM('active','inactive') DEFAULT 'active',
  `avatar`        VARCHAR(500),
  `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
", "Table: users", $log, $errors);

run($db, "
CREATE TABLE IF NOT EXISTS `products` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `name`        VARCHAR(200) NOT NULL,
  `category`    VARCHAR(50)  NOT NULL DEFAULT 'other',
  `description` TEXT,
  `price`       DECIMAL(10,3) NOT NULL DEFAULT 0,
  `currency`    VARCHAR(10)  DEFAULT 'BHD',
  `image_url`   VARCHAR(500),
  `product_url` VARCHAR(500),
  `demo_url`    VARCHAR(500),
  `status`      ENUM('active','inactive') DEFAULT 'active',
  `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
", "Table: products", $log, $errors);

run($db, "
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `product_id`      INT NOT NULL,
  `influencer_id`   INT NOT NULL,
  `offer_code`      VARCHAR(50)  UNIQUE NOT NULL,
  `ref_token`       TEXT NOT NULL,
  `discount_type`   ENUM('percent','fixed') DEFAULT 'percent',
  `discount_value`  DECIMAL(10,2) DEFAULT 0,
  `status`          ENUM('active','paused','expired') DEFAULT 'active',
  `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`)    REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`influencer_id`) REFERENCES `users`(`id`)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
", "Table: campaigns", $log, $errors);

run($db, "
CREATE TABLE IF NOT EXISTS `events` (
  `id`                  INT AUTO_INCREMENT PRIMARY KEY,
  `campaign_id`         INT NOT NULL,
  `type`                ENUM('click','conversion','skip') NOT NULL,
  `visitor_name`        VARCHAR(200),
  `visitor_phone`       VARCHAR(100),
  `visitor_country_code` VARCHAR(10),
  `promo_entered`       VARCHAR(50),
  `ip_hash`             VARCHAR(64),
  `user_agent`          TEXT,
  `timestamp`           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
", "Table: events", $log, $errors);

run($db, "
CREATE TABLE IF NOT EXISTS `points_config` (
  `id`                   INT AUTO_INCREMENT PRIMARY KEY,
  `conversions_per_point` INT  DEFAULT 100,
  `value_per_point`      DECIMAL(10,3) DEFAULT 1.000,
  `currency`             VARCHAR(10) DEFAULT 'BHD',
  `updated_at`           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
", "Table: points_config", $log, $errors);

run($db, "
CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id`             INT AUTO_INCREMENT PRIMARY KEY,
  `influencer_id`  INT NOT NULL,
  `campaign_id`    INT DEFAULT NULL,
  `points`         DECIMAL(10,2) DEFAULT 0,
  `amount`         DECIMAL(10,3) DEFAULT 0,
  `type`           ENUM('credit','debit') NOT NULL,
  `status`         ENUM('pending','paid') DEFAULT 'pending',
  `note`           TEXT,
  `created_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `paid_at`        TIMESTAMP NULL,
  FOREIGN KEY (`influencer_id`) REFERENCES `users`(`id`)    ON DELETE CASCADE,
  FOREIGN KEY (`campaign_id`)   REFERENCES `campaigns`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
", "Table: wallet_transactions", $log, $errors);

// ─── Seed Data ────────────────────────────────
// Points config
$existing = $db->query("SELECT COUNT(*) FROM points_config")->fetchColumn();
if ($existing == 0) {
    $db->exec("INSERT INTO points_config (conversions_per_point, value_per_point, currency) VALUES (100, 1.000, 'BHD')");
    $log[] = "✅ Seeded: points_config";
}

// Admin user
$existingAdmin = $db->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
$existingAdmin->execute(['admin@influx.com']);
if ($existingAdmin->fetchColumn() == 0) {
    $stmt = $db->prepare("INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, 'admin', 'active')");
    $stmt->execute(['Super Admin', 'admin@influx.com', password_hash('admin@123', PASSWORD_BCRYPT)]);
    $log[] = "✅ Seeded: Admin user (admin@influx.com / admin@123)";
}

// Sample influencers
$influencers = [
    ['Ajit Kumar',       'ajit.kumar@gmail.com',    '+91',  '9876543210',  '@ajitkumar_ig',    'instagram'],
    ['Sara Mohammed',    'sara.m@gmail.com',         '+973', '33112233',    '@saraofficial',    'tiktok'],
    ['Ravi Shankar',     'ravi.s@gmail.com',         '+91',  '9012345678',  '@ravishankar_yt',  'youtube'],
    ['Fatima Al-Zahra',  'fatima.z@gmail.com',       '+966', '501234567',   '@fatimaz.sa',      'instagram'],
    ['Ahmed Hassan',     'ahmed.h@gmail.com',        '+971', '501234567',   '@ahmedh.uae',      'youtube'],
    ['Priya Nair',       'priya.n@gmail.com',        '+91',  '8765432100',  '@priyanair_fb',    'facebook'],
    ['Omar Al-Rashid',   'omar.r@gmail.com',         '+968', '92345678',    '@omarrashid',      'instagram'],
    ['Layla Hussain',    'layla.h@gmail.com',        '+965', '66123456',    '@laylah_kw',       'tiktok'],
];
$infPass = password_hash('inf@123', PASSWORD_BCRYPT);
foreach ($influencers as [$name, $email, $cc, $phone, $handle, $platform]) {
    $chk = $db->prepare("SELECT COUNT(*) FROM users WHERE email=?");
    $chk->execute([$email]);
    if ($chk->fetchColumn() == 0) {
        $s = $db->prepare("INSERT INTO users (name,email,password,role,phone,country_code,social_handle,platform,status) VALUES (?,?,?,'influencer',?,?,?,?,'active')");
        $s->execute([$name, $email, $infPass, $phone, $cc, $handle, $platform]);
    }
}
$log[] = "✅ Seeded: 8 influencer accounts (password: inf@123)";

// Sample products
$products = [
    ['ProSuite ERP',         'software',    'Complete business management ERP for SMEs',          299.000, 'BHD', 'https://example.com/prosuite',     'https://example.com/prosuite/demo'],
    ['Gourmet Box Monthly',  'food',        'Premium curated food box delivered monthly',          15.000,  'BHD', 'https://example.com/gourmetbox',   ''],
    ['UrbanWear Collection', 'clothing',    'Trendy urban fashion for modern lifestyles',           25.000,  'BHD', 'https://example.com/urbanwear',    ''],
    ['SmartHome Hub',        'electronics', 'Central hub for all your smart home devices',          49.000,  'BHD', 'https://example.com/smarthome',    'https://example.com/smarthome/demo'],
    ['FitLife Premium',      'services',    'Online fitness coaching and nutrition planning',        20.000,  'BHD', 'https://example.com/fitlife',      ''],
];
foreach ($products as [$name, $cat, $desc, $price, $cur, $url, $demo]) {
    $chk = $db->prepare("SELECT COUNT(*) FROM products WHERE name=?");
    $chk->execute([$name]);
    if ($chk->fetchColumn() == 0) {
        $s = $db->prepare("INSERT INTO products (name,category,description,price,currency,product_url,demo_url,status) VALUES (?,?,?,?,?,?,?,'active')");
        $s->execute([$name, $cat, $desc, $price, $cur, $url, $demo]);
    }
}
$log[] = "✅ Seeded: 5 sample products";

// ─── Output ───────────────────────────────────
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>InfluX Portal — Setup</title>
<style>
  body{font-family:sans-serif;max-width:700px;margin:60px auto;padding:20px;background:#f5f5f5}
  h1{color:#6C63FF}
  .card{background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,.1)}
  .ok{color:#22c55e} .err{color:#ef4444}
  .warn{background:#fff3cd;border:1px solid #ffc107;padding:12px;border-radius:8px;margin-top:16px}
  pre{background:#1a1a2e;color:#e8e8f0;padding:16px;border-radius:8px;overflow:auto}
  a{color:#6C63FF}
</style>
</head>
<body>
<div class="card">
  <h1>🚀 InfluX Portal — Setup</h1>
  <?php if ($errors): ?>
    <h3 class="err">Errors occurred:</h3>
    <ul><?php foreach ($errors as $e) echo "<li class='err'>$e</li>"; ?></ul>
  <?php endif; ?>
  <h3>Setup Log:</h3>
  <ul><?php foreach ($log as $l) echo "<li>$l</li>"; ?></ul>

  <div class="warn">
    <strong>⚠️ Important:</strong> Delete or rename <code>setup.php</code> after setup is complete!<br>
    Default credentials:<br>
    <pre>Admin:      admin@influx.com / admin@123
Influencer: ajit.kumar@gmail.com / inf@123</pre>
  </div>

  <p><a href="index.php">→ Go to the Portal</a></p>
</div>
</body>
</html>
