<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/crypto.php';

$db     = getDB();
$action = param('action', 'overview');

// ─── Overview Stats ───────────────────────────
if ($action === 'overview') {
    requireAuth();
    $sess = $_SESSION;

    if ($sess['role'] === 'admin') {
        $stats = $db->query("
            SELECT
              (SELECT COUNT(*) FROM users WHERE role='influencer' AND status='active') as total_influencers,
              (SELECT COUNT(*) FROM products WHERE status='active')                    as total_products,
              (SELECT COUNT(*) FROM campaigns WHERE status='active')                   as total_campaigns,
              (SELECT COUNT(*) FROM events WHERE type='click')                         as total_clicks,
              (SELECT COUNT(*) FROM events WHERE type='conversion')                    as total_conversions,
              (SELECT COUNT(*) FROM events WHERE type='skip')                          as total_skips
        ")->fetch();
        // Conversion rate
        $stats['conversion_rate'] = $stats['total_clicks'] > 0
            ? round(($stats['total_conversions'] / $stats['total_clicks']) * 100, 1)
            : 0;
    } else {
        $infId = (int)$sess['user_id'];
        $stats = $db->prepare("
            SELECT
              COUNT(DISTINCT c.id)                                                       as total_campaigns,
              COUNT(DISTINCT CASE WHEN e.type='click'      THEN e.id END)               as total_clicks,
              COUNT(DISTINCT CASE WHEN e.type='conversion' THEN e.id END)               as total_conversions,
              COUNT(DISTINCT CASE WHEN e.type='skip'       THEN e.id END)               as total_skips
            FROM campaigns c
            LEFT JOIN events e ON e.campaign_id = c.id
            WHERE c.influencer_id = ?
        ");
        $stats->execute([$infId]);
        $stats = $stats->fetch();
        $stats['conversion_rate'] = ($stats['total_clicks'] ?? 0) > 0
            ? round(($stats['total_conversions'] / $stats['total_clicks']) * 100, 1)
            : 0;
    }
    apiSuccess($stats);
}

// ─── Analytics by Campaign ────────────────────
if ($action === 'by_campaign') {
    requireAdmin();
    $stmt = $db->query("
        SELECT c.id, c.offer_code, c.status,
               p.name as product_name, p.category,
               u.name as influencer_name, u.social_handle, u.platform,
               COUNT(DISTINCT e.id)                                         as total_clicks,
               COUNT(DISTINCT CASE WHEN e.type='conversion' THEN e.id END)  as total_conversions,
               COUNT(DISTINCT CASE WHEN e.type='skip'       THEN e.id END)  as total_skips,
               c.created_at
        FROM campaigns c
        JOIN products p ON p.id = c.product_id
        JOIN users    u ON u.id = c.influencer_id
        LEFT JOIN events e ON e.campaign_id = c.id
        GROUP BY c.id, c.offer_code, c.status, p.name, p.category, u.name, u.social_handle, u.platform, c.created_at
        ORDER BY total_clicks DESC
    ");
    apiSuccess($stmt->fetchAll());
}

// ─── Analytics by Influencer ──────────────────
if ($action === 'by_influencer') {
    requireAdmin();
    $stmt = $db->query("
        SELECT u.id, u.name, u.social_handle, u.platform,
               COUNT(DISTINCT c.id)                                         as campaigns,
               COUNT(DISTINCT e.id)                                         as total_clicks,
               COUNT(DISTINCT CASE WHEN e.type='conversion' THEN e.id END)  as total_conversions,
               COUNT(DISTINCT CASE WHEN e.type='skip'       THEN e.id END)  as total_skips
        FROM users u
        LEFT JOIN campaigns c ON c.influencer_id = u.id
        LEFT JOIN events    e ON e.campaign_id   = c.id
        WHERE u.role='influencer'
        GROUP BY u.id, u.name, u.social_handle, u.platform
        ORDER BY total_conversions DESC
    ");
    apiSuccess($stmt->fetchAll());
}

// ─── Analytics by Product ─────────────────────
if ($action === 'by_product') {
    requireAdmin();
    $stmt = $db->query("
        SELECT p.id, p.name, p.category, p.price, p.currency,
               COUNT(DISTINCT c.id)                                         as campaigns,
               COUNT(DISTINCT e.id)                                         as total_clicks,
               COUNT(DISTINCT CASE WHEN e.type='conversion' THEN e.id END)  as total_conversions
        FROM products p
        LEFT JOIN campaigns c ON c.product_id  = p.id
        LEFT JOIN events    e ON e.campaign_id  = c.id
        GROUP BY p.id, p.name, p.category, p.price, p.currency
        ORDER BY total_conversions DESC
    ");
    apiSuccess($stmt->fetchAll());
}

// ─── Recent Events ────────────────────────────
if ($action === 'recent_events') {
    requireAdmin();
    $limit = (int)param('limit', 20);
    $stmt  = $db->prepare("
        SELECT e.*, c.offer_code, p.name as product_name, u.name as influencer_name
        FROM events e
        JOIN campaigns c ON c.id = e.campaign_id
        JOIN products  p ON p.id = c.product_id
        JOIN users     u ON u.id = c.influencer_id
        ORDER BY e.timestamp DESC
        LIMIT ?
    ");
    $stmt->execute([$limit]);
    apiSuccess($stmt->fetchAll());
}

// ─── Chart data: clicks over time ─────────────
if ($action === 'chart_daily') {
    requireAdmin();
    $days  = (int)param('days', 30);
    $stmt  = $db->prepare("
        SELECT DATE(timestamp) as date,
               COUNT(CASE WHEN type='click'      THEN 1 END) as clicks,
               COUNT(CASE WHEN type='conversion' THEN 1 END) as conversions
        FROM events
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
    ");
    $stmt->execute([$days]);
    apiSuccess($stmt->fetchAll());
}

// ─── Visitor Leads Report ─────────────────────
if ($action === 'visitor_leads') {
    requireAdmin();
    $productId = (int)param('product_id', 0);
    $where = '';
    $params = [];
    if ($productId > 0) {
        $where = ' AND c.product_id = ?';
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
        WHERE e.type = 'conversion' $where
        ORDER BY e.timestamp DESC
    ");
    $stmt->execute($params);
    apiSuccess($stmt->fetchAll());
}

apiError('Invalid action');
