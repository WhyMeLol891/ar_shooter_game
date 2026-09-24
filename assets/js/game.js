import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { MindARThree } from 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js';
import { Enemy } from './enemy.js';
import { WeaponSystem } from './weapon.js';
import { EffectSystem } from './effects.js';
import { GameAudio } from './audio.js';

const normalizeAssetUrl = (value) => {
    if (!value) return value;
    let sanitized = String(value).replace(/\\/g, '/').replace(/^\.?\//, '');
    for (let i = 0; i < 2; i += 1) {
        try {
            const decoded = decodeURIComponent(sanitized);
            if (decoded === sanitized) break;
            sanitized = decoded;
        } catch (error) {
            break;
        }
    }
    return sanitized;
};

const legacyWarnFilter = (() => {
    const originalWarn = console.warn.bind(console);
    console.warn = (...args) => {
        const message = args.map((arg) => String(arg)).join(' ');
        if (message.includes('Property .outputEncoding has been removed')) {
            return;
        }
        originalWarn(...args);
    };
    return originalWarn;
})();

if (THREE.WebGLRenderer && !Object.getOwnPropertyDescriptor(THREE.WebGLRenderer.prototype, 'outputEncoding')) {
    Object.defineProperty(THREE.WebGLRenderer.prototype, 'outputEncoding', {
        configurable: true,
        enumerable: true,
        get() {
            return this._outputEncoding ?? THREE.sRGBEncoding;
        },
        set(value) {
            this._outputEncoding = value;
            if (value === THREE.sRGBEncoding || value === 'sRGBEncoding') {
                this.outputColorSpace = THREE.SRGBColorSpace;
            } else if (value === THREE.NoColorSpace || value === 'NoColorSpace') {
                this.outputColorSpace = THREE.NoColorSpace;
            }
        },
    });
}

const scoreValue = document.getElementById('score-value');
const waveValue = document.getElementById('wave-value');
const hpValue = document.getElementById('hp-value');
const ammoValue = document.getElementById('ammo-value');
const fireButton = document.getElementById('fire-button');
const reloadButton = document.getElementById('reload-button');
const gameOverPanel = document.getElementById('game-over-panel');
const restartButton = document.getElementById('restart-button');
const damageFlash = document.getElementById('damage-flash');
const hitFlash = document.getElementById('hit-flash');
const crosshair = document.getElementById('crosshair');
const warningBanner = document.getElementById('warning-banner');
const compatibilityPanel = document.getElementById('compatibility-panel');
const compatibilityMessage = document.getElementById('compatibility-message');

function showCompatibilityError(message) {
    if (compatibilityMessage) compatibilityMessage.textContent = message;
    if (compatibilityPanel) compatibilityPanel.classList.remove('hidden');
    if (warningBanner) warningBanner.classList.add('hidden');
}

class GameManager {
    constructor() {
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.anchor = null;
        this.worldGroup = null;
        this.weaponScene = null;
        this.mindar = null;
        this.effectSystem = null;
        this.audio = new GameAudio();
        this.weapon = null;
        this.enemies = [];
        this.score = 0;
        this.wave = 1;
        this.hp = 5;
        this.state = 'READY';
        this.targetFound = false;
        this.running = false;
        this.gameOver = false;
        this.firing = false;
        this.fireLock = false;
        this.shake = 0;
        this.config = null;
        this.clock = new THREE.Clock();
        this.raycaster = new THREE.Raycaster();
        this.hitPoint = new THREE.Vector3();
        this.lastEnemyId = 0;
        this.nextWaveTimer = 0;
        this.pendingWave = false;
        this.reloadCooldown = 0;
        this.weaponModelUrl = 'assets/models/FPS pack.undefined-glb/Fps Rig AKM.glb';
        this.playerPosition = new THREE.Vector3(0, 0, 0);
        this.mobility = 0;
    }

    async init() {
        if (window.AR_TARGET_MISSING) {
            warningBanner.classList.remove('hidden');
            return;
        }

        if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            showCompatibilityError('Camera access requires HTTPS. Use an HTTPS LAN URL on your phone, or test on this computer with http://localhost/ar_shooter_game/game.php.');
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            showCompatibilityError('This browser does not provide camera access. Open the game in Chrome on Android or Safari on iPhone.');
            return;
        }

        warningBanner.textContent = 'Starting camera...';
        warningBanner.classList.remove('hidden');

        const configResponse = await fetch('api/models.php', { cache: 'no-store' });
        this.config = await configResponse.json();
        const weaponCandidates = Array.isArray(this.config.weaponCandidates) ? this.config.weaponCandidates : [];
        const fallbackWeapon = weaponCandidates.length ? weaponCandidates[0] : 'assets/models/FPS pack.undefined-glb/Fps Rig AKM.glb';
        const selectedWeapon = this.config.weaponUrl || fallbackWeapon;
        this.weaponModelUrl = normalizeAssetUrl(selectedWeapon);

        const container = document.getElementById('ar-container');
        this.mindar = new MindARThree({
            container,
            imageTargetSrc: (window.AR_TARGET_SRC || 'assets/targets/targets.mind') + '?v=' + Date.now(),
            uiLoading: 'yes',
            uiScanning: 'no',
            uiError: 'no',
        });
        const { renderer, scene, camera, arController } = this.mindar;
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        if (!camera.parent) {
            scene.add(camera);
        }
        this.effectSystem = new EffectSystem(scene);
        this.weaponScene = new THREE.Scene();

        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.autoClear = false;

        const ambient = new THREE.AmbientLight(0xffffff, 1.4);
        const hemi = new THREE.HemisphereLight(0xbde0ff, 0x1a0e00, 0.9);
        const dir = new THREE.DirectionalLight(0xffffff, 1.1);
        dir.position.set(2, 4, 1.5);
        scene.add(ambient, hemi, dir);

        this.anchor = this.mindar.addAnchor(0);
        this.worldGroup = new THREE.Group();
        this.anchor.group.add(this.worldGroup);

        this.weapon = new WeaponSystem({
            scene: this.scene,
            overlayScene: this.weaponScene,
            modelUrl: this.weaponModelUrl,
            camera: this.camera,
            onFire: (type) => this.handleWeaponEvent(type),
            onReload: () => this.handleReloadFinish(),
        });

        try {
            await this.mindar.start();
        } catch (error) {
            console.error('MindAR could not start:', error);
            showCompatibilityError('Camera startup failed. Allow camera access and open the game over HTTPS or localhost.');
            return;
        }
        const cameraVideo = document.querySelector('#ar-container video');
        if (cameraVideo) {
            cameraVideo.setAttribute('playsinline', '');
            cameraVideo.muted = true;
            cameraVideo.style.setProperty('display', 'block', 'important');
            cameraVideo.style.setProperty('visibility', 'visible', 'important');
            cameraVideo.style.setProperty('opacity', '1', 'important');
            cameraVideo.style.setProperty('z-index', '0', 'important');
        }
        warningBanner.textContent = 'Point the camera at your target image';
        window.setTimeout(() => warningBanner.classList.add('hidden'), 3500);
        this.state = 'CAMERA_ACTIVE';
        this.running = true;
        this.startLoop();

        this.anchor.onTargetFound = () => {
            this.targetFound = true;
            this.state = 'TARGET_FOUND';
            this.spawnWave();
        };

        this.anchor.onTargetLost = () => {
            this.targetFound = false;
            this.state = 'TARGET_LOST';
        };

        this.bindControls();
        this.updateHud();
    }

    bindControls() {
        const handlePointerDown = (event) => {
            event.preventDefault();
            this.audio.unlock();
            this.firing = true;
            this.tryShoot();
        };

        const handlePointerUp = (event) => {
            event.preventDefault();
            this.firing = false;
        };

        fireButton.addEventListener('pointerdown', handlePointerDown);
        fireButton.addEventListener('pointerup', handlePointerUp);
        fireButton.addEventListener('pointerleave', handlePointerUp);
        fireButton.addEventListener('touchstart', handlePointerDown, { passive: false });
        fireButton.addEventListener('touchend', handlePointerUp, { passive: false });

        reloadButton.addEventListener('click', (event) => {
            event.preventDefault();
            this.audio.unlock();
            this.reloadWeapon();
        });

        restartButton.addEventListener('click', () => this.restartGame());

        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space' || event.key.toLowerCase() === 'f') {
                event.preventDefault();
                this.firing = true;
                this.tryShoot();
            }
            if (event.key.toLowerCase() === 'r') {
                this.reloadWeapon();
            }
        });

        document.addEventListener('keyup', (event) => {
            if (event.code === 'Space' || event.key.toLowerCase() === 'f') {
                this.firing = false;
            }
        });

        document.addEventListener('pointerdown', () => this.audio.unlock());
    }

    startLoop() {
        const animate = () => {
            const dt = Math.min(this.clock.getDelta(), 0.05);
            this.update(dt);
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    update(dt) {
        if (this.weapon) {
            this.weapon.update(dt);
        }

        if (this.effectSystem) {
            this.effectSystem.update(dt);
        }

        if (this.shake > 0) {
            this.shake = Math.max(0, this.shake - dt * 6);
        }

        if (this.firing && this.running && this.targetFound) {
            this.tryShoot();
        }

        if (this.targetFound && this.running) {
            this.updateEnemyMovement(dt);
        }

        if (this.gameOver) {
            return;
        }

        if (this.pendingWave && this.enemies.length === 0) {
            this.pendingWave = false;
            this.wave += 1;
            this.state = 'NEXT_WAVE';
            this.spawnWave();
        }

        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
        this.renderer.clearDepth();
        if (this.weapon) {
            this.weapon.render(this.renderer);
        }
        this.updateHud();
    }

    handleWeaponEvent(type) {
        if (!this.running || this.gameOver) return;
        if (type === 'shot') {
            this.audio.shoot();
            this.fireFlash();
            this.tryRaycast();
        }
        if (type === 'empty') {
            this.audio.empty();
        }
    }

    handleReloadFinish() {
        this.audio.reload();
    }

    tryShoot() {
        if (!this.running || this.gameOver || !this.weapon || this.weapon.reloading) {
            return;
        }
        if (this.weapon.triggerFire()) {
            this.fireFlash();
            this.tryRaycast();
        }
    }

    fireFlash() {
        crosshair.classList.add('hit');
        setTimeout(() => crosshair.classList.remove('hit'), 100);
    }

    reloadWeapon() {
        if (!this.running || this.weapon.reloading) return;
        this.weapon.reload();
    }

    updateHud() {
        scoreValue.textContent = String(this.score);
        waveValue.textContent = String(this.wave);
        hpValue.textContent = String(this.hp);
        ammoValue.textContent = this.weapon ? this.weapon.getAmmoState() : '30/30';
    }

    spawnWave() {
        if (this.gameOver) return;
        if (!this.targetFound) return;
        if (this.enemies.length > 0) return;

        const enemyCount = Math.min(1 + Math.floor((this.wave - 1) / 2), 4);
        for (let i = 0; i < enemyCount; i++) {
            const enemy = new Enemy({
                modelUrl: this.resolveEnemyModelUrl(),
                scene: this.scene,
                worldGroup: this.worldGroup,
                playerPosition: this.playerPosition,
                wave: this.wave,
                onDeath: (position) => this.handleEnemyDeath(position),
                onAttack: () => this.handleEnemyAttack(),
                effectSystem: this.effectSystem,
            });
            enemy.group.position.set((Math.random() - 0.5) * 0.8, 0, -0.6 - Math.random() * 0.8);
            this.enemies.push(enemy);
        }
        this.audio.wave();
    }

    resolveEnemyModelUrl() {
        if (!this.config) return 'assets/models/ghost-skull.glb';
        if (this.config.enemyUrl) {
            return normalizeAssetUrl(this.config.enemyUrl);
        }
        const enemyCandidates = Array.isArray(this.config.enemyCandidates) ? this.config.enemyCandidates : [];
        if (!enemyCandidates.length) {
            return normalizeAssetUrl('assets/models/ghost-skull.glb');
        }

        const mode = this.config.enemy ?? 'random';
        const preferred = mode === 'all' || mode === 'random'
            ? enemyCandidates[Math.floor(Math.random() * enemyCandidates.length)]
            : mode;
        const selected = enemyCandidates.includes(preferred) ? preferred : enemyCandidates[0];
        return normalizeAssetUrl('assets/models/' + selected);
    }

    updateEnemyMovement(dt) {
        const targetPos = this.playerPosition;
        for (const enemy of this.enemies) {
            if (!enemy || !enemy.isAlive) continue;
            enemy.playerPosition = targetPos;
            enemy.update(dt, this.targetFound);
            if (enemy.group.position.distanceTo(targetPos) < 0.15) {
                enemy.group.position.set(targetPos.x, targetPos.y, targetPos.z);
            }
        }
    }

    tryRaycast() {
        if (!this.camera) return;
        const rayOrigin = new THREE.Vector2(0, 0);
        this.raycaster.setFromCamera(rayOrigin, this.camera);
        let exactHit = null;

        for (const enemy of this.enemies) {
            if (!enemy || !enemy.isAlive || !enemy.model) continue;
            const hitObjects = [];
            enemy.model.traverse((child) => {
                if (child.isMesh) hitObjects.push(child);
            });
            const hits = this.raycaster.intersectObjects(hitObjects, true);
            if (hits.length > 0) {
                const point = hits[0].point.clone();
                exactHit = { enemy, point };
                break;
            }
        }

        if (!exactHit) {
            this.effectSystem.addTracer(new THREE.Vector3(0.15, -0.2, -1.2), new THREE.Vector3(0, 0, -0.8), 0xffb000);
            return;
        }

        exactHit.enemy.takeDamage(1, exactHit.point);
        this.effectSystem.addTracer(new THREE.Vector3(0.15, -0.2, -1.2), exactHit.point.clone(), 0xffdd66);
        hitFlash.classList.add('flash');
        setTimeout(() => hitFlash.classList.remove('flash'), 120);
        this.audio.hit();
        this.shake = 0.22;

        if (exactHit.enemy.isDead) {
            this.score += 100 + (this.wave * 25);
            this.pendingWave = true;
        }
    }

    handleEnemyDeath(position) {
        if (!this.effectSystem) return;
        this.effectSystem.addBurst(position, 0xffae42, 2.8);
        this.audio.death();
        this.shake = 0.6;
        this.score += 100 + (this.wave * 25);
        this.enemies = this.enemies.filter((enemy) => enemy.isAlive);
    }

    handleEnemyAttack() {
        this.hp = Math.max(0, this.hp - 1);
        this.audio.attack();
        this.shake = 0.7;
        damageFlash.style.opacity = '1';
        setTimeout(() => { damageFlash.style.opacity = '0'; }, 120);
        if (this.hp <= 0) {
            this.endGame();
        }
    }

    endGame() {
        this.running = false;
        this.gameOver = true;
        gameOverPanel.classList.remove('hidden');
        const scoreText = document.getElementById('game-over-score');
        const waveText = document.getElementById('game-over-wave');
        scoreText.textContent = `Score: ${this.score}`;
        waveText.textContent = `Reached Wave: ${this.wave}`;
    }

    restartGame() {
        if (this.mindar && this.mindar.stop) {
            this.mindar.stop();
        }
        this.score = 0;
        this.wave = 1;
        this.hp = 5;
        this.running = true;
        this.gameOver = false;
        this.firing = false;
        this.targetFound = false;
        this.pendingWave = false;
        this.shake = 0;
        this.enemies.forEach((enemy) => {
            if (enemy && enemy.worldGroup) enemy.worldGroup.remove(enemy.group);
        });
        this.enemies = [];
        if (gameOverPanel) gameOverPanel.classList.add('hidden');
        if (this.mindar && this.mindar.start) {
            this.mindar.start();
        }
        this.state = 'READY';
        this.updateHud();
        this.spawnWave();
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    const game = new GameManager();
    try {
        await game.init();
        window.AR_GAME = game;
    } catch (error) {
        console.error('Game initialization failed:', error);
        warningBanner.textContent = 'Game startup failed. Check the target file and camera permission.';
        warningBanner.classList.remove('hidden');
    }
});
