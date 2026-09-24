<?php

declare(strict_types=1);

require_once __DIR__ . '/models_lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$config = load_model_config();
$enemyCandidates = enemy_candidates();
$weaponCandidates = weapon_candidates();
$allModelCandidates = all_model_candidates();

$enemyMode = strtolower((string) ($config['enemy'] ?? 'random'));
$weaponMode = strtolower((string) ($config['weapon'] ?? 'random'));
$enemyRandom = $enemyMode === 'random' || $enemyMode === 'all';
$weaponRandom = $weaponMode === 'random' || $weaponMode === 'all';

$enemySelection = $enemyRandom
    ? ($enemyCandidates === [] ? '' : $enemyCandidates[array_rand($enemyCandidates)])
    : (in_array((string) ($config['enemy'] ?? ''), $enemyCandidates, true)
        ? (string) ($config['enemy'] ?? '')
        : ($enemyCandidates[0] ?? ''));
$configuredWeapon = (string) ($config['weapon'] ?? '');
$weaponSelection = $weaponRandom
    ? ($weaponCandidates === [] ? '' : $weaponCandidates[array_rand($weaponCandidates)])
    : (in_array($configuredWeapon, $weaponCandidates, true)
        ? $configuredWeapon
        : ($weaponCandidates[0] ?? ''));

$payload = [
    'ok' => true,
    'config' => [
        'enemy' => $config['enemy'] ?? 'random',
        'weapon' => $config['weapon'] ?? 'random',
    ],
    'enemyRandom' => $enemyRandom,
    'weaponRandom' => $weaponRandom,
    'allModels' => $allModelCandidates,
    'enemyCandidates' => $enemyCandidates,
    'weaponCandidates' => $weaponCandidates,
    'enemyUrl' => $enemySelection === '' ? '' : model_asset_url($enemySelection),
    'weaponUrl' => $weaponSelection === '' ? '' : model_asset_url($weaponSelection),
];

echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
