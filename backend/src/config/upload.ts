import multer from "multer";
import path from "path";

// En memoria, no en disco: el archivo se sube a Cloudinary justo después
// (ver config/cloudinary.ts) -- Render no tiene disco persistente.
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        const permitidos = [".pdf", ".jpg", ".jpeg", ".png"];
        const ext = path.extname(file.originalname).toLowerCase();
        if (permitidos.includes(ext)) cb(null, true);
        else cb(new Error("Formato no permitido. Usa PDF, JPG o PNG."));
    },
});