<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

$db     = getDB();
$action = param('action', 'overview');
$input  = getInput();

// ─── Wallet Overview (Admin) ──────────────────
if ($action === 'overview') {
    requireAdmin();
    $cfg = $db->query("SELECT * FROM points_config LIMIT 1")->fetch();
    $cpp = $cfg ? (int)$cfg['conversions_per_point'] : 100;
    $vpp = $cfg ? (float)$cfg['value_per_point'] : 1;
    $cur = $cfg ? $cfg['currency'] : 'BHD';

    $stmt = $db->query("
        SELECT u.id, u.name, u.social_handle, u.platform,
               COUNT(CASE WHEN e.type='conversion' THEN 1 END) as total_conversions
        FROM users u
        LEFT JOIN campaigns c ON c.influencer_id = u.id
        LEFT JOIN events    e ON e.campaign_id   = c.id
        WHERE u.role='influencer'
        GROUP BY u.id
    ");
    $rows = $stmt->fetchAll();

    $wallets = [];
    $totalPending = 0;
    $totalPaid    = 0;

    foreach ($rows as $r) {
        $totalPts  = $cpp > 0 ? floor($r['total_conversions'] / $cpp) : 0;
        $earnings  = round($totalPts * $vpp, 3);

        $paidStmt = $db->prepare("SELECT COALESCE(SUM(amount),0) FROM wallet_transactions WHERE influencer_id=? AND type='debit' AND status='paid'");
        $paidStmt->execute([$r['id']]);
        $paid    = (float)$paidStmt->fetchColumn();
        $pending = round($earnings - $paid, 3);

        $wallets[] = [
            'influencer_id'    => $r['id'],
            'name'             => $r['name'],
            'social_handle'    => $r['social_handle'],
            'platform'         => $r['platform'],
            'total_conversions'=> $r['total_conversions'],
            'total_points'     => $totalPts,
            'total_earnings'   => $earnings,
            'paid_amount'      => $paid,
            'pending_amount'   => $pending > 0 ? $pending : 0,
            'currency'         => $cur,
        ];
        $totalPending += max(0, $pending);
        $totalPaid    += $paid;
    }

    apiSuccess([
        'wallets'       => $wallets,
        'total_pending' => round($totalPending, 3),
        'total_paid'    => round($totalPaid, 3),
        'currency'      => $cur,
    ]);
}

// ─── Transactions list ────────────────────────
if ($action === 'transactions') {
    requireAdmin();
    $infId = (int)param('influencer_id', 0);
    $sql   = "
        SELECT wt.*, u.name as influencer_name
        FROM wallet_transactions wt
        JOIN users u ON u.id = wt.influencer_id
    ";
    if ($infId) {
        $stmt = $db->prepare($sql . " WHERE wt.influencer_id=? ORDER BY wt.created_at DESC");
        $stmt->execute([$infId]);
    } else {
        $stmt = $db->query($sql . " ORDER BY wt.created_at DESC");
    }
    apiSuccess($stmt->fetchAll());
}

// ─── My Transactions (Influencer) ─────────────
if ($action === 'my_transactions') {
    $sess  = requireInfluencer();
    $infId = (int)$sess['user_id'];
    $stmt  = $db->prepare("SELECT * FROM wallet_transactions WHERE influencer_id=? ORDER BY created_at DESC");
    $stmt->execute([$infId]);
    apiSuccess($stmt->fetchAll());
}

// ─── Transfer / Payout ────────────────────────
if ($action === 'transfer') {
    requireAdmin();
    $infId  = (int)($input['influencer_id'] ?? 0);
    $amount = (float)($input['amount'] ?? 0);
    $points = (float)($input['points'] ?? 0);
    $note   = sanitize($input['note'] ?? '');

    if (!$infId)   apiError('Influencer is required.');
    if ($amount <= 0) apiError('Amount must be greater than zero.');

    // Verify influencer exists
    $chk = $db->prepare("SELECT id FROM users WHERE id=? AND role='influencer'");
    $chk->execute([$infId]);
    if (!$chk->fetch()) apiError('Influencer not found.');

    $stmt = $db->prepare("INSERT INTO wallet_transactions (influencer_id,points,amount,type,status,note,paid_at) VALUES (?,?,?,'debit','paid',?,NOW())");
    $stmt->execute([$infId, $points, $amount, $note]);
    $txId = $db->lastInsertId();

    $get = $db->prepare("SELECT wt.*, u.name as influencer_name FROM wallet_transactions wt JOIN users u ON u.id=wt.influencer_id WHERE wt.id=?");
    $get->execute([$txId]);
    apiSuccess($get->fetch(), 'Payment transferred successfully');
}

apiError('Invalid action');
