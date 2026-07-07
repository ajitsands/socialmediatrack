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
        SELECT u.id, u.name, u.email, u.phone, u.country_code, u.social_handle, u.platform,
               u.status, u.created_at,
               COUNT(DISTINCT c.id) as total_campaigns,
               COUNT(DISTINCT e.id) as total_conversions
        FROM users u
        LEFT JOIN campaigns c ON c.influencer_id = u.id
        LEFT JOIN events e    ON e.campaign_id   = c.id AND e.type = 'conversion'
        WHERE u.role = 'influencer'
        GROUP BY u.id
        ORDER BY u.created_at DESC
    ");
    apiSuccess($stmt->fetchAll());
}

// ─── Get Single Influencer ────────────────────
if ($action === 'get') {
    $id   = (int)param('id');
    $stmt = $db->prepare("SELECT id,name,email,phone,country_code,social_handle,platform,status,created_at FROM users WHERE id=? AND role='influencer'");
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user) apiError('Influencer not found', 404);
    apiSuccess($user);
}

// ─── Create Influencer ────────────────────────
if ($action === 'create') {
    $name   = sanitize($input['name']   ?? '');
    $email  = trim($input['email']      ?? '');
    $pass   = trim($input['password']   ?? '');
    $phone  = sanitize($input['phone']  ?? '');
    $cc     = sanitize($input['country_code'] ?? '+973');
    $handle = sanitize($input['social_handle'] ?? '');
    $plat   = sanitize($input['platform'] ?? 'instagram');
    $status = in_array($input['status'] ?? 'active', ['active','inactive']) ? $input['status'] : 'active';

    if (!$name)  apiError('Name is required.');
    if (!$email) apiError('Email is required.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) apiError('Invalid email address.');
    if (!$pass || strlen($pass) < 6) apiError('Password must be at least 6 characters.');

    // Check duplicate
    $chk = $db->prepare("SELECT id FROM users WHERE email=?");
    $chk->execute([$email]);
    if ($chk->fetch()) apiError('Email already registered.');

    $stmt = $db->prepare("INSERT INTO users (name,email,password,role,phone,country_code,social_handle,platform,status) VALUES (?,?,?,'influencer',?,?,?,?,?)");
    $stmt->execute([$name, $email, password_hash($pass, PASSWORD_BCRYPT), $phone, $cc, $handle, $plat, $status]);
    $newId = $db->lastInsertId();

    $get = $db->prepare("SELECT id,name,email,phone,country_code,social_handle,platform,status,created_at FROM users WHERE id=?");
    $get->execute([$newId]);
    apiSuccess($get->fetch(), 'Influencer created successfully');
}

// ─── Update Influencer ────────────────────────
if ($action === 'update') {
    $id     = (int)($input['id'] ?? 0);
    $name   = sanitize($input['name']   ?? '');
    $email  = trim($input['email']      ?? '');
    $phone  = sanitize($input['phone']  ?? '');
    $cc     = sanitize($input['country_code'] ?? '+973');
    $handle = sanitize($input['social_handle'] ?? '');
    $plat   = sanitize($input['platform'] ?? 'instagram');
    $status = in_array($input['status'] ?? 'active', ['active','inactive']) ? $input['status'] : 'active';

    if (!$id)    apiError('ID is required.');
    if (!$name)  apiError('Name is required.');
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) apiError('Valid email is required.');

    // Check duplicate email for other users
    $chk = $db->prepare("SELECT id FROM users WHERE email=? AND id<>?");
    $chk->execute([$email, $id]);
    if ($chk->fetch()) apiError('Email already used by another user.');

    $sql = "UPDATE users SET name=?,email=?,phone=?,country_code=?,social_handle=?,platform=?,status=? WHERE id=? AND role='influencer'";
    if (!empty($input['password']) && strlen($input['password']) >= 6) {
        $sql = "UPDATE users SET name=?,email=?,phone=?,country_code=?,social_handle=?,platform=?,status=?,password=? WHERE id=? AND role='influencer'";
        $stmt = $db->prepare($sql);
        $stmt->execute([$name,$email,$phone,$cc,$handle,$plat,$status,password_hash($input['password'],PASSWORD_BCRYPT),$id]);
    } else {
        $stmt = $db->prepare($sql);
        $stmt->execute([$name,$email,$phone,$cc,$handle,$plat,$status,$id]);
    }

    $get = $db->prepare("SELECT id,name,email,phone,country_code,social_handle,platform,status,created_at FROM users WHERE id=?");
    $get->execute([$id]);
    apiSuccess($get->fetch(), 'Influencer updated successfully');
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

apiError('Invalid action');
