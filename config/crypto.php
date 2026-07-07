<?php
// ─────────────────────────────────────────────
//  AES-256-CBC  URL Token Encryption
//  Generates encrypted, URL-safe tokens for
//  campaign tracking links
// ─────────────────────────────────────────────
define('ENCRYPTION_KEY', 'InfluXP0rtal$3cr3tK3y#2025!Bahrain');

/**
 * Encrypt data array → URL-safe base64 string
 */
function encryptToken(array $data): string {
    $key    = substr(hash('sha256', ENCRYPTION_KEY, true), 0, 32);
    $iv     = openssl_random_pseudo_bytes(16);
    $plain  = json_encode($data);
    $cipher = openssl_encrypt($plain, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
    $raw    = $iv . $cipher;
    // URL-safe base64 without padding
    return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
}

/**
 * Decrypt URL-safe base64 string → data array
 */
function decryptToken(string $token): ?array {
    try {
        // Restore base64 padding
        $padded = $token . str_repeat('=', (4 - strlen($token) % 4) % 4);
        $raw    = base64_decode(strtr($padded, '-_', '+/'), true);
        if ($raw === false || strlen($raw) < 17) return null;

        $key   = substr(hash('sha256', ENCRYPTION_KEY, true), 0, 32);
        $iv    = substr($raw, 0, 16);
        $cipher = substr($raw, 16);
        $plain  = openssl_decrypt($cipher, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
        if ($plain === false) return null;

        return json_decode($plain, true);
    } catch (Throwable $e) {
        return null;
    }
}

/**
 * Generate unique offer code from influencer name + product index
 * Format: {2-char initials}-PR{nn}-{5 random alphanumeric}
 * Example: Ajit Kumar, product #1 → AJ-PR01-X2F01
 */
function generateOfferCode(string $name, int $productIndex): string {
    $parts    = preg_split('/\s+/', trim($name));
    $initials = count($parts) >= 2
        ? strtoupper($parts[0][0] . $parts[1][0])
        : strtoupper(substr($parts[0], 0, 2));

    $productCode = 'PR' . str_pad((string)$productIndex, 2, '0', STR_PAD_LEFT);
    $chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $random = '';
    for ($i = 0; $i < 5; $i++) {
        $random .= $chars[random_int(0, strlen($chars) - 1)];
    }

    return "{$initials}-{$productCode}-{$random}";
}
