import { Router } from "express";

import ExamenController from "../controllers/ExamenController";

import { authMiddleware } from "../middlewares/authMiddleware";
import { permitirRoles } from "../middlewares/rolesMiddleware";

const router = Router();

/*
==========================================
CONSULTAS (todos los roles autenticados; el alumno debe estar inscrito
en la materia del tema -- ver ExamenController)
==========================================
*/

router.get(
    "/tema/:idTema",
    authMiddleware,
    ExamenController.obtenerPorTema
);

router.get(
    "/:id",
    authMiddleware,
    ExamenController.obtenerPorId
);

/*
==========================================
DOCENTE Y ADMIN
==========================================
*/

router.post(
    "/",
    authMiddleware,
    permitirRoles("docente", "admin"),
    ExamenController.crear
);

router.put(
    "/:id",
    authMiddleware,
    permitirRoles("docente", "admin"),
    ExamenController.actualizar
);

router.delete(
    "/:id",
    authMiddleware,
    permitirRoles("docente", "admin"),
    ExamenController.eliminar
);

export default router;
