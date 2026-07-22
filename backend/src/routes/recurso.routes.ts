import { Router } from "express";

import RecursoController from "../controllers/RecursoController";

import { authMiddleware } from "../middlewares/authMiddleware";
import { permitirRoles } from "../middlewares/rolesMiddleware";
import { uploadRecurso } from "../config/uploadAcademico";

const router = Router();

/*
==========================================
CONSULTAS (todos los roles autenticados)
==========================================
*/

router.get(
    "/tema/:idTema",
    authMiddleware,
    RecursoController.obtenerPorTema
);

router.get(
    "/:id",
    authMiddleware,
    RecursoController.obtenerPorId
);

// :indice es opcional (default 0) para no romper a quien ya llamaba
// solo con /:id/descargar cuando el recurso tenía un único archivo.
router.get(
    "/:id/descargar/:indice?",
    authMiddleware,
    RecursoController.descargar
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
    uploadRecurso.array("archivos", 5),
    RecursoController.crear
);

router.put(
    "/:id",
    authMiddleware,
    permitirRoles("docente", "admin"),
    uploadRecurso.array("archivos", 5),
    RecursoController.actualizar
);

router.delete(
    "/:id",
    authMiddleware,
    permitirRoles("docente", "admin"),
    RecursoController.eliminar
);

export default router;
