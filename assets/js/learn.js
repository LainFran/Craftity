// =========================================================================
// CRAFTIDENTITY - ASSETS/JS/LEARN.JS (VERSIÓN CONSOLIDADA Y SEGURA)
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // PARTE 1: PROTECCIÓN Y RUTAS DINÁMICAS
    const container = document.getElementById('faqAccordion');
    if (!container) return; 

    const esCarpetaPages = window.location.pathname.includes('/pages/');
    const prefijoRuta = esCarpetaPages ? '../' : '';
    
    // PARTE 2: BASE DE DATOS DE PREGUNTAS EXCLUSIVAS DEL LEARN CENTER
    const LEARN_DATA = [
        {
            id: "tutorial-capas",
            q: "¿Cómo funciona la Segunda Capa (Outer Layer / Overlay)?",
            a: "Todas las skins modernas de Minecraft admiten dos capas de píxeles por cada parte del cuerpo. La capa Base (Body) es el cuerpo del personaje. La Segunda Capa (Overlay) flota ligeramente por encima de la base. Es perfecta para añadir volumen 3D como chaquetas, capuchas, gafas, relieves en el calzado o mechones de cabello.",
            categoria: "experto"
        },
        {
            id: "tutorial-formatos",
            q: "¿Cuál es la diferencia entre los modelos Classic (Steve) y Slim (Alex)?",
            a: "La única diferencia técnica radica en el ancho de los brazos. El modelo Clásico o Default (Steve) posee brazos con un grosor de 4 píxeles de ancho. El modelo Delgado o Slim (Alex) reduce el grosor de los brazos a 3 píxeles de ancho. El torso y las piernas miden exactamente lo mismo en ambos modelos.",
            categoria: "novato"
        },
        {
            id: "tutorial-sombreado",
            q: "¿Qué es el Shading o Sombreado de píxeles?",
            a: "Aprende el arte de dar volumen. El sombreado es la técnica que hace que una skin pase de verse plana a verse tridimensional y detallada. Consiste en alterar levemente la luminosidad de un mismo color en los píxeles contiguos para simular la incidencia de la luz, creando pliegues en la ropa.",
            categoria: "experto"
        },
        {
            id: "tutorial-importar",
            q: "¿Cómo exporto e instalo mi skin terminada en el juego?",
            a: "Una vez que termines de editar en nuestro Skin Studio, debes descargar el diseño en formato de imagen PNG (asegúrate de que mantenga la transparencia). Abre el Launcher oficial de Minecraft, ve a la pestaña 'Skins' o 'Aspectos', busca tu archivo PNG descargado y presiona guardar.",
            categoria: "novato"
        }
    ];

    // PARTE 3: FÁBRICA CONSTRUCTORA DE ACORDEONES (RENDER)
    const crearBloqueAcordeon = (item) => {
        const itemWrap = document.createElement('div');
        itemWrap.className = 'faq-item';
        if (item.id) itemWrap.id = item.id; 

        const botonPregunta = document.createElement('div');
        botonPregunta.className = 'faq-question';
        botonPregunta.setAttribute('role', 'button');
        botonPregunta.setAttribute('tabindex', '0');
        
        botonPregunta.innerHTML = `
            <img src="${prefijoRuta}assets/images/book.png" alt="Libro" class="faq-q-icon">
            <span class="faq-q-text">${item.q}</span>
        `;

        const panelRespuesta = document.createElement('div');
        panelRespuesta.className = 'faq-panel';

        const contenidoInterno = document.createElement('div');
        contenidoInterno.className = 'faq-panel-inner';

        const textoRespuesta = document.createElement('p');
        textoRespuesta.className = 'faq-answer';
        textoRespuesta.textContent = item.a;

        contenidoInterno.appendChild(textoRespuesta);
        panelRespuesta.appendChild(contenidoInterno);

        const conmutarAcordeon = () => {
            itemWrap.classList.toggle('open');
        };

        botonPregunta.addEventListener('click', conmutarAcordeon);
        botonPregunta.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                conmutarAcordeon();
            }
        });

        itemWrap.appendChild(botonPregunta);
        itemWrap.appendChild(panelRespuesta);
        
        return itemWrap;
    };

    // PARTE 4: INYECCIÓN DE DATOS EN EL CONTENEDOR DEL HTML
    container.innerHTML = '';

    LEARN_DATA.forEach(pregunta => {
        const bloqueHTML = crearBloqueAcordeon(pregunta);
        container.appendChild(bloqueHTML);
    });

    console.log(`Renderizado completado con éxito. Se inyectaron ${LEARN_DATA.length} acordeones de ayuda.`);
});
