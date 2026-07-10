<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

requireAdmin();
$db     = getDB();
$action = param('action', 'list');
$input  = getInput();

// ─── List Influencers ─────────────────────────
if ($action === 'list') {
    $stmt = $db->query("
        SELECT u.id, u.name, u.email, u.phone, u.country_code,
               u.status, u.created_at, u.profile_locked,
               COUNT(DISTINCT c.id) as total_campaigns,
               COUNT(DISTINCT e.id) as total_conversions,
               GROUP_CONCAT(DISTINCT CONCAT(up.platform, ':', IFNULL(up.social_handle, '')) SEPARATOR ',') as platforms_list,
               GROUP_CONCAT(DISTINCT ic.name SEPARATOR ',') as categories_list
        FROM users u
        LEFT JOIN user_platforms up ON up.user_id = u.id
        LEFT JOIN user_categories uc ON uc.user_id = u.id
        LEFT JOIN influencer_categories ic ON ic.id = uc.category_id
        LEFT JOIN campaigns c ON c.influencer_id = u.id
        LEFT JOIN events e    ON e.campaign_id   = c.id AND e.type = 'conversion'
        WHERE u.role = 'influencer'
        GROUP BY u.id, u.name, u.email, u.phone, u.country_code, u.status, u.profile_locked, u.created_at
        ORDER BY u.created_at DESC
    ");
    apiSuccess($stmt->fetchAll());
}

// ─── Get Single Influencer ────────────────────
if ($action === 'get') {
    $id   = (int)param('id');
    $stmt = $db->prepare("SELECT id,name,email,phone,country_code,status,profile_locked,created_at FROM users WHERE id=? AND role='influencer'");
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user) apiError('Influencer not found', 404);

    // Get platforms list
    $platStmt = $db->prepare("SELECT platform, social_handle as handle FROM user_platforms WHERE user_id = ?");
    $platStmt->execute([$id]);
    $user['platforms'] = $platStmt->fetchAll();

    // Get categories list
    $catStmt = $db->prepare("SELECT category_id FROM user_categories WHERE user_id = ?");
    $catStmt->execute([$id]);
    $user['categories'] = array_column($catStmt->fetchAll(), 'category_id');

    apiSuccess($user);
}

// ─── Create Influencer ────────────────────────
if ($action === 'create') {
    $name   = sanitize($input['name']   ?? '');
    $email  = trim($input['email']      ?? '');
    $pass   = trim($input['password']   ?? '');
    $phone  = sanitize($input['phone']  ?? '');
    $cc     = sanitize($input['country_code'] ?? '+973');
    $status = in_array($input['status'] ?? 'active', ['active','inactive']) ? $input['status'] : 'active';
    $plats  = $input['platforms']       ?? [];
    $cats   = $input['categories']      ?? [];

    if (!$name)  apiError('Name is required.');
    if (!$email) apiError('Email is required.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) apiError('Invalid email address.');
    if (!$pass || strlen($pass) < 6) apiError('Password must be at least 6 characters.');

    // Check duplicate
    $chk = $db->prepare("SELECT id FROM users WHERE email=?");
    $chk->execute([$email]);
    if ($chk->fetch()) apiError('Email already registered.');

    // Use primary platform (first platform from array) for standard fields fallback
    $primaryPlat = isset($plats[0]) ? sanitize($plats[0]['platform']) : 'instagram';
    $primaryHand = isset($plats[0]) ? sanitize($plats[0]['handle']) : '';
    $profileLocked = isset($input['profile_locked']) ? (int)$input['profile_locked'] : 0;

    $stmt = $db->prepare("INSERT INTO users (name,email,password,role,phone,country_code,social_handle,platform,status,profile_locked) VALUES (?,?,?,'influencer',?,?,?,?,?,?)");
    $stmt->execute([$name, $email, password_hash($pass, PASSWORD_BCRYPT), $phone, $cc, $primaryHand, $primaryPlat, $status, $profileLocked]);
    $newId = $db->lastInsertId();

    // Insert all platforms
    if (!empty($plats)) {
        $ins = $db->prepare("INSERT INTO user_platforms (user_id, platform, social_handle) VALUES (?, ?, ?)");
        foreach ($plats as $p) {
            $pName = sanitize($p['platform'] ?? '');
            $pHand = sanitize($p['handle'] ?? '');
            if ($pName) {
                $ins->execute([$newId, $pName, $pHand]);
            }
        }
    }

    // Insert all categories
    if (!empty($cats)) {
        $insCat = $db->prepare("INSERT INTO user_categories (user_id, category_id) VALUES (?, ?)");
        foreach ($cats as $catId) {
            $insCat->execute([$newId, (int)$catId]);
        }
    }

    $get = $db->prepare("SELECT id,name,email,phone,country_code,status,profile_locked,created_at FROM users WHERE id=?");
    $get->execute([$newId]);
    $user = $get->fetch();
    apiSuccess($user, 'Influencer created successfully');
}

// ─── Update Influencer ────────────────────────
if ($action === 'update') {
    $id     = (int)($input['id'] ?? 0);
    $name   = sanitize($input['name']   ?? '');
    $email  = trim($input['email']      ?? '');
    $phone  = sanitize($input['phone']  ?? '');
    $cc     = sanitize($input['country_code'] ?? '+973');
    $status = in_array($input['status'] ?? 'active', ['active','inactive']) ? $input['status'] : 'active';
    $plats  = $input['platforms']       ?? [];
    $cats   = $input['categories']      ?? [];
    $profileLocked = isset($input['profile_locked']) ? (int)$input['profile_locked'] : 0;

    if (!$id)    apiError('ID is required.');
    if (!$name)  apiError('Name is required.');
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) apiError('Valid email is required.');

    // Check duplicate email for other users
    $chk = $db->prepare("SELECT id FROM users WHERE email=? AND id<>?");
    $chk->execute([$email, $id]);
    if ($chk->fetch()) apiError('Email already used by another user.');

    // Primary platform fallback for standard columns
    $primaryPlat = isset($plats[0]) ? sanitize($plats[0]['platform']) : 'instagram';
    $primaryHand = isset($plats[0]) ? sanitize($plats[0]['handle']) : '';

    $sql = "UPDATE users SET name=?,email=?,phone=?,country_code=?,social_handle=?,platform=?,status=?,profile_locked=? WHERE id=? AND role='influencer'";
    if (!empty($input['password']) && strlen($input['password']) >= 6) {
        $sql = "UPDATE users SET name=?,email=?,phone=?,country_code=?,social_handle=?,platform=?,status=?,profile_locked=?,password=? WHERE id=? AND role='influencer'";
        $stmt = $db->prepare($sql);
        $stmt->execute([$name,$email,$phone,$cc,$primaryHand,$primaryPlat,$status,$profileLocked,password_hash($input['password'],PASSWORD_BCRYPT),$id]);
    } else {
        $stmt = $db->prepare($sql);
        $stmt->execute([$name,$email,$phone,$cc,$primaryHand,$primaryPlat,$status,$profileLocked,$id]);
    }

    // Refresh platforms
    $db->prepare("DELETE FROM user_platforms WHERE user_id = ?")->execute([$id]);
    if (!empty($plats)) {
        $ins = $db->prepare("INSERT INTO user_platforms (user_id, platform, social_handle) VALUES (?, ?, ?)");
        foreach ($plats as $p) {
            $pName = sanitize($p['platform'] ?? '');
            $pHand = sanitize($p['handle'] ?? '');
            if ($pName) {
                $ins->execute([$id, $pName, $pHand]);
            }
        }
    }

    // Refresh categories
    $db->prepare("DELETE FROM user_categories WHERE user_id = ?")->execute([$id]);
    if (!empty($cats)) {
        $insCat = $db->prepare("INSERT INTO user_categories (user_id, category_id) VALUES (?, ?)");
        foreach ($cats as $catId) {
            $insCat->execute([$id, (int)$catId]);
        }
    }

    $get = $db->prepare("SELECT id,name,email,phone,country_code,status,profile_locked,created_at FROM users WHERE id=?");
    $get->execute([$id]);
    $user = $get->fetch();
    apiSuccess($user, 'Influencer updated successfully');
}

// ─── Toggle Status ────────────────────────────
if ($action === 'toggle_status') {
    $id   = (int)($input['id'] ?? 0);
    if (!$id) apiError('ID required.');
    $stmt = $db->prepare("UPDATE users SET status = IF(status='active','inactive','active') WHERE id=? AND role='influencer'");
    $stmt->execute([$id]);
    $get = $db->prepare("SELECT id,name,status FROM users WHERE id=?");
    $get->execute([$id]);
    apiSuccess($get->fetch(), 'Status updated');
}

// ─── Delete Influencer ────────────────────────
if ($action === 'delete') {
    $id = (int)($input['id'] ?? 0);
    if (!$id) apiError('ID required.');
    $stmt = $db->prepare("DELETE FROM users WHERE id=? AND role='influencer'");
    $stmt->execute([$id]);
    apiSuccess([], 'Influencer deleted');
}

// ─── List Categories ──────────────────────────
if ($action === 'categories') {
    $stmt = $db->query("SELECT id, name FROM influencer_categories ORDER BY name ASC");
    apiSuccess($stmt->fetchAll());
}

// ─── Create Category ──────────────────────────
if ($action === 'create_category') {
    $name = sanitize($input['name'] ?? '');
    if (!$name) apiError('Category name is required.');
    
    // Check duplicate
    $chk = $db->prepare("SELECT id FROM influencer_categories WHERE name=?");
    $chk->execute([$name]);
    if ($chk->fetch()) apiError('Category already exists.');
    
    $stmt = $db->prepare("INSERT INTO influencer_categories (name) VALUES (?)");
    $stmt->execute([$name]);
    $newId = $db->lastInsertId();
    
    apiSuccess(['id' => $newId, 'name' => $name], 'Category created successfully');
}

apiError('Invalid action');
