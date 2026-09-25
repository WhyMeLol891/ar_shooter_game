<?php

declare(strict_types=1);

require_once __DIR__ . '/api/site_lib.php';
require_once __DIR__ . '/api/models_lib.php';

$targetPath = target_image_path();
$compiledPath = target_compiled_path();
$targetExists = is_file($targetPath);
$compiledExists = is_file($compiledPath);
$gameUrl = compute_public_base_url() . '/game.php';
$enemyCandidates = enemy_candidates();
$modelConfig = load_model_config();
$configuredEnemy = (string) ($modelConfig['enemy'] ?? '');
$enemyPreview = in_array($configuredEnemy, $enemyCandidates, true)
    ? $configuredEnemy
    : ($enemyCandidates[0] ?? '');
$enemyPreviewUrl = $enemyPreview === '' ? '' : model_asset_url($enemyPreview);
$statusText = $compiledExists ? 'Compiled · mind v1.0' : 'Not compiled · upload then compile';
$targetImageUrl = target_image_url();
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>AR Game Shooter</title>
    <meta name="description" content="AR Game Shooter web AR image-target FPS" />
    <link rel="stylesheet" href="assets/css/game.css">
</head>
<body class="landing-page">
    <header class="topbar shell">
        <div class="brand-wrap">
            <div class="brand-mark">A</div>
            <div>
                <div class="brand-name">ARGAME</div>
            </div>
        </div>
        <nav class="main-nav">
            <a href="index.php">Home</a>
            <a href="game.php">Play</a>
            <a href="models.php">Models</a>
            <a href="compile-target.php">Compile</a>
        </nav>
    </header>

    <main class="page-shell">
        <section class="hero shell">
            <div class="hero-copy">
                <p class="eyebrow">Web AR · Image Target</p>
                <h1>AR GAME SHOOTER</h1>
                <p>
                    Scan a target, open the game on your phone, and fight 3D enemies in a live augmented-reality battlefield.
                </p>
                <div class="cta-row">
                    <a class="primary" href="game.php">Start Game</a>
                    <a class="secondary" href="models.php">Change Models</a>
                    <button class="secondary" type="button" id="fullscreen-target-button">Fullscreen Target</button>
                </div>
                <ul class="feature-list">
                    <li>Scan QR code</li>
                    <li>Rear camera tracking</li>
                    <li>Enemy waves</li>
                    <li>Real-time score</li>
                </ul>
            </div>

            <div class="hero-card panel">
    <h3>Scan to Play</h3>

    <div class="qr-container" style="display: flex; justify-content: center; align-items: center; margin: 1rem 0;">
        <img 
            id="qr-code-img" 
            src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https%3A%2F%2Fderricklim.kolejsynergy.com%2Far_shooter_game%2Fgame.php" 
            alt="Game QR Code" 
            style="width: 200px; height: 200px; border-radius: 8px; background-color: #ffffff; padding: 10px;" 
        />
    </div>

    <p>Scan this code with your phone to open the AR game.</p>
    <div class="status-pill success"><?= htmlspecialchars($statusText, ENT_QUOTES, 'UTF-8') ?></div>
</div>
        </section>

        <section class="content-grid shell">
            <div class="panel target-panel">
                <div class="section-header">
                    <h2>AR Target</h2>
                    <a href="compile-target.php" class="inline-link">Compile</a>
                </div>
                <div class="target-preview-wrap">
                    <?php if ($targetExists): ?>
                        <img src="<?= htmlspecialchars($targetImageUrl, ENT_QUOTES, 'UTF-8') ?>" alt="AR target image" class="target-preview" id="target-preview-image">
                    <?php else: ?>
                        <div class="empty-target">No target image uploaded yet.</div>
                    <?php endif; ?>
                </div>
                <p class="info-text">
                    Display the target on a second screen or print it. Do not show it on the same phone that is running the game. Good lighting and high-contrast imagery improve tracking significantly.
                </p>
            </div>

            <div class="panel upload-panel">
                <div class="section-header">
                    <h2>Upload Target</h2>
                </div>
                <form action="upload-target.php" method="post" enctype="multipart/form-data" class="upload-form">
                    <label class="file-picker">
                        <span>Choose image</span>
                        <input type="file" name="targetImage" accept="image/jpeg,image/png,image/webp" required>
                    </label>
                    <label class="checkbox-row">
                        <input type="checkbox" name="compileAfterUpload" value="1">
                        <span>Compile targets.mind after upload</span>
                    </label>
                    <button type="submit" class="primary full-width">Upload target</button>
                </form>

                <?php if (isset($_GET['error'])): ?>
                    <div class="message error"><?= htmlspecialchars((string) $_GET['error'], ENT_QUOTES, 'UTF-8') ?></div>
                <?php endif; ?>
                <?php if (isset($_GET['success'])): ?>
                    <div class="message success"><?= htmlspecialchars((string) $_GET['success'], ENT_QUOTES, 'UTF-8') ?></div>
                <?php endif; ?>
            </div>
        </section>

        <?php if ($enemyPreviewUrl !== ''): ?>
            <section class="enemy-preview-panel panel shell">
                <div class="section-header">
                    <h2>Enemy Preview</h2>
                    <span class="status-pill success">In game</span>
                </div>
                <model-viewer
                    class="enemy-preview"
                    src="<?= htmlspecialchars($enemyPreviewUrl, ENT_QUOTES, 'UTF-8') ?>"
                    alt="3D preview of the enemy that appears in the game"
                    camera-controls
                    auto-rotate
                    shadow-intensity="1"
                    exposure="1.1"
                    interaction-prompt="none">
                </model-viewer>
            </section>
        <?php endif; ?>
    </main>

    <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.5.4/qrcode.min.js"></script>
    <script type="module" src="https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js"></script>
    <script type="module" src="assets/js/main.js"></script>
    
    <script>
        // Use PHP's computed base URL dynamically
        window.AR_GAME_URL = <?= json_encode($gameUrl, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;

        // Generate the QR Code URL using the dynamic PHP game URL
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.AR_GAME_URL)}`;

        // Inject into the img tag
        document.getElementById('qr-code-img').src = qrCodeUrl;
    </script>
</body>
</html>

