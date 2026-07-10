<?php
require_once __DIR__ . '/config/database.php';
$db = getDB();
$stmt = $db->query("
    SELECT id, client_id, amount, note, created_at 
    FROM client_wallet_transactions 
    WHERE note LIKE 'CPC%' 
    ORDER BY id DESC 
    LIMIT 20
");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
