import { Router } from "express";
import { AsesoriaController } from "../controllers/AsesoriaController";

const router = Router();
const controller = new AsesoriaController();

router.get("/", controller.listar);
router.post("/", controller.agregar);
router.delete("/:id", controller.eliminar);

export default router;