import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            ok: false,
            mensaje: "Token requerido"
        });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme?.toLowerCase() !== "bearer" || !token) {
        return res.status(401).json({
            ok: false,
            mensaje: "Token inválido"
        });
    }

    try {

        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET || "SECRETO_SUPER_SECRETO"
        );

        (req as any).usuario = payload as any;

        next();

    } catch {

        return res.status(401).json({
            ok: false,
            mensaje: "Token inválido"
        });
    }
};