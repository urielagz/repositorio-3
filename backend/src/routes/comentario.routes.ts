import { Router } from "express";
import ComentarioController from "../controllers/ComentarioController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

router.delete("/:id", authMiddleware, ComentarioController.eliminar);

export default router;
