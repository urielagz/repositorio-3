import { Request, Response } from "express";
import path from "path";
import RepositorioRecursos from "../repositories/RepositorioRecursos";
import { RepositorioTemas } from "../repositories/RepositorioTemas";
import RepositorioMaterias from "../repositories/RepositorioMateria";
import { clasificarTipo } from "../config/uploadAcademico";
import { ArchivoRecurso } from "../models/Recurso";
import { notificarMateria } from "../utils/notificaciones";

const repoTemas = new RepositorioTemas();
const MAX_ARCHIVOS_RECURSO = 5;

// Función suelta (no método de clase) a propósito: las rutas invocan
// "RecursoController.crear" como referencia de función, sin el objeto
// receptor -- un método normal (no arrow) perdería su "this" ahí y
// "this.mapearArchivo" tronaría con "Cannot read properties of undefined".
function mapearArchivo(archivo: Express.Multer.File): ArchivoRecurso {
    const extension = path.extname(archivo.originalname);

    return {
        url: `recursos/${archivo.filename}`,
        nombre_original: archivo.originalname,
        tipo: clasificarTipo(extension) as any,
        extension,
        tamano_bytes: archivo.size
    };
}

class RecursoController {

    // =====================================================
    // GET /recursos/tema/:idTema
    // =====================================================
    async obtenerPorTema(req: Request, res: Response): Promise<Response> {

        try {

            const idTema = Number(req.params.idTema);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(idTema)) {
                return res.status(400).json({ ok: false, mensaje: "ID de tema inválido." });
            }

            if (usuario.rol === "alumno") {
                const inscrito = await RepositorioMaterias.estaInscritoPorTema(usuario.id, idTema);

                if (!inscrito) {
                    return res.status(403).json({ ok: false, mensaje: "No estás inscrito en la materia de este tema." });
                }
            }

            const recursos = await RepositorioRecursos.obtenerPorTema(idTema);

            return res.status(200).json({ ok: true, total: recursos.length, data: recursos });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al obtener los recursos." });
        }
    }

    // =====================================================
    // GET /recursos/:id
    // =====================================================
    async obtenerPorId(req: Request, res: Response): Promise<Response> {

        try {

            const id = Number(req.params.id);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            const recurso = await RepositorioRecursos.obtenerPorId(id);

            if (!recurso) {
                return res.status(404).json({ ok: false, mensaje: "Recurso no encontrado." });
            }

            if (usuario.rol === "alumno") {
                const inscrito = await RepositorioMaterias.estaInscritoPorRecurso(usuario.id, id);

                if (!inscrito) {
                    return res.status(403).json({ ok: false, mensaje: "No estás inscrito en la materia de este recurso." });
                }
            }

            return res.status(200).json({ ok: true, data: recurso });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error del servidor." });
        }
    }

    // =====================================================
    // POST /recursos  (multipart/form-data, campo "archivos", hasta 5)
    // =====================================================
    async crear(req: Request, res: Response): Promise<Response> {

        try {

            const usuario = (req as any).usuario;
            const archivos = ((req as any).files as Express.Multer.File[] | undefined) ?? [];
            const { titulo, descripcion, id_tema } = req.body;

            if (!titulo || !id_tema) {
                return res.status(400).json({ ok: false, mensaje: "El título y el tema son obligatorios." });
            }

            if (archivos.length === 0) {
                return res.status(400).json({ ok: false, mensaje: "Debes adjuntar al menos un archivo." });
            }

            if (archivos.length > MAX_ARCHIVOS_RECURSO) {
                return res.status(400).json({ ok: false, mensaje: `Puedes adjuntar como máximo ${MAX_ARCHIVOS_RECURSO} archivos.` });
            }

            const tema = await repoTemas.buscarPorId(Number(id_tema));

            if (!tema) {
                return res.status(404).json({ ok: false, mensaje: "El tema indicado no existe." });
            }

            if (usuario.rol === "docente") {
                const propietario = await repoTemas.esDelDocente(Number(id_tema), usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes subir recursos a un tema que no es tuyo." });
                }
            }

            const recurso = await RepositorioRecursos.crear({
                titulo,
                descripcion,
                archivos: archivos.map(archivo => mapearArchivo(archivo)),
                id_tema: Number(id_tema),
                id_usuario: usuario.id
            });

            await notificarMateria(
                tema.id_materia,
                "recurso",
                `Nuevo recurso: ${titulo}`,
                `Tu docente agregó el recurso "${titulo}" en el tema "${tema.nombre}".`
            );

            return res.status(201).json({ ok: true, mensaje: "Recurso publicado correctamente.", data: recurso });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "No fue posible publicar el recurso." });
        }
    }

    // =====================================================
    // PUT /recursos/:id
    // Permite actualizar metadatos y, opcionalmente, agregar más archivos
    // (multipart/form-data, campo "archivos"). El total (existentes +
    // nuevos) no puede superar 5.
    // =====================================================
    async actualizar(req: Request, res: Response): Promise<Response> {

        try {
            const id = Number(req.params.id);
            const usuario = (req as any).usuario;
            const archivosNuevos = ((req as any).files as Express.Multer.File[] | undefined) ?? [];

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            const recursoExistente = await RepositorioRecursos.obtenerPorId(id);

            if (!recursoExistente) {
                return res.status(404).json({ ok: false, mensaje: "El recurso no existe." });
            }

            if (usuario.rol === "docente") {
                const propietario = await RepositorioRecursos.esDelDocente(id, usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes modificar este recurso." });
                }
            }

            const { titulo, descripcion } = req.body;

            if (!titulo) {
                return res.status(400).json({ ok: false, mensaje: "El título es obligatorio." });
            }

            const archivosActuales = recursoExistente.archivos ?? [];

            if (archivosActuales.length + archivosNuevos.length > MAX_ARCHIVOS_RECURSO) {
                return res.status(400).json({ ok: false, mensaje: `Un recurso admite como máximo ${MAX_ARCHIVOS_RECURSO} archivos.` });
            }

            const archivos = archivosNuevos.length > 0
                ? [...archivosActuales, ...archivosNuevos.map(archivo => mapearArchivo(archivo))]
                : undefined;

            const actualizado = await RepositorioRecursos.actualizar(id, titulo, descripcion, archivos);

            return res.status(200).json({
                ok: true,
                mensaje: archivosNuevos.length > 0
                    ? "Recurso y archivos actualizados correctamente."
                    : "Recurso actualizado correctamente.",
                data: actualizado
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({ ok: false, mensaje: "Error al actualizar el recurso." });
        }
    }

    // =====================================================
    // DELETE /recursos/:id
    // =====================================================
    async eliminar(req: Request, res: Response): Promise<Response> {

        try {

            const id = Number(req.params.id);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            if (usuario.rol === "docente") {
                const propietario = await RepositorioRecursos.esDelDocente(id, usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes eliminar este recurso." });
                }
            }

            const eliminado = await RepositorioRecursos.eliminar(id);

            if (!eliminado) {
                return res.status(404).json({ ok: false, mensaje: "Recurso no encontrado." });
            }

            return res.status(200).json({ ok: true, mensaje: "Recurso eliminado correctamente." });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "No fue posible eliminar el recurso." });
        }
    }

    // =====================================================
    // GET /recursos/:id/descargar/:indice
    // El recurso puede tener varios archivos; :indice es la posición
    // (0-based) dentro del arreglo "archivos".
    // =====================================================
    async descargar(req: Request, res: Response): Promise<void> {

        try {

            const id = Number(req.params.id);
            const indice = Number(req.params.indice ?? 0);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(id) || !Number.isInteger(indice) || indice < 0) {
                res.status(400).json({ ok: false, mensaje: "ID o índice de archivo inválido." });
                return;
            }

            const recurso = await RepositorioRecursos.obtenerPorId(id);

            if (!recurso) {
                res.status(404).json({ ok: false, mensaje: "Recurso no encontrado." });
                return;
            }

            if (usuario.rol === "alumno") {
                const inscrito = await RepositorioMaterias.estaInscritoPorRecurso(usuario.id, id);

                if (!inscrito) {
                    res.status(403).json({ ok: false, mensaje: "No estás inscrito en la materia de este recurso." });
                    return;
                }
            }

            const archivo: ArchivoRecurso | undefined = (recurso.archivos ?? [])[indice];

            if (!archivo) {
                res.status(404).json({ ok: false, mensaje: "Ese archivo no existe en este recurso." });
                return;
            }

            const ruta = path.join(process.cwd(), process.env.UPLOADS_PATH || "uploads", archivo.url);

            res.download(ruta, archivo.nombre_original || recurso.titulo, (error) => {
                if (error && !res.headersSent) {
                    res.status(404).json({ ok: false, mensaje: "Archivo no encontrado." });
                }
            });

        } catch (error) {
            console.error(error);

            if (!res.headersSent) {
                res.status(500).json({ ok: false, mensaje: "Error del servidor." });
            }
        }
    }

}

export default new RecursoController();
