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
               COUNT(DISTINCT CASE WHEN e.type='click' THEN e.id END)        as total_clicks,
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
               COUNT(DISTINCT CASE WHEN e.type='click' THEN e.id END)        as total_clicks,
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
               COUNT(DISTINCT CASE WHEN e.type='click' THEN e.id END)        as total_clicks,
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
    $dateFrom = param('date_from', '');
    $dateTo   = param('date_to', '');

    $where = '';
    $params = [];
    if (!empty($dateFrom)) {
        $where .= " AND e.timestamp >= ?";
        $params[] = $dateFrom . ' 00:00:00';
    }
    if (!empty($dateTo)) {
        $where .= " AND e.timestamp <= ?";
        $params[] = $dateTo . ' 23:59:59';
    }

    $sql = "
        SELECT e.*, c.offer_code, p.name as product_name, u.name as influencer_name
        FROM events e
        JOIN campaigns c ON c.id = e.campaign_id
        JOIN products  p ON p.id = c.product_id
        JOIN users     u ON u.id = c.influencer_id
        WHERE 1=1 $where
        ORDER BY e.timestamp DESC
    ";

    if (empty($dateFrom) && empty($dateTo)) {
        $sql .= " LIMIT ?";
        $params[] = $limit;
    } else {
        $sql .= " LIMIT 1000";
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
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

// ─── Full Insights Dashboard ──────────────────
if ($action === 'insights') {
    requireAdmin();
    $dateFrom     = param('date_from', '');
    $dateTo       = param('date_to', '');
    $clientId     = (int)param('client_id', 0);
    $influencerId = (int)param('influencer_id', 0);

    // 1. Get configs for pro-rata rates fallback
    $cfg = $db->query("SELECT * FROM points_config LIMIT 1")->fetch() ?: [
        'conversions_per_point' => 100,
        'value_per_point' => 1.000,
        'clicks_per_point' => 1000,
        'click_value_per_point' => 1.000,
        'vendor_clicks_per_point' => 1000,
        'vendor_click_value_per_point' => 1.000,
        'vendor_conversions_per_point' => 100,
        'vendor_conversion_value_per_point' => 2.000,
        'currency' => 'BHD'
    ];

    $cl_cpp   = (int)($cfg['clicks_per_point'] ?? 1000);
    $cl_vpp   = (float)($cfg['click_value_per_point'] ?? 1.000);
    $cpp      = (int)($cfg['conversions_per_point'] ?? 100);
    $vpp      = (float)($cfg['value_per_point'] ?? 1.000);

    $v_cl_cpp = (int)($cfg['vendor_clicks_per_point'] ?? 1000);
    $v_cl_vpp = (float)($cfg['vendor_click_value_per_point'] ?? 1.000);
    $v_cpp    = (int)($cfg['vendor_conversions_per_point'] ?? 100);
    $v_cvpp   = (float)($cfg['vendor_conversion_value_per_point'] ?? 2.000);

    $fallback_cl_cpc = $v_cl_cpp > 0 ? ($v_cl_vpp / $v_cl_cpp) : 0.000;
    $fallback_cl_cpl = $v_cpp > 0 ? ($v_cvpp / $v_cpp) : 0.000;
    
    $fallback_inf_cpc = $cl_cpp > 0 ? ($cl_vpp / $cl_cpp) : 0.000;
    $fallback_inf_cpl = $cpp > 0 ? ($vpp / $cpp) : 0.000;

    // 2. Fetch matching events
    $where = [];
    $params = [];

    if (!empty($dateFrom)) {
        $where[] = "DATE(e.timestamp) >= ?";
        $params[] = $dateFrom;
    }
    if (!empty($dateTo)) {
        $where[] = "DATE(e.timestamp) <= ?";
        $params[] = $dateTo;
    }
    if ($clientId > 0) {
        $where[] = "p.client_id = ?";
        $params[] = $clientId;
    }
    if ($influencerId > 0) {
        $where[] = "c.influencer_id = ?";
        $params[] = $influencerId;
    }

    $whereStr = $where ? 'AND ' . implode(' AND ', $where) : '';

    $sql = "
        SELECT e.id, e.type, e.timestamp,
               c.offer_code, c.influencer_id,
               p.name as product_name, p.client_id,
               p.cpc_rate, p.cpl_rate,
               u.name as influencer_name,
               cl.name as client_name
        FROM events e
        JOIN campaigns c ON c.id = e.campaign_id
        JOIN products  p ON p.id = c.product_id
        JOIN users     u ON u.id = c.influencer_id
        JOIN users     cl ON cl.id = p.client_id
        WHERE e.type IN ('click', 'conversion') $whereStr
        ORDER BY e.timestamp DESC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $events = $stmt->fetchAll();

    // 3. Process events to build transaction list & aggregate stats
    $txs = [];
    $totalClientCharge = 0;
    $totalInfluencerPayout = 0;
    $clicksCount = 0;
    $conversionsCount = 0;

    $infStats = []; // to track earnings grouped by influencer

    foreach ($events as $e) {
        $cpc_rate = (float)$e['cpc_rate'];
        $cpl_rate = (float)$e['cpl_rate'];

        $clientCut = 0;
        $influencerCut = 0;

        if ($e['type'] === 'click') {
            $clicksCount++;
            $clientCut = $cpc_rate > 0 ? $cpc_rate : $fallback_cl_cpc;
            $influencerCut = $cpc_rate > 0 ? $cpc_rate : $fallback_inf_cpc;
        } else if ($e['type'] === 'conversion') {
            $conversionsCount++;
            $clientCut = $cpl_rate > 0 ? $cpl_rate : $fallback_cl_cpl;
            $influencerCut = $cpl_rate > 0 ? $cpl_rate : $fallback_inf_cpl;
        }

        $profit = $clientCut - $influencerCut;

        $totalClientCharge += $clientCut;
        $totalInfluencerPayout += $influencerCut;

        $infId = (int)$e['influencer_id'];
        if (!isset($infStats[$infId])) {
            $infStats[$infId] = [
                'influencer_id' => $infId,
                'name' => $e['influencer_name'],
                'clicks' => 0,
                'conversions' => 0,
                'earnings' => 0.000
            ];
        }

        if ($e['type'] === 'click') {
            $infStats[$infId]['clicks']++;
        } else {
            $infStats[$infId]['conversions']++;
        }
        $infStats[$infId]['earnings'] += $influencerCut;

        $txs[] = [
            'id' => $e['id'],
            'timestamp' => $e['timestamp'],
            'type' => $e['type'],
            'client_name' => $e['client_name'],
            'influencer_name' => $e['influencer_name'],
            'product_name' => $e['product_name'] . ' (' . $e['offer_code'] . ')',
            'client_cut' => round($clientCut, 3),
            'influencer_cut' => round($influencerCut, 3),
            'profit' => round($profit, 3)
        ];
    }

    // 4. Query Running Campaigns Count (with filters)
    $campWhere = ["c.status = 'active'"];
    $campParams = [];
    if ($clientId > 0) {
        $campWhere[] = "p.client_id = ?";
        $campParams[] = $clientId;
    }
    if ($influencerId > 0) {
        $campWhere[] = "c.influencer_id = ?";
        $campParams[] = $influencerId;
    }
    $campWhereStr = implode(' AND ', $campWhere);
    $campStmt = $db->prepare("
        SELECT COUNT(*) 
        FROM campaigns c
        JOIN products p ON p.id = c.product_id
        WHERE $campWhereStr
    ");
    $campStmt->execute($campParams);
    $runningCampaigns = (int)$campStmt->fetchColumn();

    // 5. Query Active Clients with Positive Wallet Balance & details
    $clientWhere = ["role = 'client'", "status = 'active'"];
    $clientParams = [];
    if ($clientId > 0) {
        $clientWhere[] = "id = ?";
        $clientParams[] = $clientId;
    }
    $clientWhereStr = implode(' AND ', $clientWhere);
    
    $fundedCountStmt = $db->prepare("SELECT COUNT(*) FROM users WHERE $clientWhereStr AND wallet_balance > 0");
    $fundedCountStmt->execute($clientParams);
    $clientsWithBalance = (int)$fundedCountStmt->fetchColumn();

    $sumStmt = $db->prepare("SELECT SUM(wallet_balance) FROM users WHERE $clientWhereStr");
    $sumStmt->execute($clientParams);
    $totalClientsBalance = round((float)$sumStmt->fetchColumn(), 3);

    $clientsStmt = $db->prepare("
        SELECT id, name, company_category, wallet_balance 
        FROM users 
        WHERE $clientWhereStr
        ORDER BY wallet_balance DESC
    ");
    $clientsStmt->execute($clientParams);
    $clientsSummary = $clientsStmt->fetchAll();
    foreach ($clientsSummary as &$cl) {
        $cl['wallet_balance'] = round((float)$cl['wallet_balance'], 3);
    }

    apiSuccess([
        'stats' => [
            'running_campaigns' => $runningCampaigns,
            'clients_with_balance' => $clientsWithBalance,
            'total_clients_balance' => $totalClientsBalance,
            'total_client_charge' => round($totalClientCharge, 3),
            'total_influencer_payout' => round($totalInfluencerPayout, 3),
            'total_admin_profit' => round($totalClientCharge - $totalInfluencerPayout, 3),
            'clicks_count' => $clicksCount,
            'conversions_count' => $conversionsCount
        ],
        'influencers_summary' => array_values($infStats),
        'clients_summary' => $clientsSummary,
        'transactions' => $txs
    ]);
}

apiError('Invalid action');
