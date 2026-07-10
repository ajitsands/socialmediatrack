<?php
require_once __DIR__ . '/config/database.php';
$db = getDB();
$stmt = $db->query("SELECT id, note, payment_method FROM client_wallet_transactions ORDER BY id DESC LIMIT 15");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
