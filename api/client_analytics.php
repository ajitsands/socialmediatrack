<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';

// Protect: Client or Admin roles allowed
requireAuth();
$sess = $_SESSION;
if ($sess['role'] !== 'client' && $sess['role'] !== 'admin') {
    apiError('Access denied.', 403);
}

// If admin visits, they can pass a client_id; otherwise, use the logged-in client's ID
$clientId = $sess['role'] === 'client' ? (int)$sess['user_id'] : (int)param('client_id', 0);
if (!$clientId) {
    apiError('Client ID required.', 400);
}

$db     = getDB();
$action = param('action', 'overview');

// ─── Overview Stats ───────────────────────────
if ($action === 'overview') {
    // 1. Get Client Wallet Balance
    $userStmt = $db->prepare("SELECT wallet_balance FROM users WHERE id = ?");
    $userStmt->execute([$clientId]);
    $balance = (float)$userStmt->fetchColumn();

    // 2. Get Product Counts
    $prodStmt = $db->prepare("SELECT COUNT(*) FROM products WHERE client_id = ? AND status = 'active'");
    $prodStmt->execute([$clientId]);
    $activeProducts = (int)$prodStmt->fetchColumn();

    // 3. Get Campaign and Event aggregates for this client's products
    $stmt = $db->prepare("
        SELECT 
            COUNT(DISTINCT c.influencer_id) as engaged_influencers,
            COUNT(DISTINCT c.id)            as active_campaigns,
            COUNT(CASE WHEN e.type = 'click' THEN 1 END) as total_clicks,
            COUNT(CASE WHEN e.type = 'conversion' THEN 1 END) as total_conversions
        FROM campaigns c
        JOIN products p ON p.id = c.product_id
        LEFT JOIN events e ON e.campaign_id = c.id
        WHERE p.client_id = ?
    ");
    $stmt->execute([$clientId]);
    $aggregates = $stmt->fetch();

    $clicks = (int)($aggregates['total_clicks'] ?? 0);
    $convs  = (int)($aggregates['total_conversions'] ?? 0);
    $convRate = $clicks > 0 ? round(($convs / $clicks) * 100, 1) : 0;

    apiSuccess([
        'wallet_balance'      => $balance,
        'active_products'     => $activeProducts,
        'engaged_influencers' => (int)($aggregates['engaged_influencers'] ?? 0),
        'total_clicks'        => $clicks,
        'total_conversions'   => $convs,
        'conversion_rate'     => $convRate . '%'
    ]);
}

// ─── Product Performance ──────────────────────
if ($action === 'by_product') {
    $stmt = $db->prepare("
        SELECT p.id, p.name, p.category, p.price, p.currency, p.cpc_rate, p.cpl_rate,
               COUNT(DISTINCT c.id) as campaigns_count,
               COUNT(CASE WHEN e.type = 'click' THEN 1 END) as total_clicks,
               COUNT(CASE WHEN e.type = 'conversion' THEN 1 END) as total_conversions
        FROM products p
        LEFT JOIN campaigns c ON c.product_id = p.id
        LEFT JOIN events e ON e.campaign_id = c.id
        WHERE p.client_id = ?
        GROUP BY p.id, p.name, p.category, p.price, p.currency, p.cpc_rate, p.cpl_rate
        ORDER BY total_conversions DESC
    ");
    $stmt->execute([$clientId]);
    apiSuccess($stmt->fetchAll());
}

// ─── Best Performing Influencers ──────────────
if ($action === 'by_influencer') {
    $stmt = $db->prepare("
        SELECT u.id, u.name, u.social_handle,
               COUNT(DISTINCT c.id) as campaigns_count,
               COUNT(CASE WHEN e.type = 'click' THEN 1 END) as total_clicks,
               COUNT(CASE WHEN e.type = 'conversion' THEN 1 END) as total_conversions
        FROM users u
        JOIN campaigns c ON c.influencer_id = u.id
        JOIN products p ON p.id = c.product_id
        LEFT JOIN events e ON e.campaign_id = c.id
        WHERE p.client_id = ?
        GROUP BY u.id, u.name, u.social_handle
        ORDER BY total_conversions DESC
    ");
    $stmt->execute([$clientId]);
    apiSuccess($stmt->fetchAll());
}

// ─── Visitor Lead Log (conversions) ───────────
if ($action === 'visitor_leads') {
    $productId = (int)param('product_id', 0);
    $where = '';
    $params = [$clientId];
    if ($productId > 0) {
        $where = ' AND p.id = ?';
        $params[] = $productId;
    }

    $stmt = $db->prepare("
        SELECT e.id, e.visitor_name, e.visitor_phone, e.visitor_country_code, e.timestamp,
               c.offer_code, IFNULL(c.platform, u.platform) as platform,
               p.name as product_name, p.id as product_id,
               u.name as influencer_name
        FROM events e
        JOIN campaigns c ON c.id = e.campaign_id
        JOIN products  p ON p.id = c.product_id
        JOIN users     u ON u.id = c.influencer_id
        WHERE e.type = 'conversion' AND p.client_id = ? $where
        ORDER BY e.timestamp DESC
    ");
    $stmt->execute($params);
    apiSuccess($stmt->fetchAll());
}

// ─── Wallet / Ledger Transaction History ──────
if ($action === 'wallet_history') {
    $stmt = $db->prepare("
        SELECT id, amount, type, payment_method, note, created_at
        FROM client_wallet_transactions
        WHERE client_id = ?
        ORDER BY created_at DESC
    ");
    $stmt->execute([$clientId]);
    apiSuccess($stmt->fetchAll());
}

apiError('Invalid action');
