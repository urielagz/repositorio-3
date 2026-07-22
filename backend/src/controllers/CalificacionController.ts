import { Request, Response } from "express";
import RepositorioCalificaciones from "../repositories/RepositorioCalificaciones";
import RepositorioMaterias from "../repositories/RepositorioMateria";

class CalificacionController {

    // =====================================================
    // GET /calificaciones/materia/:idMateria/mis-calificaciones  (alumno)
    // =====================================================
    async misCalificaciones(req: Request, res: Response): Promise<Response> {

        try {

            const idMateria = Number(req.params.idMateria);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(idMateria)) {
                return res.status(400).json({ ok: false, mensaje: "ID de materia inválido." });
            }

            const calificaciones = await RepositorioCalificaciones.obtenerPorAlumnoYMateria(usuario.id, idMateria);

            return res.status(200).json({ ok: true, total: calificaciones.length, data: calificaciones });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al obtener tus calificaciones." });
        }
    }

    // =====================================================
    // GET /calificaciones/materia/:idMateria  (docente/admin)
    // =====================================================
    async obtenerPorMateria(req: Request, res: Response): Promise<Response> {

        try {

            const idMateria = Number(req.params.idMateria);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(idMateria)) {
                return res.status(400).json({ ok: false, mensaje: "ID de materia inválido." });
            }

            if (usuario.rol === "docente") {
                const propietario = await RepositorioMaterias.esDelDocente(idMateria, usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes ver las calificaciones de esta materia." });
                }
            }

            const calificaciones = await RepositorioCalificaciones.obtenerPorMateria(idMateria);

            return res.status(200).json({ ok: true, total: calificaciones.length, data: calificaciones });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al obtener las calificaciones." });
        }
    }

}

export default new CalificacionController();
