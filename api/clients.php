<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

requireAdmin();
$db     = getDB();
$action = param('action', 'list');
$input  = getInput();

// ─── List Clients ─────────────────────────────
if ($action === 'list') {
    $stmt = $db->query("
        SELECT u.id, u.name, u.email, u.phone, u.country_code, u.wallet_balance, u.status, u.created_at,
               COUNT(p.id) as total_products
        FROM users u
        LEFT JOIN products p ON p.client_id = u.id
        WHERE u.role = 'client'
        GROUP BY u.id, u.name, u.email, u.phone, u.country_code, u.wallet_balance, u.status, u.created_at
        ORDER BY u.created_at DESC
    ");
    apiSuccess($stmt->fetchAll());
}

// ─── Get Single Client ────────────────────────
if ($action === 'get') {
    $id   = (int)param('id');
    $stmt = $db->prepare("SELECT id, name, email, phone, country_code, wallet_balance, status, created_at FROM users WHERE id = ? AND role = 'client'");
    $stmt->execute([$id]);
    $client = $stmt->fetch();
    if (!$client) apiError('Client not found', 404);
    apiSuccess($client);
}

// ─── Create Client ────────────────────────────
if ($action === 'create') {
    $name   = sanitize($input['name'] ?? '');
    $email  = trim($input['email'] ?? '');
    $pass   = trim($input['password'] ?? '');
    $phone  = sanitize($input['phone'] ?? '');
    $cc     = sanitize($input['country_code'] ?? '+973');
    $status = in_array($input['status'] ?? 'active', ['active','inactive']) ? $input['status'] : 'active';

    if (!$name)  apiError('Name is required.');
    if (!$email) apiError('Email is required.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) apiError('Invalid email address.');
    if (!$pass || strlen($pass) < 6) apiError('Password must be at least 6 characters.');

    // Check duplicate email
    $chk = $db->prepare("SELECT id FROM users WHERE email = ?");
    $chk->execute([$email]);
    if ($chk->fetch()) apiError('Email already registered.');

    $stmt = $db->prepare("INSERT INTO users (name, email, password, role, phone, country_code, wallet_balance, status) VALUES (?, ?, ?, 'client', ?, ?, 0.000, ?)");
    $stmt->execute([$name, $email, password_hash($pass, PASSWORD_BCRYPT), $phone, $cc, $status]);
    $newId = $db->lastInsertId();

    // Load created user
    $get = $db->prepare("SELECT id, name, email, phone, country_code, wallet_balance, status, created_at FROM users WHERE id = ?");
    $get->execute([$newId]);
    apiSuccess($get->fetch(), 'Client created successfully');
}

// ─── Update Client ────────────────────────────
if ($action === 'update') {
    $id     = (int)($input['id'] ?? 0);
    $name   = sanitize($input['name'] ?? '');
    $email  = trim($input['email'] ?? '');
    $phone  = sanitize($input['phone'] ?? '');
    $cc     = sanitize($input['country_code'] ?? '+973');
    $status = in_array($input['status'] ?? 'active', ['active','inactive']) ? $input['status'] : 'active';

    if (!$id)    apiError('ID is required.');
    if (!$name)  apiError('Name is required.');
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) apiError('Valid email is required.');

    // Check duplicate email
    $chk = $db->prepare("SELECT id FROM users WHERE email = ? AND id <> ?");
    $chk->execute([$email, $id]);
    if ($chk->fetch()) apiError('Email already registered by another user.');

    $sql = "UPDATE users SET name = ?, email = ?, phone = ?, country_code = ?, status = ? WHERE id = ? AND role = 'client'";
    if (!empty($input['password']) && strlen($input['password']) >= 6) {
        $sql = "UPDATE users SET name = ?, email = ?, phone = ?, country_code = ?, status = ?, password = ? WHERE id = ? AND role = 'client'";
        $stmt = $db->prepare($sql);
        $stmt->execute([$name, $email, $phone, $cc, $status, password_hash($input['password'], PASSWORD_BCRYPT), $id]);
    } else {
        $stmt = $db->prepare($sql);
        $stmt->execute([$name, $email, $phone, $cc, $status, $id]);
    }

    $get = $db->prepare("SELECT id, name, email, phone, country_code, wallet_balance, status FROM users WHERE id = ?");
    $get->execute([$id]);
    apiSuccess($get->fetch(), 'Client updated successfully');
}

// ─── Toggle Client Status ─────────────────────
if ($action === 'toggle_status') {
    $id = (int)($input['id'] ?? 0);
    if (!$id) apiError('ID required.');
    $stmt = $db->prepare("UPDATE users SET status = IF(status='active','inactive','active') WHERE id = ? AND role = 'client'");
    $stmt->execute([$id]);
    
    $get = $db->prepare("SELECT id, name, status FROM users WHERE id = ?");
    $get->execute([$id]);
    apiSuccess($get->fetch(), 'Status toggled');
}

// ─── Delete Client ────────────────────────────
if ($action === 'delete') {
    $id = (int)($input['id'] ?? 0);
    if (!$id) apiError('ID required.');
    $stmt = $db->prepare("DELETE FROM users WHERE id = ? AND role = 'client'");
    $stmt->execute([$id]);
    apiSuccess([], 'Client deleted');
}

// ─── Ledger Transactions List ────────────────
if ($action === 'wallet_transactions') {
    $clientId = (int)param('client_id');
    if (!$clientId) apiError('Client ID required.');

    $stmt = $db->prepare("
        SELECT id, amount, type, payment_method, note, created_at
        FROM client_wallet_transactions
        WHERE client_id = ?
        ORDER BY created_at DESC
    ");
    $stmt->execute([$clientId]);
    apiSuccess($stmt->fetchAll());
}

// ─── Add Credit Funds to Wallet ──────────────
if ($action === 'add_funds') {
    $clientId      = (int)($input['client_id'] ?? 0);
    $amount        = (float)($input['amount'] ?? 0);
    $paymentMethod = sanitize($input['payment_method'] ?? 'cash');
    $note          = sanitize($input['note'] ?? '');

    if (!$clientId) apiError('Client ID is required.');
    if ($amount <= 0) apiError('Amount must be greater than zero.');
    
    $validMethods = ['cash', 'bank_transfer', 'cheque', 'qr_pay', 'system'];
    if (!in_array($paymentMethod, $validMethods)) {
        apiError('Invalid payment method.');
    }

    // Verify client exists
    $chk = $db->prepare("SELECT id FROM users WHERE id = ? AND role = 'client'");
    $chk->execute([$clientId]);
    if (!$chk->fetch()) apiError('Client not found.');

    try {
        $db->beginTransaction();

        // 1. Insert transaction ledger entry
        $ins = $db->prepare("INSERT INTO client_wallet_transactions (client_id, amount, type, payment_method, note) VALUES (?, ?, 'credit', ?, ?)");
        $ins->execute([$clientId, $amount, $paymentMethod, $note]);

        // 2. Update client's balance in users table
        $upd = $db->prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?");
        $upd->execute([$amount, $clientId]);

        $db->commit();
        
        // Fetch new balance
        $balStmt = $db->prepare("SELECT wallet_balance FROM users WHERE id = ?");
        $balStmt->execute([$clientId]);
        $newBalance = (float)$balStmt->fetchColumn();

        apiSuccess(['wallet_balance' => $newBalance], 'Funds added successfully to ledger');
    } catch (Exception $e) {
        $db->rollBack();
        apiError('Failed to record transaction: ' . $e->getMessage());
    }
}

apiError('Invalid action');
