<?php
// ─────────────────────────────────────────────
//  Landing Page API
//  Public endpoint — no auth required
//  Handles tracking clicks, conversions, skips
// ─────────────────────────────────────────────
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/crypto.php';

// Read action + input — POST body takes priority (bypasses suhosin/server GET filtering)
$input  = getInput();
$action = $input['action'] ?? param('action', 'info');

// Helper: read ref from POST body first, then GET, then raw QUERY_STRING
function getRef(array $input): string {
    // 1. POST body (most reliable on restricted servers)
    if (!empty($input['ref'])) return $input['ref'];
    // 2. GET param
    if (!empty($_GET['ref'])) return $_GET['ref'];
    // 3. Raw QUERY_STRING fallback (some CGI configs don't populate $_GET)
    $qs = $_SERVER['QUERY_STRING'] ?? '';
    if ($qs && preg_match('/(?:^|&)ref=([^&]+)/', $qs, $m)) {
        return urldecode($m[1]);
    }
    return '';
}

// Helper: get IP hash
function getIpHash(): string {
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP']
       ?? $_SERVER['HTTP_X_FORWARDED_FOR']
       ?? $_SERVER['REMOTE_ADDR']
       ?? '0.0.0.0';
    return hash('sha256', $ip);
}

// ─── Get Campaign Info from ref token ─────────
if ($action === 'info') {
    $ref = getRef($input);
    if (!$ref) apiError('Invalid link — missing reference token.', 400);

    // Check openssl is available
    if (!function_exists('openssl_decrypt')) {
        apiError('Server error: openssl extension not available. Please enable it in cPanel PHP Extensions.', 500);
    }


    $db   = getDB();
    $data = decryptToken($ref);
    if (!$data || empty($data['campaign_id'])) {
        apiError('Invalid or expired tracking link.', 400);
    }

    $campaignId = (int)$data['campaign_id'];
    $stmt = $db->prepare("
        SELECT c.id, c.offer_code, c.discount_type, c.discount_value, c.status,
               p.name as product_name, p.description as product_desc,
               p.price, p.currency, p.image_url, p.product_url, p.demo_url,
               p.category,
               u.name as influencer_name, u.social_handle, IFNULL(c.platform, u.platform) as platform
        FROM campaigns c
        JOIN products p ON p.id = c.product_id
        JOIN users    u ON u.id = c.influencer_id
        WHERE c.id = ?
    ");
    $stmt->execute([$campaignId]);
    $campaign = $stmt->fetch();

    if (!$campaign) apiError('Campaign not found.', 404);
    if ($campaign['status'] !== 'active') apiError('This promotional link has expired.', 410);

    // Stats
    $cStats = $db->prepare("SELECT COUNT(CASE WHEN type='click' THEN 1 END) as clicks, COUNT(CASE WHEN type='conversion' THEN 1 END) as conversions FROM events WHERE campaign_id=?");
    $cStats->execute([$campaignId]);
    $stats = $cStats->fetch();

    apiSuccess(array_merge($campaign, [
        'total_clicks'      => (int)$stats['clicks'],
        'total_conversions' => (int)$stats['conversions'],
    ]));
}

// ─── Record Click ─────────────────────────────
if ($action === 'click') {
    $ref = $input['ref'] ?? param('ref', '');
    if (!$ref) apiError('Missing ref token.');

    $data = decryptToken($ref);
    if (!$data || empty($data['campaign_id'])) apiError('Invalid tracking link.');

    $campaignId = (int)$data['campaign_id'];

    // Record click event
    $ipHash = getIpHash();
    $ua     = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);

    $db = getDB();
    $stmt = $db->prepare("INSERT INTO events (campaign_id, type, ip_hash, user_agent) VALUES (?, 'click', ?, ?)");
    $stmt->execute([$campaignId, $ipHash, $ua]);

    // Return updated click count
    $cnt = $db->prepare("SELECT COUNT(*) FROM events WHERE campaign_id=? AND type='click'");
    $cnt->execute([$campaignId]);
    apiSuccess(['click_count' => (int)$cnt->fetchColumn()], 'Click recorded');
}

// ─── Record Conversion (form submitted) ───────
if ($action === 'convert') {
    $ref         = $input['ref']          ?? '';
    $visitorName = sanitize($input['visitor_name']         ?? '');
    $visitorPhone= sanitize($input['visitor_phone']        ?? '');
    $countryCode = sanitize($input['visitor_country_code'] ?? '');
    $promoCode   = sanitize($input['promo_code']           ?? '');

    if (!$ref) apiError('Missing ref token.');

    $data = decryptToken($ref);
    if (!$data || empty($data['campaign_id'])) apiError('Invalid tracking link.');

    $campaignId = (int)$data['campaign_id'];

    // Get campaign to return redirect URL
    $db   = getDB();
    $stmt = $db->prepare("SELECT c.offer_code, c.discount_value, c.discount_type, p.product_url, p.demo_url FROM campaigns c JOIN products p ON p.id=c.product_id WHERE c.id=? AND c.status='active'");
    $stmt->execute([$campaignId]);
    $camp = $stmt->fetch();
    if (!$camp) apiError('Campaign not found or inactive.');

    // Insert conversion event
    $ipHash = getIpHash();
    $ua     = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);

    $ins = $db->prepare("INSERT INTO events (campaign_id,type,visitor_name,visitor_phone,visitor_country_code,promo_entered,ip_hash,user_agent) VALUES (?,'conversion',?,?,?,?,?,?)");
    $ins->execute([$campaignId, $visitorName, $visitorPhone, $countryCode, $promoCode ?: $camp['offer_code'], $ipHash, $ua]);

    // Auto-credit points check
    $cfg = $db->query("SELECT * FROM points_config LIMIT 1")->fetch();
    if ($cfg) {
        $cpp = (int)$cfg['conversions_per_point'];
        // Get influencer_id
        $infStmt = $db->prepare("SELECT influencer_id FROM campaigns WHERE id=?");
        $infStmt->execute([$campaignId]);
        $infId = (int)$infStmt->fetchColumn();

        // Count conversions for this influencer
        $convCnt = $db->prepare("SELECT COUNT(*) FROM events e JOIN campaigns c ON c.id=e.campaign_id WHERE c.influencer_id=? AND e.type='conversion'");
        $convCnt->execute([$infId]);
        $total = (int)$convCnt->fetchColumn();

        // Check if we crossed a new point threshold — auto-credit a pending wallet entry
        if ($cpp > 0 && $total % $cpp === 0 && $total > 0) {
            $creditPts = 1;
            $creditAmt = round($creditPts * (float)$cfg['value_per_point'], 3);
            $db->prepare("INSERT INTO wallet_transactions (influencer_id,campaign_id,points,amount,type,status,note) VALUES (?,?,?,?,'credit','pending','Auto-credited for reaching conversion milestone')")
               ->execute([$infId, $campaignId, $creditPts, $creditAmt]);
        }
    }

    // Build redirect URL with discount info
    $redirectUrl = $camp['product_url'] ?: '#';
    if ($redirectUrl && $camp['discount_value'] > 0) {
        $sep = str_contains($redirectUrl, '?') ? '&' : '?';
        $redirectUrl .= "{$sep}promo={$camp['offer_code']}&discount={$camp['discount_value']}";
    }

    apiSuccess(['redirect_url' => $redirectUrl, 'offer_code' => $camp['offer_code']], 'Conversion recorded');
}

// ─── Record Skip ──────────────────────────────
if ($action === 'skip') {
    $ref = $input['ref'] ?? '';
    if (!$ref) apiError('Missing ref token.');

    $data = decryptToken($ref);
    if (!$data || empty($data['campaign_id'])) apiError('Invalid tracking link.');

    $campaignId = (int)$data['campaign_id'];

    $db   = getDB();
    $stmt = $db->prepare("SELECT p.product_url, p.demo_url FROM campaigns c JOIN products p ON p.id=c.product_id WHERE c.id=?");
    $stmt->execute([$campaignId]);
    $camp = $stmt->fetch();

    $ipHash = getIpHash();
    $ua     = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);
    $db->prepare("INSERT INTO events (campaign_id,type,ip_hash,user_agent) VALUES (?,'skip',?,?)")->execute([$campaignId,$ipHash,$ua]);

    apiSuccess([
        'redirect_url' => $camp['product_url']  ?? '#',
        'demo_url'     => $camp['demo_url']      ?? '',
    ], 'Skip recorded');
}

apiError('Invalid action');
