const { io } = require("socket.io-client");

const socket = io("http://localhost:3001", {
  transports: ['websocket']
});

socket.on("connect", () => {
  console.log("Connected to WebSocket server");
});

socket.on("job.active", (data) => {
  console.log("Job active:", data);
});

socket.on("job.completed", (data) => {
  console.log("Job completed:", data);
});

socket.on("job.failed", (data) => {
  console.log("Job failed:", data);
});

socket.on("disconnect", () => {
  console.log("Disconnected from WebSocket server");
});

socket.on("connect_error", (error) => {
  console.log("Connection error:", error);
});
