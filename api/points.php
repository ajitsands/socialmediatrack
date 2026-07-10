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
    apiSuccess($cfg ?: [
        'conversions_per_point' => 100,
        'value_per_point' => 1.000,
        'clicks_per_point' => 1000,
        'click_value_per_point' => 1.000,
        'vendor_clicks_per_point' => 1000,
        'vendor_click_value_per_point' => 1.000,
        'vendor_conversions_per_point' => 100,
        'vendor_conversion_value_per_point' => 2.000,
        'currency' => 'BHD'
    ]);
}

// ─── Update Points Config ─────────────────────
if ($action === 'update_config') {
    requireAdmin();
    $cpp  = max(1, (int)($input['conversions_per_point'] ?? 100));
    $vpp  = max(0.001, (float)($input['value_per_point'] ?? 1));
    $clpp  = max(1, (int)($input['clicks_per_point'] ?? 1000));
    $clvpp = max(0.001, (float)($input['click_value_per_point'] ?? 1));
    $v_clpp = max(1, (int)($input['vendor_clicks_per_point'] ?? 1000));
    $v_clvpp = max(0.001, (float)($input['vendor_click_value_per_point'] ?? 1));
    $v_cpp  = max(1, (int)($input['vendor_conversions_per_point'] ?? 100));
    $v_cvpp = max(0.001, (float)($input['vendor_conversion_value_per_point'] ?? 2));
    $curr = sanitize($input['currency'] ?? 'BHD');

    $exists = $db->query("SELECT id FROM points_config LIMIT 1")->fetch();
    if ($exists) {
        $db->prepare("UPDATE points_config SET conversions_per_point=?,value_per_point=?,clicks_per_point=?,click_value_per_point=?,vendor_clicks_per_point=?,vendor_click_value_per_point=?,vendor_conversions_per_point=?,vendor_conversion_value_per_point=?,currency=?")->execute([$cpp,$vpp,$clpp,$clvpp,$v_clpp,$v_clvpp,$v_cpp,$v_cvpp,$curr]);
    } else {
        $db->prepare("INSERT INTO points_config (conversions_per_point,value_per_point,clicks_per_point,click_value_per_point,vendor_clicks_per_point,vendor_click_value_per_point,vendor_conversions_per_point,vendor_conversion_value_per_point,currency) VALUES (?,?,?,?,?,?,?,?,?)")->execute([$cpp,$vpp,$clpp,$clvpp,$v_clpp,$v_clvpp,$v_cpp,$v_cvpp,$curr]);
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
               COUNT(CASE WHEN e.type='click' THEN 1 END) as total_clicks,
               (SELECT conversions_per_point FROM points_config LIMIT 1) as cpp,
               (SELECT value_per_point       FROM points_config LIMIT 1) as vpp,
               (SELECT clicks_per_point      FROM points_config LIMIT 1) as cl_cpp,
               (SELECT click_value_per_point FROM points_config LIMIT 1) as cl_vpp,
               (SELECT currency              FROM points_config LIMIT 1) as currency
        FROM users u
        LEFT JOIN campaigns c ON c.influencer_id = u.id
        LEFT JOIN events    e ON e.campaign_id   = c.id
        WHERE u.role = 'influencer'
        GROUP BY u.id
    ");
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $cpp = $r['cpp'] > 0 ? (int)$r['cpp'] : 100;
        $vpp = (float)$r['vpp'];
        $cl_cpp = $r['cl_cpp'] > 0 ? (int)$r['cl_cpp'] : 1000;
        $cl_vpp = (float)$r['cl_vpp'];
        
        $conv_pts = floor($r['total_conversions'] / $cpp);
        $click_pts = floor($r['total_clicks'] / $cl_cpp);
        
        $r['total_points']   = $conv_pts + $click_pts;
        $r['total_earnings'] = round(($conv_pts * $vpp) + ($click_pts * $cl_vpp), 3);
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
    $cl_cpp = $cfg && isset($cfg['clicks_per_point']) ? (int)$cfg['clicks_per_point'] : 1000;
    $cl_vpp = $cfg && isset($cfg['click_value_per_point']) ? (float)$cfg['click_value_per_point'] : 1;
    $cur = $cfg ? $cfg['currency'] : 'BHD';

    $convStmt = $db->prepare("
        SELECT COUNT(e.id) as total_conversions
        FROM events e
        JOIN campaigns c ON c.id = e.campaign_id
        WHERE c.influencer_id=? AND e.type='conversion'
    ");
    $convStmt->execute([$infId]);
    $total_conversions = (int)$convStmt->fetchColumn();

    $clickStmt = $db->prepare("
        SELECT COUNT(e.id) as total_clicks
        FROM events e
        JOIN campaigns c ON c.id = e.campaign_id
        WHERE c.influencer_id=? AND e.type='click'
    ");
    $clickStmt->execute([$infId]);
    $total_clicks = (int)$clickStmt->fetchColumn();

    $conv_points  = $cpp > 0 ? floor($total_conversions / $cpp) : 0;
    $click_points = $cl_cpp > 0 ? floor($total_clicks / $cl_cpp) : 0;
    $total_points = $conv_points + $click_points;
    $total_earnings = round(($conv_points * $vpp) + ($click_points * $cl_vpp), 3);

    // Paid amount
    $paidStmt = $db->prepare("SELECT COALESCE(SUM(amount),0) as paid FROM wallet_transactions WHERE influencer_id=? AND type='debit' AND status='paid'");
    $paidStmt->execute([$infId]);
    $paid = (float)$paidStmt->fetchColumn();

    apiSuccess([
        'total_conversions' => $total_conversions,
        'total_clicks'      => $total_clicks,
        'total_points'      => $total_points,
        'total_earnings'    => $total_earnings,
        'paid_amount'       => $paid,
        'pending_amount'    => round($total_earnings - $paid, 3),
        'conversions_per_point' => $cpp,
        'value_per_point'   => $vpp,
        'clicks_per_point'  => $cl_cpp,
        'click_value_per_point' => $cl_vpp,
        'currency'          => $cur,
    ]);
}

apiError('Invalid action');
