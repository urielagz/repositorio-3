import { Request, Response } from "express";
import { RepositorioAsesorias } from "../repositories/RepositorioAsesorias";

const repo = new RepositorioAsesorias();

export class AsesoriaController {

    listar = async (_req: Request, res: Response) => {
        const asesorias = await repo.listar();
        res.json({ ok: true, data: asesorias });
    };

    agregar = async (req: Request, res: Response) => {
        const { docente, fecha, hora, enlace } = req.body;

        if (!docente || !fecha || !hora || !enlace) {
            return res.status(400).json({ ok: false, mensaje: "Datos incompletos" });
        }

        const asesoria = await repo.agregar(docente, new Date(fecha), hora, enlace);

        res.json({ ok: true, data: asesoria });
    };

    eliminar = async (req: Request, res: Response) => {
        const ok = await repo.eliminar(Number(req.params.id));
        res.json({ ok, mensaje: ok ? "Eliminada" : "No encontrada" });
    };
}