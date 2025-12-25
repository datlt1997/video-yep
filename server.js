const express = require("express")
const app = express()
const http = require("http").createServer(app)
const io = require("socket.io")(http)

app.use(express.static("public"))

let activeHands = []
let state = "idle" 
// idle | touch | countdown | next

io.on("connection", socket => {

  socket.on("register-display", () => {
    activeHands = []
    state = "idle"
    io.emit("state-change", state)
    io.emit("update-hands", [])
  })

  socket.on("toggle-hand", hand => {
    if (state === "countdown" || state === "next") return

    if (activeHands.includes(hand)) {
        activeHands = activeHands.filter(h => h !== hand)
    } else {
        activeHands.push(hand)
    }

    // 👉 CHỈ chuyển sang TOUCH khi có >=1 tay
    if (activeHands.length > 0 && state === "idle") {
        state = "touch"
        io.emit("state-change", state)
    }

    // 👉 Nếu KHÔNG còn tay nào → quay về IDLE
    if (activeHands.length === 0 && state === "touch") {
        state = "idle"
        io.emit("state-change", state)
    }

    io.emit("update-hands", activeHands)

    // 👉 CHỈ khi ĐỦ 6 tay → COUNTDOWN
    if (activeHands.length === 6 && state !== "countdown") {
        state = "countdown"
        io.emit("state-change", state)
    }
    })


  socket.on("countdown-finished", () => {
    state = "next"
    activeHands = []
    io.emit("state-change", state)
    io.emit("update-hands", [])
  })

  socket.on("reset", () => {
    activeHands = []
    state = "idle"
    io.emit("state-change", state)
    io.emit("update-hands", [])
  })
})


http.listen(3000, () => {
  console.log("🚀 Server running http://localhost:3000")
})
