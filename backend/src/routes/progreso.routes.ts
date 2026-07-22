import { Router } from "express";

import ProgresoController from "../controllers/ProgresoController";

import { authMiddleware } from "../middlewares/authMiddleware";
import { permitirRoles } from "../middlewares/rolesMiddleware";

const router = Router();

router.get(
    "/mi-progreso",
    authMiddleware,
    permitirRoles("alumno"),
    ProgresoController.miProgresoGeneral
);

router.get(
    "/materia/:idMateria/mi-progreso",
    authMiddleware,
    permitirRoles("alumno"),
    ProgresoController.miProgreso
);

router.get(
    "/materia/:idMateria",
    authMiddleware,
    permitirRoles("docente", "admin"),
    ProgresoController.obtenerPorMateria
);

export default router;
