import { Request, Response } from "express";
import RepositorioProgreso from "../repositories/RepositorioProgreso";
import RepositorioMaterias from "../repositories/RepositorioMateria";

class ProgresoController {

    // =====================================================
    // GET /progreso/mi-progreso  (alumno)
    // Avance en TODAS las materias en las que el alumno está inscrito --
    // pensado para mostrarse de un vistazo en su perfil.
    // =====================================================
    async miProgresoGeneral(req: Request, res: Response): Promise<Response> {

        try {

            const usuario = (req as any).usuario;

            const materias = await RepositorioMaterias.obtenerInscritasPorAlumno(usuario.id);

            const progresos = await Promise.all(
                materias.map(async materia => {
                    const progreso = await RepositorioProgreso.calcularYGuardar(usuario.id, materia.id_materia);
                    return { ...materia, progreso };
                })
            );

            return res.status(200).json({ ok: true, total: progresos.length, data: progresos });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al obtener tu progreso." });
        }
    }

    // =====================================================
    // GET /progreso/materia/:idMateria/mi-progreso  (alumno)
    // =====================================================
    async miProgreso(req: Request, res: Response): Promise<Response> {

        try {

            const idMateria = Number(req.params.idMateria);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(idMateria)) {
                return res.status(400).json({ ok: false, mensaje: "ID de materia inválido." });
            }

            const materiaExiste = await RepositorioMaterias.existe(idMateria);

            if (!materiaExiste) {
                return res.status(404).json({ ok: false, mensaje: "La materia indicada no existe." });
            }

            const progreso = await RepositorioProgreso.calcularYGuardar(usuario.id, idMateria);

            return res.status(200).json({ ok: true, data: progreso });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al obtener tu progreso." });
        }
    }

    // =====================================================
    // GET /progreso/materia/:idMateria  (docente/admin)
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
                    return res.status(403).json({ ok: false, mensaje: "No puedes ver el progreso de esta materia." });
                }
            }

            const idsAlumnos = await RepositorioProgreso.obtenerAlumnosConActividad(idMateria);

            const progresos = await Promise.all(
                idsAlumnos.map(idAlumno => RepositorioProgreso.calcularYGuardar(idAlumno, idMateria))
            );

            return res.status(200).json({ ok: true, total: progresos.length, data: progresos });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al obtener el progreso de la materia." });
        }
    }

}

export default new ProgresoController();
