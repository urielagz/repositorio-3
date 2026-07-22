import "dotenv/config";        // primero: carga las variables de entorno
import "./config/database";    // después: ya puede usar process.env

import http from "http";
import app from "./app";
import { iniciarSocket } from "./config/socket";

const PORT = process.env.PORT ? Number(process.env.PORT) : 7000;

// Se envuelve app en un http.Server explícito para poder colgarle
// Socket.IO (el chat en tiempo real) sin perder nada de Express.
const servidorHttp = http.createServer(app);
iniciarSocket(servidorHttp);

servidorHttp.listen(PORT, () => {
    console.log(`Servidor ejecutándose en puerto ${PORT}`);
});