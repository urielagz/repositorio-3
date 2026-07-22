import { Router } from "express";

import MateriaController from "../controllers/MateriaController";

import { authMiddleware } from "../middlewares/authMiddleware";
import { permitirRoles } from "../middlewares/rolesMiddleware";
import { uploadIconoMateria } from "../config/uploadAcademico";

const router = Router();

/*
==================================
CONSULTAS
==================================
*/

router.get(
    "/",
    authMiddleware,
    MateriaController.obtenerTodas
);

router.get(
    "/docente",
    authMiddleware,
    permitirRoles("docente", "admin"),
    MateriaController.obtenerPorDocente
);

router.get(
    "/:id",
    authMiddleware,
    MateriaController.obtenerPorId
);

router.get(
    "/:id/indice",
    authMiddleware,
    MateriaController.obtenerIndice
);

router.get(
    "/:id/token",
    authMiddleware,
    permitirRoles("docente", "admin"),
    MateriaController.obtenerToken
);

/*
==================================
INSCRIPCIÓN (alumno se inscribe con el token que recibió el docente)
==================================
*/

router.post(
    "/inscribirse",
    authMiddleware,
    permitirRoles("alumno"),
    MateriaController.inscribirse
);

/*
==================================
DOCENTE Y ADMIN
==================================
*/

router.post(
    "/",
    authMiddleware,
    permitirRoles("docente", "admin"),
    uploadIconoMateria.single("icono"),
    MateriaController.crear
);

router.put(
    "/:id",
    authMiddleware,
    permitirRoles("docente", "admin"),
    uploadIconoMateria.single("icono"),
    MateriaController.actualizar
);

router.delete(
    "/:id",
    authMiddleware,
    permitirRoles("docente", "admin"),
    MateriaController.eliminar
);

router.post(
    "/:id/aviso",
    authMiddleware,
    permitirRoles("docente", "admin"),
    MateriaController.avisoImportante
);

export default router;
