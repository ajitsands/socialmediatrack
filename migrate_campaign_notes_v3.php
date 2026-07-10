<?php
/**
 * Migration v3: Clean up CPC/CPL wallet ledger notes
 * Normalizes double-prefixed notes (e.g., "CPC Click on CPC Click: ProSuite ERP")
 * back to a clean "CPC Click: ProSuite ERP" or "CPL Lead: ProSuite ERP"
 */
require_once __DIR__ . '/config/database.php';

$db = getDB();

$db->query("
    UPDATE client_wallet_transactions
    SET note = REPLACE(note, 'CPC Click on CPC Click: ', 'CPC Click: ')
    WHERE note LIKE 'CPC Click on CPC Click: %'
");

$db->query("
    UPDATE client_wallet_transactions
    SET note = REPLACE(note, 'CPL Lead on CPL Lead: ', 'CPL Lead: ')
    WHERE note LIKE 'CPL Lead on CPL Lead: %'
");

echo "Cleaned up notes in database.";
