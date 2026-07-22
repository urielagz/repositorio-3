import { Request, Response } from "express";
import { repos } from "../repositories";
import RepositorioMaterias from "../repositories/RepositorioMateria";

const repo = repos.comentarios;
const repoPublicaciones = repos.publicaciones;

export class ComentarioController {

    // =====================================================
    // POST /publicaciones/:id/comentarios
    // El docente que responde queda destacado primero (ver
    // RepositorioComentarios.listarPorPublicacion).
    // =====================================================
    crear = async (req: Request, res: Response) => {

        try {

            const usuario = (req as any).usuario;
            const { contenido } = req.body;
            const id_publicacion = Number(req.params.id);

            if (!contenido) {
                return res.status(400).json({ ok: false, mensaje: "El comentario no puede estar vacío." });
            }

            const publicacion = await repoPublicaciones.buscarPorId(id_publicacion);

            if (!publicacion) {
                return res.status(404).json({ ok: false, mensaje: "Publicación no encontrada." });
            }

            // Un post del feed general (sin id_materia) admite comentarios
            // de cualquier autenticado, sin más validación.
            if (publicacion.id_materia) {

                if (usuario.rol === "alumno") {
                    const inscrito = await RepositorioMaterias.estaInscrito(usuario.id, publicacion.id_materia);

                    if (!inscrito) {
                        return res.status(403).json({ ok: false, mensaje: "No estás inscrito en esta materia." });
                    }
                } else if (usuario.rol === "docente") {
                    const propietario = await RepositorioMaterias.esDelDocente(publicacion.id_materia, usuario.id);

                    if (!propietario) {
                        return res.status(403).json({ ok: false, mensaje: "No puedes comentar en esta publicación." });
                    }
                }
            }

            const comentario = await repo.crear(contenido, usuario.id, id_publicacion);

            return res.status(201).json({ ok: true, data: comentario });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "No fue posible publicar el comentario." });
        }
    };

    // =====================================================
    // GET /publicaciones/:id/comentarios
    // =====================================================
    listar = async (req: Request, res: Response) => {

        try {

            const usuario = (req as any).usuario;
            const id_publicacion = Number(req.params.id);

            const publicacion = await repoPublicaciones.buscarPorId(id_publicacion);

            if (!publicacion) {
                return res.status(404).json({ ok: false, mensaje: "Publicación no encontrada." });
            }

            if (publicacion.id_materia) {

                if (usuario.rol === "alumno") {
                    const inscrito = await RepositorioMaterias.estaInscrito(usuario.id, publicacion.id_materia);

                    if (!inscrito) {
                        return res.status(403).json({ ok: false, mensaje: "No estás inscrito en esta materia." });
                    }
                } else if (usuario.rol === "docente") {
                    const propietario = await RepositorioMaterias.esDelDocente(publicacion.id_materia, usuario.id);

                    if (!propietario) {
                        return res.status(403).json({ ok: false, mensaje: "No puedes ver estos comentarios." });
                    }
                }
            }

            const comentarios = await repo.listarPorPublicacion(id_publicacion);

            return res.status(200).json({ ok: true, total: comentarios.length, data: comentarios });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al obtener los comentarios." });
        }
    };

    // =====================================================
    // DELETE /comentarios/:id  (autor o admin)
    // =====================================================
    eliminar = async (req: Request, res: Response) => {

        try {

            const usuario = (req as any).usuario;
            const id = Number(req.params.id);

            const comentario = await repo.buscarPorId(id);

            if (!comentario) {
                return res.status(404).json({ ok: false, mensaje: "Comentario no encontrado." });
            }

            const esAutor = comentario.id_usuario === usuario.id;
            const esAdmin = usuario.rol === "admin";

            if (!esAutor && !esAdmin) {
                return res.status(403).json({ ok: false, mensaje: "No puedes eliminar este comentario." });
            }

            await repo.eliminar(id);

            return res.status(200).json({ ok: true, mensaje: "Comentario eliminado correctamente." });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "No fue posible eliminar el comentario." });
        }
    };

}

export default new ComentarioController();
