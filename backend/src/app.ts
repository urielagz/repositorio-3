import express from "express";
import cors from "cors";
import path from "path";
import anuncioRoutes from "./routes/anuncio.routes";
import asesoriaRoutes from "./routes/asesoria.routes";
import usuarioRoutes from "./routes/usuario.routes";
import loginRoutes from "./routes/login.routes";
import docenteRoutes from "./routes/docente.routes";

// Módulo académico: Materia -> Índice -> Tema -> Recurso / Actividad / Examen
import materiaRoutes from "./routes/materia.routes";
import temaRoutes from "./routes/tema.routes";
import recursoRoutes from "./routes/recurso.routes";
import actividadRoutes from "./routes/actividad.routes";
import examenRoutes from "./routes/examen.routes";
import calificacionRoutes from "./routes/calificacion.routes";
import progresoRoutes from "./routes/progreso.routes";

// Comunidad: feed tipo Facebook acotado por materia
import publicacionRoutes from "./routes/publicacion.routes";
import comentarioRoutes from "./routes/comentario.routes";

// Dashboard del alumno: notificaciones, calendario/recordatorios, recomendados
import dashboardRoutes from "./routes/dashboard.routes";

// Chat: público general + grupos privados por materia (tiempo real vía
// Socket.IO, ver config/socket.ts)
import chatRoutes from "./routes/chat.routes";
// ...

const app = express();

app.use(cors());
app.use(express.json());


// ROUTES
app.use("/anuncios", anuncioRoutes);
app.use("/asesorias", asesoriaRoutes);
app.use("/usuarios", usuarioRoutes);
app.use("/login", loginRoutes);
app.use("/docentes", docenteRoutes);

// Módulo académico
app.use("/materias", materiaRoutes);
app.use("/temas", temaRoutes);
app.use("/recursos", recursoRoutes);
app.use("/actividades", actividadRoutes);
app.use("/examenes", examenRoutes);
app.use("/calificaciones", calificacionRoutes);
app.use("/progreso", progresoRoutes);

app.use(
    "/uploads",
    express.static(
        path.join(process.env.UPLOADS_PATH || "uploads")
    )
);
// Comunidad
app.use("/publicaciones", publicacionRoutes);
app.use("/comentarios", comentarioRoutes);

// Dashboard del alumno
app.use("/dashboard", dashboardRoutes);

// Chat
app.use("/chats", chatRoutes);

export default app;