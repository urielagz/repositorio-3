import { RepositorioUsuarios } from "./RepositorioUsuarios";
import RepositorioMaterias from "./RepositorioMateria";
import { RepositorioTemas } from "./RepositorioTemas";
import { RepositorioAsesorias } from "./RepositorioAsesorias";
import { RepositorioAnuncios } from "./RepositorioAnuncios";
import { RepositorioDocenteEspera } from "./RepositorioDocenteEspera";
import { RepositorioPublicaciones } from "./RepositorioPublicacion";
import { RepositorioComentarios } from "./RepositorioComentarios";

export const repos = {
    usuarios: new RepositorioUsuarios(),
    docentesEspera: new RepositorioDocenteEspera(),
    materias: RepositorioMaterias,
    temas: new RepositorioTemas(),
    asesorias: new RepositorioAsesorias(),
    anuncios: new RepositorioAnuncios(),
    publicaciones: new RepositorioPublicaciones(),
    comentarios: new RepositorioComentarios()
};
