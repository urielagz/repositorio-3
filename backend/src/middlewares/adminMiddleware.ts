import { Request, Response, NextFunction } from "express";

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
    const usuario = (req as any).usuario;

    if (!usuario || usuario.rol !== "admin") {
        return res.status(403).json({
            ok: false,
            mensaje: "No tienes permisos de administrador"
        });
    }

    next();
}