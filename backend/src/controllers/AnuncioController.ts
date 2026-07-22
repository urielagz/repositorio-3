import { Request, Response } from "express";
import { RepositorioAnuncios } from "../repositories/RepositorioAnuncios";

const repo = new RepositorioAnuncios();

export class AnuncioController {

    listar = async (_req: Request, res: Response) => {
        const anuncios = await repo.listar();
        res.json({ ok: true, data: anuncios });
    };

    agregar = async (req: Request, res: Response) => {
        const { titulo, descripcion, fecha } = req.body;

        if (!titulo || !descripcion || !fecha) {
            return res.status(400).json({ ok: false, mensaje: "Datos incompletos" });
        }

        const anuncio = await repo.agregar(titulo, descripcion, new Date(fecha));

        res.json({ ok: true, data: anuncio });
    };

    eliminar = async (req: Request, res: Response) => {
        const ok = await repo.eliminar(Number(req.params.id));
        res.json({ ok, mensaje: ok ? "Eliminado" : "No encontrado" });
    };
}
