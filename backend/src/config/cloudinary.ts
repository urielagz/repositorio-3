import { v2 as cloudinary } from "cloudinary";

// Render (plan gratis) no tiene disco persistente -- cualquier archivo
// guardado localmente se borra en el siguiente redeploy. Por eso todo lo
// que suben los usuarios (íconos, entregas, recursos, adjuntos de chat,
// cédula/diploma de docentes) va a Cloudinary en vez del disco del backend.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// "auto" deja que Cloudinary decida el resource_type (image/video/raw)
// según el archivo -- así no hay que ramificar por tipo para poder subir
// PDFs, Word, zips, etc. igual que fotos o video.
export function subirArchivo(buffer: Buffer, nombreOriginal: string, carpeta: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: "auto",
                folder: `miztontli/${carpeta}`,
                use_filename: true,
                unique_filename: true,
                filename_override: nombreOriginal,
            },
            (error, resultado) => {
                if (error || !resultado) {
                    reject(error || new Error("Falló la subida a Cloudinary"));
                    return;
                }
                resolve(resultado.secure_url);
            }
        );
        stream.end(buffer);
    });
}

export default cloudinary;
