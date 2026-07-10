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
               p.category, p.client_id, cl.wallet_balance as client_balance,
               u.name as influencer_name, u.social_handle, IFNULL(c.platform, u.platform) as platform
        FROM campaigns c
        JOIN products p ON p.id = c.product_id
        LEFT JOIN users cl ON cl.id = p.client_id AND cl.role = 'client'
        JOIN users    u ON u.id = c.influencer_id
        WHERE c.id = ?
    ");
    $stmt->execute([$campaignId]);
    $campaign = $stmt->fetch();

    if (!$campaign) apiError('Campaign not found.', 404);
    if ($campaign['status'] !== 'active') apiError('This promotional link has expired.', 410);

    // Check client balance limit: 0.100 BHD
    if ($campaign['client_id'] !== null && (float)$campaign['client_balance'] < 0.100) {
        apiError('This promotional link has expired.', 410);
    }

    // Stats
    $cStats = $db->prepare("SELECT COUNT(CASE WHEN type='click' THEN 1 END) as clicks, COUNT(CASE WHEN type='conversion' THEN 1 END) as conversions FROM events WHERE campaign_id=?");
    $cStats->execute([$campaignId]);
    $stats = $cStats->fetch();

    // Check if already converted in current session
    $alreadyConverted = !empty($_SESSION['converted_' . $campaignId]);

    // Check if already clicked in current session or 2-hour IP window
    $alreadyClicked = !empty($_SESSION['clicked_' . $campaignId]);
    if (!$alreadyClicked) {
        $twoHoursAgo = date('Y-m-d H:i:s', time() - 7200);
        $ipHash = getIpHash();
        $ipCheck = $db->prepare("SELECT id FROM events WHERE campaign_id = ? AND type = 'click' AND ip_hash = ? AND timestamp >= ? LIMIT 1");
        $ipCheck->execute([$campaignId, $ipHash, $twoHoursAgo]);
        if ($ipCheck->fetch()) {
            $alreadyClicked = true;
        }
    }

    apiSuccess(array_merge($campaign, [
        'total_clicks'      => (int)$stats['clicks'],
        'total_conversions' => (int)$stats['conversions'],
        'already_converted' => $alreadyConverted,
        'already_clicked'   => $alreadyClicked,
    ]));
}

// ─── Record Click ─────────────────────────────
if ($action === 'click') {
    $ref = $input['ref'] ?? param('ref', '');
    if (!$ref) apiError('Missing ref token.');

    $data = decryptToken($ref);
    if (!$data || empty($data['campaign_id'])) apiError('Invalid tracking link.');

    $campaignId = (int)$data['campaign_id'];

    // Deduplicate clicks using active PHP session AND IP address within last 2 hours
    $sessionKey = 'clicked_' . $campaignId;
    $db = getDB();
    
    $alreadyClicked = !empty($_SESSION[$sessionKey]);
    $ipHash = getIpHash();

    if (!$alreadyClicked) {
        // Also check database if this IP has clicked this campaign in the last 2 hours (7200 seconds)
        // Using database-agnostic comparison for portability (MySQL / SQLite compatible)
        $twoHoursAgo = date('Y-m-d H:i:s', time() - 7200);
        $ipCheck = $db->prepare("
            SELECT id FROM events 
            WHERE campaign_id = ? AND type = 'click' AND ip_hash = ? AND timestamp >= ? 
            LIMIT 1
        ");
        $ipCheck->execute([$campaignId, $ipHash, $twoHoursAgo]);
        if ($ipCheck->fetch()) {
            $alreadyClicked = true;
        }
    }

    if (!$alreadyClicked) {
        $_SESSION[$sessionKey] = true;
        
        // Record click event
        $ua     = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);

        $stmt = $db->prepare("INSERT INTO events (campaign_id, type, ip_hash, user_agent) VALUES (?, 'click', ?, ?)");
        $stmt->execute([$campaignId, $ipHash, $ua]);

        // Client Wallet CPC Deduction
        $stmtRate = $db->prepare("
            SELECT p.client_id, p.cpc_rate, p.name as product_name, cl.wallet_balance
            FROM campaigns c
            JOIN products p ON p.id = c.product_id
            LEFT JOIN users cl ON cl.id = p.client_id AND cl.role = 'client'
            WHERE c.id = ?
        ");
        $stmtRate->execute([$campaignId]);
        $prodRate = $stmtRate->fetch();

        if ($prodRate && $prodRate['client_id'] !== null) {
            $cfg = $db->query("SELECT * FROM points_config LIMIT 1")->fetch();
            $cpc = 0.000;
            if ($cfg && isset($cfg['vendor_clicks_per_point']) && (int)$cfg['vendor_clicks_per_point'] > 0) {
                $cpc = round((float)$cfg['vendor_click_value_per_point'] / (int)$cfg['vendor_clicks_per_point'], 3);
            } else {
                $cpc = (float)$prodRate['cpc_rate'];
            }

            if ($cpc > 0 && (float)$prodRate['wallet_balance'] >= 0.100) {
                try {
                    $db->beginTransaction();
                    $db->prepare("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?")->execute([$cpc, $prodRate['client_id']]);
                    $db->prepare("INSERT INTO client_wallet_transactions (client_id, amount, type, payment_method, note) VALUES (?, ?, 'debit', 'system', ?)") 
                       ->execute([$prodRate['client_id'], $cpc, 'CPC Click: ' . ($prodRate['product_name'] ?? 'Campaign #' . $campaignId)]);
                    $db->commit();
                } catch (Exception $e) {
                    $db->rollBack();
                }
            }
        }

        // Auto-credit click points check
        $cfg = $db->query("SELECT * FROM points_config LIMIT 1")->fetch();
        if ($cfg && isset($cfg['clicks_per_point'])) {
            $clpp = (int)$cfg['clicks_per_point'];
            if ($clpp > 0) {
                // Get influencer_id
                $infStmt = $db->prepare("SELECT influencer_id FROM campaigns WHERE id=?");
                $infStmt->execute([$campaignId]);
                $infId = (int)$infStmt->fetchColumn();

                // Count clicks for this influencer
                $clickCnt = $db->prepare("SELECT COUNT(*) FROM events e JOIN campaigns c ON c.id=e.campaign_id WHERE c.influencer_id=? AND e.type='click'");
                $clickCnt->execute([$infId]);
                $totalClicks = (int)$clickCnt->fetchColumn();

                if ($totalClicks % $clpp === 0 && $totalClicks > 0) {
                    $creditPts = 1;
                    $creditAmt = round($creditPts * (float)$cfg['click_value_per_point'], 3);
                    $db->prepare("INSERT INTO wallet_transactions (influencer_id,campaign_id,points,amount,type,status,note) VALUES (?,?,?,?,'credit','pending','Auto-credited for reaching click milestone')")
                       ->execute([$infId, $campaignId, $creditPts, $creditAmt]);
                }
            }
        }
    }

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
    $stmt = $db->prepare("SELECT p.name as product_name, c.offer_code, c.discount_value, c.discount_type, p.product_url, p.demo_url, p.client_id, p.cpl_rate, cl.wallet_balance FROM campaigns c JOIN products p ON p.id=c.product_id LEFT JOIN users cl ON cl.id = p.client_id AND cl.role = 'client' WHERE c.id=? AND c.status='active'");
    $stmt->execute([$campaignId]);
    $camp = $stmt->fetch();
    if (!$camp) apiError('Campaign not found or inactive.');

    // Check client balance limit: 0.100 BHD
    if ($camp['client_id'] !== null && (float)$camp['wallet_balance'] < 0.100) {
        apiError('This promotional link has expired.', 410);
    }

    // Build redirect URL
    $redirectUrl = $camp['product_url'] ?: '#';
    if ($redirectUrl && $camp['discount_value'] > 0) {
        $sep = str_contains($redirectUrl, '?') ? '&' : '?';
        $redirectUrl .= "{$sep}promo={$camp['offer_code']}&discount={$camp['discount_value']}";
    }

    // Deduplicate conversions: check if this phone number already converted for this campaign
    $dup = $db->prepare("SELECT id FROM events WHERE campaign_id=? AND visitor_phone=? AND type='conversion' LIMIT 1");
    $dup->execute([$campaignId, $visitorPhone]);
    $existing = $dup->fetch();

    if ($existing) {
        // Return existing redirect url and code, but DO NOT log conversion and DO NOT credit points
        apiSuccess(['redirect_url' => $redirectUrl, 'offer_code' => $camp['offer_code']], 'Discount already claimed!');
    }

    // Mark in session
    $_SESSION['converted_' . $campaignId] = true;

    // Insert conversion event
    $ipHash = getIpHash();
    $ua     = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);

    $ins = $db->prepare("INSERT INTO events (campaign_id,type,visitor_name,visitor_phone,visitor_country_code,promo_entered,ip_hash,user_agent) VALUES (?,'conversion',?,?,?,?,?,?)");
    $ins->execute([$campaignId, $visitorName, $visitorPhone, $countryCode, $promoCode ?: $camp['offer_code'], $ipHash, $ua]);

    // Client Wallet CPL Deduction
    $cfg = $db->query("SELECT * FROM points_config LIMIT 1")->fetch();
    if ($camp['client_id'] !== null) {
        $cpl = 0.000;
        if ($cfg && isset($cfg['vendor_conversions_per_point']) && (int)$cfg['vendor_conversions_per_point'] > 0) {
            $cpl = round((float)$cfg['vendor_conversion_value_per_point'] / (int)$cfg['vendor_conversions_per_point'], 3);
        } else {
            $cpl = (float)$camp['cpl_rate'];
        }

        if ($cpl > 0 && (float)$camp['wallet_balance'] >= 0.100) {
            try {
                $db->beginTransaction();
                $db->prepare("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?")->execute([$cpl, $camp['client_id']]);
                $db->prepare("INSERT INTO client_wallet_transactions (client_id, amount, type, payment_method, note) VALUES (?, ?, 'debit', 'system', ?)")
                   ->execute([$camp['client_id'], $cpl, 'CPL Lead: ' . ($camp['product_name'] ?? 'Campaign #' . $campaignId)]);
                $db->commit();
            } catch (Exception $e) {
                $db->rollBack();
            }
        }
    }

    // Auto-credit points check
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
