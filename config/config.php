<?php
// ─────────────────────────────────────────────
//  Application Config & Request Helpers
// ─────────────────────────────────────────────
if (session_status() === PHP_SESSION_NONE) {
    session_name('INFLUX_SESS');
    session_start();
}

// Ensure PHP error settings are safe for production and FPM/CGI servers
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', dirname(__DIR__) . '/error_log');
error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);

// Security Headers (moved from .htaccess to prevent Apache 500 errors)
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

define('APP_NAME',     'InfluX Portal');

define('APP_VERSION',  '1.0.0');

// Detect base URL dynamically
$proto   = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
$host    = $_SERVER['HTTP_HOST'] ?? 'localhost';
$base    = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
define('BASE_URL',    $proto . '://' . $host . $base);
define('LANDING_URL', BASE_URL . '/landing.php');

// Webhook
define('WEBHOOK_SECRET', 'InfluXWebhook$3cr3t2025');

// ─── JSON Response Helpers ────────────────────

function jsonResponse(array $data, int $code = 200): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function apiSuccess(mixed $data = [], string $message = 'Success'): never {
    jsonResponse(['success' => true, 'message' => $message, 'data' => $data]);
}

function apiError(string $message, int $code = 400, mixed $errors = null): never {
    $payload = ['success' => false, 'message' => $message];
    if ($errors !== null) $payload['errors'] = $errors;
    jsonResponse($payload, $code);
}

// ─── Auth Guards ─────────────────────────────

function requireAuth(): array {
    if (empty($_SESSION['user_id'])) {
        apiError('Unauthorized. Please log in.', 401);
    }
    return $_SESSION;
}

function requireAdmin(): array {
    $sess = requireAuth();
    if ($sess['role'] !== 'admin') {
        apiError('Forbidden. Admin access required.', 403);
    }
    return $sess;
}

function requireInfluencer(): array {
    $sess = requireAuth();
    if (!in_array($sess['role'], ['admin', 'influencer'])) {
        apiError('Forbidden.', 403);
    }
    return $sess;
}

// ─── Input Helpers ────────────────────────────

function getInput(): array {
    $body = file_get_contents('php://input');
    if ($body) {
        $json = json_decode($body, true);
        if (json_last_error() === JSON_ERROR_NONE) return $json;
    }
    return $_POST ?: [];
}

function param(string $key, mixed $default = null): mixed {
    return $_GET[$key] ?? $default;
}

function sanitize(string $value): string {
    return htmlspecialchars(strip_tags(trim($value)), ENT_QUOTES, 'UTF-8');
}

// ─── CORS (for local dev + production) ────────

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
