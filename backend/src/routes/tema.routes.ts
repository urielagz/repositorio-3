import { Router } from "express";
import { TemaController } from "../controllers/TemaController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { permitirRoles } from "../middlewares/rolesMiddleware";
import { uploadImagenesTema } from "../config/uploadAcademico";

const router = Router();
const controller = new TemaController();

/*
==================================
CONSULTAS (todos los roles autenticados)
==================================
*/

router.get("/", authMiddleware, controller.listar);
router.get("/:id", authMiddleware, controller.obtenerPorId);
router.get("/materia/:idMateria", authMiddleware, controller.buscarPorMateria);

/*
==================================
DOCENTE Y ADMIN
==================================
*/

router.post("/", authMiddleware, permitirRoles("docente", "admin"), controller.agregar);
router.put("/:id", authMiddleware, permitirRoles("docente", "admin"), controller.actualizar);
router.put(
    "/:id/contenido",
    authMiddleware,
    permitirRoles("docente", "admin"),
    uploadImagenesTema.fields([
        { name: "imagen1", maxCount: 1 },
        { name: "imagen2", maxCount: 1 }
    ]),
    controller.actualizarContenido
);
router.delete("/:id", authMiddleware, permitirRoles("docente", "admin"), controller.eliminar);

export default router;
