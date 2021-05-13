const express = require("express");
const app = express();
const fs = require("fs");
const csv = require("csv-parser");
const csvWriter = require("csv-write-stream");

const writer = csvWriter({ sendHeaders: false });
const server = app.listen(5000);
const players = [];

const rowArr = [];

fs.createReadStream("./db.csv")
  .pipe(csv())
  .on("data", (row) => {
    rowArr.push(row);
  })
  .on("end", () => {
    console.log(rowArr);
  });

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("firstConnect", () => {
    socket.emit("firstConnect", socket.id);
    players.push({ id: socket.id, item: 0 });
  });

  socket.on("GetItem", (data) => {
    const index = players.findIndex((i) => i.id == data);
    if (index != -1) {
      players[index].item += 1;
    }
  });

  socket.on("RemoveItem", (data) => {
    const index = players.findIndex((i) => i.id == data);
    if (index != -1) {
      players[index].item -= 1;
    }
  });

  socket.on("ReadPlayer", (data) => {
    const index = players.findIndex((i) => i.id == data);
    if (index != -1) {
      players.splice(index, 1);
    }
    socket.emit("ReadPlayer", players[0]);
  });

  socket.on("UseItem", (data) => {
    players[0].item -= 1;
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

function write() {
  writer.pipe(fs.createWriteStream("./db.csv", { flags: "a" }));
  writer.write({ id: 2, nickname: "테스트", item: 0, level: 1 });
  writer.end();
}
//write();
