<?php
/**
 * Migration v2: Fix CPC/CPL wallet ledger notes to use Product Name
 * Replaces all old formats: "Campaign #7", "Campaign: AK-PR01-S8AEG"
 * with the actual product name: "ProSuite ERP"
 * Run once, then delete this file from the server.
 */
require_once __DIR__ . '/config/database.php';

$db = getDB();

// Get all campaigns with their product name and offer_code
$campaigns = $db->query("
    SELECT c.id, c.offer_code, p.name as product_name
    FROM campaigns c
    JOIN products p ON p.id = c.product_id
")->fetchAll();

$updated = 0;

foreach ($campaigns as $camp) {
    $campId      = (int)$camp['id'];
    $offerCode   = $camp['offer_code'];
    $productName = $camp['product_name'];

    // Fix all old patterns for this campaign:
    // Pattern 1: "...Campaign #7"        (original old format)
    // Pattern 2: "...Campaign: AK-PR01-S8AEG" (offer_code format from previous migration)
    $patterns = [
        'Campaign #' . $campId,
        'Campaign: ' . $offerCode,
    ];

    foreach ($patterns as $oldText) {
        // CPC notes
        $stmt = $db->prepare("
            UPDATE client_wallet_transactions
            SET note = REPLACE(note, ?, CONCAT('CPC Click: ', ?))
            WHERE note LIKE ? AND note LIKE 'CPC%'
        ");
        $stmt->execute([$oldText, $productName, '%' . $oldText . '%']);
        $updated += $stmt->rowCount();

        // CPL notes
        $stmt = $db->prepare("
            UPDATE client_wallet_transactions
            SET note = REPLACE(note, ?, CONCAT('CPL Lead: ', ?))
            WHERE note LIKE ? AND note LIKE 'CPL%'
        ");
        $stmt->execute([$oldText, $productName, '%' . $oldText . '%']);
        $updated += $stmt->rowCount();
    }
}

echo "<pre style='font-family:monospace;font-size:14px;padding:20px'>";
echo "Migration v2 complete.\n";
echo "Records updated: {$updated}\n\n";
echo "Campaign to Product mappings:\n";
foreach ($campaigns as $c) {
    echo "  Campaign #{$c['id']} ({$c['offer_code']}) => Product: {$c['product_name']}\n";
}
echo "\nDELETE this file from the server now!";
echo "</pre>";
