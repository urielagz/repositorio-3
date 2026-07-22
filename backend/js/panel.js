const API_URL = "http://localhost:7000";
const INTERVALO_POLLING_MS = 8000;

const MAX_ARCHIVOS_MENSAJE = 5;
const TIPOS_INPUT_ARCHIVO = { foto: "inputFoto", video: "inputVideo", documento: "inputDocumento" };

let usuarioActual = null;
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

    if (!token || !user || (user.rol.toLowerCase() !== "docente" && user.rol.toLowerCase() !== "admin")) {
        alert("Acceso denegado. Por favor inicia sesión.");
        window.location.href = "login.html";
        return;
    }

    usuarioActual = user;
    document.getElementById("userDisplay").innerText = `${user.nombre} ${user.apellido}`;

    if (user.rol.toLowerCase() === "admin") {
        document.getElementById("linkAdmin").classList.remove("hidden");
    }

    inicializarSocketChat(token);
    inicializarTabs();
    inicializarFormulariosChat();
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

    if (tab === "comunidad") {
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

// ===================== COMUNIDAD / CHAT =====================
function inicializarFormulariosChat() {
    document.getElementById("formChatActivo").addEventListener("submit", enviarMensajeActivo);
    document.getElementById("btnCancelarReply").addEventListener("click", cancelarRespuesta);

    // Botón de adjuntar () abre/cierra el menú tipo WhatsApp con las 3 opciones.
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
        // El backend no distingue "escuela" de "global": separamos por si el
        // grupo está ligado a una materia (chat de escuela) o es público (global).
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

// El backend no soporta "responder a un mensaje": la cita se antepone como
// texto plano ("> Autor: fragmento") y aquí se separa de vuelta para pintarla
// en un recuadro distinto dentro de la burbuja.
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
        const url = `${archivo.url}`;
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

// ===================== RESPONDER A UN MENSAJE =====================
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

// ===================== ADJUNTOS (fotos / video / documento) =====================
function agregarArchivosPendientes(archivos, inputOrigen) {
    for (const archivo of archivos) {
        if (archivosPendientes.length >= MAX_ARCHIVOS_MENSAJE) {
            alert(`Solo puedes adjuntar hasta ${MAX_ARCHIVOS_MENSAJE} archivos por mensaje.`);
            break;
        }
        archivosPendientes.push(archivo);
    }
    inputOrigen.value = ""; // permite volver a elegir el mismo archivo si se quita luego
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

// ===================== ENVIAR MENSAJE =====================
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

// ===================== PERFIL =====================
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
}

function renderizarPerfil(perfil) {
    const contenedor = document.getElementById("perfilCard");
    const iniciales = `${(perfil.nombre || "?")[0] || ""}${(perfil.apellido || "")[0] || ""}`.toUpperCase();
    const avatarHtml = perfil.foto_perfil
        ? `<img src="${perfil.foto_perfil}" alt="" class="perfil-avatar" style="object-fit: cover;">`
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
