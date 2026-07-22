import { Request, Response } from "express";
import path from "path";
import RepositorioChat from "../repositories/RepositorioChat";
import RepositorioMaterias from "../repositories/RepositorioMateria";
import { clasificarTipo } from "../config/uploadAcademico";
import { subirArchivo } from "../config/cloudinary";
import { emitirMensaje } from "../config/socket";

const MAX_ARCHIVOS_MENSAJE = 5;

class ChatController {

    // =====================================================
    // POST /chats  (docente/admin)
    // Crea el grupo privado de una materia. Un grupo por materia (la
    // tabla tiene UNIQUE(id_materia) como red de seguridad ante carreras).
    // =====================================================
    async crearGrupoMateria(req: Request, res: Response): Promise<Response> {

        try {

            const usuario = (req as any).usuario;
            const { id_materia, nombre } = req.body;

            if (!id_materia) {
                return res.status(400).json({ ok: false, mensaje: "La materia es obligatoria." });
            }

            const idMateria = Number(id_materia);
            const materia = await RepositorioMaterias.obtenerPorId(idMateria);

            if (!materia) {
                return res.status(404).json({ ok: false, mensaje: "La materia indicada no existe." });
            }

            if (usuario.rol === "docente") {
                const propietario = await RepositorioMaterias.esDelDocente(idMateria, usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes crear un chat para una materia que no es tuya." });
                }
            }

            const grupoExistente = await RepositorioChat.obtenerGrupoPorMateria(idMateria);

            if (grupoExistente) {
                return res.status(409).json({ ok: false, mensaje: "Esta materia ya tiene un chat grupal.", data: grupoExistente });
            }

            try {

                const grupo = await RepositorioChat.crearGrupoMateria(idMateria, usuario.id, nombre || materia.nombre);

                return res.status(201).json({ ok: true, mensaje: "Chat grupal creado correctamente.", data: grupo });

            } catch (error: any) {

                // 23505 = unique_violation -- dos peticiones concurrentes
                // intentaron crear el chat de la misma materia a la vez.
                if (error?.code === "23505") {
                    const grupo = await RepositorioChat.obtenerGrupoPorMateria(idMateria);
                    return res.status(409).json({ ok: false, mensaje: "Esta materia ya tiene un chat grupal.", data: grupo });
                }

                throw error;

            }

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "No fue posible crear el chat grupal." });
        }
    }

    // =====================================================
    // GET /chats
    // Chats visibles para el usuario autenticado: el público siempre,
    // más sus grupos de materia (inscrito o dueño).
    // =====================================================
    async listar(req: Request, res: Response): Promise<Response> {

        try {

            const usuario = (req as any).usuario;
            const grupos = await RepositorioChat.listarGruposDeUsuario(usuario.id, usuario.rol);

            return res.status(200).json({ ok: true, total: grupos.length, data: grupos });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al obtener los chats." });
        }
    }

    // =====================================================
    // GET /chats/:id/mensajes?antes=&limite=
    // =====================================================
    async listarMensajes(req: Request, res: Response): Promise<Response> {

        try {

            const usuario = (req as any).usuario;
            const idGrupo = Number(req.params.id);

            if (!Number.isInteger(idGrupo)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            const puede = await RepositorioChat.esMiembro(idGrupo, usuario.id, usuario.rol);

            if (!puede) {
                return res.status(403).json({ ok: false, mensaje: "No perteneces a este chat." });
            }

            const antes = req.query.antes ? Number(req.query.antes) : undefined;
            const limite = req.query.limite ? Number(req.query.limite) : 50;

            const mensajes = await RepositorioChat.listarMensajes(idGrupo, limite, antes);

            return res.status(200).json({ ok: true, total: mensajes.length, data: mensajes });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al obtener los mensajes." });
        }
    }

    // =====================================================
    // POST /chats/:id/mensajes  (multipart/form-data, campo "archivos", hasta 5)
    // Guarda el mensaje y lo empuja en vivo por Socket.IO a quien esté
    // conectado al grupo.
    // =====================================================
    async enviarMensaje(req: Request, res: Response): Promise<Response> {

        try {

            const usuario = (req as any).usuario;
            const idGrupo = Number(req.params.id);
            const { contenido } = req.body;
            const archivos = ((req as any).files as Express.Multer.File[] | undefined) ?? [];

            if (!Number.isInteger(idGrupo)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            if (!contenido && archivos.length === 0) {
                return res.status(400).json({ ok: false, mensaje: "El mensaje debe tener texto o al menos un archivo." });
            }

            if (archivos.length > MAX_ARCHIVOS_MENSAJE) {
                return res.status(400).json({ ok: false, mensaje: `Puedes adjuntar como máximo ${MAX_ARCHIVOS_MENSAJE} archivos.` });
            }

            const puede = await RepositorioChat.esMiembro(idGrupo, usuario.id, usuario.rol);

            if (!puede) {
                return res.status(403).json({ ok: false, mensaje: "No perteneces a este chat." });
            }

            const mensaje = await RepositorioChat.crearMensaje({
                id_grupo: idGrupo,
                id_usuario: usuario.id,
                contenido,
                archivos: await Promise.all(archivos.map(async archivo => ({
                    url: await subirArchivo(archivo.buffer, archivo.originalname, "chat"),
                    nombre_original: archivo.originalname,
                    tipo: clasificarTipo(path.extname(archivo.originalname))
                })))
            });

            emitirMensaje(idGrupo, mensaje);

            return res.status(201).json({ ok: true, mensaje: "Mensaje enviado.", data: mensaje });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "No fue posible enviar el mensaje." });
        }
    }

}

export default new ChatController();
