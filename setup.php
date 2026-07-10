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
CREATE TABLE IF NOT EXISTS `user_platforms` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`       INT NOT NULL,
  `platform`      VARCHAR(50) NOT NULL,
  `social_handle` VARCHAR(100),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
", "Table: user_platforms", $log, $errors);

run($db, "
CREATE TABLE IF NOT EXISTS `influencer_categories` (
  `id`   INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
", "Table: influencer_categories", $log, $errors);

run($db, "
CREATE TABLE IF NOT EXISTS `user_categories` (
  `user_id`     INT NOT NULL,
  `category_id` INT NOT NULL,
  PRIMARY KEY (`user_id`, `category_id`),
  FOREIGN KEY (`user_id`)     REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `influencer_categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
", "Table: user_categories", $log, $errors);


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
  `platform`        VARCHAR(50)  DEFAULT NULL,
  `status`          ENUM('active','paused','expired') DEFAULT 'active',
  `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`)    REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`influencer_id`) REFERENCES `users`(`id`)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
", "Table: campaigns", $log, $errors);

// Run migration for existing campaigns table if it was already created without platform
try {
    $cols = $db->query("DESCRIBE `campaigns`")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('platform', $cols)) {
        run($db, "ALTER TABLE `campaigns` ADD COLUMN `platform` VARCHAR(50) DEFAULT NULL AFTER `discount_value`", "Migration: Add platform column to campaigns table", $log, $errors);
    }
} catch (Exception $e) {}

// Migration: users role column and wallet_balance
try {
    $cols = $db->query("DESCRIBE `users`")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('wallet_balance', $cols)) {
        run($db, "ALTER TABLE `users` ADD COLUMN `wallet_balance` DECIMAL(10,3) DEFAULT 0.000 AFTER `status`", "Migration: Add wallet_balance column to users table", $log, $errors);
    }
    // Modify ENUM role definition to include 'client'
    run($db, "ALTER TABLE `users` MODIFY COLUMN `role` ENUM('admin','influencer','client') DEFAULT 'influencer'", "Migration: Update user role ENUM to support client", $log, $errors);
    if (!in_array('profile_locked', $cols)) {
        run($db, "ALTER TABLE `users` ADD COLUMN `profile_locked` TINYINT(1) DEFAULT 0 AFTER `avatar`", "Migration: Add profile_locked column to users table", $log, $errors);
    }
} catch (Exception $e) {}

// Migration: products client columns
try {
    $cols = $db->query("DESCRIBE `products`")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('client_id', $cols)) {
        run($db, "ALTER TABLE `products` ADD COLUMN `client_id` INT DEFAULT NULL AFTER `id`", "Migration: Add client_id column to products table", $log, $errors);
        run($db, "ALTER TABLE `products` ADD CONSTRAINT fk_product_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL", "Migration: Add product client foreign key constraint", $log, $errors);
    }
    if (!in_array('cpc_rate', $cols)) {
        run($db, "ALTER TABLE `products` ADD COLUMN `cpc_rate` DECIMAL(10,3) DEFAULT 0.000 AFTER `price`", "Migration: Add cpc_rate column to products table", $log, $errors);
    }
    if (!in_array('cpl_rate', $cols)) {
        run($db, "ALTER TABLE `products` ADD COLUMN `cpl_rate` DECIMAL(10,3) DEFAULT 0.000 AFTER `cpc_rate`", "Migration: Add cpl_rate column to products table", $log, $errors);
    }
} catch (Exception $e) {}


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
  `is_read`             TINYINT(1) NOT NULL DEFAULT 0,
  `is_important`        TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
", "Table: events", $log, $errors);

// Migration: Add is_read and is_important to events table (for client lead tracking)
try {
    $evCols = $db->query("DESCRIBE `events`")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('is_read', $evCols)) {
        run($db, "ALTER TABLE `events` ADD COLUMN `is_read` TINYINT(1) NOT NULL DEFAULT 0 AFTER `timestamp`", "Migration: Add is_read column to events table", $log, $errors);
    }
    if (!in_array('is_important', $evCols)) {
        run($db, "ALTER TABLE `events` ADD COLUMN `is_important` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_read`", "Migration: Add is_important column to events table", $log, $errors);
    }
} catch (Exception $e) {}

run($db, "
CREATE TABLE IF NOT EXISTS `points_config` (
  `id`                   INT AUTO_INCREMENT PRIMARY KEY,
  `conversions_per_point` INT  DEFAULT 100,
  `clicks_per_point`     INT  DEFAULT 1000,
  `click_value_per_point` DECIMAL(10,3) DEFAULT 1.000,
  `vendor_clicks_per_point` INT DEFAULT 1000,
  `vendor_click_value_per_point` DECIMAL(10,3) DEFAULT 1.000,
  `vendor_conversions_per_point` INT DEFAULT 100,
  `vendor_conversion_value_per_point` DECIMAL(10,3) DEFAULT 2.000,
  `value_per_point`      DECIMAL(10,3) DEFAULT 1.000,
  `currency`             VARCHAR(10) DEFAULT 'BHD',
  `updated_at`           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
", "Table: points_config", $log, $errors);

// Migration: points_config table columns
try {
    $pcCols = $db->query("DESCRIBE `points_config`")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('clicks_per_point', $pcCols)) {
        run($db, "ALTER TABLE `points_config` ADD COLUMN `clicks_per_point` INT DEFAULT 1000 AFTER `conversions_per_point`", "Migration: Add clicks_per_point to points_config table", $log, $errors);
    }
    if (!in_array('click_value_per_point', $pcCols)) {
        run($db, "ALTER TABLE `points_config` ADD COLUMN `click_value_per_point` DECIMAL(10,3) DEFAULT 1.000 AFTER `clicks_per_point`", "Migration: Add click_value_per_point to points_config table", $log, $errors);
    }
    if (!in_array('vendor_clicks_per_point', $pcCols)) {
        run($db, "ALTER TABLE `points_config` ADD COLUMN `vendor_clicks_per_point` INT DEFAULT 1000 AFTER `click_value_per_point`", "Migration: Add vendor_clicks_per_point to points_config table", $log, $errors);
    }
    if (!in_array('vendor_click_value_per_point', $pcCols)) {
        run($db, "ALTER TABLE `points_config` ADD COLUMN `vendor_click_value_per_point` DECIMAL(10,3) DEFAULT 1.000 AFTER `vendor_clicks_per_point`", "Migration: Add vendor_click_value_per_point to points_config table", $log, $errors);
    }
    if (!in_array('vendor_conversions_per_point', $pcCols)) {
        run($db, "ALTER TABLE `points_config` ADD COLUMN `vendor_conversions_per_point` INT DEFAULT 100 AFTER `vendor_click_value_per_point`", "Migration: Add vendor_conversions_per_point to points_config table", $log, $errors);
    }
    if (!in_array('vendor_conversion_value_per_point', $pcCols)) {
        run($db, "ALTER TABLE `points_config` ADD COLUMN `vendor_conversion_value_per_point` DECIMAL(10,3) DEFAULT 2.000 AFTER `vendor_conversions_per_point`", "Migration: Add vendor_conversion_value_per_point to points_config table", $log, $errors);
    }
} catch (Exception $e) {}

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

run($db, "
CREATE TABLE IF NOT EXISTS `client_wallet_transactions` (
  `id`             INT AUTO_INCREMENT PRIMARY KEY,
  `client_id`      INT NOT NULL,
  `amount`         DECIMAL(10,3) NOT NULL,
  `type`           ENUM('credit','debit') NOT NULL,
  `payment_method` ENUM('cash','bank_transfer','cheque','qr_pay','system') NOT NULL,
  `note`           TEXT,
  `created_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
", "Table: client_wallet_transactions", $log, $errors);

run($db, "
CREATE TABLE IF NOT EXISTS `lead_calls` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `event_id`    INT NOT NULL,
  `status`      VARCHAR(50) NOT NULL,
  `feedback`    TEXT,
  `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
", "Table: lead_calls", $log, $errors);


// ─── Seed Data ────────────────────────────────
// Points config
$existing = $db->query("SELECT COUNT(*) FROM points_config")->fetchColumn();
if ($existing == 0) {
    $db->exec("INSERT INTO points_config (conversions_per_point, clicks_per_point, click_value_per_point, vendor_clicks_per_point, vendor_click_value_per_point, vendor_conversions_per_point, vendor_conversion_value_per_point, value_per_point, currency) VALUES (100, 1000, 1.000, 1000, 1.000, 100, 2.000, 1.000, 'BHD')");
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

// Client user
$existingClient = $db->prepare("SELECT id FROM users WHERE email = ?");
$existingClient->execute(['client@influx.com']);
$clientId = $existingClient->fetchColumn();
if (!$clientId) {
    $stmt = $db->prepare("INSERT INTO users (name, email, password, role, wallet_balance, status) VALUES (?, ?, ?, 'client', ?, 'active')");
    $stmt->execute(['Client Company', 'client@influx.com', password_hash('client@123', PASSWORD_BCRYPT), 15.000]);
    $clientId = $db->lastInsertId();
    
    // Add opening ledger transaction
    $txn = $db->prepare("INSERT INTO client_wallet_transactions (client_id, amount, type, payment_method, note) VALUES (?, ?, 'credit', 'bank_transfer', ?)");
    $txn->execute([$clientId, 15.000, 'Opening Balance']);
    
    $log[] = "✅ Seeded: Client user (client@influx.com / client@123) with BHD 15.000 balance";
}

// Seed influencer categories with emojis
$existingCats = $db->query("SELECT COUNT(*) FROM influencer_categories")->fetchColumn();
if ($existingCats == 0) {
    $db->exec("INSERT INTO influencer_categories (name) VALUES 
        ('🍔 Foodies'), 
        ('👗 Fashion / Dress'), 
        ('🔌 Electronics'), 
        ('💻 Tech / Software'), 
        ('🏋️ Fitness / Lifestyle'), 
        ('💄 Beauty'),
        ('✈️ Travel'),
        ('⚽ Sports'),
        ('🎮 Gaming'),
        ('🎵 Music / Art')");
    $log[] = "✅ Seeded: 10 influencer categories with emojis";
} else {
    // Migration: Update existing categories to add emojis
    $catMapping = [
        'Foodies'             => '🍔 Foodies',
        'Fashion / Dress'     => '👗 Fashion / Dress',
        'Electronics'         => '🔌 Electronics',
        'Tech / Software'     => '💻 Tech / Software',
        'Fitness / Lifestyle' => '🏋️ Fitness / Lifestyle',
        'Beauty'              => '💄 Beauty',
        'Travel'              => '✈️ Travel',
    ];
    foreach ($catMapping as $oldName => $newName) {
        $db->prepare("UPDATE influencer_categories SET name = ? WHERE name = ?")->execute([$newName, $oldName]);
    }

    // Add new categories with emojis if they don't exist
    $newCats = ['⚽ Sports', '🎮 Gaming', '🎵 Music / Art'];
    foreach ($newCats as $name) {
        $chk = $db->prepare("SELECT COUNT(*) FROM influencer_categories WHERE name = ?");
        $chk->execute([$name]);
        if ($chk->fetchColumn() == 0) {
            $db->prepare("INSERT INTO influencer_categories (name) VALUES (?)")->execute([$name]);
        }
    }
}

// Sample influencers and their assigned categories (by name)
$influencers = [
    ['Ajit Kumar',       'ajit.kumar@gmail.com',    '+91',  '9876543210',  '@ajitkumar_ig',    'instagram', ['💻 Tech / Software', '🔌 Electronics']],
    ['Sara Mohammed',    'sara.m@gmail.com',         '+973', '33112233',    '@saraofficial',    'tiktok',    ['👗 Fashion / Dress', '💄 Beauty']],
    ['Ravi Shankar',     'ravi.s@gmail.com',         '+91',  '9012345678',  '@ravishankar_yt',  'youtube',   ['🍔 Foodies', '🏋️ Fitness / Lifestyle']],
    ['Fatima Al-Zahra',  'fatima.z@gmail.com',       '+966', '501234567',   '@fatimaz.sa',      'instagram', ['💄 Beauty', '👗 Fashion / Dress']],
    ['Ahmed Hassan',     'ahmed.h@gmail.com',        '+971', '501234567',   '@ahmedh.uae',      'youtube',   ['💻 Tech / Software', '🔌 Electronics']],
    ['Priya Nair',       'priya.n@gmail.com',        '+91',  '8765432100',  '@priyanair_fb',    'facebook',  ['👗 Fashion / Dress']],
    ['Omar Al-Rashid',   'omar.r@gmail.com',         '+968', '92345678',    '@omarrashid',      'instagram', ['✈️ Travel', '🍔 Foodies']],
    ['Layla Hussain',    'layla.h@gmail.com',        '+965', '66123456',    '@laylah_kw',       'tiktok',    ['💄 Beauty', '👗 Fashion / Dress']],
];
$infPass = password_hash('inf@123', PASSWORD_BCRYPT);
foreach ($influencers as [$name, $email, $cc, $phone, $handle, $platform, $cats]) {
    $chk = $db->prepare("SELECT id FROM users WHERE email=?");
    $chk->execute([$email]);
    $user = $chk->fetch();
    
    if (!$user) {
        $s = $db->prepare("INSERT INTO users (name,email,password,role,phone,country_code,social_handle,platform,status) VALUES (?,?,?,'influencer',?,?,?,?,'active')");
        $s->execute([$name, $email, $infPass, $phone, $cc, $handle, $platform]);
        $userId = $db->lastInsertId();
    } else {
        $userId = $user['id'];
    }

    // Seed multiple platforms for each influencer
    $platChk = $db->prepare("SELECT COUNT(*) FROM user_platforms WHERE user_id=?");
    $platChk->execute([$userId]);
    if ($platChk->fetchColumn() == 0) {
        $insPlat = $db->prepare("INSERT INTO user_platforms (user_id, platform, social_handle) VALUES (?, ?, ?)");
        // Add the primary platform
        $insPlat->execute([$userId, $platform, $handle]);
        
        // Add additional sample platforms
        if ($platform === 'instagram') {
            $insPlat->execute([$userId, 'tiktok', '@' . strtolower(str_replace(' ', '', $name)) . '_tiktok']);
            $insPlat->execute([$userId, 'youtube', str_replace(' ', '', $name) . ' Channel']);
        } elseif ($platform === 'tiktok') {
            $insPlat->execute([$userId, 'instagram', '@' . strtolower(str_replace(' ', '', $name)) . '_ig']);
        } elseif ($platform === 'youtube') {
            $insPlat->execute([$userId, 'instagram', '@' . strtolower(str_replace(' ', '', $name)) . '_ig']);
            $insPlat->execute([$userId, 'tiktok', '@' . strtolower(str_replace(' ', '', $name)) . '_tiktok']);
        }
    }

    // Map influencer to categories
    $catChk = $db->prepare("SELECT COUNT(*) FROM user_categories WHERE user_id=?");
    $catChk->execute([$userId]);
    if ($catChk->fetchColumn() == 0) {
        $insCat = $db->prepare("
            INSERT INTO user_categories (user_id, category_id) 
            SELECT ?, id FROM influencer_categories WHERE name = ?
        ");
        foreach ($cats as $catName) {
            $insCat->execute([$userId, $catName]);
        }
    }
}
$log[] = "✅ Seeded: 8 influencer accounts and their multiple social media platforms (password: inf@123)";


// Sample products
$clientId = $db->query("SELECT id FROM users WHERE email='client@influx.com'")->fetchColumn();

$products = [
    ['ProSuite ERP',         'software',    'Complete business management ERP for SMEs',          299.000, 0.050, 0.500, 'BHD', 'https://example.com/prosuite',     'https://example.com/prosuite/demo'],
    ['Gourmet Box Monthly',  'food',        'Premium curated food box delivered monthly',          15.000,  0.010, 0.150, 'BHD', 'https://example.com/gourmetbox',   ''],
    ['UrbanWear Collection', 'clothing',    'Trendy urban fashion for modern lifestyles',           25.000,  0.020, 0.200, 'BHD', 'https://example.com/urbanwear',    ''],
    ['SmartHome Hub',        'electronics', 'Central hub for all your smart home devices',          49.000,  0.030, 0.300, 'BHD', 'https://example.com/smarthome',    'https://example.com/smarthome/demo'],
    ['FitLife Premium',      'services',    'Online fitness coaching and nutrition planning',        20.000,  0.015, 0.250, 'BHD', 'https://example.com/fitlife',      ''],
];
foreach ($products as [$name, $cat, $desc, $price, $cpc, $cpl, $cur, $url, $demo]) {
    $chk = $db->prepare("SELECT COUNT(*) FROM products WHERE name=?");
    $chk->execute([$name]);
    if ($chk->fetchColumn() == 0) {
        $s = $db->prepare("INSERT INTO products (client_id,name,category,description,price,cpc_rate,cpl_rate,currency,product_url,demo_url,status) VALUES (?,?,?,?,?,?,?,?,?,?,'active')");
        $s->execute([$clientId ?: null, $name, $cat, $desc, $price, $cpc, $cpl, $cur, $url, $demo]);
    }
}
$log[] = "✅ Seeded: 5 sample products with CPC/CPL rates and client assignment";

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
Influencer: ajit.kumar@gmail.com / inf@123
Client:     client@influx.com / client@123</pre>
  </div>

  <p><a href="index.php">→ Go to the Portal</a></p>
</div>
</body>
</html>
