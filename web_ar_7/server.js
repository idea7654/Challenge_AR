const express = require("express");
const app = express();
const cors = require("cors");

let players = [{ id: 1, gps: { lat: 36.345147, lon: 127.393537 }, degree: 0 }];
// let players = [];
app.use(cors({ credentials: true }));
app.use(express.static("public"));

const server = app.listen(3000);

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("sendPlayerInfo", (data) => {
    if (players.findIndex((i) => i.id == data.id) == -1) {
      players.push(data);
    }
    io.emit("sendPlayerInfo", players);
  });

  socket.on("disconnect", () => {
    players.forEach((element) => {
      if (element.id === socket.id) {
        const index = players.indexOf(element);
        players.splice(index, 1);
      }
    });
  });

  socket.on("check", (data) => {
    console.log(data);
  });
});
