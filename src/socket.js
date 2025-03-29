// import { io } from "socket.io-client";

// export const socket = io("http://localhost:5000", {
//     autoConnect: false,
//     withCredentials: true,
// });

// export const connectSocket = (userId) => {
//     socket.auth = { userId };
//     socket.connect();
// };

// export const disconnectSocket = () => {
//     socket.disconnect();
// };
// src/socket.js


import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

// Connection handlers for debugging
socket.on("connect", () => {
    console.log("Connected to socket server");
});

socket.on("disconnect", () => {
    console.log("Disconnected from socket server");
});

socket.on("connect_error", (err) => {
    console.error("Connection error:", err);
});

export const connectSocket = (userId) => {
    socket.auth = { userId };
    socket.connect();
    socket.emit('registerUser', userId);
};

export const disconnectSocket = () => {
    socket.disconnect();
};