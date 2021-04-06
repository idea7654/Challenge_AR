const express = require("express");
const app = express();
const cors = require("cors");

let players = [];

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
});
