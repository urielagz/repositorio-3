import { Router } from "express";
import { UsuarioController } from "../controllers/UsuarioController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { adminMiddleware } from "../middlewares/adminMiddleware";

const router = Router();
const controller = new UsuarioController();

router.get("/", authMiddleware, adminMiddleware, controller.listar);
router.post("/", controller.registrar);
router.post("/login", controller.login);
router.put("/cambiar-password",authMiddleware,controller.cambiarContraseña
);

// PERFIL
router.put(
    "/perfil",
    authMiddleware,
    controller.actualizarPerfil
);

// RUTAS CON ID
router.get("/:id", authMiddleware, controller.buscarPorId);
router.delete("/:id", authMiddleware, adminMiddleware, controller.eliminar);
router.post(
    "/forgot-password",
    controller.forgotPassword
);

router.post(
    "/reset-password",
    controller.resetPassword
);


export default router;