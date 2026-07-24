const API_URL = "https://miztontli-backend.onrender.com";

let usuarioActual = null;
let materiaActual = null;
let idTemaModalActual = null;
let idMateriaEditando = null;
let idTemaEditando = null;
let idTemaContenidoEditando = null;
let idActividadEditando = null;
let idTemaDeActividadEditando = null;
let idExamenEditando = null;
let idTemaDeExamenEditando = null;

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    // TEMPORAL: sin bloqueo de sesión/rol para poder inspeccionar el HTML
    // con WAVE u otra auditoría de accesibilidad -- no se espera que las
    // acciones reales funcionen sin haber iniciado sesión de verdad.
    usuarioActual = user || { nombre: "Invitado", apellido: "", rol: "docente" };
    document.getElementById("userDisplay").innerText = `${usuarioActual.nombre} ${usuarioActual.apellido}`;

    inicializarModales();
    obtenerMaterias();
});

async function obtenerMaterias() {
    const lista = document.getElementById("listaMaterias");
    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/materias/docente`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        renderizarMaterias(json.data);
    } catch (error) {
        console.error("Error al obtener materias:", error);
        lista.innerHTML = `<li>${error.message}</li>`;
    }
}

function renderizarMaterias(materias) {
    const lista = document.getElementById("listaMaterias");
    lista.innerHTML = "";
    if (!materias || materias.length === 0) {
        lista.innerHTML = `<li>Aún no tienes materias.</li>`;
        return;
    }
    materias.forEach(materia => {
        const item = document.createElement("li");
        item.style.cssText = "display:flex; align-items:center; justify-content:space-between; gap:0.5rem;";
        item.dataset.id = materia.id_materia;
        item.addEventListener("click", () => seleccionarMateria(materia));

        const nombreSpan = document.createElement("span");
        nombreSpan.textContent = materia.nombre;
        nombreSpan.style.cssText = "overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
        item.appendChild(nombreSpan);

        const acciones = document.createElement("div");
        acciones.style.cssText = "display:flex; gap:0.4rem; flex-shrink:0;";

        const btnToken = document.createElement("button");
        btnToken.type = "button";
        btnToken.title = "Ver token de inscripción";
        btnToken.textContent = "Token";
        btnToken.style.cssText = "border:1px solid var(--border-color); background:transparent; cursor:pointer; font-size:0.75rem; padding:0.2rem 0.5rem; border-radius:6px; opacity:0.85; flex-shrink:0;";
        btnToken.addEventListener("click", (e) => {
            e.stopPropagation();
            mostrarTokenMateria(materia.id_materia, materia.nombre);
        });
        acciones.appendChild(btnToken);

        const btnEditar = document.createElement("button");
        btnEditar.type = "button";
        btnEditar.title = "Editar materia";
        btnEditar.textContent = "Editar";
        btnEditar.style.cssText = "border:1px solid var(--border-color); background:transparent; cursor:pointer; font-size:0.75rem; padding:0.2rem 0.5rem; border-radius:6px; flex-shrink:0;";
        btnEditar.addEventListener("click", (e) => {
            e.stopPropagation();
            abrirModalEditarMateria(materia);
        });
        acciones.appendChild(btnEditar);

        const btnEliminar = document.createElement("button");
        btnEliminar.type = "button";
        btnEliminar.title = "Eliminar materia";
        btnEliminar.textContent = "Eliminar";
        btnEliminar.style.cssText = "border:1px solid var(--secondary-red); color:var(--secondary-red); background:transparent; cursor:pointer; font-size:0.75rem; padding:0.2rem 0.5rem; border-radius:6px; flex-shrink:0;";
        btnEliminar.addEventListener("click", (e) => {
            e.stopPropagation();
            eliminarMateria(materia);
        });
        acciones.appendChild(btnEliminar);

        item.appendChild(acciones);
        lista.appendChild(item);
    });
}

// Token de inscripción: endpoint dedicado GET /materias/:id/token.
async function mostrarTokenMateria(idMateria, nombreMateria) {
    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/materias/${idMateria}/token`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        abrirModalToken(nombreMateria, json.data.token);
    } catch (error) {
        console.error("Error al obtener el token de la materia:", error);
        alert(error.message);
    }
}

function abrirModalToken(nombreMateria, tokenValor) {
    document.getElementById("tokenMateriaNombre").textContent = nombreMateria;
    document.getElementById("tokenValor").value = tokenValor || "";
    abrirModal("modalToken");
}

function copiarToken() {
    const input = document.getElementById("tokenValor");
    input.select();
    input.setSelectionRange(0, 99999);

    const boton = document.getElementById("btnCopiarToken");
    const textoOriginal = boton.textContent;
    const confirmarCopia = () => {
        boton.textContent = "¡Copiado!";
        setTimeout(() => { boton.textContent = textoOriginal; }, 1500);
    };

    if (navigator.clipboard) {
        navigator.clipboard.writeText(input.value).then(confirmarCopia).catch(() => document.execCommand("copy") && confirmarCopia());
    } else {
        document.execCommand("copy");
        confirmarCopia();
    }
}

function abrirModalEditarMateria(materia) {
    idMateriaEditando = materia.id_materia;
    document.getElementById("editMatNombre").value = materia.nombre || "";
    document.getElementById("editMatColor").value = materia.color || "#00BB77";
    document.getElementById("editMatOrden").value = materia.orden ?? "";
    document.getElementById("editMatIcono").value = "";
    abrirModal("modalEditarMateria");
}

async function guardarEdicionMateria(event) {
    event.preventDefault();
    if (!idMateriaEditando) return;

    const nombre = document.getElementById("editMatNombre").value.trim();
    const color = document.getElementById("editMatColor").value;
    const orden = document.getElementById("editMatOrden").value;
    const archivoIcono = document.getElementById("editMatIcono").files[0];

    try {
        const token = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${token}` };
        let cuerpo;

        if (archivoIcono) {
            cuerpo = new FormData();
            if (nombre) cuerpo.append("nombre", nombre);
            if (color) cuerpo.append("color", color);
            if (orden) cuerpo.append("orden", orden);
            cuerpo.append("icono", archivoIcono);
        } else {
            const datos = {};
            if (nombre) datos.nombre = nombre;
            if (color) datos.color = color;
            if (orden) datos.orden = Number(orden);
            cuerpo = JSON.stringify(datos);
            headers["Content-Type"] = "application/json";
        }

        const respuesta = await fetch(`${API_URL}/materias/${idMateriaEditando}`, {
            method: "PUT",
            headers,
            body: cuerpo
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);

        if (materiaActual && Number(materiaActual.id_materia) === Number(idMateriaEditando)) {
            materiaActual = { ...materiaActual, nombre: nombre || materiaActual.nombre, color, orden };
            const encabezado = document.querySelector("#mainContent .header-materia h2");
            if (encabezado) encabezado.textContent = materiaActual.nombre;
        }

        document.getElementById("formEditarMateria").reset();
        cerrarModal(document.getElementById("modalEditarMateria"));
        idMateriaEditando = null;
        obtenerMaterias();
    } catch (error) {
        console.error("Error al editar materia:", error);
        alert(error.message);
    }
}

async function eliminarMateria(materia) {
    const confirmado = confirm(`¿Eliminar la materia "${materia.nombre}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/materias/${materia.id_materia}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);

        if (materiaActual && Number(materiaActual.id_materia) === Number(materia.id_materia)) {
            materiaActual = null;
            document.getElementById("mainContent").innerHTML = `
                <div class="welcome-screen">
                    <h2>¡Bienvenido al Panel de Gestión Académica!</h2>
                    <p>Selecciona una materia de la barra lateral o crea una nueva para comenzar a estructurar tus temas, teoría y evaluaciones.</p>
                </div>
            `;
        }
        obtenerMaterias();
    } catch (error) {
        console.error("Error al eliminar materia:", error);
        alert(error.message);
    }
}

function seleccionarMateria(materia) {
    document.querySelectorAll("#listaMaterias li").forEach(li => li.classList.remove("active"));
    const activa = [...document.querySelectorAll("#listaMaterias li")].find(li => Number(li.dataset.id) === materia.id_materia);
    if (activa) activa.classList.add("active");
    localStorage.setItem("idMateriaActual", materia.id_materia);
    materiaActual = materia;
    cargarVistaMateria(materia);
}

function cargarVistaMateria(materia) {
    const main = document.getElementById("mainContent");
    main.innerHTML = `
        <div class="header-materia">
            <h2>${materia.nombre}</h2>
            <div style="display:flex; gap:0.5rem;">
                <button id="btnEditarMateria" class="btn-secondary">Editar Materia</button>
                <button id="btnVerAlumnos" class="btn-secondary">Ver Alumnos</button>
                <button id="btnNuevoTema" class="btn-primary">+ Nuevo Tema</button>
            </div>
        </div>
        <div id="listaTemas"></div>
    `;
    document.getElementById("btnNuevoTema").addEventListener("click", () => abrirModal("modalTema"));
    document.getElementById("btnVerAlumnos").addEventListener("click", () => abrirModalAlumnos(materia));
    document.getElementById("btnEditarMateria").addEventListener("click", () => abrirModalEditarMateria(materia));
    obtenerTemas(materia.id_materia);
}

// ===================== ALUMNOS INSCRITOS + PROGRESO =====================
async function abrirModalAlumnos(materia) {
    document.getElementById("alumnosMateriaNombre").textContent = materia.nombre;
    const contenedor = document.getElementById("listaAlumnos");
    contenedor.innerHTML = "<p>Cargando...</p>";
    abrirModal("modalAlumnos");

    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/materias/${materia.id_materia}/alumnos`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        renderizarAlumnos(json.data || []);
    } catch (error) {
        console.error("Error al obtener alumnos:", error);
        contenedor.innerHTML = `<p>${error.message}</p>`;
    }
}

function renderizarAlumnos(alumnos) {
    const contenedor = document.getElementById("listaAlumnos");
    if (!alumnos || alumnos.length === 0) {
        contenedor.innerHTML = "<p>Todavía no hay alumnos inscritos en esta materia.</p>";
        return;
    }
    contenedor.innerHTML = `
        <table class="tabla-simple">
            <thead>
                <tr><th>Alumno</th><th>Correo</th><th>Avance</th><th>Actividades completadas</th></tr>
            </thead>
            <tbody>
                ${alumnos.map(alumno => `
                    <tr>
                        <td>${escaparHtml(`${alumno.nombre} ${alumno.apellido || ""}`.trim())}</td>
                        <td>${escaparHtml(alumno.correo)}</td>
                        <td>${alumno.progreso ? Number(alumno.progreso.porcentaje_avance).toFixed(0) : 0}%</td>
                        <td>${alumno.progreso ? alumno.progreso.act_completas : 0}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}

async function obtenerTemas(idMateria) {
    const contenedor = document.getElementById("listaTemas");
    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/temas/materia/${idMateria}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        renderizarTemas(json.data);
    } catch (error) {
        console.error("Error al obtener temas:", error);
        contenedor.innerHTML = `<p>${error.message}</p>`;
    }
}

function renderizarTemas(temas) {
    const contenedor = document.getElementById("listaTemas");
    contenedor.innerHTML = "";
    if (!temas || temas.length === 0) {
        contenedor.innerHTML = `<p>Aún no hay temas en esta materia.</p>`;
        return;
    }
    temas.forEach(tema => {
        contenedor.appendChild(crearTemaCard(tema));
        cargarRecursosTema(tema.id_tema);
    });
}

function crearTemaCard(tema) {
    const card = document.createElement("div");
    card.className = "tema-card";
    card.dataset.idTema = tema.id_tema;
    card.innerHTML = `
        <div class="tema-header">
            <h3>${tema.nombre}</h3>
            <div>
                <button type="button" class="btn-secondary btn-editar-tema" data-id-tema="${tema.id_tema}">Editar tema</button>
                <button type="button" class="btn-secondary btn-editar-contenido-tema" data-id-tema="${tema.id_tema}">Editar contenido</button>
                <button type="button" class="btn-secondary btn-eliminar-tema" data-id-tema="${tema.id_tema}">Eliminar tema</button>
                <button type="button" class="btn-secondary btn-nueva-actividad" data-id-tema="${tema.id_tema}">Nueva actividad</button>
                <button type="button" class="btn-secondary btn-nuevo-examen" data-id-tema="${tema.id_tema}">Nuevo examen</button>
                <button type="button" class="btn-secondary btn-nuevo-recurso" data-id-tema="${tema.id_tema}">Nuevo recurso</button>
            </div>
        </div>
        <p>${tema.descripcion || ""}</p>
        <div class="grid-recursos" id="recursos-tema-${tema.id_tema}"></div>
    `;
    card.querySelector(".btn-editar-tema").addEventListener("click", () => abrirModalEditarTema(tema));
    card.querySelector(".btn-editar-contenido-tema").addEventListener("click", () => abrirModalEditarContenidoTema(tema));
    card.querySelector(".btn-eliminar-tema").addEventListener("click", () => eliminarTema(tema));
    card.querySelector(".btn-nueva-actividad").addEventListener("click", (e) => abrirModalActividad(e.target.dataset.idTema));
    card.querySelector(".btn-nuevo-examen").addEventListener("click", (e) => abrirModalExamen(e.target.dataset.idTema));
    card.querySelector(".btn-nuevo-recurso").addEventListener("click", (e) => abrirModalRecurso(e.target.dataset.idTema));
    return card;
}

// Formatea una fecha ISO al valor que espera un <input type="datetime-local">.
function formatearFechaInput(fecha) {
    if (!fecha) return "";
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return "";
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function abrirModalEditarTema(tema) {
    idTemaEditando = tema.id_tema;
    document.getElementById("editTemaNombre").value = tema.nombre || "";
    document.getElementById("editTemaDescripcion").value = tema.descripcion || "";
    abrirModal("modalEditarTema");
}

async function guardarEdicionTema(event) {
    event.preventDefault();
    if (!idTemaEditando) return;
    const nombre = document.getElementById("editTemaNombre").value.trim();
    const descripcion = document.getElementById("editTemaDescripcion").value.trim();
    if (!nombre || !descripcion) return;
    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/temas/${idTemaEditando}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, descripcion })
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        document.getElementById("formEditarTema").reset();
        cerrarModal(document.getElementById("modalEditarTema"));
        idTemaEditando = null;
        if (materiaActual) obtenerTemas(materiaActual.id_materia);
    } catch (error) {
        console.error("Error al editar tema:", error);
        alert(error.message);
    }
}

function abrirModalEditarContenidoTema(tema) {
    idTemaContenidoEditando = tema.id_tema;
    document.getElementById("editContIntroduccion").value = tema.introduccion || "";
    document.getElementById("editContTexto").value = tema.contenido || "";
    document.getElementById("editContImagen1").value = "";
    document.getElementById("editContImagen2").value = "";
    abrirModal("modalEditarContenidoTema");
}

async function guardarContenidoTema(event) {
    event.preventDefault();
    if (!idTemaContenidoEditando) return;
    try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("introduccion", document.getElementById("editContIntroduccion").value.trim());
        formData.append("contenido", document.getElementById("editContTexto").value.trim());
        const imagen1 = document.getElementById("editContImagen1").files[0];
        const imagen2 = document.getElementById("editContImagen2").files[0];
        if (imagen1) formData.append("imagen1", imagen1);
        if (imagen2) formData.append("imagen2", imagen2);

        const respuesta = await fetch(`${API_URL}/temas/${idTemaContenidoEditando}/contenido`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        document.getElementById("formEditarContenidoTema").reset();
        cerrarModal(document.getElementById("modalEditarContenidoTema"));
        idTemaContenidoEditando = null;
        if (materiaActual) obtenerTemas(materiaActual.id_materia);
    } catch (error) {
        console.error("Error al editar el contenido del tema:", error);
        alert(error.message);
    }
}

async function eliminarTema(tema) {
    const confirmado = confirm(`¿Eliminar el tema "${tema.nombre}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;
    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/temas/${tema.id_tema}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        if (materiaActual) obtenerTemas(materiaActual.id_materia);
    } catch (error) {
        console.error("Error al eliminar tema:", error);
        alert(error.message);
    }
}

function crearItemActividad(actividad, idTema) {
    const item = document.createElement("div");
    item.className = "item-recurso";

    const archivosApoyoHtml = (actividad.archivos_apoyo || []).map(archivo =>
        `<a href="${archivo.url}" target="_blank" rel="noopener" class="link-descarga">${escaparHtml(archivo.nombre_original || "Archivo")}</a>`
    ).join("<br>");

    item.innerHTML = `
        <strong> ${actividad.titulo}</strong>
        <p>${actividad.descripcion || ""}</p>
        ${archivosApoyoHtml ? `<div style="margin-bottom:0.5rem;">${archivosApoyoHtml}</div>` : ""}
        <div>
            <button type="button" class="btn-secondary btn-ver-entregas">Ver entregas</button>
            <button type="button" class="btn-secondary btn-editar-actividad">Editar</button>
            <button type="button" class="btn-secondary btn-eliminar-actividad">Eliminar</button>
        </div>
    `;
    item.querySelector(".btn-ver-entregas").addEventListener("click", () => abrirModalEntregas(actividad));
    item.querySelector(".btn-editar-actividad").addEventListener("click", () => abrirModalEditarActividad(actividad, idTema));
    item.querySelector(".btn-eliminar-actividad").addEventListener("click", () => eliminarActividad(actividad, idTema));
    return item;
}

// ===================== ENTREGAS + CALIFICAR =====================
async function abrirModalEntregas(actividad) {
    document.getElementById("entregasActividadTitulo").textContent = actividad.titulo;
    const contenedor = document.getElementById("listaEntregas");
    contenedor.innerHTML = "<p>Cargando...</p>";
    abrirModal("modalEntregas");

    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/actividades/${actividad.id_actividad}/entregas`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        renderizarEntregas(json.data || [], actividad.puntaje);
    } catch (error) {
        console.error("Error al obtener entregas:", error);
        contenedor.innerHTML = `<p>${error.message}</p>`;
    }
}

function renderizarEntregas(entregas, puntajeMaximo) {
    const contenedor = document.getElementById("listaEntregas");
    if (!entregas || entregas.length === 0) {
        contenedor.innerHTML = "<p>Nadie ha entregado esta actividad todavía.</p>";
        return;
    }
    contenedor.innerHTML = "";
    entregas.forEach(entrega => contenedor.appendChild(crearEntregaItem(entrega, puntajeMaximo)));
}

function crearEntregaItem(entrega, puntajeMaximo) {
    const item = document.createElement("div");
    item.className = "entrega-item";

    const archivosHtml = (entrega.archivos || []).map(archivo =>
        `<a href="${archivo.url}" target="_blank" rel="noopener" download>${escaparHtml(archivo.nombre_original || "Archivo")}</a>`
    ).join("");

    item.innerHTML = `
        <div class="entrega-header">
            <strong>${escaparHtml(`${entrega.nombre} ${entrega.apellido || ""}`.trim())}</strong>
            <span>${entrega.fecha_entrega ? new Date(entrega.fecha_entrega).toLocaleString("es-MX") : ""}</span>
        </div>
        ${entrega.comentario_alumno ? `<p>${escaparHtml(entrega.comentario_alumno)}</p>` : ""}
        ${entrega.url_entrega ? `<p><a href="${escaparHtml(entrega.url_entrega)}" target="_blank" rel="noopener">${escaparHtml(entrega.url_entrega)}</a></p>` : ""}
        ${archivosHtml ? `<div class="entrega-archivos">${archivosHtml}</div>` : ""}
        <form class="form-calificar">
            <div class="form-row">
                <div class="form-group">
                    <label>Calificación${puntajeMaximo ? ` (de ${puntajeMaximo})` : ""}</label>
                    <input type="number" step="0.01" min="0" ${puntajeMaximo ? `max="${puntajeMaximo}"` : ""} class="input-calificacion" value="${entrega.calificacion ?? ""}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Observaciones (opcional)</label>
                <textarea rows="2" class="input-observaciones">${entrega.observaciones_docente || ""}</textarea>
            </div>
            <button type="submit" class="btn-primary">Guardar calificación</button>
        </form>
    `;

    item.querySelector(".form-calificar").addEventListener("submit", (event) => {
        event.preventDefault();
        const boton = event.target.querySelector('button[type="submit"]');
        const calificacion = item.querySelector(".input-calificacion").value;
        const observaciones = item.querySelector(".input-observaciones").value.trim();
        calificarEntrega(entrega.id_registro, calificacion, observaciones, boton);
    });

    return item;
}

async function calificarEntrega(idEntrega, calificacion, observaciones, boton) {
    if (boton) boton.disabled = true;
    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/actividades/entregas/${idEntrega}/calificar`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ calificacion: Number(calificacion), observaciones_docente: observaciones })
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        if (boton) {
            const textoOriginal = boton.textContent;
            boton.textContent = "¡Guardado!";
            setTimeout(() => { boton.textContent = textoOriginal; }, 1500);
        }
    } catch (error) {
        console.error("Error al calificar entrega:", error);
        alert(error.message);
    } finally {
        if (boton) boton.disabled = false;
    }
}

function abrirModalEditarActividad(actividad, idTema) {
    idActividadEditando = actividad.id_actividad;
    idTemaDeActividadEditando = idTema;
    document.getElementById("editActTitulo").value = actividad.titulo || "";
    document.getElementById("editActDescripcion").value = actividad.descripcion || "";
    document.getElementById("editActFecha").value = formatearFechaInput(actividad.fecha_limite);
    document.getElementById("editActPuntaje").value = actividad.puntaje ?? "";
    document.getElementById("editActArchivosPermitidos").value = actividad.archivos_permitidos || "";
    document.getElementById("editActArchivos").value = "";
    abrirModal("modalEditarActividad");
}

async function guardarEdicionActividad(event) {
    event.preventDefault();
    if (!idActividadEditando) return;
    const titulo = document.getElementById("editActTitulo").value.trim();
    if (!titulo) return;
    try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("titulo", titulo);
        formData.append("descripcion", document.getElementById("editActDescripcion").value.trim());
        const fechaLimite = document.getElementById("editActFecha").value;
        if (fechaLimite) formData.append("fecha_limite", fechaLimite);
        const puntaje = document.getElementById("editActPuntaje").value;
        if (puntaje) formData.append("puntaje", puntaje);
        const archivosPermitidos = document.getElementById("editActArchivosPermitidos").value.trim();
        if (archivosPermitidos) formData.append("archivos_permitidos", archivosPermitidos);
        const archivos = document.getElementById("editActArchivos").files;
        for (let i = 0; i < archivos.length; i++) {
            formData.append("archivos_apoyo", archivos[i]);
        }

        const respuesta = await fetch(`${API_URL}/actividades/${idActividadEditando}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        document.getElementById("formEditarActividad").reset();
        cerrarModal(document.getElementById("modalEditarActividad"));
        const idTemaRefrescar = idTemaDeActividadEditando;
        idActividadEditando = null;
        idTemaDeActividadEditando = null;
        cargarRecursosTema(idTemaRefrescar);
    } catch (error) {
        console.error("Error al editar actividad:", error);
        alert(error.message);
    }
}

async function eliminarActividad(actividad, idTema) {
    const confirmado = confirm(`¿Eliminar la actividad "${actividad.titulo}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;
    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/actividades/${actividad.id_actividad}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        cargarRecursosTema(idTema);
    } catch (error) {
        console.error("Error al eliminar actividad:", error);
        alert(error.message);
    }
}

function crearItemExamen(examen, idTema) {
    const item = document.createElement("div");
    item.className = "item-recurso";
    item.innerHTML = `
        <strong> ${examen.titulo}</strong>
        <p><a href="${examen.url_formulario}" target="_blank" rel="noopener">Abrir examen</a></p>
        <div>
            <button type="button" class="btn-secondary btn-editar-examen">Editar</button>
            <button type="button" class="btn-secondary btn-eliminar-examen">Eliminar</button>
        </div>
    `;
    item.querySelector(".btn-editar-examen").addEventListener("click", () => abrirModalEditarExamen(examen, idTema));
    item.querySelector(".btn-eliminar-examen").addEventListener("click", () => eliminarExamen(examen, idTema));
    return item;
}

function abrirModalEditarExamen(examen, idTema) {
    idExamenEditando = examen.id_examen;
    idTemaDeExamenEditando = idTema;
    document.getElementById("editExTitulo").value = examen.titulo || "";
    document.getElementById("editExUrlFormulario").value = examen.url_formulario || "";
    document.getElementById("editExDescripcion").value = examen.descripcion || "";
    document.getElementById("editExFecha").value = formatearFechaInput(examen.fecha_limite);
    abrirModal("modalEditarExamen");
}

async function guardarEdicionExamen(event) {
    event.preventDefault();
    if (!idExamenEditando) return;
    const titulo = document.getElementById("editExTitulo").value.trim();
    const urlFormulario = document.getElementById("editExUrlFormulario").value.trim();
    if (!titulo || !urlFormulario) return;
    try {
        const token = localStorage.getItem("token");
        const cuerpo = { titulo, url_formulario: urlFormulario, descripcion: document.getElementById("editExDescripcion").value.trim() };
        const fechaLimite = document.getElementById("editExFecha").value;
        if (fechaLimite) cuerpo.fecha_limite = fechaLimite;
        const respuesta = await fetch(`${API_URL}/examenes/${idExamenEditando}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(cuerpo)
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        document.getElementById("formEditarExamen").reset();
        cerrarModal(document.getElementById("modalEditarExamen"));
        const idTemaRefrescar = idTemaDeExamenEditando;
        idExamenEditando = null;
        idTemaDeExamenEditando = null;
        cargarRecursosTema(idTemaRefrescar);
    } catch (error) {
        console.error("Error al editar examen:", error);
        alert(error.message);
    }
}

async function eliminarExamen(examen, idTema) {
    const confirmado = confirm(`¿Eliminar el examen "${examen.titulo}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;
    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/examenes/${examen.id_examen}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        cargarRecursosTema(idTema);
    } catch (error) {
        console.error("Error al eliminar examen:", error);
        alert(error.message);
    }
}

async function cargarRecursosTema(idTema) {
    const contenedor = document.getElementById(`recursos-tema-${idTema}`);
    if (!contenedor) return;
    try {
        const token = localStorage.getItem("token");
        const [respRecursos, respActividades, respExamenes] = await Promise.all([
            fetch(`${API_URL}/recursos/tema/${idTema}`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${API_URL}/actividades/tema/${idTema}`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${API_URL}/examenes/tema/${idTema}`, { headers: { "Authorization": `Bearer ${token}` } })
        ]);
        const jsonRecursos = await respRecursos.json();
        const jsonActividades = await respActividades.json();
        const jsonExamenes = await respExamenes.json();
        const recursos = (respRecursos.ok && jsonRecursos.ok) ? jsonRecursos.data : [];
        const actividades = (respActividades.ok && jsonActividades.ok) ? jsonActividades.data : [];
        const examenes = (respExamenes.ok && jsonExamenes.ok) ? jsonExamenes.data : [];

        contenedor.innerHTML = "";
        actividades.forEach(actividad => contenedor.appendChild(crearItemActividad(actividad, idTema)));
        examenes.forEach(examen => contenedor.appendChild(crearItemExamen(examen, idTema)));
        recursos.forEach(recurso => contenedor.appendChild(crearItemRecurso(recurso, idTema)));
        if (recursos.length === 0 && actividades.length === 0 && examenes.length === 0) {
            contenedor.innerHTML = `<div class="item-recurso">Sin recursos, actividades ni exámenes aún.</div>`;
        }
    } catch (error) {
        console.error("Error al obtener recursos del tema:", error);
        contenedor.innerHTML = `<div class="item-recurso">Error al cargar recursos.</div>`;
    }
}

function crearItemRecurso(recurso, idTema) {
    const item = document.createElement("div");
    item.className = "item-recurso";

    const archivosHtml = (recurso.archivos || []).map((archivo, indice) =>
        `<button type="button" class="link-descarga" data-id-recurso="${recurso.id_recurso}" data-indice="${indice}">${escaparHtml(archivo.nombre_original || "Archivo")}</button>`
    ).join("<br>");

    item.innerHTML = `
        <strong> ${escaparHtml(recurso.titulo)}</strong>
        <p>${escaparHtml(recurso.descripcion || "")}</p>
        ${archivosHtml ? `<div>${archivosHtml}</div>` : ""}
        <div>
            <button type="button" class="btn-secondary btn-eliminar-recurso">Eliminar</button>
        </div>
    `;
    item.querySelectorAll(".link-descarga").forEach(boton => {
        boton.addEventListener("click", () => descargarRecurso(boton.dataset.idRecurso, boton.dataset.indice));
    });
    item.querySelector(".btn-eliminar-recurso").addEventListener("click", () => eliminarRecurso(recurso, idTema));
    return item;
}

// GET /recursos/:id/descargar/:indice está protegido con JWT, así que no
// se puede usar un <a href> normal -- se pide con el token y se abre desde
// un blob (mismo patrón que verArchivoDocente en admin.js).
async function descargarRecurso(idRecurso, indice) {
    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/recursos/${idRecurso}/descargar/${indice}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!respuesta.ok) throw new Error("No se pudo descargar el archivo.");
        const blob = await respuesta.blob();
        const nombre = respuesta.headers.get("content-disposition")?.match(/filename="?([^"]+)"?/)?.[1];
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = nombre || "archivo";
        enlace.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Error al descargar recurso:", error);
        alert(error.message);
    }
}

async function crearRecurso(event) {
    event.preventDefault();
    if (!idTemaModalActual) return;
    const titulo = document.getElementById("recTitulo").value.trim();
    if (!titulo) return;

    const boton = event.target.querySelector('button[type="submit"]');
    if (boton) boton.disabled = true;

    try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("titulo", titulo);
        formData.append("descripcion", document.getElementById("recDescripcion").value.trim());
        formData.append("id_tema", idTemaModalActual);
        const archivos = document.getElementById("recArchivos").files;
        for (let i = 0; i < archivos.length; i++) {
            formData.append("archivos", archivos[i]);
        }

        const respuesta = await fetch(`${API_URL}/recursos`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        document.getElementById("formRecurso").reset();
        cerrarModal(document.getElementById("modalRecurso"));
        cargarRecursosTema(idTemaModalActual);
    } catch (error) {
        console.error("Error al crear recurso:", error);
        alert(error.message);
    } finally {
        if (boton) boton.disabled = false;
    }
}

async function eliminarRecurso(recurso, idTema) {
    const confirmado = confirm(`¿Eliminar el recurso "${recurso.titulo}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;
    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/recursos/${recurso.id_recurso}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        cargarRecursosTema(idTema);
    } catch (error) {
        console.error("Error al eliminar recurso:", error);
        alert(error.message);
    }
}

function abrirModalActividad(idTema) {
    idTemaModalActual = idTema;
    abrirModal("modalActividad");
}

function abrirModalExamen(idTema) {
    idTemaModalActual = idTema;
    abrirModal("modalExamen");
}

function abrirModalRecurso(idTema) {
    idTemaModalActual = idTema;
    document.getElementById("formRecurso").reset();
    abrirModal("modalRecurso");
}

function inicializarModales() {
    document.getElementById("btnNuevaMateria").addEventListener("click", () => abrirModal("modalMateria"));
    document.querySelectorAll(".modal .close-modal").forEach(btn => {
        btn.addEventListener("click", (e) => cerrarModal(e.target.closest(".modal")));
    });
    document.querySelectorAll(".modal").forEach(modal => {
        modal.addEventListener("click", (e) => { if (e.target === modal) cerrarModal(modal); });
    });
    document.getElementById("formMateria").addEventListener("submit", crearMateria);
    document.getElementById("formEditarMateria").addEventListener("submit", guardarEdicionMateria);
    document.getElementById("formTema").addEventListener("submit", crearTema);
    document.getElementById("formEditarTema").addEventListener("submit", guardarEdicionTema);
    document.getElementById("formEditarContenidoTema").addEventListener("submit", guardarContenidoTema);
    document.getElementById("formExamen").addEventListener("submit", crearExamen);
    document.getElementById("formEditarExamen").addEventListener("submit", guardarEdicionExamen);
    document.getElementById("formActividad").addEventListener("submit", crearActividad);
    document.getElementById("formEditarActividad").addEventListener("submit", guardarEdicionActividad);
    document.getElementById("formRecurso").addEventListener("submit", crearRecurso);
    document.getElementById("btnCopiarToken").addEventListener("click", copiarToken);
}

function abrirModal(id) { document.getElementById(id).classList.add("open"); }
function cerrarModal(modal) { modal.classList.remove("open"); }

async function crearMateria(event) {
    event.preventDefault();
    const nombre = document.getElementById("matNombre").value.trim();
    if (!nombre) return;

    // Deshabilita el botón mientras la petición está en curso -- sin esto,
    // varios clics seguidos (o Enter repetido) antes de que responda el
    // backend crean varias materias idénticas.
    const boton = event.target.querySelector('button[type="submit"]');
    if (boton) boton.disabled = true;

    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/materias`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, id_docente: usuarioActual.id_usuario })
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        document.getElementById("formMateria").reset();
        cerrarModal(document.getElementById("modalMateria"));
        obtenerMaterias();
        if (json.data && json.data.token) {
            abrirModalToken(json.data.nombre, json.data.token);
        }
    } catch (error) {
        console.error("Error al crear materia:", error);
        alert(error.message);
    } finally {
        if (boton) boton.disabled = false;
    }
}

async function crearTema(event) {
    event.preventDefault();
    if (!materiaActual) return;
    const nombre = document.getElementById("temaNombre").value.trim();
    const descripcion = document.getElementById("temaDescripcion").value.trim();
    if (!nombre) return;

    const boton = event.target.querySelector('button[type="submit"]');
    if (boton) boton.disabled = true;

    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/temas`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, descripcion, id_materia: materiaActual.id_materia })
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        document.getElementById("formTema").reset();
        cerrarModal(document.getElementById("modalTema"));
        obtenerTemas(materiaActual.id_materia);
    } catch (error) {
        console.error("Error al crear tema:", error);
        alert(error.message);
    } finally {
        if (boton) boton.disabled = false;
    }
}

async function crearExamen(event) {
    event.preventDefault();
    if (!idTemaModalActual) return;
    const titulo = document.getElementById("exTitulo").value.trim();
    const urlFormulario = document.getElementById("exUrlFormulario").value.trim();
    const descripcion = document.getElementById("exDescripcion").value.trim();
    const fechaLimite = document.getElementById("exFecha").value;
    if (!titulo || !urlFormulario) return;

    const boton = event.target.querySelector('button[type="submit"]');
    if (boton) boton.disabled = true;

    try {
        const token = localStorage.getItem("token");
        const cuerpo = { titulo, url_formulario: urlFormulario, descripcion, id_tema: Number(idTemaModalActual) };
        if (fechaLimite) cuerpo.fecha_limite = fechaLimite;
        const respuesta = await fetch(`${API_URL}/examenes`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(cuerpo)
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        document.getElementById("formExamen").reset();
        cerrarModal(document.getElementById("modalExamen"));
        cargarRecursosTema(idTemaModalActual);
    } catch (error) {
        console.error("Error al crear examen:", error);
        alert(error.message);
    } finally {
        if (boton) boton.disabled = false;
    }
}

async function crearActividad(event) {
    event.preventDefault();
    if (!idTemaModalActual) return;
    const titulo = document.getElementById("actTitulo").value.trim();
    if (!titulo) return;

    const boton = event.target.querySelector('button[type="submit"]');
    if (boton) boton.disabled = true;

    try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("titulo", titulo);
        formData.append("id_tema", idTemaModalActual);
        formData.append("descripcion", document.getElementById("actDescripcion").value.trim());
        const fechaLimite = document.getElementById("actFecha").value;
        if (fechaLimite) formData.append("fecha_limite", fechaLimite);
        const puntaje = document.getElementById("actPuntaje").value;
        if (puntaje) formData.append("puntaje", puntaje);
        const archivos = document.getElementById("actArchivos").files;
        for (let i = 0; i < archivos.length; i++) {
            formData.append("archivos_apoyo", archivos[i]);
        }

        const respuesta = await fetch(`${API_URL}/actividades`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        document.getElementById("formActividad").reset();
        cerrarModal(document.getElementById("modalActividad"));
        cargarRecursosTema(idTemaModalActual);
    } catch (error) {
        console.error("Error al crear actividad:", error);
        alert(error.message);
    } finally {
        if (boton) boton.disabled = false;
    }
}
