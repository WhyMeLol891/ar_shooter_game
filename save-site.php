<?php

declare(strict_types=1);

require_once __DIR__ . '/api/site_lib.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$data = [];
if ($raw !== false && $raw !== '') {
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        $data = $decoded;
    }
}

if (isset($_POST['publicBaseUrl'])) {
    $data['publicBaseUrl'] = $_POST['publicBaseUrl'];
}

$newUrl = trim((string) ($data['publicBaseUrl'] ?? ''));

if ($newUrl !== '') {
    if (!filter_var($newUrl, FILTER_VALIDATE_URL) || !preg_match('/^https?:\/\//i', $newUrl)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid public base URL format. Must start with http:// or https://']);
        exit;
    }
    $newUrl = rtrim($newUrl, '/');
}

$config = site_config();
$config['publicBaseUrl'] = $newUrl;

if (!save_site_config($config)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Failed to save site configuration']);
    exit;
}

echo json_encode([
    'ok' => true,
    'publicBaseUrl' => $newUrl,
    'computedUrl' => compute_public_base_url() . '/game.php'
]);
