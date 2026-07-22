import { Router } from "express";
import DashboardController from "../controllers/DashboardController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { permitirRoles } from "../middlewares/rolesMiddleware";

const router = Router();

router.get("/notificaciones", authMiddleware, permitirRoles("alumno"), DashboardController.notificaciones);
router.put("/notificaciones/:id/leida", authMiddleware, permitirRoles("alumno"), DashboardController.marcarNotificacionLeida);
router.get("/calendario", authMiddleware, permitirRoles("alumno"), DashboardController.calendario);
router.get("/recomendados", authMiddleware, permitirRoles("alumno"), DashboardController.recomendados);

export default router;
