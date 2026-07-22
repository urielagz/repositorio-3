import { Request, Response } from "express";
import RepositorioActividades from "../repositories/RepositorioActividades";
import { RepositorioTemas } from "../repositories/RepositorioTemas";
import RepositorioMaterias from "../repositories/RepositorioMateria";
import RepositorioNotificaciones from "../repositories/RepositorioNotificaciones";
import { notificarMateria, correoMateria } from "../utils/notificaciones";
import { clasificarTipo } from "../config/uploadAcademico";
import { enviarCorreo } from "../config/mailer";
import { repos } from "../repositories";
import path from "path";
import fs from "fs";
const repoTemas = new RepositorioTemas();

class ActividadController {

    // =====================================================
    // GET /actividades/tema/:idTema
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

            const actividades = await RepositorioActividades.obtenerPorTema(idTema);

            return res.status(200).json({ ok: true, total: actividades.length, data: actividades });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al obtener las actividades." });
        }
    }

    // =====================================================
    // GET /actividades/:id
    // =====================================================
    async obtenerPorId(req: Request, res: Response): Promise<Response> {

        try {

            const id = Number(req.params.id);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            const actividad = await RepositorioActividades.obtenerPorId(id);

            if (!actividad) {
                return res.status(404).json({ ok: false, mensaje: "Actividad no encontrada." });
            }

            if (usuario.rol === "alumno") {
                const inscrito = await RepositorioMaterias.estaInscritoPorActividad(usuario.id, id);

                if (!inscrito) {
                    return res.status(403).json({ ok: false, mensaje: "No estás inscrito en la materia de esta actividad." });
                }
            }

            return res.status(200).json({ ok: true, data: actividad });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error del servidor." });
        }
    }

    // =====================================================
    // POST /actividades
    // =====================================================
    async crear(req: Request, res: Response): Promise<Response> {

        try {

            const usuario = (req as any).usuario;
            const { titulo, descripcion, fecha_limite, puntaje, archivos_permitidos, id_tema } = req.body;
            const archivos = ((req as any).files as Express.Multer.File[] | undefined) ?? [];

            if (!titulo || !id_tema) {
                return res.status(400).json({ ok: false, mensaje: "El título y el tema son obligatorios." });
            }

            const tema = await repoTemas.buscarPorId(Number(id_tema));

            if (!tema) {
                return res.status(404).json({ ok: false, mensaje: "El tema indicado no existe." });
            }

            if (usuario.rol === "docente") {
                const propietario = await repoTemas.esDelDocente(Number(id_tema), usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes crear actividades en un tema que no es tuyo." });
                }
            }

            const actividad = await RepositorioActividades.crear({
                titulo,
                descripcion,
                fecha_limite: fecha_limite ? new Date(fecha_limite) : undefined,
                puntaje: puntaje !== undefined ? Number(puntaje) : undefined,
                archivos_permitidos,
                archivos_apoyo: archivos.map(archivo => ({
                    url: `actividades/${archivo.filename}`,
                    nombre_original: archivo.originalname
                })),
                id_tema: Number(id_tema),
                id_docente: usuario.id
            });

            await notificarMateria(
                tema.id_materia,
                "actividad",
                `Nueva actividad: ${titulo}`,
                `Tu docente agregó la actividad "${titulo}" en el tema "${tema.nombre}".`
            );

            // Una actividad nueva sí amerita correo (a diferencia de un
            // tema nuevo, que solo genera notificación in-app).
            await correoMateria(
                tema.id_materia,
                `Nueva actividad: ${titulo} - Miztontli`,
                (alumno) => `<p>Hola ${alumno.nombre}, tu docente agregó una nueva actividad en el tema "${tema.nombre}".</p>
                             <p><strong>${titulo}</strong></p>
                             ${fecha_limite ? `<p>Fecha límite: ${new Date(fecha_limite).toLocaleString("es-MX")}</p>` : ""}`
            );

            return res.status(201).json({ ok: true, mensaje: "Actividad creada correctamente.", data: actividad });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "No fue posible crear la actividad." });
        }
    }

    // =====================================================
    // PUT /actividades/:id
    // =====================================================
    async actualizar(req: Request, res: Response): Promise<Response> {

        try {

            const id = Number(req.params.id);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            const actividadExistente = await RepositorioActividades.obtenerPorId(id);

            if (!actividadExistente) {
                return res.status(404).json({ ok: false, mensaje: "La actividad no existe." });
            }

            if (usuario.rol === "docente") {
                const propietario = await RepositorioActividades.esDelDocente(id, usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes modificar esta actividad." });
                }
            }

            const { titulo, descripcion, fecha_limite, puntaje, archivos_permitidos } = req.body;
            const archivosNuevos = ((req as any).files as Express.Multer.File[] | undefined) ?? [];

            if (!titulo) {
                return res.status(400).json({ ok: false, mensaje: "El título es obligatorio." });
            }

            const nuevaFechaLimite = fecha_limite ? new Date(fecha_limite) : undefined;

            const actualizada = await RepositorioActividades.actualizar(id, {
                titulo,
                descripcion,
                fecha_limite: nuevaFechaLimite,
                puntaje: puntaje !== undefined ? Number(puntaje) : undefined,
                archivos_permitidos,
                archivos_apoyo: [
                    ...(actividadExistente.archivos_apoyo ?? []),
                    ...archivosNuevos.map(archivo => ({
                        url: `actividades/${archivo.filename}`,
                        nombre_original: archivo.originalname
                    }))
                ]
            });

            const tema = await repoTemas.buscarPorId(actividadExistente.id_tema);

            if (tema) {
                await notificarMateria(
                    tema.id_materia,
                    "actividad",
                    `Actividad actualizada: ${titulo}`,
                    `Tu docente actualizó la actividad "${titulo}" en el tema "${tema.nombre}".`
                );

                // Solo se manda correo si la fecha límite realmente cambió --
                // ediciones menores (descripción, puntaje) no deben saturar bandejas.
                const fechaAnteriorMs = actividadExistente.fecha_limite ? new Date(actividadExistente.fecha_limite).getTime() : null;
                const fechaNuevaMs = nuevaFechaLimite ? nuevaFechaLimite.getTime() : null;

                if (fechaAnteriorMs !== fechaNuevaMs) {
                    await correoMateria(
                        tema.id_materia,
                        `Cambio de fecha: ${titulo} - Miztontli`,
                        (alumno) => `<p>Hola ${alumno.nombre}, la fecha límite de la actividad <strong>"${titulo}"</strong> en el tema "${tema.nombre}" cambió.</p>
                                     <p>Nueva fecha límite: ${nuevaFechaLimite ? nuevaFechaLimite.toLocaleString("es-MX") : "sin fecha límite"}.</p>`
                    );
                }
            }

            return res.status(200).json({ ok: true, mensaje: "Actividad actualizada correctamente.", data: actualizada });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al actualizar la actividad." });
        }
    }

    // =====================================================
    // DELETE /actividades/:id
    // =====================================================
    async eliminar(req: Request, res: Response): Promise<Response> {

        try {

            const id = Number(req.params.id);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            if (usuario.rol === "docente") {
                const propietario = await RepositorioActividades.esDelDocente(id, usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes eliminar esta actividad." });
                }
            }

            const eliminada = await RepositorioActividades.eliminar(id);

            if (!eliminada) {
                return res.status(404).json({ ok: false, mensaje: "Actividad no encontrada." });
            }

            return res.status(200).json({ ok: true, mensaje: "Actividad eliminada correctamente." });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "No fue posible eliminar la actividad." });
        }
    }

    // =====================================================
// POST /actividades/:id/entregar
// Alumno - multipart/form-data, campo "archivos" (hasta 5).
// Entrega vía archivos, texto y/o una URL: se exige al menos una de
// las tres.
// =====================================================
async entregar(req: Request, res: Response): Promise<Response> {

    const MAX_ARCHIVOS_ENTREGA = 5;
    const archivos = ((req as any).files as Express.Multer.File[] | undefined) ?? [];

    const borrarArchivosSubidos = () => {
        for (const archivo of archivos) {
            if (fs.existsSync(archivo.path)) {
                fs.unlinkSync(archivo.path);
            }
        }
    };

    try {

        const idActividad = Number(req.params.id);
        const usuario = (req as any).usuario;
        const { comentario, url_entrega } = req.body;

        if (!Number.isInteger(idActividad)) {
            borrarArchivosSubidos();
            return res.status(400).json({
                ok: false,
                mensaje: "ID inválido."
            });
        }

        if (archivos.length > MAX_ARCHIVOS_ENTREGA) {
            borrarArchivosSubidos();
            return res.status(400).json({
                ok: false,
                mensaje: `Puedes adjuntar como máximo ${MAX_ARCHIVOS_ENTREGA} archivos.`
            });
        }

        const actividad = await RepositorioActividades.obtenerPorId(idActividad);

        if (!actividad) {
            borrarArchivosSubidos();
            return res.status(404).json({
                ok: false,
                mensaje: "Actividad no encontrada."
            });
        }

        const inscrito =
            await RepositorioMaterias.estaInscritoPorActividad(
                usuario.id,
                idActividad
            );

        if (!inscrito) {
            borrarArchivosSubidos();
            return res.status(403).json({
                ok: false,
                mensaje: "No estás inscrito en la materia de esta actividad."
            });
        }

        if (archivos.length === 0 && !comentario && !url_entrega) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debes adjuntar al menos un archivo, escribir tu entrega en texto o compartir una URL."
            });
        }

        // =====================================================
        // VALIDAR EL TIPO DE CADA ARCHIVO PERMITIDO POR LA ACTIVIDAD
        // "archivos_permitidos" guarda categorías (pdf, documento,
        // imagen, video...), las mismas que devuelve clasificarTipo() --
        // no extensiones sueltas, porque una categoría como "documento"
        // agrupa varias extensiones (.doc, .docx, .odt, .txt...).
        // =====================================================
        if (archivos.length > 0 && actividad.archivos_permitidos) {

            const categoriasPermitidas = actividad.archivos_permitidos
                .split(",")
                .map((categoria: string) => categoria.trim().toLowerCase())
                .filter((categoria: string) => categoria.length > 0);

            const archivoNoPermitido = archivos.find(archivo =>
                !categoriasPermitidas.includes(clasificarTipo(path.extname(archivo.originalname)))
            );

            if (archivoNoPermitido) {
                borrarArchivosSubidos();

                return res.status(400).json({
                    ok: false,
                    mensaje:
                        `Archivo no permitido. Categorías aceptadas: ${categoriasPermitidas.join(", ")}`
                });
            }
        }

        // =====================================================
        // GUARDAR LA ENTREGA
        // =====================================================
        const entrega = await RepositorioActividades.entregar({
            id_usuario: usuario.id,
            id_actividad: idActividad,
            archivos: archivos.map(archivo => ({
                url: `entregas/${archivo.filename}`,
                nombre_original: archivo.originalname
            })),
            url_entrega,
            comentario_alumno: comentario
        });

        // Solo notifica al docente dueño (en su panel, sin correo -- mandar
        // un correo por cada entrega individual sería demasiado ruido).
        if (actividad.id_docente) {

            try {

                const alumno = await repos.usuarios.buscarPorId(usuario.id);

                await RepositorioNotificaciones.crearParaUsuarios([actividad.id_docente], {
                    titulo: `Nueva entrega: ${actividad.titulo}`,
                    mensaje: `${alumno ? `${alumno.nombre} ${alumno.apellido}` : "Un alumno"} entregó la actividad "${actividad.titulo}".`,
                    tipo: "actividad"
                });

            } catch (errorNotificacion) {

                console.error("No se pudo notificar al docente de la nueva entrega:", errorNotificacion);

            }

        }

        return res.status(201).json({
            ok: true,
            mensaje: "Actividad entregada correctamente.",
            data: entrega
        });

    } catch (error) {

        console.error(error);
        borrarArchivosSubidos();

        return res.status(500).json({
            ok: false,
            mensaje: "No fue posible entregar la actividad."
        });
    }
}
    // =====================================================
    // GET /actividades/:id/entregas  (docente/admin)
    // =====================================================
    async obtenerEntregas(req: Request, res: Response): Promise<Response> {

        try {

            const idActividad = Number(req.params.id);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(idActividad)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            if (usuario.rol === "docente") {
                const propietario = await RepositorioActividades.esDelDocente(idActividad, usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes ver las entregas de esta actividad." });
                }
            }

            const entregas = await RepositorioActividades.obtenerEntregasDeActividad(idActividad);

            return res.status(200).json({ ok: true, total: entregas.length, data: entregas });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error del servidor." });
        }
    }

    // =====================================================
    // GET /actividades/alumno/mis-entregas  (alumno)
    // =====================================================
    async misEntregas(req: Request, res: Response): Promise<Response> {

        try {

            const usuario = (req as any).usuario;

            const entregas = await RepositorioActividades.obtenerEntregasDeAlumno(usuario.id);

            return res.status(200).json({ ok: true, total: entregas.length, data: entregas });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error del servidor." });
        }
    }

    // =====================================================
    // DELETE /actividades/:id/entregar  (alumno)
    // Retira la propia entrega. No se permite si el docente ya la
    // calificó, para no borrar una evaluación ya hecha.
    // =====================================================
    async eliminarEntrega(req: Request, res: Response): Promise<Response> {

        try {

            const idActividad = Number(req.params.id);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(idActividad)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            const entrega = await RepositorioActividades.obtenerEntregaDeAlumno(usuario.id, idActividad);

            if (!entrega) {
                return res.status(404).json({ ok: false, mensaje: "No tienes una entrega registrada para esta actividad." });
            }

            if (entrega.calificacion !== null && entrega.calificacion !== undefined) {
                return res.status(400).json({ ok: false, mensaje: "No puedes eliminar una entrega que ya fue calificada." });
            }

            for (const archivo of entrega.archivos ?? []) {
                const ruta = path.join(process.cwd(), process.env.UPLOADS_PATH || "uploads", archivo.url);

                if (fs.existsSync(ruta)) {
                    fs.unlinkSync(ruta);
                }
            }

            await RepositorioActividades.eliminarEntrega(entrega.id_registro!);

            return res.status(200).json({ ok: true, mensaje: "Entrega eliminada correctamente." });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "No fue posible eliminar la entrega." });
        }
    }

    // =====================================================
    // PUT /actividades/entregas/:idEntrega/calificar  (docente/admin)
    // =====================================================
    async calificar(req: Request, res: Response): Promise<Response> {

        try {

            const idEntrega = Number(req.params.idEntrega);
            const usuario = (req as any).usuario;
            const { calificacion, observaciones_docente } = req.body;

            if (!Number.isInteger(idEntrega)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            if (calificacion === undefined || isNaN(Number(calificacion))) {
                return res.status(400).json({ ok: false, mensaje: "La calificación es obligatoria y debe ser numérica." });
            }

            const entrega = await RepositorioActividades.obtenerEntregaPorId(idEntrega);

            if (!entrega) {
                return res.status(404).json({ ok: false, mensaje: "Entrega no encontrada." });
            }

            if (usuario.rol === "docente") {
                const propietario = await RepositorioActividades.esDelDocente(entrega.id_actividad, usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes calificar esta entrega." });
                }
            }

            const actualizada = await RepositorioActividades.calificar(idEntrega, Number(calificacion), observaciones_docente);

            // Avisa al alumno en su panel y por correo -- a diferencia de
            // la notificación de "nueva entrega" al docente, esta sí
            // amerita correo porque es algo que el alumno quiere ver
            // aunque no esté conectado.
            try {

                const actividad = await RepositorioActividades.obtenerPorId(entrega.id_actividad);
                const alumno = await repos.usuarios.buscarPorId(entrega.id_usuario);

                if (actividad && alumno) {

                    await RepositorioNotificaciones.crearParaUsuarios([alumno.id_usuario], {
                        titulo: `Actividad calificada: ${actividad.titulo}`,
                        mensaje: `Tu docente calificó tu entrega de "${actividad.titulo}" con ${calificacion}.`,
                        tipo: "actividad"
                    });

                    await enviarCorreo(
                        alumno.correo,
                        `Actividad calificada: ${actividad.titulo} - Miztontli`,
                        `<p>Hola ${alumno.nombre}, tu docente calificó tu entrega de "${actividad.titulo}".</p>
                         <p>Calificación: <strong>${calificacion}</strong></p>
                         ${observaciones_docente ? `<p>Observaciones: ${observaciones_docente}</p>` : ""}`
                    );

                }

            } catch (errorAviso) {

                console.error("No se pudo notificar/enviar correo de la calificación:", errorAviso);

            }

            return res.status(200).json({ ok: true, mensaje: "Entrega calificada correctamente.", data: actualizada });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "No fue posible calificar la entrega." });
        }
    }

}

export default new ActividadController();
