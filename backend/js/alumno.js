const API_URL = "http://localhost:7000";
const INTERVALO_POLLING_MS = 8000;
const MAX_ARCHIVOS_MENSAJE = 5;
const MAX_ARCHIVOS_ENTREGA = 5;
const TIPOS_INPUT_ARCHIVO = { foto: "inputFoto", video: "inputVideo", documento: "inputDocumento" };

let usuarioActual = null;

// Chat (idéntico al panel del docente)
let gruposChat = [];
let chatActivoId = null;
let chatActivoNombre = "";
let chatsInicializados = false;
let intervaloChat = null;
let mensajeRespondiendo = null; // { autor, fragmento }
let archivosPendientes = []; // File[]
let socket = null;

// Empuja los mensajes nuevos en vivo (Socket.IO) al chat activo, en vez de
// esperar el siguiente ciclo de polling (hasta INTERVALO_POLLING_MS).
function inicializarSocketChat(token) {
    socket = io(API_URL, { auth: { token } });

    socket.on("chat:mensaje", (msg) => {
        if (Number(msg.id_grupo) !== Number(chatActivoId)) return;

        const contenedor = document.getElementById("chatMensajes");
        const vacio = contenedor.querySelector(".chat-vacio");
        if (vacio) vacio.remove();

        contenedor.appendChild(crearBurbujaMensaje(msg));
        contenedor.scrollTop = contenedor.scrollHeight;
    });
}

// Materias (libros)
let materiasInicializadas = false;
let materiasInscritas = [];
let navegacionMaterias = [{ tipo: "estante" }];

// El backend responde HTML (404 de Express) cuando una ruta no existe;
// sin esto, .json() falla con "Unexpected token '<'" en vez de decir qué ruta falta.
async function solicitarJSON(url, opciones) {
    const respuesta = await fetch(url, opciones);
    const contentType = respuesta.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        throw new Error(`La ruta ${url.replace(API_URL, "")} no devolvió JSON (status ${respuesta.status}). Verifica que exista en el backend.`);
    }
    const json = await respuesta.json();
    if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
    return json;
}

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!token || !user || user.rol.toLowerCase() !== "alumno") {
        alert("Acceso denegado. Por favor inicia sesión.");
        window.location.href = "login.html";
        return;
    }

    usuarioActual = user;
    document.getElementById("userDisplay").innerText = `${user.nombre} ${user.apellido}`;

    inicializarSocketChat(token);
    inicializarTabs();
    inicializarMaterias();
    inicializarFormulariosChat();
    cargarDashboard();
});

// ===================== TABS =====================
function inicializarTabs() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => cambiarTab(btn.dataset.tab));
    });
}

function cambiarTab(tab) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
    document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.id === `tab-${tab}`));

    if (tab === "materias" && !materiasInicializadas) {
        materiasInicializadas = true;
        cargarEstante();
    }

    if (tab === "chat") {
        if (!chatsInicializados) {
            chatsInicializados = true;
            cargarGruposChat();
        }
        iniciarPolling();
    } else {
        detenerPolling();
    }

    if (tab === "perfil") cargarPerfil();
}

// ===================== MATERIAS: INSCRIPCIÓN =====================
function inicializarMaterias() {
    document.getElementById("btnUnirse").addEventListener("click", inscribirse);
}

async function inscribirse() {
    const input = document.getElementById("inputToken");
    const tokenMateria = input.value.trim();
    if (!tokenMateria) return;

    const boton = document.getElementById("btnUnirse");
    boton.disabled = true;
    try {
        const token = localStorage.getItem("token");
        const json = await solicitarJSON(`${API_URL}/materias/inscribirse`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ token: tokenMateria })
        });
        input.value = "";
        alert(json.mensaje || "Te inscribiste correctamente.");
        cargarEstante();
    } catch (error) {
        alert(error.message);
    } finally {
        boton.disabled = false;
    }
}

// ===================== MATERIAS: ESTANTE DE LIBROS =====================
// TODO(backend): no existe un endpoint "mis materias" para alumno; estaInscrito()
// es interno y no se expone. Workaround acordado: se pide GET /materias (todas)
// y se prueba cada una contra GET /materias/:id/indice (200 = inscrito, 403 = no).
// Esto es O(n) peticiones extra; reemplazar por un endpoint real en cuanto exista.
async function materiaTieneInscripcion(idMateria, token) {
    try {
        const respuesta = await fetch(`${API_URL}/materias/${idMateria}/indice`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!respuesta.ok) return false;
        const contentType = respuesta.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return false;
        const json = await respuesta.json();
        return Boolean(json.ok);
    } catch {
        return false;
    }
}

async function cargarEstante() {
    const contenedor = document.getElementById("materiasContenido");
    contenedor.innerHTML = `<p class="dashboard-vacio">Cargando tus materias...</p>`;
    try {
        const token = localStorage.getItem("token");
        const json = await solicitarJSON(`${API_URL}/materias`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const todas = json.data || [];
        const resultados = await Promise.all(todas.map(async materia => ({
            materia,
            inscrito: await materiaTieneInscripcion(materia.id_materia, token)
        })));
        materiasInscritas = resultados.filter(r => r.inscrito).map(r => r.materia);
        mostrarEstante();
    } catch (error) {
        console.error("Error al obtener materias:", error);
        contenedor.innerHTML = `<p class="libro-error">${error.message}</p>`;
    }
}

function mostrarEstante() {
    navegacionMaterias = [{ tipo: "estante" }];
    renderizarEstanteUI();
}

function renderizarEstanteUI() {
    const contenedor = document.getElementById("materiasContenido");
    if (materiasInscritas.length === 0) {
        contenedor.innerHTML = `<div class="libro-vacio">Aún no estás inscrito en ninguna materia. Usa el token que te compartió tu docente para unirte.</div>`;
        return;
    }
    contenedor.innerHTML = `
        <div class="estante-wrapper">
            <p class="estante-titulo">Tus materias</p>
            <div class="estante-libros" id="estanteLibros"></div>
        </div>
    `;
    const estante = document.getElementById("estanteLibros");
    materiasInscritas.forEach(materia => {
        const libro = document.createElement("div");
        libro.className = "libro-card";
        libro.style.background = materia.color || "#00BB77";
        if (materia.icono) {
            libro.innerHTML = `<img src="${API_URL}/uploads/${materia.icono}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:50%;margin-bottom:0.6rem;"><span>${escaparHtml(materia.nombre)}</span>`;
        } else {
            libro.innerHTML = `<div class="libro-icono"></div><span>${escaparHtml(materia.nombre)}</span>`;
        }
        libro.addEventListener("click", () => abrirLibro(materia));
        estante.appendChild(libro);
    });
}

// ===================== MATERIAS: ÍNDICE DEL LIBRO =====================
async function abrirLibro(materia) {
    const contenedor = document.getElementById("materiasContenido");
    contenedor.innerHTML = `<p class="dashboard-vacio">Abriendo "${escaparHtml(materia.nombre)}"...</p>`;
    try {
        const token = localStorage.getItem("token");
        const json = await solicitarJSON(`${API_URL}/temas/materia/${materia.id_materia}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        navegacionMaterias = [{ tipo: "estante" }, { tipo: "indice", materia, temas: json.data || [] }];
        renderizarIndice();
    } catch (error) {
        contenedor.innerHTML = `<p class="libro-error">${error.message}</p>`;
    }
}

function renderizarIndice() {
    const estado = navegacionMaterias[navegacionMaterias.length - 1];
    const contenedor = document.getElementById("materiasContenido");
    contenedor.innerHTML = `
        <button type="button" class="separador-btn" id="btnVolverMaterias">← Volver al estante</button>
        <div class="libro-interior-header"><h2>${escaparHtml(estado.materia.nombre)}</h2></div>
        <div class="indice-categorias">
            <div class="categoria-card" data-categoria="explicaciones">
                <div class="categoria-icono"></div><h3>Explicaciones</h3><p>Teoría y contenido de cada tema</p>
            </div>
            <div class="categoria-card" data-categoria="actividades">
                <div class="categoria-icono"></div><h3>Actividades</h3><p>Trabajos para entregar</p>
            </div>
            <div class="categoria-card" data-categoria="examenes">
                <div class="categoria-icono"></div><h3>Exámenes</h3><p>Evaluaciones de la materia</p>
            </div>
        </div>
    `;
    document.getElementById("btnVolverMaterias").addEventListener("click", volverMateriaAtras);
    contenedor.querySelectorAll(".categoria-card").forEach(card => {
        card.addEventListener("click", () => abrirCategoria(card.dataset.categoria));
    });
}

// ===================== MATERIAS: CATEGORÍA (lista dentro del índice) =====================
async function abrirCategoria(categoria) {
    const estadoIndice = navegacionMaterias[navegacionMaterias.length - 1];
    const materia = estadoIndice.materia;
    const temas = estadoIndice.temas;
    const contenedor = document.getElementById("materiasContenido");

    if (categoria === "explicaciones") {
        navegacionMaterias.push({ tipo: "categoria", categoria, materia, temas, items: temas });
        renderizarCategoria();
        return;
    }

    contenedor.innerHTML = `<p class="dashboard-vacio">Cargando...</p>`;
    try {
        const token = localStorage.getItem("token");
        const ruta = categoria === "actividades" ? "actividades" : "examenes";
        // No hay endpoint a nivel materia: se junta lo de cada tema.
        const listasPorTema = await Promise.all(temas.map(async tema => {
            const json = await solicitarJSON(`${API_URL}/${ruta}/tema/${tema.id_tema}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });
            return (json.data || []).map(item => ({ ...item, _tema: tema }));
        }));
        const items = listasPorTema.flat();
        navegacionMaterias.push({ tipo: "categoria", categoria, materia, temas, items });
        renderizarCategoria();
    } catch (error) {
        contenedor.innerHTML = `<p class="libro-error">${error.message}</p>`;
    }
}

function renderizarCategoria() {
    const estado = navegacionMaterias[navegacionMaterias.length - 1];
    const contenedor = document.getElementById("materiasContenido");
    const titulos = { explicaciones: "Explicaciones", actividades: "Actividades", examenes: "Exámenes" };

    let listaHtml;
    if (!estado.items || estado.items.length === 0) {
        listaHtml = `<p class="libro-vacio">Todavía no hay ${titulos[estado.categoria].toLowerCase()} en esta materia.</p>`;
    } else if (estado.categoria === "explicaciones") {
        listaHtml = `<div class="lista-items">${estado.items.map((tema, indice) => `
            <div class="item-card" data-indice="${indice}">
                <h4>${escaparHtml(tema.nombre)}</h4>
                <p>${escaparHtml(truncarTexto(tema.descripcion || "Sin descripción.", 120))}</p>
            </div>
        `).join("")}</div>`;
    } else {
        listaHtml = `<div class="lista-items">${estado.items.map((item, indice) => `
            <div class="item-card" data-indice="${indice}">
                <div class="item-tema-label">${escaparHtml(item._tema.nombre)}</div>
                <h4>${escaparHtml(item.titulo)}</h4>
                ${item.fecha_limite ? `<p>Fecha límite: ${formatearFecha(item.fecha_limite)}</p>` : ""}
            </div>
        `).join("")}</div>`;
    }

    contenedor.innerHTML = `
        <button type="button" class="separador-btn" id="btnVolverMaterias">← Volver al índice</button>
        <div class="libro-interior-header"><h2>${titulos[estado.categoria]}</h2></div>
        ${listaHtml}
    `;
    document.getElementById("btnVolverMaterias").addEventListener("click", volverMateriaAtras);
    contenedor.querySelectorAll(".item-card").forEach(card => {
        card.addEventListener("click", () => abrirPagina(estado.items[Number(card.dataset.indice)]));
    });
}

function volverMateriaAtras() {
    navegacionMaterias.pop();
    const estado = navegacionMaterias[navegacionMaterias.length - 1];
    if (estado.tipo === "estante") renderizarEstanteUI();
    else if (estado.tipo === "indice") renderizarIndice();
    else if (estado.tipo === "categoria") renderizarCategoria();
}

// ===================== MATERIAS: PÁGINA (detalle) =====================
function abrirPagina(item) {
    const estadoCategoria = navegacionMaterias[navegacionMaterias.length - 1];
    navegacionMaterias.push({ tipo: "pagina", categoria: estadoCategoria.categoria, item });
    if (estadoCategoria.categoria === "explicaciones") renderizarPaginaExplicacion(item);
    else if (estadoCategoria.categoria === "actividades") renderizarPaginaActividad(item);
    else renderizarPaginaExamen(item);
}

function renderizarPaginaExplicacion(tema) {
    const contenedor = document.getElementById("materiasContenido");
    const imagenes = [tema.imagen1, tema.imagen2].filter(Boolean)
        .map(ruta => `<img src="${API_URL}/uploads/${ruta}" alt="">`).join("");
    contenedor.innerHTML = `
        <button type="button" class="separador-btn" id="btnVolverMaterias">← Volver</button>
        <div class="pagina-libro">
            <h2>${escaparHtml(tema.nombre)}</h2>
            ${tema.introduccion ? `<div class="pagina-texto">${escaparHtml(tema.introduccion)}</div>` : ""}
            ${imagenes}
            ${tema.contenido ? `<div class="pagina-texto">${escaparHtml(tema.contenido)}</div>` : ""}
            ${!tema.introduccion && !tema.contenido ? `<p class="pagina-texto">Tu docente todavía no agregó contenido para este tema.</p>` : ""}
        </div>
    `;
    document.getElementById("btnVolverMaterias").addEventListener("click", volverMateriaAtras);
}

function renderizarPaginaExamen(examen) {
    const contenedor = document.getElementById("materiasContenido");
    contenedor.innerHTML = `
        <button type="button" class="separador-btn" id="btnVolverMaterias">← Volver</button>
        <div class="pagina-libro">
            <h2>${escaparHtml(examen.titulo)}</h2>
            <div class="pagina-meta">${examen.fecha_limite ? `Fecha límite: ${formatearFecha(examen.fecha_limite)}` : "Sin fecha límite"}</div>
            ${examen.descripcion ? `<div class="pagina-texto">${escaparHtml(examen.descripcion)}</div>` : ""}
            <a href="${examen.url_formulario}" target="_blank" rel="noopener" class="btn-examen-link">Abrir examen</a>
        </div>
    `;
    document.getElementById("btnVolverMaterias").addEventListener("click", volverMateriaAtras);
}

async function renderizarPaginaActividad(actividad) {
    const contenedor = document.getElementById("materiasContenido");
    contenedor.innerHTML = `<p class="dashboard-vacio">Cargando...</p>`;

    let entregaActual = null;
    try {
        const token = localStorage.getItem("token");
        const json = await solicitarJSON(`${API_URL}/actividades/alumno/mis-entregas`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        entregaActual = (json.data || []).find(e => Number(e.id_actividad) === Number(actividad.id_actividad)) || null;
    } catch (error) {
        console.error("No se pudieron cargar tus entregas:", error);
    }

    const archivosApoyoHtml = (actividad.archivos_apoyo || []).map(archivo =>
        `<a href="${API_URL}/uploads/${archivo.url}" target="_blank" rel="noopener"> ${escaparHtml(archivo.nombre_original || "Archivo")}</a>`
    ).join("");

    contenedor.innerHTML = `
        <button type="button" class="separador-btn" id="btnVolverMaterias">← Volver</button>
        <div class="pagina-libro">
            <h2>${escaparHtml(actividad.titulo)}</h2>
            <div class="pagina-meta">
                ${actividad.fecha_limite ? `Fecha límite: ${formatearFecha(actividad.fecha_limite)}` : "Sin fecha límite"}
                ${actividad.puntaje !== undefined && actividad.puntaje !== null ? ` · Puntaje: ${actividad.puntaje}` : ""}
            </div>
            ${actividad.descripcion ? `<div class="pagina-texto">${escaparHtml(actividad.descripcion)}</div>` : ""}
            ${archivosApoyoHtml ? `<div class="pagina-archivos">${archivosApoyoHtml}</div>` : ""}
            <div id="entregaContainer"></div>
        </div>
    `;
    document.getElementById("btnVolverMaterias").addEventListener("click", volverMateriaAtras);
    renderizarEntrega(actividad, entregaActual);
}

function renderizarEntrega(actividad, entrega) {
    const contenedor = document.getElementById("entregaContainer");
    const calificado = entrega && entrega.calificacion !== null && entrega.calificacion !== undefined;

    if (entrega) {
        const archivosEntregaHtml = (entrega.archivos || []).map(archivo =>
            `<a href="${API_URL}/uploads/${archivo.url}" target="_blank" rel="noopener"> ${escaparHtml(archivo.nombre_original || "Archivo")}</a>`
        ).join("");
        contenedor.innerHTML = `
            <div class="entrega-actual">
                <strong>${calificado ? `Calificado: ${entrega.calificacion}` : "Ya entregaste esta actividad"}</strong>
                ${entrega.comentario_alumno ? `<p style="margin-top:0.5rem;">${escaparHtml(entrega.comentario_alumno)}</p>` : ""}
                ${entrega.url_entrega ? `<p style="margin-top:0.5rem;"><a href="${entrega.url_entrega}" target="_blank" rel="noopener">${escaparHtml(entrega.url_entrega)}</a></p>` : ""}
                ${archivosEntregaHtml ? `<div class="pagina-archivos" style="margin-top:0.5rem;">${archivosEntregaHtml}</div>` : ""}
                ${entrega.observaciones_docente ? `<p style="margin-top:0.5rem;"><em>${escaparHtml(entrega.observaciones_docente)}</em></p>` : ""}
                ${!calificado ? `<button type="button" class="btn-danger-link" id="btnEliminarEntrega">Retirar mi entrega</button>` : ""}
            </div>
        `;
        const btnEliminar = document.getElementById("btnEliminarEntrega");
        if (btnEliminar) btnEliminar.addEventListener("click", () => eliminarEntrega(actividad));
        return;
    }

    contenedor.innerHTML = `
        <form class="form-entrega" id="formEntrega">
            <h3>Entregar actividad</h3>
            <div class="form-group">
                <label for="entregaComentario">Comentario / respuesta en texto</label>
                <textarea id="entregaComentario" rows="3" placeholder="Escribe tu respuesta (opcional si adjuntas archivo o URL)"></textarea>
            </div>
            <div class="form-group">
                <label for="entregaUrl">URL (opcional)</label>
                <input type="url" id="entregaUrl" placeholder="https://...">
            </div>
            <div class="form-group">
                <label for="entregaArchivos">Archivos (máx. 5, opcional)</label>
                <input type="file" id="entregaArchivos" multiple>
            </div>
            <button type="submit" class="btn-primary">Entregar</button>
        </form>
    `;
    document.getElementById("formEntrega").addEventListener("submit", (e) => entregarActividad(e, actividad));
}

async function entregarActividad(event, actividad) {
    event.preventDefault();
    const comentario = document.getElementById("entregaComentario").value.trim();
    const urlEntrega = document.getElementById("entregaUrl").value.trim();
    const archivos = document.getElementById("entregaArchivos").files;

    if (!comentario && !urlEntrega && archivos.length === 0) {
        alert("Debes adjuntar al menos un archivo, escribir tu entrega en texto o compartir una URL.");
        return;
    }
    if (archivos.length > MAX_ARCHIVOS_ENTREGA) {
        alert(`Puedes adjuntar como máximo ${MAX_ARCHIVOS_ENTREGA} archivos.`);
        return;
    }

    const boton = event.target.querySelector("button[type=submit]");
    boton.disabled = true;
    try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        if (comentario) formData.append("comentario", comentario);
        if (urlEntrega) formData.append("url_entrega", urlEntrega);
        for (let i = 0; i < archivos.length; i++) formData.append("archivos", archivos[i]);

        await solicitarJSON(`${API_URL}/actividades/${actividad.id_actividad}/entregar`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });
        renderizarPaginaActividad(actividad);
    } catch (error) {
        alert(error.message);
        boton.disabled = false;
    }
}

async function eliminarEntrega(actividad) {
    if (!confirm("¿Retirar tu entrega de esta actividad?")) return;
    try {
        const token = localStorage.getItem("token");
        await solicitarJSON(`${API_URL}/actividades/${actividad.id_actividad}/entregar`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        renderizarEntrega(actividad, null);
    } catch (error) {
        alert(error.message);
    }
}

// ===================== CHAT (idéntico al panel del docente) =====================
function inicializarFormulariosChat() {
    document.getElementById("formChatActivo").addEventListener("submit", enviarMensajeActivo);
    document.getElementById("btnCancelarReply").addEventListener("click", cancelarRespuesta);

    const btnAdjuntar = document.getElementById("btnAdjuntar");
    const menuAdjuntar = document.getElementById("menuAdjuntar");
    btnAdjuntar.addEventListener("click", (e) => {
        e.stopPropagation();
        menuAdjuntar.classList.toggle("hidden");
    });
    document.addEventListener("click", (e) => {
        if (!menuAdjuntar.classList.contains("hidden") && !menuAdjuntar.contains(e.target) && e.target !== btnAdjuntar) {
            menuAdjuntar.classList.add("hidden");
        }
    });
    menuAdjuntar.querySelectorAll("button[data-tipo]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.getElementById(TIPOS_INPUT_ARCHIVO[btn.dataset.tipo]).click();
            menuAdjuntar.classList.add("hidden");
        });
    });

    Object.values(TIPOS_INPUT_ARCHIVO).forEach(idInput => {
        document.getElementById(idInput).addEventListener("change", (e) => agregarArchivosPendientes(e.target.files, e.target));
    });
}

async function cargarGruposChat() {
    const listaEscuela = document.getElementById("listaChatsEscuela");
    const listaGlobal = document.getElementById("listaChatsGlobal");
    try {
        const token = localStorage.getItem("token");
        const json = await solicitarJSON(`${API_URL}/chats`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        gruposChat = json.data || [];
        const gruposEscuela = gruposChat.filter(g => g.id_materia);
        const gruposGlobal = gruposChat.filter(g => !g.id_materia);

        renderizarListaChats(listaEscuela, gruposEscuela, "No perteneces a ningún chat de materia todavía.");
        renderizarListaChats(listaGlobal, gruposGlobal, "No hay chats públicos disponibles.");

        if (!chatActivoId) {
            const primero = gruposEscuela[0] || gruposGlobal[0];
            if (primero) seleccionarChat(primero);
        }
    } catch (error) {
        console.error("Error al obtener chats:", error);
        listaEscuela.innerHTML = `<li class="chat-sidebar-vacio">${error.message}</li>`;
        listaGlobal.innerHTML = "";
    }
}

function renderizarListaChats(lista, grupos, mensajeVacio) {
    lista.innerHTML = "";
    if (!grupos || grupos.length === 0) {
        lista.innerHTML = `<li class="chat-sidebar-vacio">${mensajeVacio}</li>`;
        return;
    }
    grupos.forEach(grupo => {
        const item = document.createElement("li");
        item.textContent = grupo.nombre;
        item.dataset.idGrupo = grupo.id_grupo;
        item.classList.toggle("active", Number(grupo.id_grupo) === Number(chatActivoId));
        item.addEventListener("click", () => seleccionarChat(grupo));
        lista.appendChild(item);
    });
}

function seleccionarChat(grupo) {
    if (socket && chatActivoId && Number(chatActivoId) !== Number(grupo.id_grupo)) {
        socket.emit("chat:salir", chatActivoId);
    }

    chatActivoId = grupo.id_grupo;
    chatActivoNombre = grupo.nombre;

    if (socket) socket.emit("chat:unirse", chatActivoId);
    document.getElementById("chatActivoNombre").textContent = grupo.nombre;

    document.querySelectorAll(".chat-sidebar-list li").forEach(li => {
        li.classList.toggle("active", Number(li.dataset.idGrupo) === Number(chatActivoId));
    });

    cancelarRespuesta();
    limpiarArchivosPendientes();
    cargarMensajesActivo();
}

async function cargarMensajesActivo() {
    if (!chatActivoId) return;
    const contenedor = document.getElementById("chatMensajes");
    try {
        const token = localStorage.getItem("token");
        const json = await solicitarJSON(`${API_URL}/chats/${chatActivoId}/mensajes`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        renderizarMensajes(contenedor, json.data || []);
    } catch (error) {
        console.error("Error al obtener mensajes:", error);
        contenedor.innerHTML = `<p class="chat-error">${error.message}</p>`;
    }
}

function renderizarMensajes(contenedor, mensajes) {
    contenedor.innerHTML = "";
    if (!mensajes || mensajes.length === 0) {
        contenedor.innerHTML = `<p class="chat-vacio">Aún no hay mensajes. ¡Escribe el primero!</p>`;
        return;
    }
    mensajes.forEach(msg => contenedor.appendChild(crearBurbujaMensaje(msg)));
    contenedor.scrollTop = contenedor.scrollHeight;
}

function resolverAutor(msg) {
    if (msg.autor) return `${msg.autor.nombre} ${msg.autor.apellido || ""}`.trim();
    if (msg.usuario) return `${msg.usuario.nombre} ${msg.usuario.apellido || ""}`.trim();
    return `Usuario #${msg.id_usuario}`;
}

function separarCita(contenido) {
    if (!contenido || !contenido.startsWith("> ")) return { cita: null, texto: contenido };
    const idxSalto = contenido.indexOf("\n");
    if (idxSalto === -1) return { cita: contenido.slice(2), texto: "" };
    return { cita: contenido.slice(2, idxSalto), texto: contenido.slice(idxSalto + 1) };
}

function crearBurbujaMensaje(msg) {
    const propio = Number(msg.id_usuario) === Number(usuarioActual.id_usuario);
    const burbuja = document.createElement("div");
    burbuja.className = `chat-burbuja ${propio ? "chat-burbuja-propia" : ""}`;

    const autor = resolverAutor(msg);
    const fecha = msg.fecha_creacion || msg.fecha || msg.createdAt || "";
    const { cita, texto } = separarCita(msg.contenido);

    const archivosHtml = (msg.archivos || []).map(archivo => {
        const nombre = archivo.nombre_original || "Archivo adjunto";
        const url = `${API_URL}/uploads/${archivo.url}`;
        return `<a href="${url}" target="_blank" rel="noopener" class="chat-archivo"> ${escaparHtml(nombre)}</a>`;
    }).join("");

    burbuja.innerHTML = `
        <button type="button" class="chat-burbuja-responder" title="Responder">↩</button>
        <div class="chat-burbuja-autor">${escaparHtml(autor)}</div>
        ${cita ? `<div class="chat-burbuja-cita">${escaparHtml(cita)}</div>` : ""}
        ${texto ? `<div class="chat-burbuja-texto">${escaparHtml(texto)}</div>` : ""}
        ${archivosHtml}
        ${fecha ? `<div class="chat-burbuja-fecha">${formatearFecha(fecha)}</div>` : ""}
    `;

    burbuja.querySelector(".chat-burbuja-responder").addEventListener("click", () => iniciarRespuesta(autor, texto || msg.contenido, archivosHtml));
    return burbuja;
}

function formatearFecha(fecha) {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("es-MX", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

function truncarTexto(texto, max = 70) {
    if (!texto) return "";
    return texto.length > max ? `${texto.slice(0, max).trim()}…` : texto;
}

function iniciarRespuesta(autor, texto, tieneArchivos) {
    const fragmento = texto ? truncarTexto(texto) : (tieneArchivos ? " Archivo adjunto" : "");
    mensajeRespondiendo = { autor, fragmento };

    document.getElementById("chatReplyAutor").textContent = autor;
    document.getElementById("chatReplyTexto").textContent = fragmento;
    document.getElementById("chatReplyBar").classList.remove("hidden");
    document.getElementById("inputMensaje").focus();
}

function cancelarRespuesta() {
    mensajeRespondiendo = null;
    document.getElementById("chatReplyBar").classList.add("hidden");
}

function agregarArchivosPendientes(archivos, inputOrigen) {
    for (const archivo of archivos) {
        if (archivosPendientes.length >= MAX_ARCHIVOS_MENSAJE) {
            alert(`Solo puedes adjuntar hasta ${MAX_ARCHIVOS_MENSAJE} archivos por mensaje.`);
            break;
        }
        archivosPendientes.push(archivo);
    }
    inputOrigen.value = "";
    renderizarAdjuntosPendientes();
}

function quitarArchivoPendiente(indice) {
    archivosPendientes.splice(indice, 1);
    renderizarAdjuntosPendientes();
}

function limpiarArchivosPendientes() {
    archivosPendientes = [];
    renderizarAdjuntosPendientes();
}

function renderizarAdjuntosPendientes() {
    const contenedor = document.getElementById("chatAdjuntosPreview");
    if (archivosPendientes.length === 0) {
        contenedor.classList.add("hidden");
        contenedor.innerHTML = "";
        return;
    }
    contenedor.classList.remove("hidden");
    contenedor.innerHTML = "";
    archivosPendientes.forEach((archivo, indice) => {
        const chip = document.createElement("div");
        chip.className = "chat-adjunto-chip";
        const icono = "";
        chip.innerHTML = `<span>${icono} ${escaparHtml(archivo.name)}</span>`;
        const btnQuitar = document.createElement("button");
        btnQuitar.type = "button";
        btnQuitar.innerHTML = "&times;";
        btnQuitar.addEventListener("click", () => quitarArchivoPendiente(indice));
        chip.appendChild(btnQuitar);
        contenedor.appendChild(chip);
    });
}

async function enviarMensajeActivo(event) {
    event.preventDefault();
    if (!chatActivoId) return;

    const input = document.getElementById("inputMensaje");
    let contenido = input.value.trim();
    if (mensajeRespondiendo) {
        contenido = `> ${mensajeRespondiendo.autor}: ${mensajeRespondiendo.fragmento}\n${contenido}`;
    }
    const huboTexto = input.value.trim().length > 0;
    if (!huboTexto && archivosPendientes.length === 0) return;

    try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        if (huboTexto || mensajeRespondiendo) formData.append("contenido", contenido);
        archivosPendientes.forEach(archivo => formData.append("archivos", archivo));

        await solicitarJSON(`${API_URL}/chats/${chatActivoId}/mensajes`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });

        input.value = "";
        cancelarRespuesta();
        limpiarArchivosPendientes();
        cargarMensajesActivo();
    } catch (error) {
        console.error("Error al enviar mensaje:", error);
        alert(error.message);
    }
}

function iniciarPolling() {
    if (intervaloChat) return;
    intervaloChat = setInterval(() => {
        if (chatActivoId) cargarMensajesActivo();
    }, INTERVALO_POLLING_MS);
}

function detenerPolling() {
    if (intervaloChat) {
        clearInterval(intervaloChat);
        intervaloChat = null;
    }
}

// ===================== PERFIL (idéntico al panel del docente) =====================
async function cargarPerfil() {
    try {
        const token = localStorage.getItem("token");
        const json = await solicitarJSON(`${API_URL}/usuarios/${usuarioActual.id_usuario}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        renderizarPerfil(json.data);
    } catch (error) {
        console.error("Error al obtener perfil, se muestran los datos locales:", error);
        renderizarPerfil(usuarioActual);
    }
    cargarProgresoPerfil();
}

async function cargarProgresoPerfil() {
    const contenedor = document.getElementById("perfilProgreso");
    try {
        const token = localStorage.getItem("token");
        const json = await solicitarJSON(`${API_URL}/progreso/mi-progreso`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        renderizarProgresoPerfil(json.data || []);
    } catch (error) {
        console.error("Error al obtener el progreso:", error);
        contenedor.innerHTML = `<h3>Mi progreso</h3><p class="dashboard-vacio">${error.message}</p>`;
    }
}

function renderizarProgresoPerfil(materias) {
    const contenedor = document.getElementById("perfilProgreso");

    if (!materias || materias.length === 0) {
        contenedor.innerHTML = `<h3>Mi progreso</h3><p class="dashboard-vacio">Todavía no estás inscrito en ninguna materia.</p>`;
        return;
    }

    const filas = materias.map(materia => {
        const porcentaje = Math.max(0, Math.min(100, Number(materia.progreso?.porcentaje_avance) || 0));
        const completadas = materia.progreso?.act_completas ?? 0;
        return `
            <div class="progreso-materia">
                <div class="progreso-materia-encabezado">
                    <span>${escaparHtml(materia.nombre)}</span>
                    <strong>${porcentaje}%</strong>
                </div>
                <div class="progreso-barra">
                    <div class="progreso-barra-relleno" style="width: ${porcentaje}%; background-color: ${materia.color || "var(--primary-color)"};"></div>
                </div>
                <span class="progreso-materia-detalle">${completadas} actividad${completadas === 1 ? "" : "es"} completada${completadas === 1 ? "" : "s"}</span>
            </div>
        `;
    }).join("");

    contenedor.innerHTML = `<h3>Mi progreso</h3><div class="progreso-lista">${filas}</div>`;
}

function renderizarPerfil(perfil) {
    const contenedor = document.getElementById("perfilCard");
    const iniciales = `${(perfil.nombre || "?")[0] || ""}${(perfil.apellido || "")[0] || ""}`.toUpperCase();
    const avatarHtml = perfil.foto_perfil
        ? `<img src="${API_URL}/uploads/${perfil.foto_perfil}" alt="" class="perfil-avatar" style="object-fit: cover;">`
        : `<div class="perfil-avatar">${iniciales}</div>`;

    contenedor.innerHTML = `
        ${avatarHtml}
        <h2>${escaparHtml(perfil.nombre)} ${escaparHtml(perfil.apellido || "")}</h2>
        <p class="perfil-correo">${escaparHtml(perfil.correo)}</p>
        <div class="perfil-datos">
            <div class="perfil-dato"><span>ID de usuario</span><strong>${perfil.id_usuario}</strong></div>
            <div class="perfil-dato"><span>Biografía</span><strong>${escaparHtml(perfil.biografia || "Sin biografía")}</strong></div>
            ${perfil.fecha_registro ? `<div class="perfil-dato"><span>Miembro desde</span><strong>${formatearFecha(perfil.fecha_registro)}</strong></div>` : ""}
        </div>
    `;
}

// ===================== DASHBOARD =====================
// Los nombres de campo de notificaciones/calendario/recomendados son
// best-effort: RepositorioNotificaciones y RepositorioDashboard no se
// compartieron, solo el controller. Se usan cadenas de fallback razonables
// (ej. fecha_creacion || fecha) para no romper si el nombre real difiere un poco.
function cargarDashboard() {
    cargarNotificaciones();
    cargarCalendario();
    cargarRecomendados();
}

async function cargarNotificaciones() {
    const contenedor = document.getElementById("dashboardNotificaciones");
    try {
        const token = localStorage.getItem("token");
        const json = await solicitarJSON(`${API_URL}/dashboard/notificaciones`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        renderizarNotificaciones(json.data || []);
    } catch (error) {
        console.error("Error al obtener notificaciones:", error);
        contenedor.innerHTML = `<p class="dashboard-vacio">${error.message}</p>`;
    }
}

function renderizarNotificaciones(notificaciones) {
    const contenedor = document.getElementById("dashboardNotificaciones");
    if (!notificaciones || notificaciones.length === 0) {
        contenedor.innerHTML = `<p class="dashboard-vacio">No tienes notificaciones.</p>`;
        return;
    }
    contenedor.innerHTML = "";
    notificaciones.forEach(noti => {
        const id = noti.id_notificacion !== undefined ? noti.id_notificacion : noti.id;
        const leida = Boolean(noti.leida);
        const item = document.createElement("div");
        item.className = `dashboard-item clicable ${leida ? "" : "no-leida"}`;
        const fecha = noti.fecha_creacion || noti.fecha;
        item.innerHTML = `
            <strong>${escaparHtml(noti.titulo || "Notificación")}</strong>
            <span>${escaparHtml(noti.mensaje || "")}</span>
            ${fecha ? `<span class="dashboard-fecha">${formatearFecha(fecha)}</span>` : ""}
        `;
        if (!leida && id !== undefined) {
            item.addEventListener("click", () => marcarNotificacionLeida(id, item));
        }
        contenedor.appendChild(item);
    });
}

async function marcarNotificacionLeida(id, elemento) {
    try {
        const token = localStorage.getItem("token");
        await solicitarJSON(`${API_URL}/dashboard/notificaciones/${id}/leida`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` }
        });
        elemento.classList.remove("no-leida");
    } catch (error) {
        console.error("No se pudo marcar como leída:", error);
    }
}

async function cargarCalendario() {
    const contenedor = document.getElementById("dashboardCalendario");
    try {
        const token = localStorage.getItem("token");
        const json = await solicitarJSON(`${API_URL}/dashboard/calendario`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        renderizarCalendario(json.data || []);
    } catch (error) {
        console.error("Error al obtener el calendario:", error);
        contenedor.innerHTML = `<p class="dashboard-vacio">${error.message}</p>`;
    }
}

function renderizarCalendario(eventos) {
    const contenedor = document.getElementById("dashboardCalendario");
    if (!eventos || eventos.length === 0) {
        contenedor.innerHTML = `<p class="dashboard-vacio">No tienes fechas próximas.</p>`;
        return;
    }
    contenedor.innerHTML = "";
    eventos.forEach(evento => {
        const item = document.createElement("div");
        item.className = "dashboard-item";
        const titulo = evento.titulo || evento.nombre || "Evento";
        const fecha = evento.fecha_limite || evento.fecha || evento.fecha_creacion;
        const tipo = evento.tipo === "examen" ? " Examen" : evento.tipo === "actividad" ? " Actividad" : " Evento";
        const nombreMateria = evento.materia && evento.materia.nombre ? evento.materia.nombre : "";
        item.innerHTML = `
            <strong>${escaparHtml(titulo)}</strong>
            <span>${tipo}${nombreMateria ? ` · ${escaparHtml(nombreMateria)}` : ""}</span>
            ${fecha ? `<span class="dashboard-fecha">${formatearFecha(fecha)}</span>` : ""}
        `;
        contenedor.appendChild(item);
    });
}

async function cargarRecomendados() {
    try {
        const token = localStorage.getItem("token");
        const json = await solicitarJSON(`${API_URL}/dashboard/recomendados`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = json.data || {};
        const repasar = data.repasar || {};
        const siguientes = data.siguientes || {};
        renderizarListaRecomendados("repasarTemas", repasar.temas, "nombre");
        renderizarListaRecomendados("repasarActividades", repasar.actividades, "titulo");
        renderizarListaRecomendados("siguientesTemas", siguientes.temas, "nombre");
        renderizarListaRecomendados("siguientesActividades", siguientes.actividades, "titulo");
    } catch (error) {
        console.error("Error al obtener recomendados:", error);
        ["repasarTemas", "repasarActividades", "siguientesTemas", "siguientesActividades"].forEach(id => {
            document.getElementById(id).innerHTML = `<p class="dashboard-vacio">${error.message}</p>`;
        });
    }
}

function renderizarListaRecomendados(idContenedor, items, campoTitulo) {
    const contenedor = document.getElementById(idContenedor);
    if (!items || items.length === 0) {
        contenedor.innerHTML = `<p class="dashboard-vacio">Nada por aquí.</p>`;
        return;
    }
    contenedor.innerHTML = "";
    items.forEach(item => {
        const el = document.createElement("div");
        el.className = "dashboard-item";
        el.innerHTML = `<strong>${escaparHtml(item[campoTitulo] || "Sin título")}</strong>`;
        contenedor.appendChild(el);
    });
}
