# Web-Based AR Shooter Game

A PHP-based mobile-friendly WebAR shooter built with Three.js and MindAR. The project supports custom target upload, GLB model management, QR-based access on mobile devices, and a simple FPS-style wave defense loop.

## Features

- WebAR image tracking using MindAR
- Three.js 3D environment and enemy models
- Mobile rear-camera support
- Enemy waves with increasing difficulty
- Shooting, reloading, score, HP, and restart flow
- Random enemy selection and custom GLB uploads
- Custom AR target upload and target compilation
- QR code access for phone play
- Responsive tactical dark interface

## Requirements

- PHP 8.3+
- Modern browser with WebGL and camera support
- HTTPS recommended for camera access
- XAMPP or cPanel shared hosting
- Android Chrome recommended for testing

## Installation

1. Copy the project folder into your XAMPP `htdocs` directory.
2. Start Apache from XAMPP.
3. Open `http://localhost/ar_shooter_game/index.php` in a browser.
4. Upload a target image.
5. Compile the target.
6. Open the game page and scan the QR code with a smartphone.

## cPanel deployment

1. Upload the project files to your hosting account.
2. Extract the files into the public web root.
3. Confirm PHP version is 8.3+.
4. Verify folder permissions allow file writes under `assets/`.
5. Open the site and upload a target image.
6. Compile the target before playing.
7. Use HTTPS for camera access.

## Camera requirements

Modern browsers generally require HTTPS for camera access. Local development may work over `localhost`, but LAN testing on a smartphone often requires a proper HTTPS configuration or tunnel.

## Troubleshooting

- If camera access fails, verify the site is served over HTTPS or localhost.
- If target tracking fails, use a high-contrast image and strong lighting.
- If the AR scene is blank, ensure `targets.mind` was generated and the file exists.
- If models do not load, confirm the uploaded GLB file is valid and contains binary GLTF data.
- If the game does not start, verify the browser has camera permissions and the target file exists.

## CDN libraries used

- Three.js 0.160.0
- MindAR 1.2.5
- QRCode generator
