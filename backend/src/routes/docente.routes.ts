import { Router } from "express";
import path from "path";
import { DocenteController } from "../controllers/DocenteController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { adminMiddleware } from "../middlewares/adminMiddleware";
import { upload } from "../config/upload";

const router = Router();
const controller = new DocenteController();

router.post(
    "/solicitud",
    upload.fields([
        { name: "cedula_profesional", maxCount: 1 },
        { name: "diploma", maxCount: 1 }
    ]),
    controller.solicitar
);

router.get("/pendientes", authMiddleware, adminMiddleware, controller.listarPendientes);
router.post("/:id/aprobar", authMiddleware, adminMiddleware, controller.aprobar);
router.post("/:id/rechazar", authMiddleware, adminMiddleware, controller.rechazar);

// Ver documento (cédula o diploma) — solo admin
router.get(
    "/archivo/:nombreArchivo",
    authMiddleware,
    adminMiddleware,
    (req, res) => {
        const ruta = path.join(
            process.cwd(),
            process.env.UPLOADS_PATH || "uploads",
            String(req.params.nombreArchivo)
        );
        res.sendFile(ruta, (err) => {
            if (err) res.status(404).json({ ok: false, mensaje: "Archivo no encontrado" });
        });
    }
);

export default router;