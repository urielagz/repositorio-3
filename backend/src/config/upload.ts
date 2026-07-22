import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsPath = process.env.UPLOADS_PATH || "uploads";
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsPath),
    filename: (_req, file, cb) => {
        const nombreUnico = `${Date.now()}-${file.originalname}`;
        cb(null, nombreUnico);
    },
});

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        const permitidos = [".pdf", ".jpg", ".jpeg", ".png"];
        const ext = path.extname(file.originalname).toLowerCase();
        if (permitidos.includes(ext)) cb(null, true);
        else cb(new Error("Formato no permitido. Usa PDF, JPG o PNG."));
    },
});