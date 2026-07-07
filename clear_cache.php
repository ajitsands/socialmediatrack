<?php
header('Content-Type: text/plain');

$file = __DIR__ . '/config/config.php';

echo "OPCACHE STATUS:\n";
if (function_exists('opcache_reset')) {
    echo "opcache_reset() exists.\n";
    if (opcache_reset()) {
        echo "✅ OpCache cleared successfully.\n";
    } else {
        echo "❌ OpCache failed to clear.\n";
    }
} else {
    echo "OpCache reset function not available.\n";
}

if (function_exists('opcache_invalidate')) {
    echo "opcache_invalidate() exists.\n";
    if (opcache_invalidate($file, true)) {
        echo "✅ Invalidated config.php cache.\n";
    } else {
        echo "❌ Failed to invalidate config.php cache.\n";
    }
}
