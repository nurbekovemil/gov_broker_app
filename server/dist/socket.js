"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.getIO = getIO;
const socket_io_1 = require("socket.io");
let io;
function initSocket(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: { origin: '*' },
    });
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
    return io;
}
function getIO() {
    if (!io)
        throw new Error('Socket.io not initialized');
    return io;
}
