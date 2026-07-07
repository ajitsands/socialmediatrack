<?php
// ─────────────────────────────────────────────
//  GitHub Webhook Handler
//  URL: /webhook.php
//  Set this URL in GitHub → Settings → Webhooks
//  Content-Type: application/json
//  Secret: InfluXWebhook$3cr3t2025
// ─────────────────────────────────────────────

define('WEBHOOK_SECRET_KEY', 'InfluXWebhook$3cr3t2025');
define('LOG_FILE', __DIR__ . '/webhook_log.txt');
define('REPO_DIR', __DIR__);

// Read payload
$payload   = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';

// ─── Verify GitHub signature ──────────────────
$computed = 'sha256=' . hash_hmac('sha256', $payload, WEBHOOK_SECRET_KEY);
if (!hash_equals($computed, $signature)) {
    http_response_code(401);
    log_webhook('FAIL', 'Invalid signature');
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// ─── Parse payload ────────────────────────────
$data   = json_decode($payload, true);
$branch = $data['ref'] ?? 'unknown';
$pusher = $data['pusher']['name'] ?? 'unknown';
$commit = $data['head_commit']['message'] ?? 'no message';

log_webhook('INFO', "Push by {$pusher} on {$branch}: {$commit}");

// ─── Only deploy on main / master ────────────
if (!in_array($branch, ['refs/heads/main', 'refs/heads/master'])) {
    http_response_code(200);
    echo json_encode(['status' => 'ignored', 'branch' => $branch]);
    exit;
}

// ─── Pull latest code ─────────────────────────
$dir    = escapeshellarg(REPO_DIR);
$cmd    = "cd {$dir} && git fetch --all 2>&1 && git reset --hard origin/main 2>&1";
$output = shell_exec($cmd);

log_webhook('DEPLOY', $output ?? 'no output');

http_response_code(200);
header('Content-Type: application/json');
echo json_encode([
    'status'  => 'deployed',
    'branch'  => $branch,
    'pusher'  => $pusher,
    'commit'  => $commit,
    'output'  => trim($output ?? ''),
    'time'    => date('Y-m-d H:i:s'),
]);

// ─── Logging helper ───────────────────────────
function log_webhook(string $level, string $message): void {
    $line = sprintf("[%s] [%s] %s\n", date('Y-m-d H:i:s'), $level, $message);
    file_put_contents(LOG_FILE, $line, FILE_APPEND | LOCK_EX);
}
