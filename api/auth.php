<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

$action = param('action', 'login');

// ─── Login ────────────────────────────────────
if ($action === 'login') {
    $input = getInput();
    $email = trim($input['email'] ?? '');
    $pass  = trim($input['password'] ?? '');

    if (!$email || !$pass) apiError('Email and password are required.');

    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ? AND status = 'active' LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($pass, $user['password'])) {
        apiError('Invalid email or password.', 401);
    }

    $_SESSION['user_id']   = $user['id'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['role']      = $user['role'];
    $_SESSION['email']     = $user['email'];

    unset($user['password']);
    apiSuccess($user, 'Login successful');
}

// ─── Logout ───────────────────────────────────
if ($action === 'logout') {
    session_destroy();
    apiSuccess([], 'Logged out successfully');
}

// ─── Me (current user) ────────────────────────
if ($action === 'me') {
    requireAuth();
    $db   = getDB();
    $stmt = $db->prepare("SELECT id,name,email,role,phone,country_code,social_handle,platform,status,avatar,profile_locked,created_at,follower_count FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    if (!$user) apiError('User not found', 404);

    // Attach social media accounts (user_platforms)
    $platStmt = $db->prepare("SELECT platform, social_handle as handle, follower_count as followers FROM user_platforms WHERE user_id = ? ORDER BY id ASC");
    $platStmt->execute([$_SESSION['user_id']]);
    $user['platforms'] = $platStmt->fetchAll();

    // Attach selected category IDs
    $catStmt = $db->prepare("SELECT category_id FROM user_categories WHERE user_id = ?");
    $catStmt->execute([$_SESSION['user_id']]);
    $user['category_ids'] = array_column($catStmt->fetchAll(), 'category_id');

    apiSuccess($user);
}

// ─── Update Profile ───────────────────────────
if ($action === 'update_profile') {
    requireAuth();
    $input  = getInput();
    $name   = sanitize($input['name'] ?? '');
    $phone  = sanitize($input['phone'] ?? '');
    $cc     = sanitize($input['country_code'] ?? '+973');
    $plat   = sanitize($input['platform'] ?? 'instagram');
    $handle = sanitize($input['social_handle'] ?? '');

    if (!$name) apiError('Name is required.');

    $db = getDB();
    $userId = $_SESSION['user_id'];

    // Check if profile details are verified/locked by admin
    $stmtLock = $db->prepare("SELECT profile_locked, name FROM users WHERE id = ?");
    $stmtLock->execute([$userId]);
    $lockInfo = $stmtLock->fetch();
    if ($lockInfo && (int)$lockInfo['profile_locked'] === 1) {
        // Enforce lock: ignore requested name change, preserve the verified database name
        $name = $lockInfo['name'];
    }

    // Handle avatar base64
    $avatarPath = null;
    if (!empty($input['avatar_base64'])) {
        $data = $input['avatar_base64'];
        if (preg_match('/^data:image\/(\w+);base64,/', $data, $type)) {
            $data = substr($data, strpos($data, ',') + 1);
            $type = strtolower($type[1]);
            if (in_array($type, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                $data = base64_decode($data);
                if ($data !== false) {
                    $uploadDir = __DIR__ . '/../uploads/avatars/';
                    if (!is_dir($uploadDir)) {
                        mkdir($uploadDir, 0755, true);
                    }
                    $filename = 'avatar_' . $userId . '_' . time() . '.' . $type;
                    file_put_contents($uploadDir . $filename, $data);
                    $avatarPath = 'uploads/avatars/' . $filename;
                }
            }
        }
    }

    $followerCount = (int)($input['follower_count'] ?? 0);

    $sql = "UPDATE users SET name = ?, phone = ?, country_code = ?, platform = ?, social_handle = ?, follower_count = ?";
    $params = [$name, $phone, $cc, $plat, $handle, $followerCount];
    if ($avatarPath) {
        $sql .= ", avatar = ?";
        $params[] = $avatarPath;
    }
    $sql .= " WHERE id = ?";
    $params[] = $userId;

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    // Refresh user details to return
    $get = $db->prepare("SELECT id,name,email,role,phone,country_code,social_handle,platform,status,avatar,profile_locked,created_at,follower_count FROM users WHERE id = ?");
    $get->execute([$userId]);
    $user = $get->fetch();

    // Update session variables
    $_SESSION['user_name'] = $user['name'];

    apiSuccess($user, 'Profile updated successfully');
}

// ─── Change Password ──────────────────────────
if ($action === 'change_password') {
    requireAuth();
    $input  = getInput();
    $oldPwd = trim($input['old_password'] ?? '');
    $newPwd = trim($input['new_password'] ?? '');
    $confPwd= trim($input['confirm_password'] ?? '');

    if (!$oldPwd || !$newPwd || !$confPwd) apiError('All password fields are required.');
    if ($newPwd !== $confPwd) apiError('New passwords do not match.');
    if (strlen($newPwd) < 6) apiError('Password must be at least 6 characters long.');

    $db     = getDB();
    $userId = $_SESSION['user_id'];

    // Verify old password
    $chk = $db->prepare("SELECT password FROM users WHERE id = ?");
    $chk->execute([$userId]);
    $pwdHash = $chk->fetchColumn();

    if (!$pwdHash || !password_verify($oldPwd, $pwdHash)) {
        apiError('Incorrect current password.', 401);
    }

    // Update password
    $stmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->execute([password_hash($newPwd, PASSWORD_BCRYPT), $userId]);

    apiSuccess([], 'Password changed successfully');
}

// ─── Save Platforms (Influencer self-service) ──
if ($action === 'save_platforms') {
    requireAuth();
    $input  = getInput();
    $userId = $_SESSION['user_id'];
    $plats  = $input['platforms'] ?? [];

    $db = getDB();

    // Delete existing and re-insert
    $db->prepare("DELETE FROM user_platforms WHERE user_id = ?")->execute([$userId]);

    if (!empty($plats)) {
        $ins = $db->prepare("INSERT INTO user_platforms (user_id, platform, social_handle, follower_count) VALUES (?, ?, ?, ?)");
        foreach ($plats as $p) {
            $pName = sanitize($p['platform'] ?? '');
            $pHand = sanitize($p['handle'] ?? '');
            $pFollowers = (int)($p['followers'] ?? 0);
            if ($pName) {
                $ins->execute([$userId, $pName, $pHand, $pFollowers]);
            }
        }
    }

    // Return updated platforms list
    $platStmt = $db->prepare("SELECT platform, social_handle as handle, follower_count as followers FROM user_platforms WHERE user_id = ? ORDER BY id ASC");
    $platStmt->execute([$userId]);
    apiSuccess($platStmt->fetchAll(), 'Social media accounts saved successfully');
}

// ─── Get Categories (influencer self-service) ───
if ($action === 'get_categories') {
    requireAuth();
    $db   = getDB();
    $stmt = $db->query("SELECT id, name FROM influencer_categories ORDER BY name ASC");
    apiSuccess($stmt->fetchAll());
}

// ─── Save Categories (influencer self-service) ───
if ($action === 'save_categories') {
    requireAuth();
    $input  = getInput();
    $userId = $_SESSION['user_id'];
    $ids    = $input['category_ids'] ?? [];

    // Server-side safety limit: max 3 categories
    if (count($ids) > 3) {
        apiError('You can only select up to 3 categories.');
    }

    $db = getDB();
    // Delete and re-insert
    $db->prepare("DELETE FROM user_categories WHERE user_id = ?")->execute([$userId]);

    if (!empty($ids)) {
        $ins = $db->prepare("INSERT INTO user_categories (user_id, category_id) VALUES (?, ?)");
        $count = 0;
        foreach ($ids as $cid) {
            $cid = (int)$cid;
            if ($cid > 0) {
                $ins->execute([$userId, $cid]);
                $count++;
                if ($count >= 3) break;
            }
        }
    }
    apiSuccess([], 'Categories saved successfully');
}

apiError('Invalid action');
