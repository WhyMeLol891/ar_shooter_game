<?php

declare(strict_types=1);

require_once __DIR__ . '/api/site_lib.php';

$targetPath = target_compiled_path();
$targetMissing = !is_file($targetPath);
$targetUrl = str_replace('\\', '/', substr($targetPath, strlen(__DIR__) + 1));
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>AR Game Shooter</title>
    <meta name="description" content="AR image target shooter" />
    <link rel="stylesheet" href="assets/css/game.css">
</head>
<body class="game-page">
    <div id="game-shell" class="game-shell">
        <div id="ar-stage" class="ar-stage">
            <div id="ar-container" class="ar-container"></div>
            <div id="warning-banner" class="warning-banner hidden">Target file is missing. Please compile the target before starting the game.</div>
            <div id="compatibility-panel" class="compatibility-panel hidden">
                <div class="compatibility-box">
                    <h2>Camera access is blocked</h2>
                    <p id="compatibility-message">Open this game using HTTPS or localhost, then allow camera access.</p>
                    <a class="primary" href="index.php">Back to game setup</a>
                </div>
            </div>
            <div id="crosshair" class="crosshair" aria-label="Aiming reticle">
                <span></span>
            </div>
            <div id="hit-flash" class="hit-flash"></div>
            <div id="damage-flash" class="damage-flash"></div>
        </div>

        <div id="hud" class="hud">
            <div class="hud-block">
                <span class="label">Score</span>
                <span id="score-value">0</span>
            </div>
            <div class="hud-block">
                <span class="label">Wave</span>
                <span id="wave-value">1</span>
            </div>
            <div class="hud-block">
                <span class="label">HP</span>
                <span id="hp-value">5</span>
            </div>
            <div class="hud-block ammo-block">
                <span class="label">Ammo</span>
                <span id="ammo-value">30/30</span>
            </div>
        </div>

        <div class="touch-controls">
            <button id="reload-button" type="button" class="action-button reload-button">RELOAD</button>
            <button id="fire-button" type="button" class="action-button fire-button">FIRE</button>
        </div>

        <div id="game-over-panel" class="game-over-panel hidden">
            <div class="game-over-box">
                <h2>GAME OVER</h2>
                <p id="game-over-score">Score: 0</p>
                <p id="game-over-wave">Reached Wave: 0</p>
                <button id="restart-button" type="button" class="primary">Restart</button>
            </div>
        </div>
    </div>

    <script type="importmap">
        {
            "imports": {
                "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
                "three/addons/renderers/CSS3DRenderer.js": "./assets/js/css3d-renderer-compat.js",
                "three/addons/utils/SkeletonUtils.js": "./assets/js/skeleton-utils-compat.js",
                "three/examples/jsm/utils/SkeletonUtils.js": "./assets/js/skeleton-utils-compat.js",
                "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/",
                "three/": "https://cdn.jsdelivr.net/npm/three@0.160.0/"
            }
        }
    </script>
    <script type="module">
        window.AR_TARGET_MISSING = <?= json_encode($targetMissing, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
        window.AR_TARGET_SRC = <?= json_encode($targetUrl, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
    </script>
    <script type="module" src="assets/js/game.js"></script>
</body>
</html>
