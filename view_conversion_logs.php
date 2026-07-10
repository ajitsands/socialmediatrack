<?php
require_once __DIR__ . '/config/database.php';
$db = getDB();
$stmt = $db->query("
    SELECT id, campaign_id, type, visitor_name, visitor_phone, visitor_country_code, ip_hash, timestamp 
    FROM events 
    WHERE type = 'conversion' 
    ORDER BY id DESC 
    LIMIT 5
");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
