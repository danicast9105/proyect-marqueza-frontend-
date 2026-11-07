(function () {
    if (document.getElementById("marqueza-assistant-launcher")) return;

    const scriptUrl = document.currentScript.src;
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("asistente.css", scriptUrl).href;
    document.head.appendChild(stylesheet);

    const modules = [
        { name: "Inicio", key: "", aliases: ["inicio", "dashboard", "panel", "resumen"], description: "un panel con indicadores y gráficas de ventas, cotizaciones e inventario", details: "Resume la actividad comercial y muestra comparaciones de ventas, cotizaciones y existencias.", countQuestion: "¿Qué módulos tiene MARQUEZA?", createQuestion: "¿Qué información muestra el inicio?" },
        { name: "Insumos", key: "marqueza_insumos", aliases: ["insumo", "insumos", "material", "materiales"], description: "la gestión del inventario de materias primas e insumos", details: "Permite consultar nombre, código, cantidad, precio, estado y proveedor relacionado.", singular: "insumo", plural: "insumos", countQuestion: "¿Cuántos insumos hay?", createQuestion: "¿Cómo registro un insumo?" },
        { name: "Productos", key: "marqueza_productos", aliases: ["producto", "productos", "prenda", "prendas"], description: "la gestión del catálogo y las existencias de productos", details: "Organiza los productos con su código, nombre, cantidad disponible, precio y estado.", singular: "producto", plural: "productos", countQuestion: "¿Cuántos productos hay?", createQuestion: "¿Cómo creo un producto?" },
        { name: "Ventas", key: "marqueza_ventas", aliases: ["venta", "ventas"], description: "el registro y consulta de ventas", details: "Las ventas se relacionan con clientes y productos; el total depende de las cantidades y precios registrados.", singular: "venta", plural: "ventas", countQuestion: "¿Cuántas ventas hay?", createQuestion: "¿Cómo registro una venta?" },
        { name: "Cotizaciones", key: "marqueza_cotizaciones", aliases: ["cotizacion", "cotizaciones", "propuesta", "propuestas"], description: "la creación y seguimiento de cotizaciones para clientes", details: "Una cotización puede incluir productos, cantidades, precios y un total. En esta pantalla aparecen los estados Pendiente, Enviada, Aprobada y Rechazada.", singular: "cotización", plural: "cotizaciones", countQuestion: "¿Cuántas cotizaciones hay?", createQuestion: "¿Qué estados puede tener una cotización?" },
        { name: "Clientes", key: "marqueza_clientes", aliases: ["cliente", "clientes"], description: "los datos de contacto de los clientes", details: "La pantalla de clientes permite manejar nombre, documento, teléfono y correo.", singular: "cliente", plural: "clientes", countQuestion: "¿Cuántos clientes hay?", createQuestion: "¿Cómo registro un cliente?" },
        { name: "Proveedores", key: "marqueza_proveedores", aliases: ["proveedor", "proveedores"], description: "la información de los proveedores", details: "El proyecto relaciona proveedores con información de persona y canales de contacto.", singular: "proveedor", plural: "proveedores", countQuestion: "¿Cuántos proveedores hay?", createQuestion: "¿Cómo agrego un proveedor?" },
        { name: "Usuarios", key: "marqueza_usuarios", aliases: ["usuario", "usuarios", "cuenta", "cuentas"], description: "las cuentas y roles de acceso al sistema", details: "El módulo administra cuentas y sus datos de acceso. No compartas contraseñas en este chat.", singular: "usuario", plural: "usuarios", countQuestion: "¿Cuántos usuarios hay?", createQuestion: "¿Cómo registro un usuario?" },
        { name: "Registro de actividad", key: "marqueza_bitacora", aliases: ["registro de actividad", "actividad", "auditoria", "historial", "errores"], description: "el historial de actividad registrado en la aplicación", details: "Permite consultar eventos de auditoría, acciones y actividad guardada por la aplicación.", singular: "evento", plural: "eventos", countQuestion: "¿Cuántos eventos hay?", createQuestion: "¿Qué guarda el registro de actividad?" }
    ];

    function normalize(value) {
        return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    const VOICE_LANG = "es-CO";
    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    const voiceInputSupported = Boolean(SpeechRecognitionImpl) && window.isSecureContext !== false;
    const voiceOutputSupported = "speechSynthesis" in window;
    let recognition = null;
    let isListening = false;

    const voiceStorageKey = "marqueza_asistente_voz";
    let voiceOutputEnabled = localStorage.getItem(voiceStorageKey) === "on";

    function speak(text) {
        if (!voiceOutputEnabled || !voiceOutputSupported) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = VOICE_LANG;
        utterance.rate = 1;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    }

    function currentModule() {
        const path = normalize(decodeURIComponent(window.location.pathname));
        return modules.find((module) => module.aliases.some((alias) => path.includes(alias))) || modules[0];
    }

    function findModule(question) {
        const normalized = normalize(question);
        return modules.find((module) => module.aliases.some((alias) => normalized.includes(normalize(alias))));
    }

    function localCount(module) {
        if (!module.key) return null;
        try {
            const value = localStorage.getItem(module.key);
            if (value === null) return 0;
            const records = JSON.parse(value);
            return Array.isArray(records) ? records.length : null;
        } catch {
            return null;
        }
    }

    function answerQuestion(question) {
        const normalized = normalize(question);
        const activeModule = currentModule();
        const targetModule = findModule(question) || activeModule;

        if (/\b(hola|buenas|buenos dias|buenas tardes|buenas noches)\b/.test(normalized)) {
            return "Hola. Puedo orientarte sobre esta pantalla, los módulos y el proyecto MARQUEZA. ¿Qué quieres consultar?";
        }

        if (/\b(api|backend|mysql|servidor|conecta|conexion|localstorage|almacenamiento local|guardan los datos|almacenan los datos|donde se guardan)\b/.test(normalized)) {
            return "El backend de MARQUEZA usa Flask y MySQL, y expone una API REST. El frontend está hecho con HTML, CSS y JavaScript; varias pantallas todavía guardan sus registros en localStorage. Por eso, un dato visible en el navegador no necesariamente está sincronizado con MySQL.";
        }

        if (/\b(proyecto|marqueza|sistema|aplicacion|tecnologia|frontend|modulos|modulo)\b/.test(normalized)) {
            return "MARQUEZA es una aplicación de gestión para una empresa de confecciones. Reúne clientes, proveedores, productos, insumos, ventas, cotizaciones, usuarios y registro de actividad. Su propósito es centralizar contactos, inventario y seguimiento comercial. El frontend usa HTML, CSS y JavaScript; el backend usa Flask y MySQL, aunque algunas pantallas aún trabajan con datos locales.";
        }

        if (/\b(estado|estados|pendiente|enviada|aprobada|rechazada)\b/.test(normalized) && targetModule.name === "Cotizaciones") {
            return "Las cotizaciones pueden estar Pendientes, Enviadas, Aprobadas o Rechazadas. Puedes revisar y filtrar esos estados desde la pantalla de Cotizaciones.";
        }

        if (/\b(datos|campos|informacion|incluye|contiene|guarda|almacena)\b/.test(normalized) && findModule(question)) {
            return `${targetModule.name} ${targetModule.details}`;
        }

        if (/\b(relacion|relaciona|asocia|vincula|depende)\b/.test(normalized)) {
            if (targetModule.name === "Ventas") return "Las ventas se relacionan con un cliente y con los productos vendidos. Las líneas de producto incluyen cantidades; el valor depende de los precios registrados.";
            if (targetModule.name === "Cotizaciones") return "Las cotizaciones se preparan para clientes y pueden incluir productos, cantidades, precios y un total.";
            if (targetModule.name === "Insumos") return "Los insumos pueden relacionarse con un proveedor y con detalles de producción.";
            if (targetModule.name === "Productos") return "Los productos pueden relacionarse con sus insumos y con las ventas en las que se incluyen.";
            return `${targetModule.name} forma parte del flujo de gestión de MARQUEZA. ${targetModule.details}`;
        }

        // ---- Soporte: preguntas de "no puedo..." / "no funciona..." / situaciones y problemas ----

        if (/\b(no puedo iniciar sesion|no me deja entrar|no inicia sesion|no reconoce mi usuario|usuario no registrado|contrasena incorrecta|error de acceso|no me deja iniciar)\b/.test(normalized)) {
            return "Para iniciar sesión, el usuario tiene que existir primero en el módulo Usuarios (o en el registro), y la contraseña debe coincidir exactamente. Si el sistema dice \"usuario no registrado\", regístrate primero. Si dice que la contraseña es incorrecta, verifica mayúsculas y espacios; recuerda que el inicio de sesión valida contra los usuarios guardados en este navegador.";
        }

        if (/\b(olvide mi contrasena|recuperar contrasena|restablecer contrasena|reestablecer contrasena|perdi mi clave|cambiar mi contrasena)\b/.test(normalized)) {
            return "En la pantalla de recuperación, ingresas tu correo y el sistema busca si existe una cuenta asociada. Si existe, guarda una solicitud de recuperación local, pero no cambia la contraseña automáticamente: debes contactar a un administrador para que la restablezca desde el módulo Usuarios.";
        }

        if (/\b(cerrar sesion|salir de la cuenta|desconectarme|cerrar mi cuenta)\b/.test(normalized)) {
            return "Para cerrar sesión, usa el botón correspondiente en la barra lateral. Eso borra tu sesión activa guardada en este navegador y te regresa a la pantalla de inicio de sesión.";
        }

        if (/\b(no veo mis datos|se borraron mis datos|desaparecieron los registros|no aparecen los registros|perdi mi informacion|se perdio la informacion|no carga la tabla|tabla vacia)\b/.test(normalized)) {
            return "La mayoría de los módulos todavía guardan la información en el almacenamiento local (localStorage) de este navegador, no en el servidor. Por eso, si abres la aplicación en otro navegador, en una ventana de incógnito, o si borraste los datos de navegación, los registros no van a aparecer: siguen en el otro navegador o se perdieron al limpiar el caché.";
        }

        if (/\b(no puedo guardar|no me deja guardar|no guarda el registro|no se guarda|campos incompletos|no se envia el formulario)\b/.test(normalized)) {
            return "Si el formulario no guarda, revisa que TODOS los campos estén completos: el sistema rechaza el guardado si encuentra algún campo vacío y muestra el aviso \"Campos incompletos\". Completa cada campo del formulario y vuelve a intentar.";
        }

        if (/\b(como elimino|como borro|eliminar un registro|borrar un registro)\b/.test(normalized)) {
            return "Para eliminar, usa el ícono de la papelera en la fila correspondiente de la tabla. El sistema pide confirmación antes de borrar porque la acción no se puede deshacer.";
        }

        if (/\b(como busco|como filtro|barra de busqueda|no encuentro un registro)\b/.test(normalized)) {
            return "Cada módulo tiene un campo de búsqueda arriba de la tabla: escribe ahí y la tabla se filtra automáticamente comparando contra todos los datos del registro (no solo un campo), así que puedes buscar por cualquier dato visible.";
        }

        if (/\b(exportar|descargar datos|descargar registros|exportar pdf|exportar csv)\b/.test(normalized)) {
            return "El botón de exportar descarga los registros del módulo actual en un archivo .csv (se puede abrir en Excel), aunque en algún módulo el botón diga \"PDF\" por el nombre interno; el formato real que se descarga es CSV.";
        }

        if (/\b(modo oscuro|tema oscuro|cambiar tema|modo claro)\b/.test(normalized)) {
            return "El interruptor de tema está en la barra lateral: cambia entre modo claro y oscuro, y tu preferencia queda guardada en este navegador para la próxima vez que entres.";
        }

        if (/\b(no veo el menu|barra lateral no aparece|menu hamburguesa|no aparece el menu en el celular)\b/.test(normalized)) {
            return "En pantallas pequeñas, el menú lateral se abre con el ícono de hamburguesa en la parte superior. En pantallas grandes, el ícono de flecha en la barra lateral la expande o la contrae.";
        }

        if (/\b(no me deja registrar|error al registrarme|no puedo crear mi cuenta|usuario ya existe|correo ya existe|correo ya registrado|requisitos de contrasena|como me registro|como creo una cuenta|como creo un usuario nuevo)\b/.test(normalized)) {
            return "Para crear una cuenta nueva: el nombre de usuario debe tener entre 3 y 20 caracteres, solo letras y números (sin espacios ni símbolos); la contraseña necesita mínimo 8 caracteres con al menos una mayúscula, una minúscula y un número; debes confirmar la contraseña igual; y elegir un rol distinto de \"Ninguno\". Si dice \"usuario existente\" o \"correo existente\", significa que ya hay una cuenta registrada con esos datos: usa otro usuario/correo o inicia sesión con el que ya tienes.";
        }

        if (/\b(no funciona el microfono|no me escucha|no reconoce mi voz|activar microfono|permiso de microfono|el microfono no anda|no hay boton de microfono)\b/.test(normalized)) {
            if (!voiceInputSupported) {
                return "Tu navegador no admite el reconocimiento de voz que uso, o la página no se está sirviendo de forma segura (HTTPS o localhost). Prueba abrir MARQUEZA en Chrome o Edge, y desde un servidor local en vez de abrir el archivo HTML directamente con doble clic.";
            }
            return "Si el micrófono no responde, revisa que le hayas dado permiso al navegador para usarlo (clic en el candado de la barra de direcciones) y que tu equipo tenga un micrófono conectado y seleccionado como predeterminado. También necesitas conexión a internet, porque el reconocimiento de voz del navegador se procesa en línea.";
        }

        if (/\b(tengo un problema|no funciona|hay un error|algo fallo|se dano|no carga la pagina|pantalla en blanco)\b/.test(normalized)) {
            return "Cuéntame qué estabas haciendo cuando pasó (por ejemplo: \"no puedo guardar\", \"no inicia sesión\", \"no veo mis datos\") y te doy el paso a paso. Si el problema persiste, revisa el módulo Registro de actividad: ahí queda un historial de las acciones y accesos, y también puedes intentar recargar la página o limpiar el caché del navegador.";
        }

        if (/\b(cuantos|cuantas|total|cantidad|numero|registros)\b/.test(normalized) || (/\b(hay|existen)\b/.test(normalized) && findModule(question))) {
            const count = localCount(targetModule);
            if (count === null) {
                return `No encuentro datos de ${targetModule.name} en el almacenamiento local de este navegador, así que no puedo confirmar un total.`;
            }
            const countLabel = count === 1 ? targetModule.singular || targetModule.name.toLowerCase() : targetModule.plural || targetModule.name.toLowerCase();
            return `Hay ${count} ${countLabel} en el almacenamiento local de este navegador.`;
        }

        if (/\b(que hace|que puedo hacer|que hay en|esta pagina|esta pantalla|para que sirve|funciona)\b/.test(normalized)) {
            const count = localCount(targetModule);
            const countText = count === null ? "" : ` Actualmente hay ${count} registros locales.`;
            return `Esta es la pantalla de ${targetModule.name}: ${targetModule.description}. ${targetModule.details}${countText}`;
        }

        if (/\b(crear|creo|agregar|agrego|anadir|registro|registrar|nuevo|nueva|guardar|guardo|editar|edito|eliminar|elimino|buscar|busco|filtrar|filtro)\b/.test(normalized)) {
            if (targetModule.name === "Inicio" || targetModule.name === "Registro de actividad") {
                return `La pantalla de ${targetModule.name} sirve para consultar información; no es un formulario de creación de registros. Usa la barra lateral para abrir el módulo que quieras gestionar.`;
            }
            return `En ${targetModule.name}, usa el botón principal para crear un registro. Después de guardarlo, aparecerá en la tabla, donde podrás consultarlo, editarlo o eliminarlo.`;
        }

        if (findModule(question)) {
            const count = localCount(targetModule);
            const countText = count === null ? " No hay datos locales disponibles para contar." : ` Hay ${count} registros locales.`;
            return `El módulo ${targetModule.name} se usa para ${targetModule.description.replace(/^la gestión de |^el registro y consulta de |^la creación y seguimiento de |^los datos de contacto de |^la información de |^las cuentas y roles de acceso al sistema/, "")}. ${targetModule.details}${countText}`;
        }

        return "Puedo responder sobre el proyecto, esta pantalla y los conteos guardados localmente. No tengo un servicio de IA conectado ni acceso a información fuera de la aplicación. Prueba preguntando, por ejemplo: ¿Qué hace esta página? o ¿Cuántos clientes hay?";
    }

    function suggestedQuestions(module) {
        if (module.name === "Inicio") {
            return [module.countQuestion, "¿Cómo se guardan los datos?", "¿Qué muestra esta pantalla?"];
        }
        if (module.name === "Registro de actividad") {
            return [module.createQuestion, module.countQuestion, "¿Qué módulos tiene MARQUEZA?"];
        }
        return [module.countQuestion, module.createQuestion, `¿Qué datos maneja ${module.name}?`];
    }

    function createElement(tagName, className, text) {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        if (text) element.textContent = text;
        return element;
    }

    const launcher = createElement("button", "marqueza-assistant-launcher");
    launcher.id = "marqueza-assistant-launcher";
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Abrir asistente MARQUEZA");
    launcher.setAttribute("aria-expanded", "false");
    launcher.title = "Abrir asistente";
    launcher.innerHTML = "<span class='marqueza-assistant-launcher-mark'><i class='bx bxs-message-rounded-dots' aria-hidden='true'></i><i class='bx bx-sparkles' aria-hidden='true'></i></span>";

    const panel = createElement("section", "marqueza-assistant-panel");
    panel.id = "marqueza-assistant-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-labelledby", "marqueza-assistant-title");
    panel.setAttribute("aria-modal", "false");
    panel.hidden = true;

    const header = createElement("header", "marqueza-assistant-header");
    const identity = createElement("div", "marqueza-assistant-identity");
    const avatar = createElement("span", "marqueza-assistant-avatar");
    avatar.innerHTML = "<i class='bx bxs-message-rounded-dots' aria-hidden='true'></i>";
    const heading = createElement("div", "marqueza-assistant-heading");
    const title = createElement("h2", "", "Asistente MARQUEZA");
    title.id = "marqueza-assistant-title";
    heading.append(title, createElement("p", "", "Preguntas sobre MARQUEZA"));
    identity.append(avatar, heading);
    const closeButton = createElement("button", "marqueza-assistant-close");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Cerrar asistente");
    closeButton.title = "Cerrar";
    closeButton.innerHTML = "<i class='bx bx-x' aria-hidden='true'></i>";

    const voiceToggle = createElement("button", "marqueza-assistant-voice-toggle");
    voiceToggle.type = "button";
    voiceToggle.hidden = !voiceOutputSupported;
    header.append(identity, voiceToggle, closeButton);

    const messages = createElement("div", "marqueza-assistant-messages");
    messages.setAttribute("aria-live", "polite");
    messages.setAttribute("aria-label", "Conversacion");
    const intro = createElement("div", "marqueza-assistant-intro");
    intro.append(createElement("p", "", "Hola, soy tu asistente contextual."));
    intro.append(createElement("p", "", "Pregunta por los módulos, los datos o cómo realizar una tarea."));
    const suggestions = createElement("div", "marqueza-assistant-suggestions");
    suggestedQuestions(currentModule()).forEach((suggestion) => {
        const button = createElement("button", "marqueza-assistant-suggestion", suggestion);
        button.type = "button";
        button.addEventListener("click", () => submitQuestion(suggestion));
        suggestions.appendChild(button);
    });
    intro.appendChild(suggestions);
    messages.appendChild(intro);

    const form = createElement("form", "marqueza-assistant-form");
    const status = createElement("p", "marqueza-assistant-status");
    status.setAttribute("aria-live", "polite");
    const input = createElement("input", "marqueza-assistant-input");
    input.type = "text";
    input.name = "question";
    input.placeholder = "Escribe o presiona el micrófono...";
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Escribe tu pregunta");
    const micButton = createElement("button", "marqueza-assistant-mic");
    micButton.type = "button";
    // El botón siempre queda visible, incluso sin soporte de voz: al hacer
    // clic explica por qué no está disponible en vez de desaparecer sin avisar.
    micButton.setAttribute("aria-label", "Hablarle al asistente");
    micButton.title = voiceInputSupported ? "Hablarle al asistente" : "Reconocimiento de voz no disponible en este navegador";
    micButton.innerHTML = "<i class='bx bx-microphone' aria-hidden='true'></i>";
    const sendButton = createElement("button", "marqueza-assistant-send");
    sendButton.type = "submit";
    sendButton.setAttribute("aria-label", "Enviar pregunta");
    sendButton.title = "Enviar";
    sendButton.innerHTML = "<i class='bx bx-send' aria-hidden='true'></i>";
    form.append(input, micButton, sendButton);
    panel.append(header, messages, status, form);
    document.body.append(launcher, panel);

    function addMessage(text, sender) {
        const message = createElement("p", `marqueza-assistant-message is-${sender}`, text);
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
    }

    function submitQuestion(question) {
        const value = question.trim();
        if (!value) return;
        addMessage(value, "user");
        input.value = "";
        const answer = answerQuestion(value);
        addMessage(answer, "assistant");
        speak(answer);
        input.focus();
    }

    function setOpen(isOpen) {
        panel.hidden = !isOpen;
        launcher.setAttribute("aria-expanded", String(isOpen));
        launcher.setAttribute("aria-label", isOpen ? "Cerrar asistente MARQUEZA" : "Abrir asistente MARQUEZA");
        launcher.title = isOpen ? "Cerrar asistente" : "Abrir asistente";
        if (isOpen) input.focus();
        if (!isOpen && window.speechSynthesis) window.speechSynthesis.cancel();
        if (!isOpen && isListening) recognition?.stop();
    }

    // ---- Botón para leer las respuestas en voz alta (on/off) ----
    function updateVoiceToggle() {
        voiceToggle.classList.toggle("is-active", voiceOutputEnabled);
        voiceToggle.setAttribute("aria-pressed", String(voiceOutputEnabled));
        voiceToggle.setAttribute("aria-label", voiceOutputEnabled ? "Desactivar respuestas por voz" : "Activar respuestas por voz");
        voiceToggle.title = voiceOutputEnabled ? "Respuestas por voz activadas" : "Respuestas por voz desactivadas";
        voiceToggle.innerHTML = `<i class='bx ${voiceOutputEnabled ? "bx-volume-full" : "bx-volume-mute"}' aria-hidden='true'></i>`;
    }
    updateVoiceToggle();
    voiceToggle.addEventListener("click", () => {
        voiceOutputEnabled = !voiceOutputEnabled;
        localStorage.setItem(voiceStorageKey, voiceOutputEnabled ? "on" : "off");
        updateVoiceToggle();
        if (!voiceOutputEnabled) window.speechSynthesis?.cancel();
    });

    // ---- Reconocimiento de voz (micrófono) ----
    if (voiceInputSupported) {
        recognition = new SpeechRecognitionImpl();
        recognition.lang = VOICE_LANG;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.addEventListener("start", () => {
            isListening = true;
            micButton.classList.add("is-listening");
            micButton.innerHTML = "<i class='bx bx-microphone' aria-hidden='true'></i>";
            status.textContent = "Escuchando... habla ahora.";
        });

        recognition.addEventListener("result", (event) => {
            const transcript = event.results[0][0].transcript;
            status.textContent = "";
            submitQuestion(transcript);
        });

        recognition.addEventListener("error", (event) => {
            status.textContent = "";
            const mensajes = {
                "not-allowed": "No tienes permitido el uso del micrófono. Habilítalo desde el ícono de candado en la barra de direcciones y vuelve a intentar.",
                "service-not-allowed": "El navegador bloqueó el acceso al micrófono. Revisa los permisos del sitio y vuelve a intentar.",
                "no-speech": "No te escuché. Acércate al micrófono y vuelve a intentar.",
                "audio-capture": "No se detectó un micrófono conectado. Conecta uno y vuelve a intentar.",
                "network": "El reconocimiento de voz necesita conexión a internet para funcionar. Revisa tu conexión y vuelve a intentar.",
            };
            addMessage(mensajes[event.error] || "Ocurrió un problema con el micrófono. Puedes seguir escribiendo tu pregunta mientras tanto.", "assistant");
        });

        recognition.addEventListener("end", () => {
            isListening = false;
            micButton.classList.remove("is-listening");
            status.textContent = "";
        });

        micButton.addEventListener("click", () => {
            if (panel.hidden) setOpen(true);
            if (isListening) {
                recognition.stop();
                return;
            }
            try {
                recognition.start();
            } catch {
                // ya estaba escuchando; se ignora el intento duplicado
            }
        });
    } else {
        micButton.addEventListener("click", () => {
            setOpen(true);
            addMessage("Tu navegador no admite el reconocimiento de voz que uso, o la página no se está sirviendo de forma segura (HTTPS o localhost). Prueba abrir MARQUEZA en Chrome o Edge, y desde un servidor local en vez de abrir el archivo HTML directamente con doble clic.", "assistant");
        });
    }

    launcher.addEventListener("click", () => setOpen(panel.hidden));
    closeButton.addEventListener("click", () => setOpen(false));
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        submitQuestion(input.value);
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !panel.hidden) {
            setOpen(false);
            launcher.focus();
        }
    });
})();