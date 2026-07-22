import { Router } from "express";
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

// Antes había una ruta "/archivo/:nombreArchivo" que servía el PDF/imagen
// desde disco local -- ya no aplica: cedula_profesional/diploma ahora
// guardan la URL completa de Cloudinary, así que el frontend la abre
// directo (ver admin.js).

export default router;