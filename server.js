const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

let messages = [];

io.on("connection", (socket) => {

    socket.emit("loadMessages", messages);

    socket.on("sendMessage", (data) => {
        const message = {
            id: Date.now(),
            text: data.text,
            sender: data.sender,
            edited: false
        };

        messages.push(message);
        io.emit("newMessage", message);
    });

    socket.on("editMessage", (data) => {
        const msg = messages.find(m => m.id === data.id);
        if (msg) {
            msg.text = data.text;

            if (data.sender === "client") {
                msg.edited = true;
            }

            io.emit("updateMessage", msg);
        }
    });

});

server.listen(3000, () => {
    console.log("Server started on port 3000");

});
