<?php
require_once __DIR__ . '/config/database.php';
header('Content-Type: text/plain');

try {
    $db = getDB();
    echo "Connected successfully to database.\n\n";
    
    echo "TABLES IN DATABASE:\n";
    $stmt = $db->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $t) {
        echo " - $t\n";
    }
    
    if (in_array('campaign_requests', $tables)) {
        echo "\nTable 'campaign_requests' exists. Structure:\n";
        $desc = $db->query("DESCRIBE campaign_requests")->fetchAll();
        print_r($desc);
    } else {
        echo "\nTable 'campaign_requests' does NOT exist.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
