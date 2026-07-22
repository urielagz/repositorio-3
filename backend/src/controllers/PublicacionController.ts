import { Request, Response } from "express";
import { repos } from "../repositories";
import RepositorioMaterias from "../repositories/RepositorioMateria";
import { RepositorioTemas } from "../repositories/RepositorioTemas";
import RepositorioActividades from "../repositories/RepositorioActividades";
import RepositorioExamenes from "../repositories/RepositorioExamenes";
import { clasificarTipo } from "../config/uploadAcademico";
import { enviarCorreo } from "../config/mailer";
import path from "path";

const repo = repos.publicaciones;
const repoTemas = new RepositorioTemas();

export class PublicacionController {

    // =====================================================
    // POST /publicaciones  (multipart/form-data)
    // Feed tipo Facebook, acotado por materia. El docente/admin puede
    // publicar cualquier tipo (dispara correo a los inscritos); el
    // alumno solo puede publicar tipo "pregunta" (sin correo masivo), y
    // debe estar inscrito en la materia.
    // =====================================================
    crear = async (req: Request, res: Response) => {

        try {

            const usuario = (req as any).usuario;
            const archivos = ((req as any).files as Express.Multer.File[] | undefined) ?? [];
            const { titulo, contenido, id_materia, id_tema, id_actividad, id_examen } = req.body;
            let { tipo } = req.body;

            if (!titulo) {
                return res.status(400).json({ ok: false, mensaje: "El título es obligatorio." });
            }

            let idMateria: number | undefined;
            let idTemaFinal: number | undefined;
            let idActividadFinal: number | undefined;
            let idExamenFinal: number | undefined;

            if (id_materia) {

                // Post acotado a una materia (como un grupo de clase):
                // requiere inscripción/propiedad, igual que antes.
                idMateria = Number(id_materia);
                const materiaExiste = await RepositorioMaterias.existe(idMateria);

                if (!materiaExiste) {
                    return res.status(404).json({ ok: false, mensaje: "La materia indicada no existe." });
                }

                // Permisos: el alumno debe estar inscrito y solo puede preguntar;
                // el docente debe ser dueño de la materia y puede publicar cualquier tipo.
                if (usuario.rol === "alumno") {

                    const inscrito = await RepositorioMaterias.estaInscrito(usuario.id, idMateria);

                    if (!inscrito) {
                        return res.status(403).json({ ok: false, mensaje: "No estás inscrito en esta materia." });
                    }

                    tipo = "pregunta";

                } else if (usuario.rol === "docente") {

                    const propietario = await RepositorioMaterias.esDelDocente(idMateria, usuario.id);

                    if (!propietario) {
                        return res.status(403).json({ ok: false, mensaje: "No puedes publicar en una materia que no es tuya." });
                    }

                    const tiposValidos = ["general", "pregunta", "recurso"];
                    tipo = tiposValidos.includes(tipo) ? tipo : "general";

                } else {
                    // admin
                    const tiposValidos = ["general", "pregunta", "recurso"];
                    tipo = tiposValidos.includes(tipo) ? tipo : "general";
                }

                // Si dan id_tema, debe pertenecer a la materia. Si dan
                // id_actividad/id_examen, se usa su propio tema (y se valida
                // que ese tema sea de la materia).
                idTemaFinal = id_tema ? Number(id_tema) : undefined;

                if (idTemaFinal) {
                    const tema = await repoTemas.buscarPorId(idTemaFinal);

                    if (!tema || tema.id_materia !== idMateria) {
                        return res.status(400).json({ ok: false, mensaje: "El tema indicado no pertenece a esta materia." });
                    }
                }

                idActividadFinal = id_actividad ? Number(id_actividad) : undefined;

                if (idActividadFinal) {
                    const actividad = await RepositorioActividades.obtenerPorId(idActividadFinal);

                    if (!actividad) {
                        return res.status(400).json({ ok: false, mensaje: "La actividad indicada no existe." });
                    }

                    if (idTemaFinal && actividad.id_tema !== idTemaFinal) {
                        return res.status(400).json({ ok: false, mensaje: "La actividad indicada no pertenece al tema indicado." });
                    }

                    idTemaFinal = idTemaFinal ?? actividad.id_tema;
                }

                idExamenFinal = id_examen ? Number(id_examen) : undefined;

                if (idExamenFinal) {
                    const examen = await RepositorioExamenes.obtenerPorId(idExamenFinal);

                    if (!examen) {
                        return res.status(400).json({ ok: false, mensaje: "El examen indicado no existe." });
                    }

                    if (idTemaFinal && examen.id_tema !== idTemaFinal) {
                        return res.status(400).json({ ok: false, mensaje: "El examen indicado no pertenece al tema indicado." });
                    }

                    idTemaFinal = idTemaFinal ?? examen.id_tema;
                }

            } else {

                // Post del feed general de la comunidad: cualquier alumno o
                // docente autenticado puede publicar, sin inscripción de
                // por medio -- no se restringe el tipo (a diferencia del
                // feed por materia, donde el alumno solo puede preguntar).
                const tiposValidos = ["general", "pregunta", "recurso"];
                tipo = tiposValidos.includes(tipo) ? tipo : "general";

            }

            const publicacion = await repo.crear({
                titulo,
                contenido,
                tipo,
                archivos: archivos.map(archivo => ({
                    url: `comunidad/${archivo.filename}`,
                    nombre_original: archivo.originalname,
                    tipo: clasificarTipo(path.extname(archivo.originalname))
                })),
                id_usuario: usuario.id,
                id_materia: idMateria,
                id_tema: idTemaFinal,
                id_actividad: idActividadFinal,
                id_examen: idExamenFinal
            });

            // Solo las publicaciones del docente/admin DENTRO DE UNA MATERIA
            // notifican por correo a todos los inscritos -- las preguntas de
            // un alumno no, y un post del feed general tampoco (no hay una
            // lista natural de destinatarios sin mandarle correo a toda la
            // plataforma).
            if (idMateria !== undefined && usuario.rol !== "alumno") {

                // Best-effort: no se espera, para que un SMTP lento/colgado
                // no tumbe la respuesta de la publicación ya creada.
                RepositorioMaterias.obtenerAlumnosInscritos(idMateria)
                    .then(alumnos => Promise.all(alumnos.map(alumno => enviarCorreo(
                        alumno.correo,
                        `Nueva publicación: "${titulo}" - Miztontli`,
                        `<p>Hola ${alumno.nombre}, tu docente publicó algo nuevo en tu materia.</p>
                         <p><strong>${titulo}</strong></p>
                         <p>${contenido ?? ""}</p>`
                    ))))
                    .catch(errorCorreo => {
                        console.error("No se pudieron enviar los correos de la publicación:", errorCorreo);
                    });

            }

            return res.status(201).json({ ok: true, mensaje: "Publicación creada correctamente.", data: publicacion });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "No fue posible crear la publicación." });
        }
    };

    // =====================================================
    // GET /publicaciones/general?tipo=pregunta
    // Feed general de la comunidad (sin materia): cualquier autenticado
    // puede verlo, no requiere inscripción ni pertenecer a ninguna clase.
    // =====================================================
    listarGeneral = async (req: Request, res: Response) => {

        try {

            const tipo = req.query.tipo as string | undefined;
            const publicaciones = await repo.listarGeneral(tipo);

            return res.status(200).json({ ok: true, total: publicaciones.length, data: publicaciones });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al obtener el feed general." });
        }
    };

    // =====================================================
    // GET /publicaciones/materia/:idMateria?tipo=pregunta
    // Feed de una materia. El alumno debe estar inscrito; el docente
    // debe ser dueño; admin siempre puede.
    // =====================================================
    listar = async (req: Request, res: Response) => {

        try {

            const usuario = (req as any).usuario;
            const idMateria = Number(req.params.idMateria);
            const tipo = req.query.tipo as string | undefined;

            if (!Number.isInteger(idMateria)) {
                return res.status(400).json({ ok: false, mensaje: "ID de materia inválido." });
            }

            if (usuario.rol === "alumno") {
                const inscrito = await RepositorioMaterias.estaInscrito(usuario.id, idMateria);

                if (!inscrito) {
                    return res.status(403).json({ ok: false, mensaje: "No estás inscrito en esta materia." });
                }
            } else if (usuario.rol === "docente") {
                const propietario = await RepositorioMaterias.esDelDocente(idMateria, usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes ver el feed de una materia que no es tuya." });
                }
            }

            const publicaciones = await repo.listarPorMateria(idMateria, tipo);

            return res.status(200).json({ ok: true, total: publicaciones.length, data: publicaciones });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al obtener el feed de la materia." });
        }
    };

    // =====================================================
    // GET /publicaciones/:id
    // =====================================================
    buscarPorId = async (req: Request, res: Response) => {

        try {

            const usuario = (req as any).usuario;
            const id = Number(req.params.id);

            const publicacion = await repo.buscarPorId(id);

            if (!publicacion) {
                return res.status(404).json({ ok: false, mensaje: "Publicación no encontrada." });
            }

            // Un post del feed general (sin id_materia) es visible para
            // cualquier autenticado, sin más validación.
            if (publicacion.id_materia) {

                if (usuario.rol === "alumno") {
                    const inscrito = await RepositorioMaterias.estaInscrito(usuario.id, publicacion.id_materia);

                    if (!inscrito) {
                        return res.status(403).json({ ok: false, mensaje: "No estás inscrito en esta materia." });
                    }
                } else if (usuario.rol === "docente") {
                    const propietario = await RepositorioMaterias.esDelDocente(publicacion.id_materia, usuario.id);

                    if (!propietario) {
                        return res.status(403).json({ ok: false, mensaje: "No puedes ver esta publicación." });
                    }
                }
            }

            return res.status(200).json({ ok: true, data: publicacion });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error del servidor." });
        }
    };

    // =====================================================
    // DELETE /publicaciones/:id  (autor o admin)
    // =====================================================
    eliminar = async (req: Request, res: Response) => {

        try {

            const usuario = (req as any).usuario;
            const id = Number(req.params.id);

            const publicacion = await repo.buscarPorId(id);

            if (!publicacion) {
                return res.status(404).json({ ok: false, mensaje: "Publicación no encontrada." });
            }

            const esAutor = publicacion.id_usuario === usuario.id;
            const esAdmin = usuario.rol === "admin";

            if (!esAutor && !esAdmin) {
                return res.status(403).json({ ok: false, mensaje: "No puedes eliminar esta publicación." });
            }

            await repo.eliminar(id);

            return res.status(200).json({ ok: true, mensaje: "Publicación eliminada correctamente." });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "No fue posible eliminar la publicación." });
        }
    };

}

export default new PublicacionController();
