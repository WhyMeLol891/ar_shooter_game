<?php

declare(strict_types=1);

require_once __DIR__ . '/api/site_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'No target payload received']);
    exit;
}

$targetDir = app_root() . '/assets/targets';
ensure_directory($targetDir);
$savePath = $targetDir . DIRECTORY_SEPARATOR . 'targets.mind';
$bytesWritten = file_put_contents($savePath, $raw);

if ($bytesWritten === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Failed to save compiled target']);
    exit;
}

echo json_encode(['ok' => true, 'saved' => $savePath]);
