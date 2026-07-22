import { Router } from "express";

import CalificacionController from "../controllers/CalificacionController";

import { authMiddleware } from "../middlewares/authMiddleware";
import { permitirRoles } from "../middlewares/rolesMiddleware";

const router = Router();

router.get(
    "/materia/:idMateria/mis-calificaciones",
    authMiddleware,
    permitirRoles("alumno"),
    CalificacionController.misCalificaciones
);

router.get(
    "/materia/:idMateria",
    authMiddleware,
    permitirRoles("docente", "admin"),
    CalificacionController.obtenerPorMateria
);

export default router;
