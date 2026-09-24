<?php

declare(strict_types=1);

require_once __DIR__ . '/site_lib.php';

function model_config_path(): string
{
    return app_root() . '/assets/config/models.json';
}

function default_model_config(): array
{
    return [
        'enemy' => 'random',
        'weapon' => 'fps-akm.glb',
        'updatedAt' => '',
    ];
}

function all_model_candidates(): array
{
    $directory = app_root() . '/assets/models';
    return list_model_names($directory, ['glb']);
}

function load_model_config(): array
{
    $config = load_json_file(model_config_path());
    return array_merge(default_model_config(), $config);
}

function save_model_config(array $config): bool
{
    $config['updatedAt'] = gmdate('c');
    return save_json_file(model_config_path(), $config);
}

function list_model_names(string $directory, array $extensions): array
{
    if (!is_dir($directory)) {
        return [];
    }

    $items = [];
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS)
    );

    foreach ($iterator as $file) {
        if (!$file->isFile()) {
            continue;
        }

        $extension = strtolower($file->getExtension());
        if (in_array($extension, $extensions, true)) {
            $relative = substr($file->getPathname(), strlen($directory) + 1);
            $items[] = str_replace(DIRECTORY_SEPARATOR, '/', $relative);
        }
    }

    sort($items, SORT_STRING);
    return $items;
}

function is_prop_or_ammo(string $filename): bool
{
    $lower = strtolower($filename);
    $propWords = ['c4', 'grenade', 'truck', 'case', 'ammo', '7.62', '9x19', 'bullet', 'projectile', 'barrel', 'prop'];
    foreach ($propWords as $word) {
        if (str_contains($lower, $word)) {
            return true;
        }
    }
    return false;
}

function is_weapon_model(string $filename): bool
{
    if (is_prop_or_ammo($filename)) {
        return false;
    }
    $lower = strtolower($filename);
    $weaponWords = ['fps', 'akm', 'gun', 'rifle', 'mossberg', 'glock', 'knife', 'shotgun', 'weapon', 'rigged fps'];
    foreach ($weaponWords as $word) {
        if (str_contains($lower, $word)) {
            return true;
        }
    }
    return false;
}

function enemy_candidates(): array
{
    $files = all_model_candidates();
    $filtered = array_values(array_filter($files, static function (string $filename): bool {
        if (is_prop_or_ammo($filename) || is_weapon_model($filename)) {
            return false;
        }
        $lower = strtolower($filename);
        return !str_contains($lower, 'effect');
    }));

    if ($filtered === []) {
        // Fallback to ghost-skull if available
        foreach ($files as $candidate) {
            if (str_contains(strtolower($candidate), 'skull') || str_contains(strtolower($candidate), 'specter')) {
                $filtered[] = $candidate;
            }
        }
        if ($filtered === []) {
            $filtered = $files;
        }
    }

    return $filtered;
}

function weapon_candidates(): array
{
    $files = all_model_candidates();
    $filtered = array_values(array_filter($files, static function (string $filename): bool {
        return is_weapon_model($filename);
    }));

    if ($filtered === []) {
        $filtered = array_values(array_filter($files, static function (string $filename): bool {
            return !is_prop_or_ammo($filename);
        }));
    }

    return $filtered;
}

function model_asset_url(string $filename): string
{
    $clean = str_replace(['..', '\\'], ['', '/'], $filename);
    $clean = ltrim($clean, '/');
    $fullPath = app_root() . '/assets/models/' . $clean;
    $version = is_file($fullPath) ? '?v=' . filemtime($fullPath) : '?v=1';
    return 'assets/models/' . $clean . $version;
}

