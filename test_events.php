<?php
require_once __DIR__ . '/config/database.php';
header('Content-Type: text/plain');

try {
    $db = getDB();
    echo "Connected to database.\n\n";

    echo "LATEST EVENTS:\n";
    $stmt = $db->query("SELECT id, campaign_id, type, visitor_name, visitor_phone, ip_hash, timestamp FROM events ORDER BY id DESC LIMIT 20");
    $events = $stmt->fetchAll();
    foreach ($events as $e) {
        printf("ID: %d | Camp ID: %d | Type: %s | Name: %s | Phone: %s | IP: %s | Time: %s\n",
            $e['id'], $e['campaign_id'], $e['type'], $e['visitor_name'] ?? 'N/A', $e['visitor_phone'] ?? 'N/A', substr($e['ip_hash'], 0, 8), $e['timestamp']
        );
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
