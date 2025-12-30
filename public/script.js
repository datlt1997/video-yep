const socket = io();
const isDisplay = document.body.id === 'display-page';
const isControl = document.body.id === 'control-page';

/* =========================================
   LOGIC MÀN HÌNH DISPLAY
   ========================================= */
if (isDisplay) {
  const videoElem = document.getElementById('bg-video');
  const mainText = document.getElementById('main-text');
  const handsWrapper = document.getElementById('hands-wrapper');
  const uiLayer = document.getElementById('ui-layer');
  const countdownElem = document.getElementById('countdown-display');
  
  // Audio Elements
  const countdownAudio = document.getElementById('countdown-audio');
  const startAudio = document.getElementById('start-audio');
  const handAudio = document.getElementById('hand-audio');
  const startOverlay = document.getElementById('start-overlay');
  
  let isCountingDown = false;

  // 1. SỰ KIỆN KHỞI ĐỘNG (CLICK TO START)
  if (startOverlay) {
    startOverlay.addEventListener('click', () => {
      startOverlay.style.display = 'none';
      
      // A. CHẠY NHẠC NỀN CHÍNH
      startAudio.volume = 0.8; 
      startAudio.play().catch(e => console.error("Start Audio Error:", e));
      
      // B. "MỒI" (WARM-UP) ÂM THANH KHÁC
      // Cho chạy 200ms với volume cực nhỏ để trình duyệt cấp quyền
      const warmUpSound = (audio) => {
          audio.volume = 0.001;
          const p = audio.play();
          if (p !== undefined) {
              p.then(() => {
                  setTimeout(() => {
                      audio.pause();
                      audio.currentTime = 0;
                      audio.volume = 1.0; // Trả lại volume gốc
                  }, 200);
              }).catch(e => console.error("Warm-up Error:", e));
          }
      };

      warmUpSound(countdownAudio);
      warmUpSound(handAudio);

      // C. CHẠY VIDEO
      videoElem.play().catch(e => console.error("Video Autoplay Error:", e));
    });
  }

  // 2. SOCKET: HIỆN BÀN TAY
  socket.on('show-hands', () => {
    mainText.classList.add('move-up');
    handsWrapper.classList.add('show');
    // Nhạc nền đã chạy từ lúc click, không cần xử lý ở đây
  });

  // 3. SOCKET: UPDATE TRẠNG THÁI TAY
  socket.on('update-hand', (data) => {
    if (isCountingDown) return;

    const { index, status } = data;
    const hands = document.querySelectorAll('.hand-icon');
    const hand = hands[index];

    if (hand) {
      if (status) {
        // Bật tay
        hand.classList.remove('fa-regular');
        hand.classList.add('fa-solid', 'active');
        
        // Phát tiếng hiệu ứng chạm tay
        handAudio.currentTime = 0;
        handAudio.play().catch(e => console.log(e));

      } else {
        // Tắt tay
        hand.classList.remove('fa-solid', 'active');
        hand.classList.add('fa-regular');
      }

      // Kiểm tra đủ 6 tay
      const currentActive = document.querySelectorAll('.hand-icon.active').length;
      if (currentActive === 6) {
        setTimeout(() => {
            startCountdown();
        }, 200); 
      }
    }
  });

  function startCountdown() {
    isCountingDown = true;
    
    // Dừng nhạc nền
    startAudio.pause();
    startAudio.currentTime = 0;

    // Tắt tiếng video nền (nếu có)
    videoElem.muted = true;
    
    // Phát nhạc Countdown
    countdownAudio.currentTime = 0;
    countdownAudio.play().catch(e => console.log("Countdown Play Error:", e));

    // Hiển thị số
    countdownElem.style.display = 'block';
    countdownElem.style.opacity = '1'; 
    mainText.style.opacity = '0'; 
    handsWrapper.style.opacity = '0';

    let count = 10;
    const runNumberEffect = (num) => {
      countdownElem.innerText = num;
      countdownElem.classList.remove('impact-effect');
      void countdownElem.offsetWidth; // Trigger reflow
      countdownElem.classList.add('impact-effect');
    };
    runNumberEffect(count);

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        runNumberEffect(count);
      } else {
        clearInterval(interval);
        
        // Kết thúc countdown
        countdownElem.style.display = 'none';
        countdownAudio.pause();

        uiLayer.classList.add('fade-out');
        videoElem.classList.add('video-hidden'); 
        setTimeout(() => playNextVideo(), 500);
      }
    }, 1000);
  }

  function playNextVideo() {
    videoElem.src = 'videos/next.mp4';
    videoElem.loop = false;
    videoElem.muted = false;
    videoElem.classList.add('video-hidden');

    videoElem.play().then(() => {
        setTimeout(() => {
            videoElem.classList.remove('video-hidden');
        }, 200);

    }).catch(e => console.log("Autoplay Next blocked:", e));
  }

  socket.on('reset-system', () => {
    isCountingDown = false;
    
    // Reset Audio: Dừng countdown, chạy lại nhạc nền
    countdownAudio.pause();
    
    startAudio.currentTime = 0;
    startAudio.play().catch(e => console.log("Reset Start Audio Error:", e));

    // Reset Video
    videoElem.src = 'videos/idle.mp4';
    videoElem.loop = true;
    videoElem.muted = false;
    videoElem.classList.remove('video-hidden');
    videoElem.play();

    // Reset UI
    uiLayer.classList.remove('fade-out');
    mainText.classList.remove('move-up');
    mainText.style.opacity = '1';
    
    handsWrapper.classList.remove('show');
    handsWrapper.style.opacity = '';
    
    countdownElem.style.display = 'none';
    countdownElem.classList.remove('impact-effect');

    document.querySelectorAll('.hand-icon').forEach(h => {
      h.classList.remove('active', 'fa-solid');
      h.classList.add('fa-regular');
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
    btnShow.innerText = "Hands Displayed";
  });

  handBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-index'));
      handStates[index] = !handStates[index];
      const newState = handStates[index];

      socket.emit('toggle-hand', { index: index, status: newState });
      
      if (newState) {
        btn.classList.add('tapped'); 
      } else {
        btn.classList.remove('tapped'); 
      }
    });
  });

  btnReset.addEventListener('click', () => {
    socket.emit('trigger-reset');
    btnShow.disabled = false;
    btnShow.innerText = "START (Show Hands)";
    handBtns.forEach(btn => btn.classList.remove('tapped'));
    handStates = [false, false, false, false, false, false];
  });
}