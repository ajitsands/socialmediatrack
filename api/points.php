<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

$db     = getDB();
$action = param('action', 'config');
$input  = getInput();

// ─── Get Points Config ────────────────────────
if ($action === 'config') {
    requireAdmin();
    $cfg = $db->query("SELECT * FROM points_config ORDER BY id DESC LIMIT 1")->fetch();
    apiSuccess($cfg ?: ['conversions_per_point'=>100,'value_per_point'=>1,'currency'=>'BHD']);
}

// ─── Update Points Config ─────────────────────
if ($action === 'update_config') {
    requireAdmin();
    $cpp  = max(1, (int)($input['conversions_per_point'] ?? 100));
    $vpp  = max(0.001, (float)($input['value_per_point'] ?? 1));
    $curr = sanitize($input['currency'] ?? 'BHD');

    $exists = $db->query("SELECT id FROM points_config LIMIT 1")->fetch();
    if ($exists) {
        $db->prepare("UPDATE points_config SET conversions_per_point=?,value_per_point=?,currency=?")->execute([$cpp,$vpp,$curr]);
    } else {
        $db->prepare("INSERT INTO points_config (conversions_per_point,value_per_point,currency) VALUES (?,?,?)")->execute([$cpp,$vpp,$curr]);
    }
    $cfg = $db->query("SELECT * FROM points_config ORDER BY id DESC LIMIT 1")->fetch();
    apiSuccess($cfg, 'Points configuration saved');
}

// ─── Get Influencer Points Summary ────────────
if ($action === 'influencer_points') {
    requireAdmin();
    $stmt = $db->query("
        SELECT u.id, u.name, u.social_handle, u.platform,
               COUNT(DISTINCT c.id) as campaigns,
               COUNT(CASE WHEN e.type='conversion' THEN 1 END) as total_conversions,
               (SELECT conversions_per_point FROM points_config LIMIT 1) as cpp,
               (SELECT value_per_point       FROM points_config LIMIT 1) as vpp,
               (SELECT currency              FROM points_config LIMIT 1) as currency
        FROM users u
        LEFT JOIN campaigns c ON c.influencer_id = u.id
        LEFT JOIN events    e ON e.campaign_id   = c.id
        WHERE u.role = 'influencer'
        GROUP BY u.id
    ");
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['total_points']   = $r['cpp'] > 0 ? floor($r['total_conversions'] / $r['cpp']) : 0;
        $r['total_earnings'] = round($r['total_points'] * $r['vpp'], 3);
    }
    apiSuccess($rows);
}

// ─── My Points (Influencer self) ──────────────
if ($action === 'my_points') {
    $sess  = requireInfluencer();
    $infId = (int)$sess['user_id'];

    $cfg = $db->query("SELECT * FROM points_config LIMIT 1")->fetch();
    $cpp = $cfg ? (int)$cfg['conversions_per_point'] : 100;
    $vpp = $cfg ? (float)$cfg['value_per_point'] : 1;
    $cur = $cfg ? $cfg['currency'] : 'BHD';

    $convStmt = $db->prepare("
        SELECT COUNT(e.id) as total_conversions
        FROM events e
        JOIN campaigns c ON c.id = e.campaign_id
        WHERE c.influencer_id=? AND e.type='conversion'
    ");
    $convStmt->execute([$infId]);
    $total_conversions = (int)$convStmt->fetchColumn();

    $total_points   = $cpp > 0 ? floor($total_conversions / $cpp) : 0;
    $total_earnings = round($total_points * $vpp, 3);

    // Paid amount
    $paidStmt = $db->prepare("SELECT COALESCE(SUM(amount),0) as paid FROM wallet_transactions WHERE influencer_id=? AND type='debit' AND status='paid'");
    $paidStmt->execute([$infId]);
    $paid = (float)$paidStmt->fetchColumn();

    apiSuccess([
        'total_conversions' => $total_conversions,
        'total_points'      => $total_points,
        'total_earnings'    => $total_earnings,
        'paid_amount'       => $paid,
        'pending_amount'    => round($total_earnings - $paid, 3),
        'conversions_per_point' => $cpp,
        'value_per_point'   => $vpp,
        'currency'          => $cur,
    ]);
}

apiError('Invalid action');
