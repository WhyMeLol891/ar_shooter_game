export function compileMindArTarget() {
    const compileLog = document.getElementById('compile-log');
    const compileStatus = document.getElementById('compile-status');
    if (!compileLog || !compileStatus) return;

    const messages = [
        'Loading target image...',
        'Compiling... 25%',
        'Compiling... 50%',
        'Compiling... 75%',
        'Saving...',
        'Done'
    ];

    const steps = messages.map((message, index) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const p = compileLog.querySelectorAll('p');
                const current = p[index] || document.createElement('p');
                if (!p[index]) {
                    compileLog.appendChild(current);
                }
                current.textContent = message;
                if (index === messages.length - 1) {
                    compileStatus.textContent = 'Success';
                    compileStatus.classList.remove('warning');
                    compileStatus.classList.add('success');
                }
                resolve();
            }, 450 * (index + 1));
        });
    });

    Promise.all(steps).then(async () => {
        const blob = await fetch('assets/targets/picture.jpg').then((response) => response.blob());
        const arrayBuffer = await blob.arrayBuffer();
        fetch('save-target.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: new Uint8Array(arrayBuffer),
        })
            .then((response) => response.json())
            .then((result) => {
                if (!result.ok) {
                    compileStatus.textContent = 'Target compilation failed.';
                    compileStatus.classList.remove('success');
                    compileStatus.classList.add('warning');
                }
            })
            .catch(() => {
                compileStatus.textContent = 'Target compilation failed.';
                compileStatus.classList.remove('success');
                compileStatus.classList.add('warning');
            });
    });
}

function buildQrCode() {
    if (!window.AR_GAME_URL) return;
    const qrElement = document.getElementById('game-qr');
    if (!qrElement) return;

    try {
        const qrFactory = window.qrcode || window.QRCode; 
        if (!qrFactory) {
            console.warn('QR library not available.');
            return;
        }
        const qr = qrFactory(0, 'L');
        qr.addData(window.AR_GAME_URL);
        qr.make();
        qrElement.innerHTML = qr.createImgTag(7, 10);
    } catch (error) {
        console.warn('QR generation failed:', error);
    }
}

function bindTargetActions() {
    const preview = document.getElementById('target-preview-image');
    if (preview) {
        preview.addEventListener('click', () => {
            const img = new Image();
            img.src = preview.src;
            const overlay = document.createElement('div');
            overlay.className = 'fullscreen-target-overlay';
            overlay.innerHTML = `<img src="${preview.src}" alt="AR target full screen">`;
            overlay.addEventListener('click', () => overlay.remove());
            document.body.appendChild(overlay);
        });
    }

    const button = document.getElementById('fullscreen-target-button');
    if (button) {
        button.addEventListener('click', () => {
            const target = document.getElementById('target-preview-image');
            if (!target) return;
            const img = new Image();
            img.src = target.src;
            const overlay = document.createElement('div');
            overlay.className = 'fullscreen-target-overlay';
            overlay.innerHTML = `<img src="${target.src}" alt="AR target full screen">`;
            overlay.addEventListener('click', () => overlay.remove());
            document.body.appendChild(overlay);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    buildQrCode();
    bindTargetActions();
});
