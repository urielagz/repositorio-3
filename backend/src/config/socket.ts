import { Server as ServidorHttp } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import RepositorioChat from "../repositories/RepositorioChat";

// Mismo secreto que usa middlewares/authMiddleware.ts para las rutas REST
// -- el cliente manda el mismo JWT del login en el "auth" del handshake.
const JWT_SECRETO = process.env.JWT_SECRET || "SECRETO_SUPER_SECRETO";

let io: Server | undefined;

// La persistencia de mensajes sigue viviendo en las rutas REST (POST
// /chats/:id/mensajes), que ya reutilizan multer/authMiddleware/multer
// tal cual funcionan hoy. Socket.IO aquí solo hace dos cosas: (1) deja
// que un usuario se una al "room" de un grupo si en verdad pertenece a
// él, y (2) empuja en tiempo real los mensajes que ChatController ya
// guardó, vía emitirMensaje(). No reinventa el upload de archivos por
// socket.
export function iniciarSocket(servidorHttp: ServidorHttp): Server {

    io = new Server(servidorHttp, {
        cors: { origin: "*" }
    });

    io.use((socket: Socket, next) => {

        const token = socket.handshake.auth?.token as string | undefined;

        if (!token) {
            return next(new Error("Token requerido"));
        }

        try {

            const payload = jwt.verify(token, JWT_SECRETO);
            (socket as any).usuario = payload;
            next();

        } catch {

            next(new Error("Token inválido"));

        }

    });

    io.on("connection", (socket: Socket) => {

        const usuario = (socket as any).usuario;

        // El cliente pide unirse a un grupo específico; se valida
        // membresía (público, o inscrito/dueño de la materia) antes de
        // dejarlo entrar al room -- un alumno no inscrito no puede
        // escuchar los mensajes de un grupo que no le corresponde.
        socket.on("chat:unirse", async (idGrupo: number, callback?: (respuesta: { ok: boolean; mensaje?: string }) => void) => {

            try {

                const puede = await RepositorioChat.esMiembro(Number(idGrupo), usuario.id, usuario.rol);

                if (!puede) {
                    callback?.({ ok: false, mensaje: "No perteneces a este chat." });
                    return;
                }

                socket.join(`grupo:${idGrupo}`);
                callback?.({ ok: true });

            } catch (error) {

                console.error(error);
                callback?.({ ok: false, mensaje: "Error del servidor." });

            }

        });

        socket.on("chat:salir", (idGrupo: number) => {
            socket.leave(`grupo:${idGrupo}`);
        });

    });

    return io;

}

// La llama ChatController justo después de guardar un mensaje nuevo en
// la BD, para empujarlo en vivo a todos los conectados a ese grupo.
export function emitirMensaje(idGrupo: number, mensaje: any): void {
    io?.to(`grupo:${idGrupo}`).emit("chat:mensaje", mensaje);
}
