const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// ===== ЗАГРУЗКА ДАННЫХ =====
let clients = {};

if (fs.existsSync("data.json")) {
    clients = JSON.parse(fs.readFileSync("data.json"));
}

function saveData() {
    fs.writeFileSync("data.json", JSON.stringify(clients, null, 2));
}

// ===== SOCKET =====
io.on("connection", (socket) => {

    const clientId = socket.handshake.query.clientId;

    // ===== ЕСЛИ ПОДКЛЮЧИЛСЯ КЛИЕНТ =====
    if (clientId) {

        if (!clients[clientId]) {
            clients[clientId] = {
                name: clientId,
                messages: [],
                online: false
            };
        }

        clients[clientId].online = true;
        saveData();

        socket.join(clientId);
        socket.emit("loadMessages", clients[clientId].messages);

        io.emit("clientsList", clients);
    }

    // ===== ОТКЛЮЧЕНИЕ =====
    socket.on("disconnect", () => {
        if (clientId && clients[clientId]) {
            clients[clientId].online = false;
            saveData();
            io.emit("clientsList", clients);
        }
    });

    // ===== СООБЩЕНИЕ ОТ КЛИЕНТА =====
    socket.on("sendMessage", (data) => {
        if (!clientId) return;

        const message = {
            id: Date.now(),
            text: data.text,
            sender: "client",
            edited: false
        };

        clients[clientId].messages.push(message);
        saveData();

        io.to(clientId).emit("newMessage", message);
        io.emit("clientsList", clients);
    });

    // ===== СООБЩЕНИЕ ОТ АДМИНА =====
    socket.on("adminMessage", ({ clientId, text }) => {
        if (!clients[clientId]) return;

        const message = {
            id: Date.now(),
            text,
            sender: "admin",
            edited: false
        };

        clients[clientId].messages.push(message);
        saveData();

        io.to(clientId).emit("newMessage", message);
    });

    // ===== РЕДАКТИРОВАНИЕ =====
    socket.on("editMessage", ({ clientId, id, text, sender }) => {
        if (!clients[clientId]) return;

        const message = clients[clientId].messages.find(m => m.id == id);
        if (!message) return;

        message.text = text;

        // Только если редактировал клиент — показываем "(изменено)"
        if (sender === "client") {
            message.edited = true;
        }

        saveData();
        io.to(clientId).emit("updateMessage", message);
    });

    // ===== СПИСОК КЛИЕНТОВ =====
    socket.on("getClients", () => {
        socket.emit("clientsList", clients);
    });

    // ===== ПЕРЕИМЕНОВАНИЕ =====
    socket.on("renameClient", ({ clientId, name }) => {
        if (!clients[clientId]) return;

        clients[clientId].name = name;
        saveData();
        io.emit("clientsList", clients);
    });

    // ===== ПОДКЛЮЧЕНИЕ АДМИНА К КОМНАТЕ =====
    socket.on("joinClientRoom", (clientId) => {
        socket.join(clientId);
        socket.emit("loadMessages", clients[clientId]?.messages || []);
    });

});

server.listen(3000, () => {
    console.log("SERVER READY");
});
