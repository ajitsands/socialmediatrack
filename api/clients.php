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
        SELECT u.id, u.name, u.email, u.phone, u.country_code, u.company_category, u.wallet_balance, u.status, u.profile_locked, u.created_at,
               COUNT(p.id) as total_products
        FROM users u
        LEFT JOIN products p ON p.client_id = u.id
        WHERE u.role = 'client'
        GROUP BY u.id, u.name, u.email, u.phone, u.country_code, u.company_category, u.wallet_balance, u.status, u.profile_locked, u.created_at
        ORDER BY u.created_at DESC
    ");
    apiSuccess($stmt->fetchAll());
}

// ─── Get Single Client ────────────────────────
if ($action === 'get') {
    $id   = (int)param('id');
    $stmt = $db->prepare("SELECT id, name, email, phone, country_code, company_category, wallet_balance, status, profile_locked, created_at FROM users WHERE id = ? AND role = 'client'");
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
    $profileLocked = isset($input['profile_locked']) ? (int)$input['profile_locked'] : 0;
    $compCategory = sanitize($input['company_category'] ?? '');

    if (!$name)  apiError('Name is required.');
    if (!$email) apiError('Email is required.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) apiError('Invalid email address.');
    if (!$pass || strlen($pass) < 6) apiError('Password must be at least 6 characters.');

    // Check duplicate email
    $chk = $db->prepare("SELECT id FROM users WHERE email = ?");
    $chk->execute([$email]);
    if ($chk->fetch()) apiError('Email already registered.');

    $stmt = $db->prepare("INSERT INTO users (name, email, password, role, phone, country_code, company_category, wallet_balance, status, profile_locked) VALUES (?, ?, ?, 'client', ?, ?, ?, 0.000, ?, ?)");
    $stmt->execute([$name, $email, password_hash($pass, PASSWORD_BCRYPT), $phone, $cc, $compCategory, $status, $profileLocked]);
    $newId = $db->lastInsertId();

    // Load created user
    $get = $db->prepare("SELECT id, name, email, phone, country_code, company_category, wallet_balance, status, profile_locked, created_at FROM users WHERE id = ?");
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
    $profileLocked = isset($input['profile_locked']) ? (int)$input['profile_locked'] : 0;
    $compCategory = sanitize($input['company_category'] ?? '');

    if (!$id)    apiError('ID is required.');
    if (!$name)  apiError('Name is required.');
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) apiError('Valid email is required.');

    // Check duplicate email
    $chk = $db->prepare("SELECT id FROM users WHERE email = ? AND id <> ?");
    $chk->execute([$email, $id]);
    if ($chk->fetch()) apiError('Email already registered by another user.');

    $sql = "UPDATE users SET name = ?, email = ?, phone = ?, country_code = ?, company_category = ?, status = ?, profile_locked = ? WHERE id = ? AND role = 'client'";
    if (!empty($input['password']) && strlen($input['password']) >= 6) {
        $sql = "UPDATE users SET name = ?, email = ?, phone = ?, country_code = ?, company_category = ?, status = ?, profile_locked = ?, password = ? WHERE id = ? AND role = 'client'";
        $stmt = $db->prepare($sql);
        $stmt->execute([$name, $email, $phone, $cc, $compCategory, $status, $profileLocked, password_hash($input['password'], PASSWORD_BCRYPT), $id]);
    } else {
        $stmt = $db->prepare($sql);
        $stmt->execute([$name, $email, $phone, $cc, $compCategory, $status, $profileLocked, $id]);
    }

    $get = $db->prepare("SELECT id, name, email, phone, country_code, company_category, wallet_balance, status, profile_locked FROM users WHERE id = ?");
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
    $clientId  = (int)param('client_id', 0);
    $dateFrom  = param('date_from', '');
    $dateTo    = param('date_to', '');

    $conditions = [];
    $params     = [];

    if ($clientId) {
        $conditions[] = 'wt.client_id = ?';
        $params[]     = $clientId;
    }
    if (!empty($dateFrom)) {
        $conditions[] = 'DATE(wt.created_at) >= ?';
        $params[]     = $dateFrom;
    }
    if (!empty($dateTo)) {
        $conditions[] = 'DATE(wt.created_at) <= ?';
        $params[]     = $dateTo;
    }

    $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

    $stmt = $db->prepare("
        SELECT wt.id, wt.amount, wt.type, wt.payment_method, wt.note, wt.status, wt.screenshot_url, wt.created_at, u.name as client_name
        FROM client_wallet_transactions wt
        JOIN users u ON u.id = wt.client_id
        $where
        ORDER BY wt.created_at DESC
    ");
    $stmt->execute($params);
    apiSuccess($stmt->fetchAll());
}

// ─── Add Credit/Debit Funds to Wallet ──────────────
if ($action === 'add_funds') {
    $clientId       = (int)($input['client_id'] ?? 0);
    $amount         = (float)($input['amount'] ?? 0);
    $paymentMethod  = sanitize($input['payment_method'] ?? 'cash');
    $note           = sanitize($input['note'] ?? '');
    $txType         = sanitize($input['transaction_type'] ?? 'credit'); // credit or debit

    if (!$clientId) apiError('Client ID is required.');
    if ($amount <= 0) apiError('Amount must be greater than zero.');
    if (!in_array($txType, ['credit', 'debit'])) apiError('Invalid transaction type.');

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
        $ins = $db->prepare("INSERT INTO client_wallet_transactions (client_id, amount, type, payment_method, note) VALUES (?, ?, ?, ?, ?)");
        $ins->execute([$clientId, $amount, $txType, $paymentMethod, $note]);

        // 2. Update client's balance (credit = add, debit = subtract)
        if ($txType === 'debit') {
            $upd = $db->prepare("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?");
        } else {
            $upd = $db->prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?");
        }
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

// ─── Delete Manual Wallet Transaction ────────────
if ($action === 'delete_wallet_transaction') {
    $txId = (int)($input['id'] ?? 0);
    if (!$txId) apiError('Transaction ID is required.');

    // Fetch the transaction first
    $stmt = $db->prepare("SELECT * FROM client_wallet_transactions WHERE id = ?");
    $stmt->execute([$txId]);
    $tx = $stmt->fetch();

    if (!$tx) apiError('Transaction not found.', 404);

    // Block deletion of auto-generated CPC/CPL system entries
    $note = strtolower($tx['note'] ?? '');
    $isAutoEntry = (
        strpos($note, 'cpc click') === 0 || 
        strpos($note, 'cpl lead') === 0
    );
    if ($isAutoEntry) {
        apiError('Auto-generated CPC/CPL transactions cannot be deleted.');
    }

    try {
        $db->beginTransaction();

        // Reverse the wallet balance effect
        if ($tx['type'] === 'credit') {
            $db->prepare("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?")->execute([$tx['amount'], $tx['client_id']]);
        } else {
            $db->prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?")->execute([$tx['amount'], $tx['client_id']]);
        }

        // Delete the transaction record
        $db->prepare("DELETE FROM client_wallet_transactions WHERE id = ?")->execute([$txId]);

        $db->commit();
        apiSuccess([], 'Transaction deleted and wallet balance reversed.');
    } catch (Exception $e) {
        $db->rollBack();
        apiError('Failed to delete transaction: ' . $e->getMessage());
    }
}

// ─── Client Submits Top-Up Proof ──────────────────
if ($action === 'submit_topup') {
    requireAuth();
    if ($_SESSION['role'] !== 'client') {
        apiError('Unauthorized: Only clients can submit top-up requests.');
    }
    $clientId = (int)$_SESSION['user_id'];
    $amount = (float)($_POST['amount'] ?? 0);
    $paymentMethod = sanitize($_POST['payment_method'] ?? 'bank_transfer');
    $note = sanitize($_POST['note'] ?? '');

    if ($amount <= 0) apiError('Please enter a valid positive amount.');
    
    $validMethods = ['bank_transfer', 'qr_pay', 'cheque'];
    if (!in_array($paymentMethod, $validMethods)) {
        apiError('Invalid payment method.');
    }

    $screenshotUrl = null;
    if (isset($_FILES['screenshot']) && $_FILES['screenshot']['error'] === UPLOAD_ERR_OK) {
        $ext = strtolower(pathinfo($_FILES['screenshot']['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'svg', 'webp', 'pdf'];
        if (!in_array($ext, $allowed)) {
            apiError('Only image/PDF receipt files are allowed.');
        }
        $dir = __DIR__ . '/../uploads/receipts/';
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        $filename = 'receipt_' . time() . '_' . rand(1000, 9999) . '.' . $ext;
        if (move_uploaded_file($_FILES['screenshot']['tmp_name'], $dir . $filename)) {
            $screenshotUrl = 'uploads/receipts/' . $filename;
        } else {
            apiError('Failed to save receipt file.');
        }
    } else {
        if ($paymentMethod !== 'cheque') {
            apiError('Receipt screenshot/proof is required for this payment method.');
        }
    }

    $stmt = $db->prepare("
        INSERT INTO client_wallet_transactions (client_id, amount, type, payment_method, note, status, screenshot_url) 
        VALUES (?, ?, 'credit', ?, ?, 'pending', ?)
    ");
    $stmt->execute([$clientId, $amount, $paymentMethod, $note, $screenshotUrl]);

    apiSuccess([], 'Top-up request submitted successfully! It is pending approval by the Admin.');
}

// ─── Approve / Reject Client Top-up Request ──────
if ($action === 'approve_reject_topup') {
    requireAdmin();
    $txId = (int)($input['tx_id'] ?? 0);
    $status = sanitize($input['status'] ?? ''); // 'approved' or 'rejected'

    if (!$txId) apiError('Transaction ID is required.');
    if (!in_array($status, ['approved', 'rejected'])) apiError('Invalid status.');

    // Fetch transaction
    $stmt = $db->prepare("SELECT * FROM client_wallet_transactions WHERE id = ?");
    $stmt->execute([$txId]);
    $tx = $stmt->fetch();
    if (!$tx) apiError('Transaction not found.', 404);
    if ($tx['status'] !== 'pending') apiError('Transaction is already processed.');

    try {
        $db->beginTransaction();

        // 1. Update status
        $updStatus = $db->prepare("UPDATE client_wallet_transactions SET status = ? WHERE id = ?");
        $updStatus->execute([$status, $txId]);

        // 2. If approved, add to client's wallet balance
        if ($status === 'approved') {
            $updBalance = $db->prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?");
            $updBalance->execute([$tx['amount'], $tx['client_id']]);
        }

        $db->commit();
        apiSuccess([], 'Transaction has been ' . $status . ' successfully.');
    } catch (Exception $e) {
        $db->rollBack();
        apiError('Failed to process request: ' . $e->getMessage());
    }
}

apiError('Invalid action');
