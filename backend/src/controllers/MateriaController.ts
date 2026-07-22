import { Request, Response } from "express";
import RepositorioMaterias from "../repositories/RepositorioMateria";
import { RepositorioTemas } from "../repositories/RepositorioTemas";
import { repos } from "../repositories";
import { enviarCorreo } from "../config/mailer";
import { notificarMateria, correoMateria } from "../utils/notificaciones";
import RepositorioChat from "../repositories/RepositorioChat";
import RepositorioProgreso from "../repositories/RepositorioProgreso";

const repoTemas = new RepositorioTemas();

class MateriaController {

    // =====================================================
    // GET /materias
    // =====================================================

    async obtenerTodas(req: Request, res: Response) {

        try {

            const materias = await RepositorioMaterias.obtenerTodas();

            return res.status(200).json({
                ok: true,
                total: materias.length,
                data: materias
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                ok: false,
                mensaje: "Error al obtener las materias."
            });

        }

    }

    // =====================================================
    // GET /materias/:id
    // =====================================================

    async obtenerPorId(req: Request, res: Response) {

        try {

            const id = Number(req.params.id);

            if (!Number.isFinite(id) || !Number.isInteger(id)) {

                return res.status(400).json({
                    ok: false,
                    mensaje: "ID inválido."
                });

            }

            const materia = await RepositorioMaterias.obtenerPorId(id);

            if (!materia) {

                return res.status(404).json({
                    ok: false,
                    mensaje: "Materia no encontrada."
                });

            }

            return res.json({
                ok: true,
                data: materia
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                ok: false,
                mensaje: "Error del servidor."
            });

        }

    }

    // =====================================================
    // GET /materias/docente  (docente/admin)
    // Materias del docente autenticado (usa el id del token, no hace
    // falta mandarlo por header/body).
    // =====================================================

    async obtenerPorDocente(req: any, res: Response) {

        try {

            const usuario = req.usuario;

            const materias = await RepositorioMaterias.obtenerPorDocente(usuario.id);

            return res.status(200).json({
                ok: true,
                total: materias.length,
                data: materias
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                ok: false,
                mensaje: "Error al obtener las materias del docente."
            });

        }

    }

    // =====================================================
    // POST /materias
    // =====================================================

    async crear(req: any, res: Response) {

        try {

            const usuario = req.usuario;

            const {

                nombre,
                color,
                orden,
                id_docente

            } = req.body;

            // Si mandan un archivo (campo "icono"), esa imagen manda sobre
            // cualquier texto que también hayan puesto en icono -- el
            // ícono real de la materia es el archivo subido.
            const archivo = req.file as Express.Multer.File | undefined;
            const icono = archivo ? `materias/${archivo.filename}` : req.body.icono;

            if (!nombre || !id_docente) {

                return res.status(400).json({

                    ok: false,

                    mensaje: "Datos incompletos."

                });

            }

            // Docente solo puede crear para él mismo

            if (usuario.rol === "docente") {

                if (usuario.id != id_docente) {

                    return res.status(403).json({

                        ok: false,

                        mensaje: "No puedes crear materias para otro docente."

                    });

                }

            }

            const materia = await RepositorioMaterias.crear({

                nombre,

                icono,

                color,

                orden,

                id_docente

            });

            // El chat privado de la materia se crea junto con ella -- el
            // docente ya no tiene que crearlo aparte con POST /chats. Los
            // alumnos entran solos en cuanto se inscriben (la membresía
            // se calcula en vivo contra usuario_materia, no hace falta
            // agregarlos a mano). Best-effort: si falla, la materia ya
            // quedó creada y el docente puede crear el chat manualmente
            // después con POST /chats.
            try {

                await RepositorioChat.crearGrupoMateria(
                    materia.id_materia,
                    Number(id_docente),
                    materia.nombre
                );

            } catch (errorChat) {

                console.error("No se pudo crear el chat de la materia:", errorChat);

            }

            // El docente recibe el token de inscripción por correo -- es
            // best-effort: no se espera (el SMTP puede tardar o colgarse),
            // así que corre en paralelo y nunca retrasa ni tumba la respuesta.
            repos.usuarios.buscarPorId(Number(id_docente))
                .then(docente => {
                    if (!docente) return;

                    return enviarCorreo(
                        docente.correo,
                        `Token de inscripción para "${materia.nombre}" - Miztontli`,
                        `<p>Hola ${docente.nombre}, creaste la materia <strong>${materia.nombre}</strong>.</p>
                         <p>Comparte este token con tus alumnos para que se inscriban:</p>
                         <p style="font-size:20px;"><strong>${materia.token}</strong></p>`
                    );
                })
                .catch(errorCorreo => {
                    console.error("No se pudo enviar el correo del token de materia:", errorCorreo);
                });

            return res.status(201).json({

                ok: true,

                mensaje: "Materia creada correctamente. Se envió el token de inscripción al correo del docente.",

                data: materia

            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                ok: false,

                mensaje: "Error al crear la materia."

            });

        }

    }

    // =====================================================
    // PUT
    // =====================================================

    async actualizar(req: any, res: Response) {

        try {

            const id = Number(req.params.id);

            const usuario = req.usuario;

            const materiaExistente = await RepositorioMaterias.obtenerPorId(id);

            if (!materiaExistente) {

                return res.status(404).json({

                    ok: false,

                    mensaje: "Materia inexistente."

                });

            }

            if (usuario.rol === "docente") {

                const propietario = await RepositorioMaterias.esDelDocente(
                    id,
                    usuario.id
                );

                if (!propietario) {

                    return res.status(403).json({

                        ok: false,

                        mensaje: "No puedes modificar esta materia."

                    });

                }

            }

            const { nombre, color, orden } = req.body;

            // Si suben un archivo nuevo (campo "icono"), reemplaza el
            // ícono; si no, conserva el que ya tenía -- mismo patrón que
            // TemaController.actualizarContenido con imagen1/imagen2. El
            // resto de los campos también conserva su valor actual si no
            // se mandan, para poder actualizar solo el ícono sin tener
            // que reenviar nombre/color/orden.
            const archivo = req.file as Express.Multer.File | undefined;
            const icono = archivo ? `materias/${archivo.filename}` : (req.body.icono ?? materiaExistente.icono);

            const materia = await RepositorioMaterias.actualizar(id, {
                nombre: nombre ?? materiaExistente.nombre,
                icono,
                color: color ?? materiaExistente.color,
                orden: orden !== undefined ? Number(orden) : materiaExistente.orden,
                id_docente: materiaExistente.id_docente
            });

            return res.json({

                ok: true,

                mensaje: "Materia actualizada.",

                data: materia

            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                ok: false,

                mensaje: "Error del servidor."

            });

        }

    }

    // =====================================================
    // DELETE
    // =====================================================

    async eliminar(req: any, res: Response) {

        try {

            const id = Number(req.params.id);

            const usuario = req.usuario;

            if (usuario.rol === "docente") {

                const propietario = await RepositorioMaterias.esDelDocente(
                    id,
                    usuario.id
                );

                if (!propietario) {

                    return res.status(403).json({

                        ok: false,

                        mensaje: "No puedes eliminar esta materia."

                    });

                }

            }

            const eliminado = await RepositorioMaterias.eliminar(id);

            if (!eliminado) {

                return res.status(404).json({

                    ok: false,

                    mensaje: "Materia no encontrada."

                });

            }

            return res.json({

                ok: true,

                mensaje: "Materia eliminada."

            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                ok: false,

                mensaje: "Error del servidor."

            });

        }

    }

    // =====================================================
    // GET /materias/:id/alumnos  (docente dueño o admin)
    // Roster de inscritos + su avance calculado, para el panel del
    // docente ("mis alumnos"). A diferencia de GET /progreso/materia/:id,
    // incluye a TODOS los inscritos (no solo a quienes ya entregaron algo).
    // =====================================================

    async obtenerAlumnos(req: any, res: Response) {

        try {

            const id = Number(req.params.id);
            const usuario = req.usuario;

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            const materia = await RepositorioMaterias.obtenerPorId(id);

            if (!materia) {
                return res.status(404).json({ ok: false, mensaje: "Materia no encontrada." });
            }

            if (usuario.rol === "docente") {
                const propietario = await RepositorioMaterias.esDelDocente(id, usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes ver los alumnos de esta materia." });
                }
            }

            const roster = await RepositorioMaterias.obtenerRosterInscritos(id);

            const alumnos = await Promise.all(
                roster.map(async alumno => ({
                    ...alumno,
                    progreso: await RepositorioProgreso.calcularYGuardar(alumno.id_usuario, id)
                }))
            );

            return res.status(200).json({ ok: true, total: alumnos.length, data: alumnos });

        } catch (error) {

            console.error(error);

            return res.status(500).json({ ok: false, mensaje: "Error al obtener los alumnos de la materia." });

        }

    }

    // =====================================================
    // GET /materias/:id/indice
    // Navegación de la materia: temas ordenados, con indicador de si
    // cada uno tiene actividades y/o exámenes. No almacena nada, solo
    // compone lo que ya existe.
    // =====================================================

    async obtenerIndice(req: any, res: Response) {

        try {

            const id = Number(req.params.id);
            const usuario = req.usuario;

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            const materia = await RepositorioMaterias.existe(id);

            if (!materia) {
                return res.status(404).json({ ok: false, mensaje: "Materia no encontrada." });
            }

            if (usuario.rol === "alumno") {
                const inscrito = await RepositorioMaterias.estaInscrito(usuario.id, id);

                if (!inscrito) {
                    return res.status(403).json({ ok: false, mensaje: "No estás inscrito en esta materia." });
                }
            }

            const temas = await repoTemas.buscarIndicePorMateria(id);

            return res.json({
                ok: true,
                data: { temas }
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({ ok: false, mensaje: "Error del servidor." });

        }

    }

    // =====================================================
    // GET /materias/:id/token  (docente dueño o admin)
    // El token de inscripción no se expone en ningún otro endpoint (ver
    // el comentario de COLUMNAS): solo se devuelve una vez al crear la
    // materia y se manda por correo. Esta ruta existe para que el docente
    // lo pueda recuperar después sin tener que ir a la base de datos.
    // =====================================================

    async obtenerToken(req: any, res: Response) {

        try {

            const id = Number(req.params.id);
            const usuario = req.usuario;

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            const materia = await RepositorioMaterias.obtenerPorId(id);

            if (!materia) {
                return res.status(404).json({ ok: false, mensaje: "Materia no encontrada." });
            }

            if (usuario.rol === "docente") {
                const propietario = await RepositorioMaterias.esDelDocente(id, usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes ver el token de una materia que no es tuya." });
                }
            }

            const token = await RepositorioMaterias.obtenerToken(id);

            return res.json({ ok: true, data: { token } });

        } catch (error) {

            console.error(error);

            return res.status(500).json({ ok: false, mensaje: "Error al obtener el token de la materia." });

        }

    }

    // =====================================================
    // POST /materias/inscribirse  (alumno)
    // El alumno manda el token que le compartió su docente y queda
    // inscrito en esa materia. Sin inscripción no puede ver el índice,
    // los temas, recursos, actividades ni exámenes de la materia.
    // =====================================================

    async inscribirse(req: any, res: Response) {

        try {

            const usuario = req.usuario;
            const { token } = req.body;

            if (!token || String(token).trim() === "") {
                return res.status(400).json({ ok: false, mensaje: "Debes ingresar el token de la materia." });
            }

            const materia = await RepositorioMaterias.buscarPorToken(String(token).trim().toUpperCase());

            if (!materia) {
                return res.status(404).json({ ok: false, mensaje: "Token inválido. Verifica que esté bien escrito." });
            }

            const yaInscrito = await RepositorioMaterias.estaInscrito(usuario.id, materia.id_materia);

            if (yaInscrito) {
                return res.status(409).json({ ok: false, mensaje: "Ya estás inscrito en esta materia." });
            }

            await RepositorioMaterias.inscribir(usuario.id, materia.id_materia);

            return res.status(201).json({
                ok: true,
                mensaje: `Te inscribiste correctamente a "${materia.nombre}".`,
                data: materia
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({ ok: false, mensaje: "No fue posible completar la inscripción." });

        }

    }

    // =====================================================
    // POST /materias/:id/aviso  (docente/admin)
    // "Aviso importante": a diferencia de una publicación normal de la
    // Comunidad, esto SIEMPRE genera notificación in-app (tipo "aviso")
    // Y correo a todos los inscritos, de una sola vez -- pensado para
    // avisos que el docente quiere asegurarse de que todos vean (cambio
    // de fecha de examen, instrucciones urgentes, etc.), no para el feed
    // de preguntas/respuestas del día a día.
    // =====================================================

    async avisoImportante(req: any, res: Response) {

        try {

            const id = Number(req.params.id);
            const usuario = req.usuario;
            const { titulo, mensaje } = req.body;

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            if (!titulo || !mensaje) {
                return res.status(400).json({ ok: false, mensaje: "El título y el mensaje son obligatorios." });
            }

            const materia = await RepositorioMaterias.obtenerPorId(id);

            if (!materia) {
                return res.status(404).json({ ok: false, mensaje: "Materia no encontrada." });
            }

            if (usuario.rol === "docente") {
                const propietario = await RepositorioMaterias.esDelDocente(id, usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes enviar avisos en una materia que no es tuya." });
                }
            }

            await notificarMateria(id, "aviso", titulo, mensaje);

            // El correo masivo a los inscritos es best-effort: no se espera,
            // para que un SMTP lento/colgado no tumbe la respuesta.
            correoMateria(
                id,
                `Aviso importante: ${titulo} - Miztontli`,
                (alumno) => `<p>Hola ${alumno.nombre}, tu docente envió un aviso importante en "${materia.nombre}".</p>
                             <p><strong>${titulo}</strong></p>
                             <p>${mensaje}</p>`
            ).catch(errorCorreo => {
                console.error("No se pudo enviar el correo del aviso:", errorCorreo);
            });

            return res.status(201).json({
                ok: true,
                mensaje: "Aviso enviado a todos los alumnos inscritos (notificación y correo)."
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({ ok: false, mensaje: "No fue posible enviar el aviso." });

        }

    }

}

export default new MateriaController();