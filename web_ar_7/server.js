const express = require("express");
const app = express();
const cors = require("cors");

let players = [{ id: 1, gps: { lat: 36.31774, lon: 127.370638 }, degree: 180 }];

app.use(cors());
app.use(express.static("public"));

const server = app.listen(3000);

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("sendPlayerInfo", (data) => {
    // console.log(data);
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
});
