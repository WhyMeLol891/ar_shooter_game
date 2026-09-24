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
        'updatedAt' => '',
    ];
}

function site_config_path(): string
{
    return app_root() . '/assets/config/site.json';
}

function site_config(): array
{
    $cfg = load_json_file(site_config_path());
    return array_merge(default_site_config(), $cfg);
}

function save_site_config(array $config): bool
{
    $config['updatedAt'] = gmdate('c');
    return save_json_file(site_config_path(), $config);
}

function get_lan_ip(): string
{
    // Try network interfaces first (PHP 7.3+)
    if (function_exists('net_get_interfaces')) {
        $interfaces = @net_get_interfaces();
        if (is_array($interfaces)) {
            foreach ($interfaces as $interface) {
                if (empty($interface['up']) || empty($interface['unicast'])) {
                    continue;
                }
                foreach ($interface['unicast'] as $entry) {
                    $address = $entry['address'] ?? '';
                    // Check for standard private IPv4 ranges: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
                    if (preg_match('/^(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/', $address)) {
                        return $address;
                    }
                }
            }
        }
    }

    // Fallback using hostname
    $hostname = @gethostname();
    if ($hostname) {
        $ip = @gethostbyname($hostname);
        if ($ip && filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            if ($ip !== '127.0.0.1' && !str_starts_with($ip, '169.254.')) {
                return $ip;
            }
        }
    }

    return 'localhost';
}

function compute_public_base_url(): string
{
    $config = site_config();
    if (!empty($config['publicBaseUrl'])) {
        return rtrim((string) $config['publicBaseUrl'], '/');
    }

    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
        || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443);
    $scheme = $isHttps ? 'https' : 'http';

    $hostHeader = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? 'localhost';
    $port = '';
    if (str_contains($hostHeader, ':')) {
        [$hostOnly, $portPart] = explode(':', $hostHeader, 2);
        $host = $hostOnly;
        if (($scheme === 'http' && $portPart !== '80') || ($scheme === 'https' && $portPart !== '443')) {
            $port = ':' . $portPart;
        }
    } else {
        $host = $hostHeader;
        $serverPort = (string) ($_SERVER['SERVER_PORT'] ?? '80');
        if (($scheme === 'http' && $serverPort !== '80') || ($scheme === 'https' && $serverPort !== '443')) {
            $port = ':' . $serverPort;
        }
    }

    // If accessed as localhost or loopback, auto-resolve to LAN IP so phones can connect
    if (empty($host) || $host === 'localhost' || $host === '127.0.0.1' || $host === '[::1]') {
        $lanIp = get_lan_ip();
        if ($lanIp !== 'localhost') {
            $host = $lanIp;
        }
    }

    $scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '/');
    $scriptDir = str_replace('\\', '/', $scriptDir);
    if ($scriptDir === '/' || $scriptDir === '.') {
        $scriptDir = '';
    } else {
        $scriptDir = '/' . trim($scriptDir, '/');
    }

    return $scheme . '://' . $host . $port . $scriptDir;
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
    return app_root() . '/assets/targets/targets.mind';
}

function target_compiled_exists(): bool
{
    return is_file(target_compiled_path()) && filesize(target_compiled_path()) > 1000;
}

function target_compiled_url(): string
{
    $path = target_compiled_path();
    $version = is_file($path) ? '?v=' . filemtime($path) : '?v=1';
    return 'assets/targets/targets.mind' . $version;
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

