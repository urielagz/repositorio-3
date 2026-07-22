import { Request, Response } from "express";
import RepositorioExamenes from "../repositories/RepositorioExamenes";
import { RepositorioTemas } from "../repositories/RepositorioTemas";
import RepositorioMaterias from "../repositories/RepositorioMateria";
import { notificarMateria, correoMateria } from "../utils/notificaciones";

const repoTemas = new RepositorioTemas();

class ExamenController {

    // =====================================================
    // GET /examenes/tema/:idTema
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

            const examenes = await RepositorioExamenes.obtenerPorTema(idTema);

            return res.status(200).json({ ok: true, total: examenes.length, data: examenes });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al obtener los exámenes." });
        }
    }

    // =====================================================
    // GET /examenes/:id
    // =====================================================
    async obtenerPorId(req: Request, res: Response): Promise<Response> {

        try {

            const id = Number(req.params.id);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            const examen = await RepositorioExamenes.obtenerPorId(id);

            if (!examen) {
                return res.status(404).json({ ok: false, mensaje: "Examen no encontrado." });
            }

            if (usuario.rol === "alumno") {
                const inscrito = await RepositorioMaterias.estaInscritoPorExamen(usuario.id, id);

                if (!inscrito) {
                    return res.status(403).json({ ok: false, mensaje: "No estás inscrito en la materia de este examen." });
                }
            }

            return res.status(200).json({ ok: true, data: examen });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error del servidor." });
        }
    }

    // =====================================================
    // POST /examenes  (docente/admin)
    // =====================================================
    async crear(req: Request, res: Response): Promise<Response> {

        try {

            const usuario = (req as any).usuario;
            const { titulo, descripcion, url_formulario, fecha_limite, id_tema } = req.body;

            if (!titulo || !url_formulario || !id_tema) {
                return res.status(400).json({ ok: false, mensaje: "El título, la URL del formulario y el tema son obligatorios." });
            }

            const tema = await repoTemas.buscarPorId(Number(id_tema));

            if (!tema) {
                return res.status(404).json({ ok: false, mensaje: "El tema indicado no existe." });
            }

            if (usuario.rol === "docente") {
                const propietario = await repoTemas.esDelDocente(Number(id_tema), usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes crear exámenes en un tema que no es tuyo." });
                }
            }

            const examen = await RepositorioExamenes.crear({
                titulo,
                descripcion,
                url_formulario,
                fecha_limite: fecha_limite ? new Date(fecha_limite) : undefined,
                id_tema: Number(id_tema),
                id_docente: usuario.id
            });

            await notificarMateria(
                tema.id_materia,
                "examen",
                `Nuevo examen: ${titulo}`,
                `Se agregó un nuevo examen en el tema "${tema.nombre}".`
            );

            // Un examen nuevo sí amerita correo (a diferencia de un tema
            // nuevo, que solo genera notificación in-app).
            await correoMateria(
                tema.id_materia,
                `Nuevo examen: ${titulo} - Miztontli`,
                (alumno) => `<p>Hola ${alumno.nombre}, tu docente agregó un nuevo examen en el tema "${tema.nombre}".</p>
                             <p><strong>${titulo}</strong></p>
                             ${fecha_limite ? `<p>Fecha límite: ${new Date(fecha_limite).toLocaleString("es-MX")}</p>` : ""}`
            );

            return res.status(201).json({ ok: true, mensaje: "Examen creado correctamente.", data: examen });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "No fue posible crear el examen." });
        }
    }

    // =====================================================
    // PUT /examenes/:id  (docente/admin)
    // =====================================================
    async actualizar(req: Request, res: Response): Promise<Response> {

        try {

            const id = Number(req.params.id);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            const examenExistente = await RepositorioExamenes.obtenerPorId(id);

            if (!examenExistente) {
                return res.status(404).json({ ok: false, mensaje: "El examen no existe." });
            }

            if (usuario.rol === "docente") {
                const propietario = await RepositorioExamenes.esDelDocente(id, usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes modificar este examen." });
                }
            }

            const { titulo, descripcion, url_formulario, fecha_limite } = req.body;

            if (!titulo || !url_formulario) {
                return res.status(400).json({ ok: false, mensaje: "El título y la URL del formulario son obligatorios." });
            }

            const nuevaFechaLimite = fecha_limite ? new Date(fecha_limite) : undefined;

            const actualizado = await RepositorioExamenes.actualizar(id, {
                titulo,
                descripcion,
                url_formulario,
                fecha_limite: nuevaFechaLimite
            });

            const tema = await repoTemas.buscarPorId(examenExistente.id_tema);

            if (tema) {
                await notificarMateria(
                    tema.id_materia,
                    "examen",
                    `Examen actualizado: ${titulo}`,
                    `Tu docente actualizó el examen "${titulo}" en el tema "${tema.nombre}".`
                );

                // Solo se manda correo si la fecha límite realmente cambió --
                // ediciones menores (descripción, url) no deben saturar bandejas.
                const fechaAnteriorMs = examenExistente.fecha_limite ? new Date(examenExistente.fecha_limite).getTime() : null;
                const fechaNuevaMs = nuevaFechaLimite ? nuevaFechaLimite.getTime() : null;

                if (fechaAnteriorMs !== fechaNuevaMs) {
                    await correoMateria(
                        tema.id_materia,
                        `Cambio de fecha: ${titulo} - Miztontli`,
                        (alumno) => `<p>Hola ${alumno.nombre}, la fecha límite del examen <strong>"${titulo}"</strong> en el tema "${tema.nombre}" cambió.</p>
                                     <p>Nueva fecha límite: ${nuevaFechaLimite ? nuevaFechaLimite.toLocaleString("es-MX") : "sin fecha límite"}.</p>`
                    );
                }
            }

            return res.status(200).json({ ok: true, mensaje: "Examen actualizado correctamente.", data: actualizado });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al actualizar el examen." });
        }
    }

    // =====================================================
    // DELETE /examenes/:id  (docente/admin)
    // =====================================================
    async eliminar(req: Request, res: Response): Promise<Response> {

        try {

            const id = Number(req.params.id);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            if (usuario.rol === "docente") {
                const propietario = await RepositorioExamenes.esDelDocente(id, usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes eliminar este examen." });
                }
            }

            const eliminado = await RepositorioExamenes.eliminar(id);

            if (!eliminado) {
                return res.status(404).json({ ok: false, mensaje: "Examen no encontrado." });
            }

            return res.status(200).json({ ok: true, mensaje: "Examen eliminado correctamente." });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "No fue posible eliminar el examen." });
        }
    }

}

export default new ExamenController();
