import { Request, Response } from "express";
import RepositorioNotificaciones from "../repositories/RepositorioNotificaciones";
import RepositorioDashboard from "../repositories/RepositorioDashboard";

class DashboardController {

    // =====================================================
    // GET /dashboard/notificaciones
    // Cambios que el docente hizo en temas/actividades/exámenes de las
    // materias del alumno.
    // =====================================================
    async notificaciones(req: Request, res: Response): Promise<Response> {

        try {

            const usuario = (req as any).usuario;

            const notificaciones = await RepositorioNotificaciones.listarPorUsuario(usuario.id);

            return res.status(200).json({ ok: true, total: notificaciones.length, data: notificaciones });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al obtener las notificaciones." });
        }
    }

    // =====================================================
    // PUT /dashboard/notificaciones/:id/leida
    // =====================================================
    async marcarNotificacionLeida(req: Request, res: Response): Promise<Response> {

        try {

            const usuario = (req as any).usuario;
            const id = Number(req.params.id);

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            const notificacion = await RepositorioNotificaciones.marcarLeida(id, usuario.id);

            if (!notificacion) {
                return res.status(404).json({ ok: false, mensaje: "Notificación no encontrada." });
            }

            return res.status(200).json({ ok: true, mensaje: "Notificación marcada como leída.", data: notificacion });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "No fue posible marcar la notificación." });
        }
    }

    // =====================================================
    // GET /dashboard/calendario
    // Recordatorios y calendario comparten la misma fuente: fechas
    // límite de actividades y exámenes de las materias inscritas.
    // =====================================================
    async calendario(req: Request, res: Response): Promise<Response> {

        try {

            const usuario = (req as any).usuario;

            const eventos = await RepositorioDashboard.calendario(usuario.id);

            return res.status(200).json({ ok: true, total: eventos.length, data: eventos });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al obtener el calendario." });
        }
    }

    // =====================================================
    // GET /dashboard/recomendados
    // Doble apartado: "repasar" (calificación < 7) y "siguientes"
    // (temas/actividades todavía no entregadas).
    // =====================================================
    async recomendados(req: Request, res: Response): Promise<Response> {

        try {

            const usuario = (req as any).usuario;

            const [actividadesARepasar, temasARepasar, actividadesSiguientes, temasSiguientes] = await Promise.all([
                RepositorioDashboard.actividadesARepasar(usuario.id),
                RepositorioDashboard.temasARepasar(usuario.id),
                RepositorioDashboard.actividadesSiguientes(usuario.id),
                RepositorioDashboard.temasSiguientes(usuario.id)
            ]);

            return res.status(200).json({
                ok: true,
                data: {
                    repasar: { temas: temasARepasar, actividades: actividadesARepasar },
                    siguientes: { temas: temasSiguientes, actividades: actividadesSiguientes }
                }
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, mensaje: "Error al obtener los recomendados." });
        }
    }

}

export default new DashboardController();
