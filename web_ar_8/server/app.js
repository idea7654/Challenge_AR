const express = require("express");
const app = express();

const server = app.listen(5000);
const players = [];

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("firstConnect", () => {
    socket.emit("firstConnect", socket.id);
    players.push({ id: socket.id, item: [] });
  });

  socket.on("GetItem", () => {
    console.log("작동중");
  });

  socket.on("RemoveItem", () => {
    console.log("작동중2");
  });
});
