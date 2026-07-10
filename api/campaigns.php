<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/crypto.php';

$db     = getDB();
$action = param('action', 'list');
$input  = getInput();

// ─── List Campaigns ───────────────────────────
if ($action === 'list') {
    requireAuth();
    $sess = $_SESSION;
    $where = $sess['role'] === 'admin' ? '' : 'AND c.influencer_id = ' . (int)$sess['user_id'];

    $cfg = $db->query("SELECT * FROM points_config LIMIT 1")->fetch() ?: [
        'conversions_per_point' => 100,
        'value_per_point' => 1.000,
        'clicks_per_point' => 1000,
        'click_value_per_point' => 1.000,
        'currency' => 'BHD'
    ];
    $cpp = (int)$cfg['conversions_per_point'];
    $vpp = (float)$cfg['value_per_point'];
    $cl_cpp = (int)$cfg['clicks_per_point'];
    $cl_vpp = (float)$cfg['click_value_per_point'];
    $curr = $cfg['currency'] ?: 'BHD';

    $stmt = $db->query("
        SELECT c.*,
               p.name as product_name, p.category as product_category,
               p.price, p.currency, p.product_url, p.image_url,
               u.name as influencer_name, u.social_handle,
               IFNULL(c.platform, u.platform) as platform,
               COUNT(DISTINCT e.id) as total_clicks,
               COUNT(DISTINCT CASE WHEN e.type='conversion' THEN e.id END) as total_conversions,
               COUNT(DISTINCT CASE WHEN e.type='skip' THEN e.id END) as total_skips
        FROM campaigns c
        JOIN products p ON p.id = c.product_id
        JOIN users    u ON u.id = c.influencer_id
        LEFT JOIN events e ON e.campaign_id = c.id
        WHERE 1=1 $where
        GROUP BY c.id
        ORDER BY c.created_at DESC
    ");
    $campaigns = $stmt->fetchAll();
    foreach ($campaigns as &$c) {
        $total_clicks = (int)$c['total_clicks'];
        $total_conversions = (int)$c['total_conversions'];

        $conv_pts = $cpp > 0 ? floor($total_conversions / $cpp) : 0;
        $click_pts = $cl_cpp > 0 ? floor($total_clicks / $cl_cpp) : 0;
        
        $c['earned_amount'] = round(($conv_pts * $vpp) + ($click_pts * $cl_vpp), 3);
        $c['currency'] = $curr;
    }
    apiSuccess($campaigns);
}

// ─── Get Single Campaign ──────────────────────
if ($action === 'get') {
    requireAuth();
    $id   = (int)param('id');
    $stmt = $db->prepare("
        SELECT c.*, p.name as product_name, u.name as influencer_name
        FROM campaigns c
        JOIN products p ON p.id=c.product_id
        JOIN users u    ON u.id=c.influencer_id
        WHERE c.id=?
    ");
    $stmt->execute([$id]);
    $camp = $stmt->fetch();
    if (!$camp) apiError('Campaign not found', 404);
    // Build full landing URL
    $camp['landing_url'] = LANDING_URL . '?ref=' . $camp['ref_token'];
    apiSuccess($camp);
}

// ─── Generate Campaigns ───────────────────────
if ($action === 'generate') {
    requireAdmin();
    $productId      = (int)($input['product_id']      ?? 0);
    $discountType   = in_array($input['discount_type'] ?? 'percent', ['percent','fixed']) ? $input['discount_type'] : 'percent';
    $discountValue  = (float)($input['discount_value'] ?? 0);
    $targets        = $input['targets']                ?? [];

    // Fallback support for older parameters (array of IDs)
    if (empty($targets) && !empty($input['influencer_ids'])) {
        foreach ($input['influencer_ids'] as $infId) {
            $targets[] = ['influencer_id' => $infId, 'platform' => ''];
        }
    }

    if (!$productId)         apiError('Product is required.');
    if (empty($targets))     apiError('Select at least one influencer target.');

    // Get product
    $pStmt = $db->prepare("SELECT id,name FROM products WHERE id=? AND status='active'");
    $pStmt->execute([$productId]);
    $product = $pStmt->fetch();
    if (!$product) apiError('Product not found or inactive.');

    // Get product index for code
    $pIdxStmt = $db->query("SELECT id FROM products ORDER BY id ASC");
    $pAll     = array_column($pIdxStmt->fetchAll(), 'id');
    $pIndex   = (array_search($productId, $pAll) ?: 0) + 1;

    $created = [];
    foreach ($targets as $target) {
        $infId = (int)($target['influencer_id'] ?? 0);
        $plat  = sanitize($target['platform']     ?? '');

        // Get influencer
        $uStmt = $db->prepare("SELECT id,name,platform FROM users WHERE id=? AND role='influencer' AND status='active'");
        $uStmt->execute([$infId]);
        $inf = $uStmt->fetch();
        if (!$inf) continue;

        // Default to user's main platform if not specified
        if (!$plat) {
            $plat = $inf['platform'] ?: 'instagram';
        }

        // Check if campaign already exists for this influencer+product+platform
        $existStmt = $db->prepare("
            SELECT id FROM campaigns 
            WHERE product_id=? AND influencer_id=? AND platform=? AND status='active' 
            LIMIT 1
        ");
        $existStmt->execute([$productId, $infId, $plat]);
        if ($existStmt->fetch()) continue; // Skip if already has active campaign for this platform

        // Generate unique offer code
        $attempts = 0;
        do {
            $code = generateOfferCode($inf['name'], $pIndex);
            $dup  = $db->prepare("SELECT id FROM campaigns WHERE offer_code=?");
            $dup->execute([$code]);
            $attempts++;
        } while ($dup->fetch() && $attempts < 10);

        // Generate encrypted token
        $tokenData = [
            'campaign_id'   => null, // Will update after insert
            'influencer_id' => $infId,
            'product_id'    => $productId,
            'offer_code'    => $code,
            'platform'      => $plat,
            'ts'            => time(),
        ];
        // Temporary token (will regenerate with real campaign_id)
        $tmpToken = encryptToken($tokenData);

        $stmt = $db->prepare("INSERT INTO campaigns (product_id,influencer_id,offer_code,ref_token,discount_type,discount_value,platform,status) VALUES (?,?,?,?,?,?,?, 'active')");
        $stmt->execute([$productId,$infId,$code,$tmpToken,$discountType,$discountValue,$plat]);
        $campId = (int)$db->lastInsertId();

        // Regenerate token with real campaign_id and update
        $tokenData['campaign_id'] = $campId;
        $finalToken = encryptToken($tokenData);
        $updStmt = $db->prepare("UPDATE campaigns SET ref_token=? WHERE id=?");
        $updStmt->execute([$finalToken, $campId]);

        $created[] = [
            'campaign_id'    => $campId,
            'influencer_name'=> $inf['name'],
            'product_name'   => $product['name'],
            'offer_code'     => $code,
            'ref_token'      => $finalToken,
            'platform'       => $plat,
            'landing_url'    => LANDING_URL . '?ref=' . $finalToken,
            'discount_type'  => $discountType,
            'discount_value' => $discountValue,
        ];
    }

    if (empty($created)) apiError('No new campaigns created. Campaigns may already exist for selected influencer platforms.');
    apiSuccess($created, count($created) . ' campaign(s) generated successfully');
}

// ─── Update Campaign Status ───────────────────
if ($action === 'update_status') {
    requireAuth();
    $sess   = $_SESSION;
    $id     = (int)($input['id'] ?? 0);
    $status = in_array($input['status'] ?? '', ['active','paused']) ? $input['status'] : null;
    if ($sess['role'] === 'admin') {
        $status = in_array($input['status'] ?? '', ['active','paused','expired']) ? $input['status'] : null;
    }
    if (!$id || !$status) apiError('ID and valid status required.');

    // Enforce ownership if role is influencer
    if ($sess['role'] === 'influencer') {
        $chk = $db->prepare("SELECT id FROM campaigns WHERE id=? AND influencer_id=?");
        $chk->execute([$id, $sess['user_id']]);
        if (!$chk->fetch()) {
            apiError('Unauthorized. You do not own this campaign.', 403);
        }
    }

    $stmt = $db->prepare("UPDATE campaigns SET status=? WHERE id=?");
    $stmt->execute([$status, $id]);
    apiSuccess([], 'Campaign status updated');
}

// ─── Delete Campaign ──────────────────────────
if ($action === 'delete') {
    requireAdmin();
    $id  = (int)($input['id'] ?? 0);
    $ids = $input['ids'] ?? [];

    if (!$id && empty($ids)) {
        apiError('ID or IDs required.');
    }

    if (!empty($ids)) {
        // Safe sanitisation and query construction
        $ids = array_filter(array_map('intval', $ids));
        if (empty($ids)) apiError('Invalid IDs.');
        
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $db->prepare("DELETE FROM campaigns WHERE id IN ($placeholders)");
        $stmt->execute($ids);
        apiSuccess([], 'Selected campaigns deleted successfully');
    } else {
        $stmt = $db->prepare("DELETE FROM campaigns WHERE id=?");
        $stmt->execute([$id]);
        apiSuccess([], 'Campaign deleted');
    }
}

apiError('Invalid action');
