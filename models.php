<?php

declare(strict_types=1);

require_once __DIR__ . '/api/models_lib.php';

$config = load_model_config();
$enemyCandidates = enemy_candidates();
$weaponCandidates = weapon_candidates();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['enemy']) || isset($_POST['weapon'])) {
        $newConfig = [
            'enemy' => (string) ($_POST['enemy'] ?? $config['enemy']),
            'weapon' => (string) ($_POST['weapon'] ?? $config['weapon']),
        ];
        save_model_config($newConfig);
        $config = $newConfig;
        header('Location: models.php?success=Settings%20saved');
        exit;
    }

    if (isset($_FILES['glbModel']) && is_array($_FILES['glbModel'])) {
        $file = $_FILES['glbModel'];
        $tmp = $file['tmp_name'] ?? '';
        $name = $file['name'] ?? '';
        $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;

        if ($error !== UPLOAD_ERR_OK || $tmp === '' || !is_uploaded_file($tmp)) {
            header('Location: models.php?error=Invalid%20GLB%20upload');
            exit;
        }

        if ((int) $file['size'] > 40 * 1024 * 1024) {
            header('Location: models.php?error=GLB%20file%20is%20too%20large');
            exit;
        }

        $content = @file_get_contents($tmp);
        if ($content === false || strncmp($content, 'glTF', 4) !== 0) {
            header('Location: models.php?error=The%20uploaded%20file%20is%20not%20a%20valid%20GLB%20model');
            exit;
        }

        $safeName = sanitize_filename($name);
        if ($safeName === '' || !preg_match('/\.glb$/i', $safeName)) {
            $safeName = 'uploaded-model.glb';
        }

        $targetDir = app_root() . '/assets/models';
        ensure_directory($targetDir);
        $finalName = $safeName;
        $counter = 1;
        while (is_file($targetDir . DIRECTORY_SEPARATOR . $finalName)) {
            $base = pathinfo($safeName, PATHINFO_FILENAME);
            $ext = strtolower(pathinfo($safeName, PATHINFO_EXTENSION));
            $finalName = $base . '-' . $counter . '.' . $ext;
            $counter++;
        }

        $savePath = $targetDir . DIRECTORY_SEPARATOR . $finalName;
        if (!@move_uploaded_file($tmp, $savePath)) {
            header('Location: models.php?error=Failed%20to%20save%20the%20GLB%20model');
            exit;
        }

        header('Location: models.php?success=Model%20uploaded%20successfully');
        exit;
    }
}

$enemyOptions = ['random' => 'Random', 'all' => 'All available'];
foreach ($enemyCandidates as $enemy) {
    $enemyOptions[$enemy] = $enemy;
}

$weaponOptions = ['random' => 'Random', 'all' => 'All available'];
foreach ($weaponCandidates as $weapon) {
    $weaponOptions[$weapon] = $weapon;
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Model Manager</title>
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
        <section class="panel shell model-panel">
            <div class="section-header">
                <h2>Model Management</h2>
            </div>

            <form method="post" action="models.php" class="settings-form">
                <label>
                    <span>Enemy</span>
                    <select name="enemy">
                        <?php foreach ($enemyOptions as $value => $label): ?>
                            <option value="<?= htmlspecialchars($value, ENT_QUOTES, 'UTF-8') ?>" <?= $config['enemy'] === $value ? 'selected' : '' ?>><?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8') ?></option>
                        <?php endforeach; ?>
                    </select>
                </label>

                <label>
                    <span>Weapon</span>
                    <select name="weapon">
                        <?php foreach ($weaponOptions as $value => $label): ?>
                            <option value="<?= htmlspecialchars($value, ENT_QUOTES, 'UTF-8') ?>" <?= $config['weapon'] === $value ? 'selected' : '' ?>><?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8') ?></option>
                        <?php endforeach; ?>
                    </select>
                </label>

                <button type="submit" class="primary full-width">Save configuration</button>
            </form>

            <form method="post" action="models.php" enctype="multipart/form-data" class="upload-form model-upload-form">
                <label class="file-picker">
                    <span>Upload GLB model</span>
                    <input type="file" name="glbModel" accept=".glb,model/gltf-binary" required>
                </label>
                <button type="submit" class="secondary full-width">Upload model</button>
            </form>

            <?php if (isset($_GET['error'])): ?>
                <div class="message error"><?= htmlspecialchars((string) $_GET['error'], ENT_QUOTES, 'UTF-8') ?></div>
            <?php endif; ?>
            <?php if (isset($_GET['success'])): ?>
                <div class="message success"><?= htmlspecialchars((string) $_GET['success'], ENT_QUOTES, 'UTF-8') ?></div>
            <?php endif; ?>
        </section>
    </main>
</body>
</html>
