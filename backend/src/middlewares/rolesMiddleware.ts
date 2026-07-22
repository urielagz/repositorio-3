import { Request, Response, NextFunction } from "express";

export const permitirRoles = (
    ...roles: string[]
) => {

    return (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {

        const usuario = (req as any).usuario;

        if (!usuario || typeof (usuario as any).rol !== "string") {
            return res.status(403).json({
                ok: false,
                mensaje: "Acceso denegado"
            });
        }

        if (!roles.includes((usuario as any).rol)) {

            return res.status(403).json({
                ok: false,
                mensaje: "Acceso denegado"
            });
        }

        next();
    };
};