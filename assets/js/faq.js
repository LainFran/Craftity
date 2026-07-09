// ================= ASSETS/JS/FAQ.JS (ACORDEÓN DE PREGUNTAS FRECUENTES, AISLADO DEL VISOR 3D) =================
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('faqAccordion');
    if (!container) return; // Si esta sección no existe en la página, no hacemos nada más

    // ================= CONTENIDO: 5 PREGUNTAS PRINCIPALES + 3 RELACIONADAS CADA UNA =================
    const FAQ_DATA = [
        {
            q: "¿Qué es una skin de Minecraft?",
            a: "En Craftity creemos que una skin es más que una simple textura: es la identidad de tu personaje dentro del juego. Es la forma en la que decides mostrarte —o mostrar a quien quieras ser— frente a otros jugadores, y tú tienes el control total sobre cómo se ve.",
            link: "https://www.minecraft.net/es-es/article/what-is-minecraft-skin",
            related: [
                { q: "¿Puedo crear una skin totalmente original o debo basarme en una plantilla?", a: "¡Totalmente original! En nuestro Skin Studio puedes empezar desde una plantilla en blanco y dibujar cada píxel a tu gusto, sin ninguna base obligatoria." },
                { q: "¿Qué partes del cuerpo puedo personalizar en una skin?", a: "Cabeza, torso, brazos y piernas, además de una capa extra (Overlay) para detalles como sombreros, chaquetas o accesorios que sobresalen del cuerpo base." },
                { q: "¿Las skins afectan el gameplay o solo la apariencia?", a: "Solo la apariencia. Una skin no cambia tu velocidad, resistencia ni ninguna estadística — es 100% estético." }
            ]
        },
        {
            q: "¿Cómo instalo o aplico una skin en el juego?",
            a: "Depende de tu versión: si tienes Minecraft Premium (Java Edition), subes el PNG directo desde el launcher oficial, en tu perfil. Si usas launchers alternativos como TLauncher, SKLauncher o Legacy Launcher, cada uno trae su propio gestor de skins integrado. Y si juegas Bedrock (móvil, consola, Windows), el cambio se hace desde el propio menú de personajes del juego, no desde un launcher externo.",
            link: "https://help.minecraft.net/hc/en-us/articles/4408894664461-Minecraft-Java-Edition-Skins",
            related: [
                { q: "¿Cuál es la diferencia entre instalar una skin en Java y en Bedrock?", a: "En Java subes el archivo PNG desde el launcher o la web de Minecraft.net. En Bedrock se hace directo desde el menú 'Dressing Room' dentro del juego, sin salir a ningún sitio externo." },
                { q: "¿Cómo cambio mi skin en TLauncher o SKLauncher?", a: "Cada launcher tiene su propio gestor de cuenta y skins integrado — busca la pestaña de perfil o cuenta dentro del launcher y ahí encontrarás la opción de subir tu PNG." },
                { q: "¿Necesito una cuenta Premium para usar skins personalizadas?", a: "No necesariamente. Los launchers alternativos permiten cargar skins personalizadas sin cuenta Premium, aunque algunas funciones oficiales de Mojang sí la requieren." }
            ]
        },
        {
            q: "¿Cuál es la diferencia entre el modelo Default (Steve) y Slim (Alex)?",
            a: "La diferencia está en el ancho de los brazos: el modelo Default tiene brazos de 4 píxeles, mientras que el Slim los tiene más delgados, de 3 píxeles. Es solo una elección estética — puedes probar ambos directamente en nuestro Visor de Vista Previa antes de decidir.",
            link: "https://minecraft.wiki/w/Skin",
            related: [
                { q: "¿Cómo sé qué modelo usa mi skin actual?", a: "Míralo en nuestro Visor de Vista Previa: si los brazos se ven finos y algo desalineados es porque está pensada para Slim, no Default." },
                { q: "¿Puedo cambiar de Steve a Alex sin perder mi diseño?", a: "Sí, pero el ancho del brazo cambia, así que el diseño de esa zona puede desalinearse un poco. Te recomendamos revisar el brazo tras el cambio." },
                { q: "¿Por qué mi skin se ve deformada en un modelo pero no en el otro?", a: "Porque cada modelo usa una región distinta de píxeles para los brazos. Si tu textura fue pensada para Default y la usas en Slim (o viceversa), esos píxeles no encajan del todo." }
            ]
        },
        {
            q: "¿Cómo diseño mi propia skin desde cero?",
            a: "En nuestro Skin Studio puedes dibujar tu skin píxel por píxel directamente desde el navegador, sin instalar nada. Entra a la sección Skin Studio, elige una plantilla en blanco (o carga una existente para editarla) y empieza a pintar cada parte del cuerpo con las herramientas de color y capas.",
            link: "pages/studio.html",
            related: [
                { q: "¿Necesito saber dibujar pixel art para crear una buena skin?", a: "No es obligatorio. Nuestro Skin Studio tiene herramientas de color y capas que facilitan el proceso, aunque como en cualquier arte, la práctica ayuda a pulir el resultado." },
                { q: "¿Puedo editar una skin que ya descargué en vez de crear una desde cero?", a: "Sí, puedes cargarla en el Skin Studio y modificarla como prefieras, en vez de empezar desde una plantilla en blanco." },
                { q: "¿Cómo guardo o exporto mi skin terminada?", a: "Desde el Skin Studio puedes descargar tu creación como PNG, listo para subir a tu launcher o cuenta de Minecraft." }
            ]
        },
        {
            q: "Mi skin no se ve bien o no carga — ¿qué hago?",
            a: "El problema más común es confundir la capa Base (Body) con la capa Overlay (la \"ropa\" extra, como chaquetas o sombreros). Si tu skin se ve con partes transparentes o duplicadas, revisa en nuestro Visor que ambas capas estén activadas. También confirma que tu imagen sea PNG y tenga el tamaño correcto.",
            link: "pages/learn.html",
            related: [
                { q: "¿Por qué mi skin se ve como un bloque gris en el juego?", a: "Casi siempre es porque el archivo no cargó correctamente o no tiene el formato PNG esperado. Revisa que el tamaño de imagen sea el correcto." },
                { q: "¿Qué tamaño de imagen debe tener mi skin, 64x64 o 64x32?", a: "El formato moderno es 64x64 píxeles. El formato antiguo de 64x32 sigue funcionando, pero no incluye la capa Overlay completa." },
                { q: "¿Por qué la capa Overlay de mi skin no se ve en el juego?", a: "Puede estar desactivada. Revisa el panel de Visibilidad de Capas en nuestro Visor y asegúrate de que el interruptor de Overlay esté encendido." }
            ]
        }
    ];

    // ================= CONSTRUCTOR DE UN BLOQUE DE PREGUNTA (REUTILIZABLE PARA NIVEL 1 Y NIVEL 2) =================
    const crearPreguntaEl = (item, esRelacionada) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'faq-item';

        // --- La pregunta: todo el bloque es clickeable para plegar/desplegar ---
        const preguntaEl = document.createElement('div');
        preguntaEl.className = 'faq-question';
        preguntaEl.setAttribute('role', 'button');
        preguntaEl.setAttribute('tabindex', '0');
        preguntaEl.innerHTML = `<img src="assets/images/book.png" alt="" class="faq-q-icon"><span class="faq-q-text">${item.q}</span>`;

        // --- El panel desplegable (respuesta + portal + relacionadas) ---
        const panelEl = document.createElement('div');
        panelEl.className = 'faq-panel';

        const innerEl = document.createElement('div');
        innerEl.className = 'faq-panel-inner';

        const answerEl = document.createElement('p');
        answerEl.className = 'faq-answer';
        answerEl.textContent = item.a;
        innerEl.appendChild(answerEl);

        // El portal solo aparece si esta pregunta tiene link (las 5 principales, nunca las relacionadas)
        if (item.link) {
            const portalEl = document.createElement('a');
            portalEl.className = 'faq-portal-link';
            portalEl.href = item.link;
            portalEl.target = '_blank';
            portalEl.rel = 'noopener noreferrer';
            portalEl.title = 'Ver más sobre este tema';

            const imgEl = document.createElement('img');
            imgEl.src = 'assets/images/portal_nether.gif';
            imgEl.alt = 'Portal: ver más';
            imgEl.className = 'faq-portal-gif';

            portalEl.appendChild(imgEl);
            innerEl.appendChild(portalEl);
        }

        panelEl.appendChild(innerEl);

        // Las relacionadas solo se generan para preguntas de nivel 1 (nunca anidamos un tercer nivel)
        if (!esRelacionada && Array.isArray(item.related) && item.related.length > 0) {
            const relatedWrap = document.createElement('div');
            relatedWrap.className = 'faq-related';
            item.related.forEach(rel => {
                relatedWrap.appendChild(crearPreguntaEl(rel, true));
            });
            panelEl.appendChild(relatedWrap);
        }

        // --- Toggle: clic (o Enter/Espacio con teclado) abre/cierra SOLO este bloque, no afecta a sus hermanos ---
        const alternar = () => wrapper.classList.toggle('open');
        preguntaEl.addEventListener('click', alternar);
        preguntaEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                alternar();
            }
        });

        wrapper.appendChild(preguntaEl);
        wrapper.appendChild(panelEl);
        return wrapper;
    };

    // ================= RENDERIZADO FINAL: LAS 5 PRINCIPALES EN EL CONTENEDOR =================
    FAQ_DATA.forEach(item => {
        container.appendChild(crearPreguntaEl(item, false));
    });
});