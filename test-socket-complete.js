const { io } = require("socket.io-client");
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

// Create Socket.IO client
const socket = io("http://localhost:3001", {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Socket event handlers
socket.on("connect", () => {
  console.log("✅ Connected to WebSocket server");
  runTest();
});

socket.on("job.active", (data) => {
  console.log("📝 Job active:", data);
});

socket.on("job.completed", (data) => {
  console.log("✅ Job completed:", data);
});

socket.on("job.failed", (data) => {
  console.log("❌ Job failed:", data);
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected from WebSocket server");
});

socket.on("connect_error", (error) => {
  console.log("❌ Connection error:", error);
});

// Test function to upload a file and monitor events
async function runTest() {
  try {
    // Create a test log file
    const logContent = `
2024-03-03 10:00:00 ERROR Test error message
2024-03-03 10:00:01 WARNING Test warning message
2024-03-03 10:00:02 INFO Test info from IP 192.168.1.100
2024-03-03 10:00:03 ERROR Another error from IP 192.168.1.101
    `.trim();

    fs.writeFileSync('test-complete.log', logContent);

    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test-complete.log'));

    // Upload file
    console.log("📤 Uploading file...");
    const response = await axios.post('http://localhost:3000/api/upload-logs', formData, {
      headers: formData.getHeaders()
    });

    console.log("📤 Upload response:", response.data);

  } catch (error) {
    console.error("❌ Error during test:", error.response?.data || error.message);
  }
}

// Keep the script running
process.stdin.resume();
