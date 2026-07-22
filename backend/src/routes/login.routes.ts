import { Router } from "express";
import { LoginController } from "../controllers/LoginController";

const router = Router();
const controller = new LoginController();

router.post("/", async (req, res) => {
    try {
        const result = await controller.iniciarSesion(
            req.body.correo,
            req.body.contraseña
        );

        res.status(result.ok ? 200 : 401).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, mensaje: "Error del servidor." });
    }
});

export default router;