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
    $stmt = $db->prepare("SELECT id,name,email,role,phone,country_code,social_handle,platform,status,avatar,created_at FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    if (!$user) apiError('User not found', 404);
    apiSuccess($user);
}

apiError('Invalid action');
