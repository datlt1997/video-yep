const socket = io();
const isDisplay = document.body.id === 'display-page';
const isControl = document.body.id === 'control-page';

if (isDisplay) {
    /* =========================================
       1. SETUP & CONFIG
       ========================================= */
    const videoElem = document.getElementById('bg-video');
    const mainText = document.getElementById('main-text');
    const handsWrapper = document.getElementById('hands-wrapper');
    const countdownElem = document.getElementById('countdown-display');
    const blackHole = document.getElementById('black-hole');
    const canvas = document.getElementById('cable-canvas');
    const ctx = canvas.getContext('2d');
    
    // Audio
    const countdownAudio = document.getElementById('countdown-audio');
    const startAudio = document.getElementById('start-audio');
    const handAudio = document.getElementById('hand-audio');
    const waitingAudio = document.getElementById('waiting-audio'); // CẬP NHẬT: Nhạc chờ
    
    const startOverlay = document.getElementById('start-overlay');
    
    // VARIABLES
    let isSequenceFinished = false; 
    let animationFrameId;
    let activeHandCount = 0;
    let isAnimating = false;
    let currentHoleScale = 0; 
    let particles = []; 
    
    let isOverloading = false;       
    let isSpawningAllowed = true;    
    let isNameSuckingStarted = false; 

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // CLICK START
    if (startOverlay) {
        startOverlay.addEventListener('click', () => {
            startOverlay.style.display = 'none';
            startAudio.muted = false; startAudio.volume = 0.8;
            videoElem.play().catch(()=>{}); startAudio.play().catch(()=>{});
            
            // CẬP NHẬT: Preload cả waitingAudio
            [countdownAudio, handAudio, waitingAudio].forEach(a => { 
                if(a) { a.volume=0; a.play().then(()=>{a.pause();a.currentTime=0;a.volume=1;}).catch(()=>{}); }
            });
        });
    }

    /* =========================================
       2. SOCKETS
       ========================================= */
    socket.on('show-hands', () => { 
        if(!isSequenceFinished) {
            handsWrapper.classList.add('show');
            
            startAudio.pause();
            if(waitingAudio) {
                waitingAudio.currentTime = 0;
                waitingAudio.volume = 0.7;
                waitingAudio.play().catch(e => console.log(e));
            }
        } 
    });

    socket.on('update-hand', (data) => {
        if (isSequenceFinished) return;
        const { index, status } = data;
        const hands = document.querySelectorAll('.hand-icon');
        const hand = hands[index];
        if (hand) {
            if (status) {
                if (!hand.classList.contains('active')) {
                    hand.classList.remove('fa-regular'); hand.classList.add('fa-solid', 'active');
                    handAudio.currentTime=0; handAudio.play().catch(()=>{});
                    hand.nextSpawnTime = Date.now() + Math.random() * 500;
                }
            } else {
                if (hand.classList.contains('active')) {
                    hand.classList.remove('fa-solid', 'active'); hand.classList.add('fa-regular');
                }
            }
            activeHandCount = document.querySelectorAll('.hand-icon.active').length;

            if (waitingAudio) {
                let newVolume = 0.7 + (activeHandCount * 0.05);
                
                if (newVolume > 1.0) newVolume = 1.0;
                
                waitingAudio.volume = newVolume;
            }
            updateEnergyState();
        }
    });

    /* =========================================
       3. LOGIC HỐ ĐEN
       ========================================= */
    function updateEnergyState() {
        if (isOverloading) return;

        if (activeHandCount > 0 && !isAnimating) {
            isAnimating = true;
            animateLoop();
        }

        if (activeHandCount > 0) {
            if (currentHoleScale < 0.3) {
                currentHoleScale = 0.3;
                blackHole.style.transform = `translate(-50%, -50%) scale(${currentHoleScale})`;
            }

            const shakeIntensity = activeHandCount * 1.5; 
            const rX = (Math.random()-0.5)*shakeIntensity*2;
            const rY = (Math.random()-0.5)*shakeIntensity*2;
            const rRot = (Math.random()-0.5)*(activeHandCount*0.5);
            mainText.style.transform = `translate(calc(-50% + ${rX}px), calc(-50% + ${rY}px)) rotate(${rRot}deg)`;
        } 
        else if (activeHandCount === 0) {
            currentHoleScale = 0;
            blackHole.style.transform = `translate(-50%, -50%) scale(0)`;
            mainText.style.transform = `translate(-50%, -50%)`;
        }

        if (activeHandCount === 6) {
            isOverloading = true; 
            setTimeout(() => {
                triggerPhase2_StopHands();
            }, 3000);
        }
    }

    // GIAI ĐOẠN 2
    function triggerPhase2_StopHands() {
        isSpawningAllowed = false;
        handsWrapper.style.transition = 'opacity 0.8s'; 
        handsWrapper.style.opacity = '0';
        setTimeout(() => {
            triggerPhase3_SuckName();
        }, 1000);
    }

    // GIAI ĐOẠN 3
    function triggerPhase3_SuckName() {
        if (isNameSuckingStarted) return;
        isNameSuckingStarted = true;
        isSequenceFinished = true; 
        
        if(waitingAudio) waitingAudio.pause();

        currentHoleScale += 0.3;
        blackHole.style.transform = `translate(-50%, -50%) scale(${currentHoleScale})`;

        mainText.classList.add('being-sucked');

        setTimeout(() => {
            mainText.style.opacity = '0';
            isAnimating = false; 
            cancelAnimationFrame(animationFrameId);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles = []; 
            blackHole.classList.add('move-to-center');
            // countdownElem.classList.add('move-to-center');
            startCountdown();
        }, 1500);
    }

    /* =========================================
       4. COUNTDOWN
       ========================================= */
    function startCountdown() {
        countdownElem.style.display = 'block';
        setTimeout(() => {
            countdownElem.classList.add('move-to-center');
        }, 50);
        let count = 10;
        
        countdownAudio.currentTime = 0;
        countdownAudio.volume = 1.0;
        setTimeout(() => {
            countdownAudio.play().catch(e => console.log("Audio play failed:", e));
        }, 0)
        

        const runNumberEffect = (num) => {
            countdownElem.innerText = num;
            const scaleVal = 1.3 + ((10 - num) * 0.2);
            countdownElem.style.setProperty('--start-scale', scaleVal);

            countdownElem.classList.remove('number-sucked');
            void countdownElem.offsetWidth; 
            countdownElem.classList.add('number-sucked');

            currentHoleScale += 0.15; 
            blackHole.style.transform = `translate(-50%, -50%) scale(${currentHoleScale})`;
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
        countdownElem.style.display = 'none';
        blackHole.classList.add('consume-screen');
        setTimeout(() => {
            playNextVideo();
            setTimeout(() => {
                blackHole.style.opacity = '0';
                setTimeout(() => {
                    blackHole.classList.remove('consume-screen');
                    blackHole.style.transform = 'translate(-50%, -50%) scale(0)';
                }, 1000);
            }, 1000);
        }, 1000);
    }

    /* =========================================
       5. PARTICLE SYSTEM
       ========================================= */
    class HelicalParticle {
        constructor(startX, startY, centerX, centerY) {
            this.startX = startX + (Math.random() - 0.5) * 20;
            this.startY = startY + (Math.random() - 0.5) * 20;
            this.endX = centerX + (Math.random() - 0.5) * 30;
            this.endY = centerY + (Math.random() - 0.5) * 30;

            const dx = this.endX - this.startX;
            const dy = this.endY - this.startY;
            this.totalDist = Math.sqrt(dx*dx + dy*dy);
            this.angleBase = Math.atan2(dy, dx);
            this.currentDist = 0;

            this.speed = 6 + Math.random() * 3; 
            this.spiralRadiusMax = 40 + Math.random() * 20; 
            this.spiralFreq = 0.05;   
            this.phase = Math.random() * Math.PI * 2;      
            this.size = 40 + Math.random() * 20; 
            
            this.dead = false;
            this.reachedCenter = false; 
        }

        update() {
            this.currentDist += this.speed;
            let progress = this.currentDist / this.totalDist;
            
            if (progress >= 1) {
                this.dead = true;
                this.reachedCenter = true; 
                return;
            }

            const baseX = this.startX + (this.endX - this.startX) * progress;
            const baseY = this.startY + (this.endY - this.startY) * progress;
            const perpAngle = this.angleBase + Math.PI / 2;
            const currentSpiralRadius = this.spiralRadiusMax * (1 - progress);
            const wave = Math.sin(this.currentDist * this.spiralFreq + this.phase);
            
            this.x = baseX + Math.cos(perpAngle) * wave * currentSpiralRadius;
            this.y = baseY + Math.sin(perpAngle) * wave * currentSpiralRadius;
            
            this.currentSize = this.size * (1 - (progress * 0.95));
            if (this.currentSize < 3) this.currentSize = 3;
        }

        draw(ctx) {
            if (this.dead) return;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(this.x, this.y, this.currentSize * 0.2, this.x, this.y, this.currentSize);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.6, '#f0f0f0');
            gradient.addColorStop(1, '#dcdcdc');
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff4500';
        }
    }

    function animateLoop() {
        if (!isAnimating) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const rect = blackHole.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const activeHands = document.querySelectorAll('.hand-icon.active');
        const now = Date.now();

        if (isSpawningAllowed) {
            activeHands.forEach(hand => {
                const hRect = hand.getBoundingClientRect();
                const hx = hRect.left + hRect.width / 2;
                const hy = hRect.top + 80;

                if (!hand.nextSpawnTime) hand.nextSpawnTime = now + Math.random() * 500;

                if (now > hand.nextSpawnTime) {
                    particles.push(new HelicalParticle(hx, hy, cx, cy));
                    hand.nextSpawnTime = now + 400 + Math.random() * 400;
                }
            });
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw(ctx);
            
            if (particles[i].dead && particles[i].reachedCenter) {
                if (currentHoleScale < 1.3) {
                    currentHoleScale += 0.015; 
                    blackHole.style.transform = `translate(-50%, -50%) scale(${currentHoleScale})`;
                }
                particles.splice(i, 1);
            } else if (particles[i].dead) {
                particles.splice(i, 1);
            }
        }

        // Rung lắc tên
        if (!isSequenceFinished && activeHandCount > 0) {
            const shakeIntensity = activeHandCount * 1.5;
            const rX = (Math.random()-0.5)*shakeIntensity*2; 
            const rY = (Math.random()-0.5)*shakeIntensity*2;
            const rRot = (Math.random()-0.5)*(activeHandCount*0.5);
            mainText.style.transform = `translate(calc(-50% + ${rX}px), calc(-50% + ${rY}px)) rotate(${rRot}deg)`;
        }

        if ((activeHandCount > 0 && !isNameSuckingStarted) || particles.length > 0) {
             animationFrameId = requestAnimationFrame(animateLoop);
        } else {
            isAnimating = false;
        }
    }

    function playNextVideo() {
        videoElem.src = 'videos/next.mp4'; videoElem.loop = false; videoElem.muted = false;
        videoElem.play().catch(e => console.log(e));
    }

    socket.on('reset-system', () => {
        isSequenceFinished = false; 
        isAnimating = false; 
        isOverloading = false;
        isSpawningAllowed = true;
        isNameSuckingStarted = false;
        activeHandCount = 0; 
        currentHoleScale = 0;
        
        cancelAnimationFrame(animationFrameId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles = [];
        
        // RESET AUDIO
        countdownAudio.pause(); 
        if(waitingAudio) { waitingAudio.pause(); waitingAudio.currentTime = 0; }
        
        startAudio.currentTime=0; startAudio.play().catch(()=>{});
        
        videoElem.src = 'videos/idle.mp4'; videoElem.loop = true; videoElem.play();
        
        mainText.classList.remove('being-sucked'); 
        mainText.style.opacity = '1'; mainText.style.transform = 'translate(-50%, -50%)';
        
        blackHole.style.opacity = '1'; blackHole.classList.remove('consume-screen'); 
        blackHole.style.transform = 'translate(-50%, -50%) scale(0)';

        blackHole.classList.remove('move-to-center');
        countdownElem.classList.remove('move-to-center');
        
        countdownElem.style.display = 'none'; 
        handsWrapper.classList.remove('show'); handsWrapper.style.opacity = '';
        
        document.querySelectorAll('.hand-icon').forEach(h => { 
            h.classList.remove('active', 'fa-solid'); h.classList.add('fa-regular'); 
            delete h.nextSpawnTime; 
        });
    });
}

/* =========================================
   LOGIC MÀN HÌNH CONTROL
   ========================================= */
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