<?php
/**
 * One-time patch: adds follower_count column to users and user_platforms tables.
 * Visit this URL once, then delete the file.
 */
require_once __DIR__ . '/config/database.php';

$db = getDB();
$results = [];

// Patch users table
try {
    $cols = $db->query("DESCRIBE `users`")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('follower_count', $cols)) {
        $db->exec("ALTER TABLE `users` ADD COLUMN `follower_count` INT DEFAULT 0 AFTER `avatar`");
        $results[] = "✅ Added follower_count to users table.";
    } else {
        $results[] = "ℹ️ users.follower_count already exists.";
    }
} catch (Exception $e) {
    $results[] = "❌ Error patching users: " . $e->getMessage();
}

// Patch user_platforms table
try {
    $cols = $db->query("DESCRIBE `user_platforms`")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('follower_count', $cols)) {
        $db->exec("ALTER TABLE `user_platforms` ADD COLUMN `follower_count` INT DEFAULT 0");
        $results[] = "✅ Added follower_count to user_platforms table.";
    } else {
        $results[] = "ℹ️ user_platforms.follower_count already exists.";
    }
} catch (Exception $e) {
    $results[] = "❌ Error patching user_platforms: " . $e->getMessage();
}

echo "<pre style='font-family:monospace;font-size:14px;padding:20px'>";
echo "<b>DB Patch Results:</b>\n\n";
foreach ($results as $r) {
    echo $r . "\n";
}
echo "\n<b>Done. You can delete this file now (patch.php).</b>";
echo "</pre>";
