import express from "express";
import http from "http";
import { Server as SocketServer } from "socket.io";
import AppRoutes from './src/routes.js'

const PORT = process.env.PORT || 4000

import cors from "cors";

// Initializations
const app = express();
const server = http.createServer(app);
export const io = new SocketServer(server, {
  cors: {
    origin: "*",
  },
});

app.use(express.json())

// Middlewares
app.use(cors({
    origin: ['http://localhost:5173', 'https://rifa-club.netlify.app','https://suscribete.rifaclub.com/']
}));

app.use(AppRoutes)

io.on("connection", (socket) => {
  console.log(socket.id);
});

server.listen(PORT);
console.log(`server on port ${PORT}`);