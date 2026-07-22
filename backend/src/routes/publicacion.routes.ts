import { Router } from "express";
import PublicacionController from "../controllers/PublicacionController";
import ComentarioController from "../controllers/ComentarioController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { uploadComunidad } from "../config/uploadAcademico";

const router = Router();

/*
==================================
FEED DE LA COMUNIDAD (acotado por materia; el control de inscripción/
propiedad vive dentro del controller, según el rol)
==================================
*/

router.post(
    "/",
    authMiddleware,
    uploadComunidad.array("archivos", 5),
    PublicacionController.crear
);

router.get(
    "/materia/:idMateria",
    authMiddleware,
    PublicacionController.listar
);

// Va antes de "/:id" para que Express no intente interpretar "general"
// como un id numérico.
router.get(
    "/general",
    authMiddleware,
    PublicacionController.listarGeneral
);

router.get(
    "/:id",
    authMiddleware,
    PublicacionController.buscarPorId
);

router.delete(
    "/:id",
    authMiddleware,
    PublicacionController.eliminar
);

/*
==================================
COMENTARIOS de una publicación
==================================
*/

router.post(
    "/:id/comentarios",
    authMiddleware,
    ComentarioController.crear
);

router.get(
    "/:id/comentarios",
    authMiddleware,
    ComentarioController.listar
);

export default router;
