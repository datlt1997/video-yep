const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static('public'));

// Chặn lỗi 404 Favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

io.on('connection', (socket) => {
    console.log('User connected: ' + socket.id);

    // 1. Control bấm START
    socket.on('trigger-hands', () => {
        io.emit('show-hands');
    });

    // 2. Control chạm từng bàn tay
    socket.on('toggle-hand', (data) => {
        io.emit('update-hand', data);
    });

    // 3. Control bấm RESET
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