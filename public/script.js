const socket = io()

// ===== Detect page =====
const isDisplay = document.body.classList.contains("display")

if (isDisplay) {
  socket.emit("register-display")
}


// ===== VIDEO (DISPLAY ONLY) =====
const videoIdle = isDisplay ? document.getElementById("videoIdle") : null
const videoCountdown = isDisplay ? document.getElementById("videoCountdown") : null
const videoNext = isDisplay ? document.getElementById("videoNext") : null

// ===== HANDS =====
const handsWrap = document.querySelector(".hands")
const hands = document.querySelectorAll(".hand")
const buttons = document.querySelectorAll(".hand-btn")
const resetBtn = document.getElementById("reset")

// ===== DISPLAY VIDEO CONTROL =====
function showVideo(video) {
  if (!isDisplay || !video) return

  ;[videoIdle, videoCountdown, videoNext].forEach(v => {
    if (!v) return
    v.onended = null   // 🔥 clear callback cũ
    v.pause()
    v.currentTime = 0
    v.classList.remove("active")
  })

  video.classList.add("active")
  video.play().catch(() => {})
}


// ===== CONTROL =====
buttons.forEach(btn => {
  btn.onclick = () => {
    socket.emit("toggle-hand", btn.dataset.id)
  }
})

resetBtn && (resetBtn.onclick = () => socket.emit("reset"))

// ===== SOCKET SYNC =====
socket.on("sync", data => {
  updateHands(data.activeHands)
  handleState(data.state)
})

socket.on("update-hands", updateHands)
socket.on("state-change", handleState)

// ===== UPDATE HANDS =====
function updateHands(activeHands = []) {
  hands.forEach(hand => {
    hand.classList.toggle(
      "active",
      activeHands.includes(hand.dataset.id)
    )
  })

  buttons.forEach(btn => {
    btn.classList.toggle(
      "active",
      activeHands.includes(btn.dataset.id)
    )
  })
}

// ===== HANDLE STATE (DISPLAY ONLY) =====
function handleState(state) {
  if (!isDisplay) return

  if (state === "idle") {
    // handsWrap?.classList.add("hidden")
    showVideo(videoIdle)
  }

  if (state === "touch") {
    handsWrap?.classList.remove("hidden")
    // ❗ KHÔNG đổi video – vẫn là idle.mp4
  }

  if (state === "countdown") {
    handsWrap?.classList.remove("hidden")
    showVideo(videoCountdown)

    videoCountdown.onended = () => {
      socket.emit("countdown-finished")
    }
  }

  if (state === "next") {
    handsWrap?.classList.add("hidden")
    showVideo(videoNext)
  }
}
