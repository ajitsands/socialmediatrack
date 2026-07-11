<?php
header('Content-Type: text/plain');

$setupFile = __DIR__ . '/setup.php';
echo "SETUP FILE PATH: $setupFile\n";
echo "SETUP FILE EXISTS: " . (file_exists($setupFile) ? 'YES' : 'NO') . "\n";
echo "SETUP FILE SIZE: " . filesize($setupFile) . " bytes\n";
echo "SETUP FILE MD5: " . md5_file($setupFile) . "\n\n";

if (file_exists($setupFile)) {
    $lines = file($setupFile);
    echo "LINES 100 - 130 in setup.php:\n";
    for ($i = 99; $i < min(135, count($lines)); $i++) {
        echo ($i + 1) . ": " . $lines[$i];
    }
}
