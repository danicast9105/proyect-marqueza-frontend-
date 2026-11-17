(function () {
    if (document.getElementById("marqueza-assistant-launcher")) return;

    const scriptUrl = document.currentScript.src;
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("asistente.css", scriptUrl).href;
    document.head.appendChild(stylesheet);

    const dataModules = [
        {
            name: "Insumos",
            key: "marqueza_insumos",
            aliases: ["insumo", "insumos", "material", "materiales"],
            description: "administra materias primas y suministros usados por el negocio",
            fields: ["nombre", "categoría", "proveedor", "cantidad", "unidad", "precio unitario", "estado"],
            details: "El resumen muestra el número de registros, insumos con stock bajo, los marcados como disponibles y el valor estimado (cantidad por precio unitario).",
            relations: ["El proveedor se selecciona desde el directorio de Proveedores."],
            statuses: ["Disponible", "Agotado", "Pedido"],
            createQuestion: "¿Cómo registro un insumo?"
        },
        {
            name: "Productos",
            key: "marqueza_productos",
            aliases: ["producto", "productos", "prenda", "prendas"],
            description: "administra el catálogo de productos y sus existencias",
            fields: ["código", "nombre", "cantidad", "precio", "estado"],
            details: "El resumen presenta referencias, productos con stock bajo, unidades disponibles y valor del catálogo. La etiqueta de stock se calcula por cantidad: Bajo hasta 5, Medio de 6 a 20 y Bueno por encima de 20.",
            relations: [],
            statuses: ["Bajo (hasta 5 unidades)", "Medio (de 6 a 20 unidades)", "Bueno (más de 20 unidades)"],
            createQuestion: "¿Cómo creo un producto?"
        },
        {
            name: "Ventas",
            key: "marqueza_ventas",
            aliases: ["venta", "ventas", "pedido", "pedidos"],
            description: "registra y consulta operaciones de venta",
            fields: ["fecha", "cliente", "producto", "cantidad", "total"],
            details: "El resumen muestra cantidad de ventas, ingresos acumulados, unidades vendidas y promedio por operación.",
            relations: ["El formulario selecciona un cliente y un producto existentes.", "El total se calcula con el precio del producto multiplicado por la cantidad."],
            createQuestion: "¿Cómo registro una venta?"
        },
        {
            name: "Cotizaciones",
            key: "marqueza_cotizaciones",
            aliases: ["cotizacion", "cotizaciones", "propuesta", "propuestas"],
            description: "crea propuestas comerciales para clientes y permite seguir su estado",
            fields: ["fecha", "cliente", "uno o más productos", "cantidad y precio unitario por producto", "total calculado", "estado", "notas"],
            details: "El historial permite buscar por cliente o producto, filtrar por estado, editar o eliminar propuestas y descargar cada cotización como PDF. El balance se calcula con los datos locales de Insumos, Productos y Ventas.",
            relations: ["Se elige un cliente y uno o más productos del catálogo.", "El total suma cantidad por precio unitario de cada producto."],
            statuses: ["Pendiente", "Enviada", "Aprobada", "Rechazada"],
            createQuestion: "¿Cómo creo una cotización?"
        },
        {
            name: "Clientes",
            key: "marqueza_clientes",
            aliases: ["cliente", "clientes"],
            description: "mantiene el directorio de contactos de clientes",
            fields: ["nombre", "documento", "teléfono", "correo"],
            details: "El resumen cuenta clientes, correos y teléfonos registrados, y calcula el porcentaje de fichas con todos sus campos completos.",
            relations: ["Los clientes registrados pueden seleccionarse al crear Ventas y Cotizaciones."],
            createQuestion: "¿Cómo registro un cliente?"
        },
        {
            name: "Proveedores",
            key: "marqueza_proveedores",
            aliases: ["proveedor", "proveedores"],
            description: "mantiene el directorio de empresas proveedoras y sus contactos",
            fields: ["empresa", "contacto", "teléfono", "correo", "dirección"],
            details: "El resumen muestra proveedores, contactos y teléfonos disponibles, y el porcentaje de fichas completas.",
            relations: ["Los proveedores registrados pueden seleccionarse al crear Insumos."],
            createQuestion: "¿Cómo registro un proveedor?"
        },
        {
            name: "Usuarios",
            key: "marqueza_usuarios",
            aliases: ["usuario", "usuarios", "cuenta", "cuentas"],
            description: "administra las cuentas y roles que pueden acceder a la aplicación",
            fields: ["nombre", "correo", "rol"],
            details: "Se pueden crear, consultar, editar y eliminar cuentas. Las contraseñas son datos privados: el asistente no las muestra ni las consulta.",
            relations: [],
            createQuestion: "¿Cómo administro los usuarios?"
        },
        {
            name: "Registro de actividad",
            key: "marqueza_bitacora",
            aliases: ["registro de actividad", "bitacora", "auditoria", "historial de actividad", "errores"],
            description: "consulta eventos de acceso, cambios de registros y errores de la aplicación",
            fields: ["fecha y hora", "persona", "evento", "módulo", "detalle"],
            details: "Permite buscar eventos, filtrar todos los eventos, cambios, accesos o errores, actualizar la vista y exportar el resultado como CSV. La bitácora local conserva hasta 500 eventos.",
            relations: [],
            createQuestion: "¿Qué registra la bitácora?"
        }
    ];

    const modules = [
        {
            name: "Inicio",
            route: "inicio",
            aliases: ["inicio", "dashboard", "panel principal", "resumen"],
            description: "muestra indicadores y gráficas sobre inventario y actividad comercial",
            fields: ["unidades en stock", "valor del inventario", "ingresos por ventas", "clientes y cotizaciones abiertas", "tendencias comerciales, inventario por categoría, actividad por módulo y estados de cotización"],
            details: "Las gráficas comparan ventas y cotizaciones de los últimos seis meses, unidades por categoría, valor de productos e insumos, cantidad de registros por módulo y estados de las cotizaciones.",
            key: null
        },
        ...dataModules.map((module) => ({ ...module, route: module.key.replace("marqueza_", "") }))
    ];
    modules.find((module) => module.name === "Registro de actividad").route = "log_errores";

    function normalize(value) {
        return String(value || "").toLowerCase().normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function hasPhrase(text, phrase) {
        return ` ${text} `.includes(` ${normalize(phrase)} `);
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
        return modules.find((module) => path.includes(normalize(module.route))) || modules[0];
    }

    function findModules(question) {
        const normalized = normalize(question);
        return modules.filter((module) => module.aliases.some((alias) => hasPhrase(normalized, alias)));
    }

    function readLocalRecords(module) {
        if (!module.key) return { state: "not-applicable", records: [] };
        try {
            const value = localStorage.getItem(module.key);
            if (value === null) return { state: "empty", records: [] };
            const records = JSON.parse(value);
            return Array.isArray(records)
                ? { state: "available", records }
                : { state: "invalid", records: [] };
        } catch (error) {
            return { state: "unavailable", records: [], error };
        }
    }

    function countRecords(module, question = "") {
        const result = readLocalRecords(module);
        if (result.state === "unavailable") return "No puedo acceder al almacenamiento local de este navegador para consultar ese conteo.";
        if (result.state === "invalid") return `Los datos locales de ${module.name} no tienen el formato esperado, así que no puedo confirmar el conteo.`;
        const normalized = normalize(question);
        const records = module.name === "Cotizaciones" && /\b(abiertas|activas|vigentes)\b/.test(normalized)
            ? result.records.filter((quote) => quote.estado !== "Rechazada")
            : result.records;
        const count = records.length;
        if (module.name === "Cotizaciones" && records !== result.records) {
            return `Hay ${count} cotizaciones abiertas o activas (se excluyen las rechazadas).`;
        }
        const labels = {
            Insumos: ["insumo", "insumos"],
            Productos: ["producto", "productos"],
            Ventas: ["venta", "ventas"],
            Cotizaciones: ["cotización", "cotizaciones"],
            Clientes: ["cliente", "clientes"],
            Proveedores: ["proveedor", "proveedores"],
            Usuarios: ["usuario", "usuarios"],
            "Registro de actividad": ["evento", "eventos"]
        };
        const label = labels[module.name][count === 1 ? 0 : 1];
        const feminine = module.name === "Ventas" || module.name === "Cotizaciones";
        const participle = feminine
            ? count === 1 ? "guardada" : "guardadas"
            : count === 1 ? "guardado" : "guardados";
        return `Hay ${count} ${label} ${participle} en este navegador${result.state === "empty" ? "; todavía no hay registros" : ""}.`;
    }

    function inventoryAnswer(module, question) {
        const result = readLocalRecords(module);
        if (result.state === "unavailable") return `No puedo consultar el inventario de ${module.name} en el almacenamiento local de este navegador.`;
        if (result.state === "invalid") return `Los datos locales de ${module.name} no tienen el formato esperado, así que no puedo calcular el inventario.`;
        const records = result.records;
        const units = records.reduce((total, item) => total + Number(item.cantidad || 0), 0);
        const unitValue = module.name === "Insumos" ? "precioUnitario" : "precio";
        const value = records.reduce((total, item) => total + Number(item.cantidad || 0) * Number(item[unitValue] || 0), 0);
        const lowStock = records.filter((item) => Number(item.cantidad) <= 5).length;
        const normalized = normalize(question);
        if (/\b(bajo|bajos|baja|bajas)\b/.test(normalized)) {
            return `Hay ${lowStock} ${module.name.toLowerCase()} con stock bajo (5 unidades o menos).`;
        }
        if (/\b(valor|costo|precio)\b/.test(normalized)) {
            const money = Number(value || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
            return `El valor estimado del inventario de ${module.name.toLowerCase()} es ${money}, calculado como cantidad por precio guardado localmente.`;
        }
        const lowStockText = lowStock === 1 ? "1 tiene" : `${lowStock} tienen`;
        return `Hay ${units} unidades en ${records.length} registros de ${module.name.toLowerCase()}; ${lowStockText} stock bajo (5 unidades o menos).`;
    }

    function dashboardCounts() {
        const results = dataModules.map((module) => ({ module, result: readLocalRecords(module) }));
        const unavailable = results.find(({ result }) => result.state === "unavailable" || result.state === "invalid");
        if (unavailable) {
            return `No puedo resumir todos los módulos: no pude leer los datos de ${unavailable.module.name} en este navegador.`;
        }
        return `Inicio reúne estos registros locales: ${results.map(({ module, result }) => `${module.name}: ${result.records.length}`).join("; ")}.`;
    }

    function dashboardSummary() {
        const results = dataModules.map((module) => ({ module, result: readLocalRecords(module) }));
        const unavailable = results.find(({ result }) => result.state === "unavailable" || result.state === "invalid");
        if (unavailable) {
            return `No puedo calcular los indicadores ahora: no pude leer los datos de ${unavailable.module.name} en este navegador.`;
        }
        const records = Object.fromEntries(results.map(({ module, result }) => [module.name, result.records]));
        const sum = (items, field) => items.reduce((total, item) => total + Number(item[field] || 0), 0);
        const stock = sum(records.Productos, "cantidad");
        const inventoryValue = records.Productos.reduce((total, item) => total + Number(item.cantidad || 0) * Number(item.precio || 0), 0);
        const supplyValue = records.Insumos.reduce((total, item) => total + Number(item.cantidad || 0) * Number(item.precioUnitario || 0), 0);
        const sales = sum(records.Ventas, "total");
        const openQuotes = records.Cotizaciones.filter((quote) => quote.estado !== "Rechazada").length;
        const money = (value) => Number(value || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
        return `Según los datos locales de este navegador: ${stock} unidades en productos; valor estimado de productos e insumos ${money(inventoryValue + supplyValue)}; ventas registradas por ${money(sales)}; ${records.Clientes.length} clientes; ${openQuotes} cotizaciones no rechazadas. Estos indicadores reflejan los registros guardados aquí.`;
    }

    function moduleOverview(module) {
        const fields = module.fields?.length ? ` Los datos que maneja incluyen ${module.fields.join(", ")}.` : "";
        const details = module.details ? ` ${module.details}` : "";
        const relations = module.relations?.length ? ` ${module.relations.join(" ")}` : "";
        const statusNote = module.name === "Insumos"
            ? " El formulario permite guardar estado Disponible, Agotado o Pedido; el indicador visible en la tabla se calcula por cantidad: Bajo hasta 5, Medio de 6 a 20 y Bueno por encima de 20."
            : module.name === "Productos"
                ? " La etiqueta de estado y los filtros de stock se calculan por cantidad: Bajo hasta 5, Medio de 6 a 20 y Bueno por encima de 20."
                : "";
        return `${module.name}: ${module.description}.${fields}${details}${relations}${statusNote}`;
    }

    function moduleWorkflow(module, intent) {
        if (module.name === "Inicio" || module.name === "Registro de actividad") {
            return `${module.name} es principalmente de consulta; no tiene un formulario para crear esos registros. ${module.name === "Inicio" ? "Usa sus tarjetas y gráficas para revisar inventario, ventas y cotizaciones." : "En Registro de actividad puedes buscar, filtrar todos los eventos, cambios, accesos o errores, actualizar la vista y exportar el resultado como CSV. La bitácora local conserva hasta 500 eventos."}`;
        }
        const create = {
            Insumos: "Pulsa «Nuevo insumo», completa nombre, categoría, proveedor, cantidad, unidad, precio unitario y estado, y guarda. La cantidad debe ser al menos 1 y el precio no puede ser negativo.",
            Productos: "Pulsa «Nuevo producto», completa código, nombre, cantidad, precio y estado, y guarda. El módulo incluye filtros por nivel de stock; la categoría se puede filtrar cuando está disponible en los registros.",
            Ventas: "Pulsa «Nueva venta», selecciona fecha, cliente y producto, indica cantidad y guarda. El total se calcula automáticamente según el precio del producto y la cantidad.",
            Cotizaciones: "Pulsa «Nueva cotización», elige fecha y cliente, agrega uno o más productos, indica cantidad y precio unitario, revisa el total calculado, elige estado y guarda. Las notas son opcionales.",
            Clientes: "Pulsa «Nuevo cliente», completa nombre, documento, teléfono y correo, y guarda.",
            Proveedores: "Pulsa «Nuevo proveedor», completa empresa, contacto, teléfono, correo y dirección, y guarda.",
            Usuarios: "En el módulo Usuarios, pulsa «Nuevo usuario», completa nombre, correo, rol, contraseña y confirmación, y guarda. No compartas contraseñas con el asistente.",
        }[module.name];
        if (intent === "create") return create;
        if (intent === "edit") return `Para editar un registro de ${module.name}, localízalo en la tabla y usa el botón de edición de su fila. Modifica los campos y guarda los cambios.${module.name === "Usuarios" ? " Al editar una cuenta, deja la contraseña nueva vacía si no quieres cambiarla." : ""}`;
        if (intent === "delete") return `En ${module.name}, localiza la fila del registro y pulsa el botón de eliminar. La aplicación solicita confirmar la acción; eliminar no se puede deshacer.`;
        if (intent === "search") {
            const search = {
                Insumos: "Puedes buscar por nombre, categoría o unidad; también filtrar por categoría y nivel de stock.",
                Productos: "Puedes buscar por código, nombre o categoría; también filtrar por categoría y nivel de stock.",
                Ventas: "Puedes buscar por cliente, producto o fecha.",
                Cotizaciones: "Puedes buscar por cliente o producto, y filtrar por estado.",
                Clientes: "Puedes buscar por nombre, documento, teléfono o correo.",
                Proveedores: "Puedes buscar por empresa, contacto, teléfono o correo.",
                Usuarios: "Puedes buscar por nombre o correo.",
            }[module.name];
            return `${module.name}: ${search}`;
        }
        if (intent === "export") {
            const exportInfo = {
                Insumos: "El botón «Exportar» descarga la tabla como PDF.",
                Productos: "El botón «Exportar» descarga la tabla como PDF.",
                Ventas: "El botón «Exportar» genera un archivo CSV.",
                Cotizaciones: "Cada cotización tiene una acción para descargarla como PDF; no hay una exportación global de la lista.",
                Clientes: "El botón «Exportar» genera un archivo CSV.",
                Proveedores: "El botón «Exportar» genera un archivo CSV.",
                Usuarios: "El módulo Usuarios no incluye un botón de exportación.",
            }[module.name];
            return `${module.name}: ${exportInfo}`;
        }
        return create;
    }

    function answerQuestion(question) {
        const normalized = normalize(question);
        const explicitModules = findModules(question);
        const activeModule = currentModule();
        const module = explicitModules.length === 1 ? explicitModules[0] : activeModule;

        if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey)$/.test(normalized)) {
            return "Hola. Puedo ayudarte con funciones, campos, relaciones, búsqueda, exportación y datos locales de MARQUEZA. ¿Qué quieres consultar?";
        }

        if (/\b(?:ver|mostrar|revelar|decir|dime|cual es|que tiene)\b.*\b(contrasena|clave|password)\b/.test(normalized)
            || /\b(contrasena|clave|password)\b.*\b(?:de|del|para)\s+[a-z0-9]+\b/.test(normalized)) {
            return "No puedo mostrar ni recuperar contraseñas o credenciales. Si necesitas cambiar una, usa el módulo Usuarios o solicita ayuda a un administrador; nunca compartas una contraseña en el chat.";
        }

        if (/\b(requisitos|reglas|validacion|validaciones)\b.*\b(contrasena|clave)\b/.test(normalized)) {
            return "En el formulario de registro, la contraseña debe tener al menos 8 caracteres, una letra mayúscula, una minúscula y un número; la confirmación debe coincidir. El nombre de usuario acepta entre 3 y 20 letras o números, y debes elegir un rol.";
        }

        if (/\b(tecnologia|tecnologias|lenguaje|lenguajes|framework)\b/.test(normalized)) {
            return "La interfaz de este proyecto está implementada con HTML, CSS y JavaScript. En los archivos revisados, los módulos de gestión guardan datos en localStorage; el repositorio frontend no permite confirmar qué backend o servidor se usa.";
        }

        if (/\b(modulos|que es marqueza|sobre el proyecto|que hace el sistema|que hace marqueza|funciones del sistema)\b/.test(normalized)) {
            return "MARQUEZA reúne Inicio, Insumos, Productos, Ventas, Cotizaciones, Clientes, Proveedores, Usuarios y Registro de actividad. Desde esos módulos puedes consultar indicadores, gestionar inventario y contactos, registrar ventas y cotizaciones, administrar accesos y revisar eventos de la aplicación.";
        }

        if (/\b(donde se guardan|donde guarda|almacenamiento|localstorage|se sincroniza|servidor|backend|api|mysql|flask)\b/.test(normalized)) {
            return "En el frontend revisado, los registros de los módulos se leen y guardan en localStorage del navegador. Eso significa que los datos dependen de este navegador y perfil; no puedo confirmar sincronización con un servidor o backend desde este proyecto frontend.";
        }

        if (/\b(modo oscuro|tema oscuro|cambiar tema|modo claro)\b/.test(normalized)) {
            return "Usa el interruptor de tema en la barra lateral para alternar entre modo claro y oscuro. La preferencia se guarda en este navegador.";
        }

        if (/\b(cerrar sesion|salir de la cuenta|desconectarme|cerrar mi cuenta)\b/.test(normalized)) {
            return "Usa «Salir» en la barra lateral para cerrar la sesión activa y volver a la pantalla de inicio de sesión.";
        }

        if (/\b(olvide mi contrasena|recuperar contrasena|restablecer contrasena|reestablecer contrasena|perdi mi clave|cambiar mi contrasena)\b/.test(normalized)) {
            return "La pantalla de recuperación verifica el correo y, si encuentra la cuenta, registra una solicitud local. No cambia la contraseña automáticamente; contacta a un administrador para restablecerla. No envíes tu contraseña por este chat.";
        }

        if (/\b(microfono|reconocimiento de voz|hablarle al asistente)\b/.test(normalized)) {
            if (!voiceInputSupported) {
                return "El reconocimiento de voz no está disponible en este navegador o contexto. Prueba con Chrome o Edge desde HTTPS o localhost; también puedes escribir tu pregunta.";
            }
            return "Pulsa el botón del micrófono y concede permiso al navegador. El reconocimiento de voz requiere un contexto seguro y puede necesitar conexión a internet; si falla, puedes escribir la pregunta.";
        }

        if (/\b(voz|leer en voz alta|respuesta hablada)\b/.test(normalized)) {
            return voiceOutputSupported
                ? "El botón de volumen del encabezado activa o desactiva la lectura de respuestas. La preferencia se guarda en este navegador."
                : "Este navegador no ofrece lectura de respuestas por voz; puedes usar el chat escribiendo tus preguntas.";
        }

        if (/\b(no veo mis datos|se borraron mis datos|desaparecieron los registros|no aparecen los registros|perdi mi informacion|se perdio la informacion|no carga la tabla|tabla vacia)\b/.test(normalized)) {
            return "Los registros se guardan localmente en el navegador. Comprueba que estés usando el mismo navegador y perfil, y que no hayas borrado sus datos. Si el problema continúa, consulta Registro de actividad; no limpies los datos del navegador si necesitas conservar registros.";
        }

        if (/\b(no puedo guardar|no me deja guardar|no guarda el registro|no se guarda|campos incompletos|no se envia el formulario)\b/.test(normalized)) {
            return `Revisa los campos obligatorios y los valores válidos del formulario de ${module.name}. En los módulos de gestión, los registros se guardan localmente; si sigue fallando, anota el mensaje y revisa Registro de actividad.`;
        }

        if (/\b(menu hamburguesa|barra lateral no aparece|menu no aparece|no veo el menu)\b/.test(normalized)) {
            return "En pantallas pequeñas, pulsa el botón de menú en la parte superior para abrir o cerrar la navegación. En pantallas grandes, usa la flecha lateral para expandir o contraerla.";
        }

        if (/\b(iniciar sesion|no me deja entrar|no inicia sesion|usuario no registrado|contrasena incorrecta|error de acceso)\b/.test(normalized)) {
            return "El inicio de sesión valida el nombre de usuario y la contraseña contra las cuentas locales de este navegador. Verifica esos datos; si no existe la cuenta, usa el formulario de registro disponible o pide ayuda a un administrador. No compartas credenciales por el chat.";
        }

        if (/\b(editar|edito|actualizar|actualizo|modificar|modifico|cambiar)\b/.test(normalized)) return moduleWorkflow(module, "edit");
        if (/\b(eliminar|elimino|borrar|borro|quitar)\b/.test(normalized)) return moduleWorkflow(module, "delete");
        if (/\b(buscar|busco|busca|filtro|filtrar|no encuentro)\b/.test(normalized)) return moduleWorkflow(module, "search");
        if (/\b(exportar|exporto|exporta|descargar|descargo|descarga|pdf|csv)\b/.test(normalized)) return moduleWorkflow(module, "export");

        if (/\b(relacion|relaciona|relacionan|vinculo|vincula|asocia|depende)\b/.test(normalized)) {
            if (explicitModules.length > 1) {
                const relations = explicitModules.flatMap((item) => item.relations || []);
                return relations.length
                    ? [...new Set(relations)].join(" ")
                    : `No encontré una relación directa documentada entre ${explicitModules.map((item) => item.name).join(" y ")}.`;
            }
            return module.relations?.length
                ? module.relations.join(" ")
                : `No encontré una relación directa documentada para ${module.name}.`;
        }

        if (/\b(estado|estados|pendiente|enviada|aprobada|rechazada|disponible|agotado|pedido)\b/.test(normalized) && module.statuses) {
            if (module.name === "Insumos") {
                return "En el formulario de Insumos puedes elegir Disponible, Agotado o Pedido. La etiqueta de la tabla y los filtros de stock son calculados por cantidad: Bajo hasta 5, Medio de 6 a 20 y Bueno por encima de 20.";
            }
            return `${module.name} maneja estos estados o niveles: ${module.statuses.join(", ")}.`;
        }

        if (/\b(indicador|indicadores|metrica|metricas|grafica|graficas|resumen|valor del inventario|ingresos|stock|cotizaciones abiertas)\b/.test(normalized) && module.name === "Inicio") {
            return dashboardSummary();
        }

        if (/\b(cuantos|cuantas|cuanto|cuanta|total|cantidad|numero|registros)\b/.test(normalized)
            || (/\b(hay|existen)\b/.test(normalized) && explicitModules.length > 0 && !/\b(datos|campos|informacion|detalles)\b/.test(normalized))) {
            if (explicitModules.length > 1) return explicitModules.map((item) => countRecords(item, question)).join(" ");
            if (module.name === "Inicio") return dashboardCounts();
            if ((module.name === "Productos" || module.name === "Insumos") && /\b(stock|unidades|existencias|inventario|bajo|bajos)\b/.test(normalized)) {
                return inventoryAnswer(module, question);
            }
            return countRecords(module, question);
        }

        if (explicitModules.length > 1 && !/\b(comparar|diferencia|relacion|relacionan|vinculo)\b/.test(normalized)) {
            return `Mencionaste varios módulos (${explicitModules.map((item) => item.name).join(", ")}). ¿Sobre cuál quieres saber más?`;
        }

        if (/\b(datos|campos|informacion|incluye|contiene|maneja|guarda|almacena)\b/.test(normalized)) {
            return moduleOverview(module);
        }

        if (/\b(que hace|que puedo hacer|que hay en|esta pagina|esta pantalla|para que sirve|funciona)\b/.test(normalized)) {
            return moduleOverview(module);
        }

        if (/\b(crear|creo|agregar|agrego|anadir|registro|registrar|nuevo|nueva|guardar)\b/.test(normalized)) {
            return moduleWorkflow(module, "create");
        }

        if (explicitModules.length === 1) return moduleOverview(module);

        if (/\b(problema|error|no funciona|algo fallo|no carga)\b/.test(normalized)) {
            return "Cuéntame qué módulo usabas, qué acción intentabas realizar y qué mensaje apareció. Puedes revisar Registro de actividad para consultar errores y eventos de acceso; no compartas contraseñas ni datos privados.";
        }

        return "Puedo orientar sobre los módulos, sus campos y funciones, y consultar conteos locales. No uso un servicio de IA ni puedo acceder a datos fuera de este navegador. Indica el módulo y qué necesitas saber; por ejemplo: «¿Qué campos tiene Clientes?» o «¿Cómo exporto Cotizaciones?»";
    }

    function suggestedQuestions(module) {
        if (module.name === "Inicio") {
            return ["¿Qué módulos tiene MARQUEZA?", "¿Qué indicadores muestra Inicio?", "¿Dónde se guardan los datos?"];
        }
        return [
            `¿Qué campos maneja ${module.name}?`,
            module.name === "Registro de actividad" ? "¿Cómo filtro los eventos?" : `¿Cómo registro ${module.name === "Insumos" ? "un insumo" : module.name === "Productos" ? "un producto" : module.name === "Ventas" ? "una venta" : module.name === "Cotizaciones" ? "una cotización" : module.name === "Clientes" ? "un cliente" : module.name === "Proveedores" ? "un proveedor" : "un usuario"}?`,
            `¿Cuántos ${module.name === "Registro de actividad" ? "eventos" : module.name.toLowerCase()} hay?`
        ];
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
    intro.append(createElement("p", "", "Pregunta por las funciones, campos, procesos o conteos locales. No consulto datos externos ni contraseñas."));
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