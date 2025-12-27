const socket = io();
const isDisplay = document.body.id === 'display-page';
const isControl = document.body.id === 'control-page';

/* =========================================
   LOGIC CHO MÀN HÌNH DISPLAY (index.html)
   ========================================= */
if (isDisplay) {
  const videoElem = document.getElementById('bg-video');
  const mainText = document.getElementById('main-text');
  const handsWrapper = document.getElementById('hands-wrapper');
  const uiLayer = document.getElementById('ui-layer');
  const countdownElem = document.getElementById('countdown-display');
  const countdownAudio = document.getElementById('countdown-audio');
  
  // Flag để chặn tương tác khi đang đếm ngược
  let isCountingDown = false;

  socket.on('show-hands', () => {
    mainText.classList.add('move-up');
    handsWrapper.classList.add('show');
  });

  // XỬ LÝ BẬT/TẮT BÀN TAY
  socket.on('update-hand', (data) => {
    // Nếu đang đếm ngược rồi thì không cho chỉnh sửa tay nữa
    if (isCountingDown) return;

    const { index, status } = data;
    const hands = document.querySelectorAll('.hand-icon');
    const hand = hands[index];

    if (hand) {
      if (status) {
        // BẬT
        hand.classList.remove('fa-regular');
        hand.classList.add('fa-solid', 'active');
      } else {
        // TẮT
        hand.classList.remove('fa-solid', 'active');
        hand.classList.add('fa-regular');
      }

      // Đếm lại tổng số bàn tay đang sáng
      const currentActive = document.querySelectorAll('.hand-icon.active').length;
      
      // Nếu đủ 6 tay thì Start Countdown
      if (currentActive === 6) {
        startCountdown();
      }
    }
  });

  function startCountdown() {
    isCountingDown = true; // Khóa trạng thái

    // Âm thanh & Nhạc
    videoElem.muted = true; // Tắt nhạc nền
    countdownAudio.currentTime = 0;
    countdownAudio.play().catch(e => console.log(e));

    // UI Setup
    countdownElem.style.display = 'block';
    
    // Ẩn chữ và bàn tay ngay lập tức cho tập trung vào số
    mainText.style.opacity = '0'; 
    handsWrapper.style.opacity = '0';

    let count = 10;
    
    // Hàm chạy hiệu ứng số (Style kiểu MC Zerrill)
    const runNumberEffect = (num) => {
      countdownElem.innerText = num;
      // Reset Animation
      countdownElem.classList.remove('impact-effect');
      void countdownElem.offsetWidth; // Trigger Reflow
      countdownElem.classList.add('impact-effect');
    };

    runNumberEffect(count);

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        runNumberEffect(count);
      } else {
        clearInterval(interval);
        playNextVideo();
      }
    }, 1000);
  }

  function playNextVideo() {
    countdownElem.style.display = 'none';
    countdownAudio.pause();
    uiLayer.classList.add('fade-out');

    videoElem.src = 'videos/next.mp4';
    videoElem.loop = false;
    videoElem.muted = false; // Bật lại tiếng cho video mới
    videoElem.play();
  }

  socket.on('reset-system', () => {
    isCountingDown = false;
    
    // Reset Audio/Video
    countdownAudio.pause();
    videoElem.src = 'videos/idle.mp4';
    videoElem.loop = true;
    videoElem.muted = false;
    videoElem.play();

    // Reset UI
    uiLayer.classList.remove('fade-out');
    mainText.classList.remove('move-up');
    mainText.style.opacity = '1';
    
    handsWrapper.classList.remove('show');
    handsWrapper.style.opacity = '';
    
    countdownElem.style.display = 'none';
    countdownElem.classList.remove('impact-effect');

    // Reset Hands Icon
    document.querySelectorAll('.hand-icon').forEach(h => {
      h.classList.remove('active', 'fa-solid');
      h.classList.add('fa-regular');
    });
  });
}

/* =========================================
   LOGIC CHO MÀN HÌNH CONTROL (control.html)
   ========================================= */
if (isControl) {
  const btnShow = document.getElementById('btn-show-hands');
  const handBtns = document.querySelectorAll('.hand-btn');
  const btnReset = document.getElementById('btn-reset');

  // Trạng thái cục bộ của 6 bàn tay (false = tắt, true = bật)
  let handStates = [false, false, false, false, false, false];

  btnShow.addEventListener('click', () => {
    socket.emit('trigger-hands');
    btnShow.disabled = true;
    btnShow.innerText = "Hands Displayed";
  });

  handBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-index'));
      
      // Đảo ngược trạng thái (Toggle)
      handStates[index] = !handStates[index];
      const newState = handStates[index];

      // Gửi lên server: index + trạng thái mới
      socket.emit('toggle-hand', { index: index, status: newState });
      
      // Update giao diện nút bấm
      if (newState) {
        btn.classList.add('tapped'); // Xanh
      } else {
        btn.classList.remove('tapped'); // Xám lại
      }
    });
  });

  btnReset.addEventListener('click', () => {
    socket.emit('trigger-reset');
    
    // Reset Control UI
    btnShow.disabled = false;
    btnShow.innerText = "START (Show Hands)";
    handBtns.forEach(btn => btn.classList.remove('tapped'));
    handStates = [false, false, false, false, false, false];
  });
}