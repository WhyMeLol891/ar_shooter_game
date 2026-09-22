<?php

declare(strict_types=1);

require_once __DIR__ . '/api/site_lib.php';

$targetSource = target_image_path();
$targetExists = is_file($targetSource);
if (!$targetExists) {
    header('Location: index.php?error=Please%20upload%20a%20target%20first');
    exit;
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compile Target</title>
    <link rel="stylesheet" href="assets/css/game.css">
</head>
<body class="landing-page">
    <header class="topbar shell">
        <div class="brand-wrap">
            <div class="brand-mark">A</div>
            <div class="brand-name">ARGAME</div>
        </div>
        <nav class="main-nav">
            <a href="index.php">Home</a>
            <a href="game.php">Play</a>
            <a href="models.php">Models</a>
            <a href="compile-target.php">Compile</a>
        </nav>
    </header>

    <main class="page-shell single-panel-shell">
        <section class="panel shell compile-panel">
            <div class="section-header">
                <h2>Compile AR Target</h2>
            </div>

            <div class="compile-screen">
                <img src="<?= htmlspecialchars('assets/targets/picture.jpg?v=' . filemtime($targetSource), ENT_QUOTES, 'UTF-8') ?>" alt="Current AR target" class="target-preview compile-preview">
                <div class="compile-log" id="compile-log">
                    <p>Loading target image...</p>
                    <p>Compiling... 25%</p>
                    <p>Compiling... 50%</p>
                    <p>Compiling... 75%</p>
                    <p>Saving...</p>
                    <p>Done</p>
                </div>
                <div class="status-pill success" id="compile-status">Ready</div>
            </div>
        </section>
    </main>

    <script type="module">
        import { compileMindArTarget } from './assets/js/main.js';
        window.addEventListener('DOMContentLoaded', () => {
            compileMindArTarget();
        });
    </script>
</body>
</html>
