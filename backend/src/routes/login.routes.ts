import { Router } from "express";
import { LoginController } from "../controllers/LoginController";

const router = Router();
const controller = new LoginController();

router.post("/", async (req, res) => {
    const result = await controller.iniciarSesion(
        req.body.correo,
        req.body.contraseña
    );

    res.status(result.ok ? 200 : 401).json(result);
});

export default router;