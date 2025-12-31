const socket = io();
const isDisplay = document.body.id === 'display-page';
const isControl = document.body.id === 'control-page';

if (isDisplay) {
    const videoElem = document.getElementById('bg-video');
    const mainText = document.getElementById('main-text');
    const handsWrapper = document.getElementById('hands-wrapper');
    const countdownElem = document.getElementById('countdown-display');
    const targetIdentity = document.getElementById('target-identity');
    const shockwave = document.getElementById('shockwave');
    const blackOverlay = document.getElementById('black-overlay');
    
    const canvas = document.getElementById('cable-canvas');
    const ctx = canvas.getContext('2d');
    
    const countdownAudio = document.getElementById('countdown-audio');
    const startAudio = document.getElementById('start-audio');
    const handAudio = document.getElementById('hand-audio');
    const startOverlay = document.getElementById('start-overlay');
    const ringBorder = document.querySelector('.ring-border');
    const oldNameText = document.querySelector('.old-name');
    
    let isSequenceFinished = false; 
    let animationFrameId;
    let activeHandCount = 0;
    let isAnimating = false;
    
    // Biến mới để xử lý delay nổ
    let explosionTimeout = null; 
    let isOverloading = false; // Trạng thái đang chờ nổ

    // Object lưu thời gian kích hoạt
    let handTimers = {}; 

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 1. CLICK START
    if (startOverlay) {
        startOverlay.addEventListener('click', () => {
            startOverlay.style.display = 'none';
            startAudio.muted = false; startAudio.volume = 0.8;
            videoElem.play().catch(e => console.log(e));
            startAudio.play().catch(()=>{});
            countdownAudio.volume = 0; countdownAudio.play().then(() => { countdownAudio.pause(); countdownAudio.currentTime = 0; countdownAudio.volume = 1; });
            handAudio.volume = 0; handAudio.play().then(() => { handAudio.pause(); handAudio.currentTime = 0; handAudio.volume = 1; });
        });
    }

    // 2. SOCKET
    socket.on('show-hands', () => {
        if(isSequenceFinished) return;
        mainText.classList.add('move-up');
        handsWrapper.classList.add('show');
    });

    socket.on('update-hand', (data) => {
        if (isSequenceFinished) return;
        
        const { index, status } = data;
        const hands = document.querySelectorAll('.hand-icon');
        const hand = hands[index];

        if (hand) {
            if (status) {
                if (!hand.classList.contains('active')) {
                    hand.classList.remove('fa-regular');
                    hand.classList.add('fa-solid', 'active');
                    handAudio.currentTime = 0;
                    handAudio.play().catch(()=>{});
                    
                    // Lưu thời điểm kích hoạt
                    handTimers[index] = Date.now();
                }
            } else {
                if (hand.classList.contains('active')) {
                    hand.classList.remove('fa-solid', 'active');
                    hand.classList.add('fa-regular');
                    delete handTimers[index];
                }
            }

            // Đếm lại số tay active
            const activeHands = document.querySelectorAll('.hand-icon.active');
            activeHandCount = activeHands.length;

            updateEnergyState();
        }
    });

    function updateEnergyState() {
        if (isOverloading) return;

        if (activeHandCount > 0 && !isAnimating) {
            isAnimating = true;
            animateLoop();
        }

        if (activeHandCount > 0) {
            targetIdentity.classList.add('under-attack');
            
            // 1. Tăng độ sáng của viền theo số tay
            // opacity từ 0.2 -> 1
            ringBorder.style.opacity = (0.2 + activeHandCount * 0.15).toString();
            ringBorder.style.borderWidth = `${5 + activeHandCount * 2}px`; // Viền dày lên

            // 2. Hiệu ứng Glitch cho chữ
            // Set text shadow đỏ rực lên
            oldNameText.style.textShadow = `0 0 ${activeHandCount * 10}px #ff0000`;
            
            // Nếu tay > 3 (quá nửa) -> Bắt đầu giật lag (Glitch)
            if (activeHandCount >= 3) {
                oldNameText.classList.add('glitch');
                // Cần set attribute data-text để CSS ::before/::after hoạt động
                oldNameText.setAttribute('data-text', oldNameText.innerText);
            } else {
                oldNameText.classList.remove('glitch');
            }

        } else {
            targetIdentity.classList.remove('under-attack');
            oldNameText.classList.remove('glitch');
            ringBorder.style.opacity = '1';
            ringBorder.style.borderWidth = '5px';
            oldNameText.style.textShadow = 'none';
        }

        // --- ĐỦ 6 TAY ---
        if (activeHandCount === 6) {
            isOverloading = true;
            
            // Trạng thái cực hạn (Critical)
            targetIdentity.classList.add('critical');
            
            explosionTimeout = setTimeout(() => {
                triggerExplosionAndCountdown();
            }, 500);
        } else {
             targetIdentity.classList.remove('critical');
        }
    }

    // --- VẼ SẤM SÉT ---
    function drawLightning(x1, y1, x2, y2, progress) {
        const fullDx = x2 - x1;
        const fullDy = y2 - y1;
        
        const currentX2 = x1 + fullDx * progress;
        const currentY2 = y1 + fullDy * progress;

        const dx = currentX2 - x1;
        const dy = currentY2 - y1;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Vẽ ngay cả khi ngắn để tạo cảm giác xuất phát
        if (dist < 1) return;

        const segments = 12;
        const amplitude = dist / 10; 

        ctx.beginPath();
        ctx.moveTo(x1, y1);

        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const idealX = x1 + dx * t;
            const idealY = y1 + dy * t;

            let offsetX = 0;
            let offsetY = 0;

            if (i < segments) {
                offsetX = (Math.random() - 0.5) * amplitude;
                offsetY = (Math.random() - 0.5) * amplitude;
            }
            ctx.lineTo(idealX + offsetX, idealY + offsetY);
        }

        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff4500';
        ctx.strokeStyle = '#ffffcc';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    function animateLoop() {
        if (!isAnimating) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const rect = targetIdentity.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const activeHands = document.querySelectorAll('.hand-icon.active');
        const now = Date.now();

        activeHands.forEach(hand => {
            const indexStr = hand.getAttribute('data-index');
            const index = indexStr ? parseInt(indexStr) : -1;
            
            const rect = hand.getBoundingClientRect();
            const hx = rect.left + rect.width / 2;
            const hy = rect.top + 80;
            
            let progress = 1; 

            if (index !== -1 && handTimers[index]) {
                const duration = 100; // 0.1 giây chạy tia sét
                const elapsed = now - handTimers[index];
                progress = elapsed / duration;
                if (progress > 1) progress = 1;
            }

            drawLightning(hx, hy, cx, cy, progress);
        });

        // Vòng lặp vẫn chạy kể cả khi đang chờ nổ (isOverloading)
        if (!isSequenceFinished) {
            animationFrameId = requestAnimationFrame(animateLoop);
        }
    }

    function triggerExplosionAndCountdown() {
        isSequenceFinished = true;
        
        shockwave.classList.add('explode');
        startAudio.pause();
        countdownAudio.currentTime = 0;
        countdownAudio.play().catch(()=>{});

        // Dừng vẽ canvas lúc này
        isAnimating = false;
        cancelAnimationFrame(animationFrameId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        handsWrapper.style.opacity = '0';
        mainText.style.opacity = '0';
        targetIdentity.style.opacity = '0';
        targetIdentity.classList.remove('under-attack', 'critical');

        setTimeout(() => {
            startCountdown();
        }, 100); 
    }

    function startCountdown() {
        countdownElem.style.display = 'block';
        let count = 10;
        
        const runNumberEffect = (num) => {
            countdownElem.innerText = num;
            
            countdownElem.classList.remove('slam-effect');
            void countdownElem.offsetWidth; 
            countdownElem.classList.add('slam-effect');

            shockwave.classList.remove('explode');
            void shockwave.offsetWidth; 
            shockwave.classList.add('explode');
        };

        runNumberEffect(count);

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                runNumberEffect(count);
            } else {
                clearInterval(interval);
                finishSequence();
            }
        }, 1000);
    }

    function finishSequence() {
        shockwave.classList.remove('explode');
        blackOverlay.classList.add('fade-out');

        setTimeout(() => {
            countdownElem.style.display = 'none';
            playNextVideo();
            setTimeout(() => {
                blackOverlay.classList.remove('fade-out');
            }, 500);
        }, 1500); 
    }

    function playNextVideo() {
        videoElem.src = 'videos/next.mp4';
        videoElem.loop = false;
        videoElem.muted = false;
        videoElem.play().catch(e => console.log(e));
    }

    socket.on('reset-system', () => {
        isSequenceFinished = false;
        isAnimating = false;
        isOverloading = false;
        activeHandCount = 0;
        handTimers = {}; 

        // Xóa timeout nếu đang đếm ngược để nổ mà bấm reset
        if (explosionTimeout) {
            clearTimeout(explosionTimeout);
            explosionTimeout = null;
        }

        cancelAnimationFrame(animationFrameId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        countdownAudio.pause();
        startAudio.currentTime = 0;
        startAudio.play().catch(()=>{});

        videoElem.src = 'videos/idle.mp4';
        videoElem.loop = true;
        videoElem.play();

        mainText.classList.remove('move-up');
        mainText.style.opacity = '1';
        handsWrapper.classList.remove('show');
        handsWrapper.style.opacity = ''; 
        
        targetIdentity.style.opacity = '1';
        targetIdentity.classList.remove('under-attack', 'critical');
        oldNameText.classList.remove('glitch');
        
        shockwave.classList.remove('explode');
        countdownElem.style.display = 'none';
        
        blackOverlay.classList.remove('fade-out');

        document.querySelectorAll('.hand-icon').forEach(h => {
            h.classList.remove('active', 'fa-solid');
            h.classList.add('fa-regular');
        });
    });
}

// Logic CONTROL giữ nguyên...
if (isControl) {
    const btnShow = document.getElementById('btn-show-hands');
    const handBtns = document.querySelectorAll('.hand-btn');
    const btnReset = document.getElementById('btn-reset');
    let handStates = [false, false, false, false, false, false];

    btnShow.addEventListener('click', () => {
        socket.emit('trigger-hands');
        btnShow.disabled = true;
        btnShow.innerText = "HANDS DEPLOYED";
    });

    handBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.getAttribute('data-index'));
            handStates[index] = !handStates[index];
            socket.emit('toggle-hand', { index: index, status: handStates[index] });
            if (handStates[index]) btn.classList.add('tapped');
            else btn.classList.remove('tapped');
        });
    });

    btnReset.addEventListener('click', () => {
        socket.emit('trigger-reset');
        btnShow.disabled = false;
        btnShow.innerText = "START (Show Hands)";
        handBtns.forEach(btn => btn.classList.remove('tapped'));
        handStates.fill(false);
    });
}