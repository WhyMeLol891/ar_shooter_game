<?php

declare(strict_types=1);

require_once __DIR__ . '/api/site_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.php');
    exit;
}

if (!isset($_FILES['targetImage']) || !is_array($_FILES['targetImage'])) {
    header('Location: index.php?error=No%20image%20file%20provided');
    exit;
}

$file = $_FILES['targetImage'];
$targetDir = app_root() . '/assets/targets';
ensure_directory($targetDir);

if ($file['error'] !== UPLOAD_ERR_OK) {
    header('Location: index.php?error=Upload%20failed');
    exit;
}

if (!is_uploaded_file($file['tmp_name'] ?? '')) {
    header('Location: index.php?error=Invalid%20upload');
    exit;
}

if ((int) $file['size'] > 12 * 1024 * 1024) {
    header('Location: index.php?error=Image%20file%20is%20too%20large');
    exit;
}

$raw = @file_get_contents($file['tmp_name']);
if ($raw === false || strlen($raw) < 12) {
    header('Location: index.php?error=Unable%20to%20read%20image%20file');
    exit;
}

$allowedMimeTypes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
];

$finfo = @finfo_open(FILEINFO_MIME_TYPE);
$mimeType = $finfo ? @finfo_file($finfo, $file['tmp_name']) : null;
if ($finfo) {
    @finfo_close($finfo);
}

if ($mimeType === false || !isset($allowedMimeTypes[$mimeType])) {
    header('Location: index.php?error=Unsupported%20image%20type.%20Please%20upload%20JPG%2C%20PNG%2C%20or%20WEBP.');
    exit;
}

$imageInfo = @getimagesize($file['tmp_name']);
if ($imageInfo === false || empty($imageInfo[0]) || empty($imageInfo[1])) {
    header('Location: index.php?error=Invalid%20or%20corrupt%20image%20file.');
    exit;
}

$targetJpg = $targetDir . DIRECTORY_SEPARATOR . 'picture.jpg';

// Convert or save directly as picture.jpg
if (function_exists('imagecreatefromstring')) {
    $srcImg = @imagecreatefromstring($raw);
    if ($srcImg !== false) {
        $width = imagesx($srcImg);
        $height = imagesy($srcImg);
        $trueColor = imagecreatetruecolor($width, $height);
        $white = imagecolorallocate($trueColor, 255, 255, 255);
        imagefill($trueColor, 0, 0, $white);
        imagecopy($trueColor, $srcImg, 0, 0, 0, 0, $width, $height);
        imagejpeg($trueColor, $targetJpg, 92);
        imagedestroy($srcImg);
        imagedestroy($trueColor);
    } else {
        @move_uploaded_file($file['tmp_name'], $targetJpg);
    }
} else {
    @move_uploaded_file($file['tmp_name'], $targetJpg);
}

// Clean up alternate format files if present
foreach (['picture.png', 'picture.webp', 'picture.jpeg'] as $alt) {
    $altPath = $targetDir . DIRECTORY_SEPARATOR . $alt;
    if (is_file($altPath)) {
        @unlink($altPath);
    }
}

$compileAfterUpload = isset($_POST['compileAfterUpload']) && $_POST['compileAfterUpload'] === '1';
if ($compileAfterUpload) {
    header('Location: compile-target.php');
    exit;
}

header('Location: index.php?success=Target%20uploaded%20successfully');
exit;
