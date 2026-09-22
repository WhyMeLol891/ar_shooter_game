<?php

declare(strict_types=1);

function app_root(): string
{
    return dirname(__DIR__);
}

function load_json_file(string $path): array
{
    if (!is_file($path)) {
        return [];
    }

    $raw = @file_get_contents($path);
    if ($raw === false) {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function save_json_file(string $path, array $data): bool
{
    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
        return false;
    }

    $encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        return false;
    }

    return (bool) file_put_contents($path, $encoded . PHP_EOL);
}

function default_site_config(): array
{
    return [
        'publicBaseUrl' => '',
    ];
}

function site_config(): array
{
    $path = app_root() . '/assets/config/site.json';
    $cfg = load_json_file($path);
    return array_merge(default_site_config(), $cfg);
}

function compute_public_base_url(): string
{
    $config = site_config();
    if (!empty($config['publicBaseUrl'])) {
        return rtrim((string) $config['publicBaseUrl'], '/');
    }

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? 'localhost';

    if (empty($host) || $host === 'localhost' || $host === '127.0.0.1' || $host === '[::1]') {
        $host = 'localhost';
    }

    return $scheme . '://' . $host . dirname($_SERVER['SCRIPT_NAME'] ?? '/');
}

function target_image_path(): string
{
    $candidatePaths = [
        app_root() . '/assets/targets/picture.jpg',
        app_root() . '/assets/targets/picture.jpeg',
        app_root() . '/assets/targets/picture.png',
        app_root() . '/assets/targets/picture.webp',
    ];

    foreach ($candidatePaths as $candidate) {
        if (is_file($candidate)) {
            return $candidate;
        }
    }

    $rootFiles = scandir(app_root());
    if (is_array($rootFiles)) {
        foreach ($rootFiles as $file) {
            if ($file === '.' || $file === '..') {
                continue;
            }

            $lower = strtolower($file);
            if (!preg_match('/\.(jpe?g|png|webp|avif)$/i', $file)) {
                continue;
            }

            $source = app_root() . '/' . $file;
            $destination = app_root() . '/assets/targets/picture.jpg';
            $image = false;

            if (preg_match('/\.avif$/i', $file) && function_exists('imagecreatefromavif')) {
                $image = imagecreatefromavif($source);
            } elseif (preg_match('/\.png$/i', $file)) {
                $image = imagecreatefrompng($source);
            } elseif (preg_match('/\.webp$/i', $file)) {
                $image = imagecreatefromwebp($source);
            } elseif (preg_match('/\.jpe?g$/i', $file)) {
                $image = imagecreatefromjpeg($source);
            }

            if ($image !== false) {
                ensure_directory(app_root() . '/assets/targets');
                imagejpeg($image, $destination, 92);
                imagedestroy($image);
                return $destination;
            }

            if (copy($source, $destination)) {
                return $destination;
            }
        }
    }

    return app_root() . '/assets/targets/picture.jpg';
}

function target_image_url(): string
{
    $path = target_image_path();
    $version = is_file($path) ? '?v=' . filemtime($path) : '?v=1';
    $relative = str_starts_with($path, app_root()) ? substr($path, strlen(app_root()) + 1) : $path;
    $relative = str_replace('\\', '/', $relative);
    return $relative . $version;
}

function target_compiled_path(): string
{
    $candidates = [
        app_root() . '/assets/targets/target.mind',
        app_root() . '/assets/targets/targets.mind',
    ];

    foreach ($candidates as $candidate) {
        if (is_file($candidate)) {
            return $candidate;
        }
    }

    return app_root() . '/assets/targets/targets.mind';
}

function target_compiled_exists(): bool
{
    return is_file(target_compiled_path());
}

function sanitize_filename(string $filename): string
{
    $filename = basename(str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $filename));
    $filename = preg_replace('/[^A-Za-z0-9._-]+/', '-', $filename);
    $filename = trim($filename, " .-\0");
    return $filename !== '' ? $filename : 'upload.bin';
}

function ensure_directory(string $directory): bool
{
    if (is_dir($directory)) {
        return true;
    }

    return mkdir($directory, 0775, true) || is_dir($directory);
}
