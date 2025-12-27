const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// Serve static files from 'public' folder
app.use(express.static('public'));

// Socket.io connection logic
io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);

    // 1. Khi Control yêu cầu hiển thị bàn tay
    socket.on('trigger-hands', () => {
        io.emit('show-hands'); // Gửi lệnh cho Display
    });

    // 2. Khi Control chạm vào một bàn tay cụ thể (index: 0-5)
    socket.on('toggle-hand', (data) => {
        // data = { index: 0, status: true/false }
        io.emit('update-hand', data);
    });

    // 3. Khi Control yêu cầu Reset
    socket.on('trigger-reset', () => {
        io.emit('reset-system');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});