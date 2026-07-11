<?php
// Temporary diagnostic - check categories on production
require_once __DIR__ . '/config/database.php';
$db = getDB();
$cats = $db->query("SELECT id, name FROM influencer_categories ORDER BY name")->fetchAll();
header('Content-Type: application/json');
echo json_encode(['count' => count($cats), 'data' => $cats]);
