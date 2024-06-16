import express from "express";
import http from "http";
import { Server as SocketServer } from "socket.io";
import cors from "cors";
import morgan from "morgan";
import AppRoutes from './src/routes.js'

const PORT = process.env.PORT || 4000 



// Initializations
const app = express();
app.use(cors())
app.use(express.json())

app.use(morgan('dev'));

app.use(AppRoutes)

const server = http.createServer(app);
export const io = new SocketServer(server, {
  cors: {
    origin: "*",
  },
});




io.on("connection", socket => {
  console.log(`client conected ${socket.id}`);
});

server.listen(PORT);
console.log(`server on port ${PORT}`);

