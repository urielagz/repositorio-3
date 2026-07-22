import { Router } from "express";
import ChatController from "../controllers/ChatController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { permitirRoles } from "../middlewares/rolesMiddleware";
import { uploadChat } from "../config/uploadAcademico";

const router = Router();

/*
==================================
Chats visibles para el usuario autenticado (público + materias
inscritas/propias). La membresía a cada grupo se valida dentro del
controller.
==================================
*/

router.get(
    "/",
    authMiddleware,
    ChatController.listar
);

router.post(
    "/",
    authMiddleware,
    permitirRoles("docente", "admin"),
    ChatController.crearGrupoMateria
);

router.get(
    "/:id/mensajes",
    authMiddleware,
    ChatController.listarMensajes
);

router.post(
    "/:id/mensajes",
    authMiddleware,
    uploadChat.array("archivos", 5),
    ChatController.enviarMensaje
);

export default router;
