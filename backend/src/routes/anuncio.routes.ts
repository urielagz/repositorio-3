import { Router } from "express";
import { AnuncioController } from "../controllers/AnuncioController";

const router = Router();
const controller = new AnuncioController();

router.get("/", controller.listar);
router.post("/", controller.agregar);
router.delete("/:id", controller.eliminar);

export default router;