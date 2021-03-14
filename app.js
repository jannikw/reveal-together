import http from "http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import nunjucks from "nunjucks";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import { isHttpUri, isHttpsUri } from "valid-url";
import { Session } from "inspector";
import _ from "lodash";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);
const port = process.env.PORT || 8888;
const publicUrl = process.env.PUBLIC_URL || `http://localhost:${port}`;
const sessions = new Map();

nunjucks.configure(path.join(__dirname, "templates"), {
    autoescape: true,
    express: app,
    watch: process.env.NODE_ENV !== "production",
});

function findSessionByPrivateId(privateId) {
    // TODO: Index this
    for (let session of sessions.values()) {
        if (session.privateId === privateId) {
            return session;
        }
    }

    return undefined;
}

function findSessionByPublicId(publicId) {
    return sessions.get(publicId);
}

io.on("connection", (socket) => {
    const sessionId = socket.handshake.query.token;
    const session =
        findSessionByPublicId(sessionId) || findSessionByPrivateId(sessionId);
    if (session) {
        const isPrivate = session.privateId === sessionId;
        socket.join(session.publicId);

        if (isPrivate) {
            session.controlling++;
        } else {
            session.watching++;
        }

        // Emit the last state so the client starts of at the current slide
        if (session.lastState) {
            socket.emit("slidechange", session.lastState);
        }

        if (isPrivate) {
            socket.on("slidechange", (data) => {
                session.post(socket, data);
            });
        }

        socket.on("disconnect", () => {
            if (isPrivate) {
                session.controlling = Math.max(0, session.controlling - 1);
            } else {
                session.watching = Math.max(0, session.watching - 1);
            }
        });
    } else {
        socket.disconnect();
    }
});

app.get("/", (req, res) => {
    if (req.query.markdown && req.query.markdown.trim().length > 0) {
        const markdownUrl = req.query.markdown;

        if (!isHttpUri(markdownUrl) && !isHttpsUri(markdownUrl)) {
            res.redirect("/");
            return;
        }

        console.log(`Creating session for ${markdownUrl}`);
        const privateId = uuid();
        const publicId = uuid();
        const session = {
            markdownUrl,
            privateId,
            publicId,
            lastState: null,
            controlling: 0,
            watching: 0,
            post(socket, data) {
                this.lastState = data;
                socket.to(publicId).emit("slidechange", data);
            },
        };
        session.post = _.throttle(session.post, 500);
        sessions.set(publicId, session);
        res.redirect("/share/" + privateId);
    } else {
        res.render("index.html");
    }
});

app.get("/share/:id", (req, res) => {
    const session = findSessionByPrivateId(req.params.id);
    if (session) {
        res.render("share.html", {
            privateUrl: `${publicUrl}/slides/${session.privateId}/`,
            publicUrl: `${publicUrl}/slides/${session.publicId}/`,
            watching: session.watching,
            controlling: session.controlling,
        });
    } else {
        res.redirect("/");
    }
});

app.get("/slides/:id", (req, res) => {
    const session =
        findSessionByPublicId(req.params.id) ||
        findSessionByPrivateId(req.params.id);
    if (session) {
        const isPrivate = session.privateId === req.params.id;
        res.render("slides.html", {
            markdownUrl: session.markdownUrl,
            socketServerUrl: "/",
            id: isPrivate ? session.privateId : session.publicId,
            control: isPrivate,
        });
    } else {
        res.redirect("/");
    }
});

server.listen(port);
console.log(`server listening for client on port ${port}`);
console.log(`app available at public url ${publicUrl}`);

process.on("SIGINT", () => {
    console.info("app stopped");
    server.close();
    process.exit(0);
});
