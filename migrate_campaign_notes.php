<?php
/**
 * One-time migration: Fix CPC/CPL wallet ledger notes
 * Replaces "Campaign #7" style notes with "Campaign: OFFER_CODE"
 * Run once, then delete this file from the server.
 */
require_once __DIR__ . '/config/database.php';

$db = getDB();

// Fetch all campaigns mapping: id => offer_code
$campaigns = $db->query("SELECT id, offer_code FROM campaigns")->fetchAll(PDO::FETCH_KEY_PAIR);

$updated = 0;
$errors  = [];

foreach ($campaigns as $campId => $offerCode) {
    // Fix CPC notes: "CPC Click on Campaign #7" → "CPC Click on Campaign: OFFER_CODE"
    $stmt = $db->prepare("
        UPDATE client_wallet_transactions 
        SET note = REPLACE(note, 'Campaign #" . (int)$campId . "', 'Campaign: " . addslashes($offerCode) . "')
        WHERE note LIKE '%Campaign #" . (int)$campId . "%'
    ");
    $stmt->execute();
    $updated += $stmt->rowCount();
}

echo "<pre style='font-family:monospace;font-size:14px;padding:20px'>";
echo "✅ Migration complete.\n";
echo "📝 Records updated: {$updated}\n";
echo "\nCampaign mappings applied:\n";
foreach ($campaigns as $id => $code) {
    echo "  Campaign #{$id} → Campaign: {$code}\n";
}
echo "\n⚠️  DELETE this file from the server now!";
echo "</pre>";
