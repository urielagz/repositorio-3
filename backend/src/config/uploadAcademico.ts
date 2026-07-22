import multer from "multer";
import path from "path";

// Multer dedicado al módulo académico (recursos de un tema y entregas de
// actividades). No comparte configuración con config/upload.ts, que es el
// usado por el flujo de solicitud de docentes (sistema de usuarios).
//
// En memoria, no en disco: cada controlador sube el buffer a Cloudinary
// justo después (ver config/cloudinary.ts) -- Render no tiene disco
// persistente, así que guardar localmente se perdía en cada redeploy.
const storage = multer.memoryStorage();

// Comparte esta lista uploadRecurso, uploadEntrega, uploadActividadApoyo
// y uploadComunidad (recursos, entregas de actividades, archivos de
// apoyo de actividades y adjuntos de publicaciones de la comunidad) --
// un solo cambio aquí actualiza los 4 flujos de subida.
const EXTENSIONES_PERMITIDAS = [
    // documentos
    ".pdf", ".doc", ".docx", ".docm", ".dot", ".dotx", ".dotm",
    ".txt", ".rtf", ".odt", ".wps", ".pages", ".tex", ".md",
    ".epub", ".mobi", ".azw", ".azw3", ".fb2", ".djvu",
    ".xps", ".oxps", ".ps", ".ini", ".cfg", ".log",
    // presentaciones
    ".ppt", ".pptx", ".odp", ".key",
    // hojas de cálculo
    ".xls", ".xlsx", ".csv", ".tsv", ".ods",
    // imágenes
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg",
    // audio
    ".mp3", ".wav", ".ogg", ".m4a", ".aac",
    // video
    ".mp4", ".avi", ".mov", ".wmv", ".mkv", ".webm",
    // comprimidos
    ".zip", ".rar", ".7z", ".tar", ".gz",
    // código / marcado
    ".java", ".py", ".cpp", ".c", ".cs", ".js", ".ts", ".php", ".sql",
    ".json", ".xml", ".yaml", ".yml", ".html", ".htm", ".mht", ".mhtml", ".css",
    // diseño
    ".psd", ".ai", ".fig", ".xd", ".indd",
    // modelos 3D
    ".stl", ".obj", ".fbx"
];

function filtroArchivos(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    const ext = path.extname(file.originalname).toLowerCase();

    if (EXTENSIONES_PERMITIDAS.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Formato de archivo no permitido."));
    }
}

export const uploadRecurso = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    fileFilter: filtroArchivos,
});

export const uploadEntrega = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    fileFilter: filtroArchivos,
});

// Archivos de apoyo que el docente adjunta a una actividad (opcionales,
// pueden ser varios).
export const uploadActividadApoyo = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    fileFilter: filtroArchivos,
});

// Fotos/videos/documentos adjuntos a una publicación de la comunidad
// (opcionales, pueden ser varios).
export const uploadComunidad = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    fileFilter: filtroArchivos,
});

// Archivos adjuntos a un mensaje de chat (público o de materia).
export const uploadChat = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    fileFilter: filtroArchivos,
});

function filtroImagenes(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    const ext = path.extname(file.originalname).toLowerCase();
    const permitidas = [".jpg", ".jpeg", ".png", ".webp"];

    if (permitidas.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Solo se permiten imágenes JPG, JPEG, PNG o WEBP."));
    }
}

export const uploadImagenesTema = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: filtroImagenes,
});

// Ícono de una materia (un solo archivo, campo "icono").
export const uploadIconoMateria = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: filtroImagenes,
});

export function clasificarTipo(extension: string): string {
    const ext = extension.toLowerCase().replace(".", "");

    if (ext === "pdf") return "pdf";
    if ([
        "doc", "docx", "docm", "dot", "dotx", "dotm",
        "txt", "rtf", "odt", "wps", "pages", "tex", "md",
        "epub", "mobi", "azw", "azw3", "fb2", "djvu",
        "xps", "oxps", "ps", "ini", "cfg", "log"
    ].includes(ext)) return "documento";
    if (["ppt", "pptx", "odp", "key"].includes(ext)) return "presentacion";
    if (["xls", "xlsx", "csv", "tsv", "ods"].includes(ext)) return "hoja_calculo";
    if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(ext)) return "imagen";
    if (["mp3", "wav", "ogg", "m4a", "aac"].includes(ext)) return "audio";
    if (["mp4", "avi", "mov", "wmv", "mkv", "webm"].includes(ext)) return "video";
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "comprimido";
    if ([
        "java", "py", "cpp", "c", "cs", "js", "ts", "php", "sql",
        "json", "xml", "yaml", "yml", "html", "htm", "mht", "mhtml", "css"
    ].includes(ext)) return "codigo";
    if (["psd", "ai", "fig", "xd", "indd"].includes(ext)) return "diseno";
    if (["stl", "obj", "fbx"].includes(ext)) return "modelo_3d";

    return "otro";
}
