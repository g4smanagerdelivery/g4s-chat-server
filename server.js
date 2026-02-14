const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Храним клиентов и их сообщения
let clients = {};

io.on("connection", (socket) => {

    const clientId = socket.handshake.query.clientId;

    // ЕСЛИ ЭТО КЛИЕНТ
    if (clientId) {

        console.log("Client connected:", clientId);

        if (!clients[clientId]) {
            clients[clientId] = {
                name: clientId,
                messages: []
            };
        }

        socket.join(clientId);
        socket.emit("loadMessages", clients[clientId].messages);
    }

    // Отправка сообщения
    socket.on("sendMessage", (data) => {

        const clientId = socket.handshake.query.clientId;

        if (clientId) {
            const message = {
                id: Date.now(),
                text: data.text,
                sender: "client",
                edited: false
            };

            clients[clientId].messages.push(message);
            io.to(clientId).emit("newMessage", message);
        }
    });

    // Список клиентов для админа
    socket.on("getClients", () => {
        socket.emit("clientsList", Object.keys(clients));
    });

});

server.listen(3000, () => {
    console.log("Server started on port 3000");
});
