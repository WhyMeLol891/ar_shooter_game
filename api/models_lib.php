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
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS));

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

function enemy_candidates(): array
{
    $directory = app_root() . '/assets/models';
    $files = list_model_names($directory, ['glb']);
    $filtered = array_values(array_filter($files, static function (string $filename): bool {
        $lower = strtolower($filename);
        if (str_contains($lower, 'weapon') || str_contains($lower, 'fps') || str_contains($lower, 'prop') || str_contains($lower, 'projectile') || str_contains($lower, 'ammo') || str_contains($lower, 'barrel') || str_contains($lower, 'bullet')) {
            return false;
        }

        return !str_contains($lower, 'effect');
    }));
    
    return $filtered;
}

function weapon_candidates(): array
{
    $directory = app_root() . '/assets/models';
    $files = list_model_names($directory, ['glb']);
    $filtered = array_values(array_filter($files, static function (string $filename): bool {
        $lower = strtolower($filename);
        return str_contains($lower, 'fps') || str_contains($lower, 'weapon') || str_contains($lower, 'rifle') || str_contains($lower, 'akm') || str_contains($lower, 'gun');
    }));

    if ($filtered === []) {
        $filtered = ['fps-akm.glb'];
    }

    return $filtered;
}

function model_asset_url(string $filename): string
{
    $clean = str_replace('..', '', $filename);
    return 'assets/models/' . ltrim($clean, '/');
}
