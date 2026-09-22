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

$allowedTypes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
];
$finfo = @finfo_open(FILEINFO_MIME_TYPE);
$mimeType = $finfo ? @finfo_file($finfo, $file['tmp_name']) : null;
if ($mimeType === false || !isset($allowedTypes[$mimeType])) {
    header('Location: index.php?error=Unsupported%20image%20type');
    exit;
}

$extension = $allowedTypes[$mimeType];
$destination = $targetDir . DIRECTORY_SEPARATOR . 'picture.' . $extension;
if (!@move_uploaded_file($file['tmp_name'], $destination)) {
    header('Location: index.php?error=Failed%20to%20save%20the%20uploaded%20image');
    exit;
}

if ($extension !== 'jpg') {
    $tmpImage = imagecreatefromstring($raw);
    if ($tmpImage !== false) {
        $converted = imagecreatetruecolor(imagesx($tmpImage), imagesy($tmpImage));
        $white = imagecolorallocate($converted, 255, 255, 255);
        imagefill($converted, 0, 0, $white);
        imagecopy($converted, $tmpImage, 0, 0, 0, 0, imagesx($tmpImage), imagesy($tmpImage));
        imagejpeg($converted, $targetDir . DIRECTORY_SEPARATOR . 'picture.jpg', 92);
        imagedestroy($tmpImage);
        imagedestroy($converted);
    }
}

if (!is_file($targetDir . DIRECTORY_SEPARATOR . 'picture.jpg') && is_file($targetDir . DIRECTORY_SEPARATOR . 'picture.png')) {
    $tmpImage = imagecreatefrompng($targetDir . DIRECTORY_SEPARATOR . 'picture.png');
    if ($tmpImage !== false) {
        imagejpeg($tmpImage, $targetDir . DIRECTORY_SEPARATOR . 'picture.jpg', 92);
        imagedestroy($tmpImage);
    }
}

$compileAfterUpload = isset($_POST['compileAfterUpload']) && $_POST['compileAfterUpload'] === '1';
if ($compileAfterUpload) {
    header('Location: compile-target.php');
    exit;
}

header('Location: index.php?success=Target%20uploaded%20successfully');
exit;
