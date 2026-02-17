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
                online: true,
                unread: 0
            };
        }

        clients[clientId].online = true;
        saveData();

        socket.join(clientId);

        socket.emit("loadMessages", clients[clientId].messages);

        io.emit("clientsList", clients);
    }
    
        socket.on("typing", ({ clientId }) => {
        socket.to(clientId).emit("typing");
});
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

        // Увеличиваем unread
        clients[clientId].unread++;

        saveData();

        io.to(clientId).emit("newMessage", message);

        io.emit("updateUnread", {
            clientId,
            unread: clients[clientId].unread
        });

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
    socket.on("editMessage", (data) => {

    const { clientId, id, text, edited } = data;

    // Обновляем в БД
    db.run(
        "UPDATE messages SET text = ?, edited = ? WHERE id = ?",
        [text, edited ? 1 : 0, id],
        function(err) {
            if (err) return;

            // Получаем обновлённое сообщение
            db.get(
                "SELECT * FROM messages WHERE id = ?",
                [id],
                (err, row) => {

                    if (!row) return;

                    // ===== АДМИНУ отправляем всегда =====
                    io.to(clientId).emit("updateMessage", row);

                    // ===== КЛИЕНТУ =====
                    if (edited) {
                        // ред+ — клиент видит пометку
                        io.to(clientId + "_client").emit("updateMessage", row);
                    } else {
                        // ред- — скрываем факт редактирования
                        const hidden = {
                            ...row,
                            edited: 0
                        };
                        io.to(clientId + "_client").emit("updateMessage", hidden);
                    }
                }
            );
        }
    );
});

    // ===== ПОМЕТИТЬ КАК ПРОЧИТАНО =====
    socket.on("markAsRead", (clientId) => {
        if (!clients[clientId]) return;

        clients[clientId].unread = 0;
        saveData();

        io.emit("updateUnread", {
            clientId,
            unread: 0
        });

        io.emit("clientsList", clients);
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

    // ===== АДМИН ПОДКЛЮЧАЕТСЯ К КОМНАТЕ =====
    socket.on("joinClientRoom", (clientId) => {
        socket.join(clientId);
        socket.emit("loadMessages", clients[clientId]?.messages || []);
    });

});

server.listen(3000, () => {
    console.log("SERVER READY");
});


