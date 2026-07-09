// ================= ASSETS/JS/STUDIO.JS (SKIN STUDIO - FASE 2: MOTOR 2D + PINCEL/BORRADOR) =================
// Este archivo está separado de viewer3d.js (Preview) y de faq.js a propósito,
// mismo criterio que ya usamos en el resto del sitio: cada sección, su propio script aislado.
document.addEventListener('DOMContentLoaded', () => {
    const viewerContainer = document.getElementById('studioViewerContainer');
    const viewport2D = document.getElementById('studio2DViewport');
    const btnView3D = document.getElementById('studioBtnView3D');
    const btnView2D = document.getElementById('studioBtnView2D');
    const canvas3D = document.getElementById('studioCanvas3D');
    const canvas2D = document.getElementById('studioCanvas2D');
    const btnZoomIn = document.getElementById('studioBtnZoomIn');
    const btnZoomOut = document.getElementById('studioBtnZoomOut');
    const toolBrushBtn = document.getElementById('toolBrush');
    const toolEraserBtn = document.getElementById('toolEraser');
    const toolEyedropperBtn = document.getElementById('toolEyedropper');
    const toolMarkerBtn = document.getElementById('toolMarker');
    const toolGradientBtn = document.getElementById('toolGradient');
    const toolBucketBtn = document.getElementById('toolBucket');
    const toolLightenBtn = document.getElementById('toolLighten');
    const toolDarkenBtn = document.getElementById('toolDarken');
    const btnUndo = document.getElementById('btnUndo');
    const btnRedo = document.getElementById('btnRedo');
    const btnComplexionDefault = document.getElementById('studioBtnComplexionDefault');
    const btnComplexionSlim = document.getElementById('studioBtnComplexionSlim');
    const colorPicker = document.getElementById('studioColorPicker');
    const paletteGrid = document.getElementById('studioPaletteGrid');
    const rgbInputR = document.getElementById('rgbInputR');
    const rgbInputG = document.getElementById('rgbInputG');
    const rgbInputB = document.getElementById('rgbInputB');
    const rgbPreviewSwatch = document.getElementById('rgbPreviewSwatch');
    let modoActual3D = false; // Compartida entre el toggle y los botones de zoom

    // ================= TOGGLE VISUAL 3D / 2D =================
    if (btnView3D && btnView2D && canvas3D && viewport2D) {
        btnView3D.addEventListener('click', () => {
            btnView3D.classList.add('active');
            btnView2D.classList.remove('active');
            canvas3D.style.display = 'block';
            viewport2D.style.display = 'none';
            modoActual3D = true;
        });

        btnView2D.addEventListener('click', () => {
            btnView2D.classList.add('active');
            btnView3D.classList.remove('active');
            viewport2D.style.display = 'flex';
            canvas3D.style.display = 'none';
            modoActual3D = false;
        });
    }

    // ================= FASE 2/5: MOTOR 2D Y 3D (COMPARTEN EL MISMO LIENZO DE DATOS) =================
    if (canvas2D && viewport2D && viewerContainer && canvas3D) {
        const TEX_SIZE = 64;
        const ZOOM_MIN = 1;
        const ZOOM_MAX = 30;
        let zoom = 1;
        let herramientaActual = 'brush';
        let colorActual = colorPicker ? colorPicker.value : '#3C8527';
        let isPainting = false;
        let lastPixel = null;

        // --- Canvas de datos: la fuente real de la textura (64x64), nunca se muestra directamente ---
        // Este es el mismo tamaño que el PNG final, así que sirve tal cual para la Fase 7 (Descargar Skin)
        // y para la Fase 5 (motor 3D), sin necesidad de convertir nada.
        const dataCanvas = document.createElement('canvas');
        dataCanvas.width = TEX_SIZE;
        dataCanvas.height = TEX_SIZE;
        const dataCtx = dataCanvas.getContext('2d');
        dataCtx.imageSmoothingEnabled = false;

        const displayCtx = canvas2D.getContext('2d');
        displayCtx.imageSmoothingEnabled = false;

        let isSlim = false;

        // --- Visibilidad de capas (Body/Overlay): compartida entre el 2D y el 3D ---
        const capasVisibles = {
            head: true, torso: true, leftArm: true, rightArm: true, leftLeg: true, rightLeg: true,
            jacketHead: false, jacketTorso: false, jacketLeftArm: false, jacketRightArm: false, jacketLeftLeg: false, jacketRightLeg: false
        };

        // --- Regiones anatómicas (bounding box por parte): mismas coordenadas que el UV_MAP de
        // viewer3d.js, reutilizadas para la grilla gruesa de colores. El ancho de brazo varía
        // con Default(4px)/Slim(3px); todo lo demás es constante. ---
        const construirRegiones = (armWidth) => {
            const anchoBrazo = 8 + 2 * armWidth; // 16 en Default, 14 en Slim
            return [
                { x: 0,  y: 0,  w: 32, h: 16, color: '#2196F3', key: 'head' },
                { x: 32, y: 0,  w: 32, h: 16, color: '#2196F3', key: 'jacketHead' },
                { x: 16, y: 16, w: 24, h: 16, color: '#4CAF50', key: 'torso' },
                { x: 16, y: 32, w: 24, h: 16, color: '#4CAF50', key: 'jacketTorso' },
                { x: 40, y: 16, w: anchoBrazo, h: 16, color: '#FF9800', key: 'leftArm' },
                { x: 40, y: 32, w: anchoBrazo, h: 16, color: '#FF9800', key: 'jacketLeftArm' },
                { x: 32, y: 48, w: anchoBrazo, h: 16, color: '#FF9800', key: 'rightArm' },
                { x: 48, y: 48, w: anchoBrazo, h: 16, color: '#FF9800', key: 'jacketRightArm' },
                { x: 0,  y: 16, w: 16, h: 16, color: '#9C27B0', key: 'leftLeg' },
                { x: 0,  y: 32, w: 16, h: 16, color: '#9C27B0', key: 'jacketLeftLeg' },
                { x: 16, y: 48, w: 16, h: 16, color: '#9C27B0', key: 'rightLeg' },
                { x: 0,  y: 48, w: 16, h: 16, color: '#9C27B0', key: 'jacketRightLeg' }
            ];
        };

        // --- Caras individuales por parte (top/bottom/right/left/front/back): mismas fórmulas
        // exactas que UV_MAP en viewer3d.js, usadas por la herramienta Cubo para saber qué
        // rectángulo exacto rellenar al hacer doble clic. ---
        const construirCarasRelleno = (armWidth) => {
            const partes = [
                { top: [8, 0, 8, 8], bottom: [16, 0, 8, 8], right: [0, 8, 8, 8], left: [16, 8, 8, 8], front: [8, 8, 8, 8], back: [24, 8, 8, 8] },
                { top: [40, 0, 8, 8], bottom: [48, 0, 8, 8], right: [32, 8, 8, 8], left: [48, 8, 8, 8], front: [40, 8, 8, 8], back: [56, 8, 8, 8] },
                { top: [20, 16, 8, 4], bottom: [28, 16, 8, 4], right: [16, 20, 4, 12], left: [28, 20, 4, 12], front: [20, 20, 8, 12], back: [32, 20, 8, 12] },
                { top: [20, 32, 8, 4], bottom: [28, 32, 8, 4], right: [16, 36, 4, 12], left: [28, 36, 4, 12], front: [20, 36, 8, 12], back: [32, 36, 8, 12] },
                { top: [44, 16, armWidth, 4], bottom: [44 + armWidth, 16, armWidth, 4], right: [40, 20, 4, 12], left: [40 + 4 + armWidth, 20, 4, 12], front: [44, 20, armWidth, 12], back: [44 + armWidth + 4, 20, armWidth, 12] },
                { top: [44, 32, armWidth, 4], bottom: [44 + armWidth, 32, armWidth, 4], right: [40, 36, 4, 12], left: [40 + 4 + armWidth, 36, 4, 12], front: [44, 36, armWidth, 12], back: [44 + armWidth + 4, 36, armWidth, 12] },
                { top: [36, 48, armWidth, 4], bottom: [36 + armWidth, 48, armWidth, 4], right: [32, 52, 4, 12], left: [32 + 4 + armWidth, 52, 4, 12], front: [36, 52, armWidth, 12], back: [36 + armWidth + 4, 52, armWidth, 12] },
                { top: [52, 48, armWidth, 4], bottom: [52 + armWidth, 48, armWidth, 4], right: [48, 52, 4, 12], left: [48 + 4 + armWidth, 52, 4, 12], front: [52, 52, armWidth, 12], back: [52 + armWidth + 4, 52, armWidth, 12] },
                { top: [4, 16, 4, 4], bottom: [8, 16, 4, 4], right: [0, 20, 4, 12], left: [8, 20, 4, 12], front: [4, 20, 4, 12], back: [12, 20, 4, 12] },
                { top: [4, 32, 4, 4], bottom: [8, 32, 4, 4], right: [0, 36, 4, 12], left: [8, 36, 4, 12], front: [4, 36, 4, 12], back: [12, 36, 4, 12] },
                { top: [20, 48, 4, 4], bottom: [24, 48, 4, 4], right: [16, 52, 4, 12], left: [24, 52, 4, 12], front: [20, 52, 4, 12], back: [28, 52, 4, 12] },
                { top: [4, 48, 4, 4], bottom: [8, 48, 4, 4], right: [0, 52, 4, 12], left: [8, 52, 4, 12], front: [4, 52, 4, 12], back: [12, 52, 4, 12] }
            ];
            const caras = [];
            partes.forEach(p => {
                ['top', 'bottom', 'right', 'left', 'front', 'back'].forEach(lado => {
                    const [x, y, w, h] = p[lado];
                    caras.push({ x, y, w, h });
                });
            });
            return caras;
        };

        let regionesActuales = construirRegiones(4);

        // Arranca con el mismo gris sólido que usa el maniquí vacío del Preview (0x555555), pero
        // SOLO en las regiones de Body — el Overlay queda transparente, como en una skin real
        // (ahí solo debería verse algo si el jugador pinta encima, como una chaqueta o sombrero).
        dataCtx.fillStyle = '#555555';
        regionesActuales.forEach(r => {
            if (r.key.startsWith('jacket')) return;
            dataCtx.fillRect(r.x, r.y, r.w, r.h);
        });
        let carasRellenoActuales = construirCarasRelleno(4);

        // --- Redibuja todo: fondo de transparencia, textura escalada, y las 2 capas de grilla ---
        const dibujarVista2D = () => {
            const size = TEX_SIZE * zoom;
            canvas2D.width = size;
            canvas2D.height = size;

            displayCtx.imageSmoothingEnabled = false;
            displayCtx.clearRect(0, 0, size, size);

            // Tablero tipo ajedrez para distinguir zonas transparentes
            const casilla = Math.max(4, zoom);
            for (let ty = 0; ty < size; ty += casilla) {
                for (let tx = 0; tx < size; tx += casilla) {
                    const par = ((tx / casilla) + (ty / casilla)) % 2 === 0;
                    displayCtx.fillStyle = par ? '#707070' : '#5C5C5C';
                    displayCtx.fillRect(tx, ty, casilla, casilla);
                }
            }

            // La textura real, escalada sin difuminar (pixel art nítido)
            displayCtx.drawImage(dataCanvas, 0, 0, TEX_SIZE, TEX_SIZE, 0, 0, size, size);

            // Oculta visualmente (no borra los datos) las regiones cuya capa esté apagada
            regionesActuales.forEach(r => {
                if (capasVisibles[r.key]) return;
                const rx = r.x * zoom, ry = r.y * zoom, rw = r.w * zoom, rh = r.h * zoom;
                const casillaOculta = Math.max(4, zoom);
                for (let ty = 0; ty < rh; ty += casillaOculta) {
                    for (let tx = 0; tx < rw; tx += casillaOculta) {
                        const par = (((rx + tx) / casillaOculta) + ((ry + ty) / casillaOculta)) % 2 === 0;
                        displayCtx.fillStyle = par ? '#707070' : '#5C5C5C';
                        displayCtx.fillRect(rx + tx, ry + ty, casillaOculta, casillaOculta);
                    }
                }
            });

            // Grilla fina de píxeles
            displayCtx.strokeStyle = 'rgba(255,255,255,0.15)';
            displayCtx.lineWidth = 1;
            for (let i = 0; i <= TEX_SIZE; i++) {
                const pos = i * zoom + 0.5;
                displayCtx.beginPath();
                displayCtx.moveTo(pos, 0);
                displayCtx.lineTo(pos, size);
                displayCtx.stroke();
                displayCtx.beginPath();
                displayCtx.moveTo(0, pos);
                displayCtx.lineTo(size, pos);
                displayCtx.stroke();
            }

            // Grilla intermedia: separa cada cara individual (frente/atrás/lados) dentro de cada
            // región, con líneas finas — mismos datos que usa el Cubo para saber dónde rellenar
            displayCtx.strokeStyle = 'rgba(255,255,255,0.3)';
            displayCtx.lineWidth = 1;
            carasRellenoActuales.forEach(c => {
                displayCtx.strokeRect(c.x * zoom + 0.5, c.y * zoom + 0.5, c.w * zoom - 1, c.h * zoom - 1);
            });

            // Grilla gruesa de regiones anatómicas, coloreada
            displayCtx.lineWidth = 2;
            regionesActuales.forEach(r => {
                displayCtx.strokeStyle = r.color;
                displayCtx.strokeRect(r.x * zoom + 1, r.y * zoom + 1, r.w * zoom - 2, r.h * zoom - 2);
            });
        };

        // --- Zoom inicial: ajusta el mapa completo 64x64 al tamaño visible del visor ---
        const calcularZoomInicial = () => {
            const disponible = Math.min(viewerContainer.clientWidth, viewerContainer.clientHeight);
            zoom = Math.max(ZOOM_MIN, Math.floor(disponible / TEX_SIZE));
            dibujarVista2D();
        };
        calcularZoomInicial();

        // --- Botones de Zoom (funcionan tanto en 2D como en 3D, según el modo activo) ---
        if (btnZoomIn) btnZoomIn.addEventListener('click', () => {
            if (modoActual3D) { aplicarZoom3D(zoom3D + ZOOM3D_STEP); return; }
            zoom = Math.min(ZOOM_MAX, zoom + 1);
            dibujarVista2D();
        });
        if (btnZoomOut) btnZoomOut.addEventListener('click', () => {
            if (modoActual3D) { aplicarZoom3D(zoom3D - ZOOM3D_STEP); return; }
            zoom = Math.max(ZOOM_MIN, zoom - 1);
            dibujarVista2D();
        });

        // --- Zoom con la rueda del mouse (2D) ---
        canvas2D.addEventListener('wheel', (e) => {
            e.preventDefault();
            zoom = e.deltaY < 0 ? Math.min(ZOOM_MAX, zoom + 1) : Math.max(ZOOM_MIN, zoom - 1);
            dibujarVista2D();
        }, { passive: false });

        // --- Conversión de coordenadas de pantalla a píxel real de la textura ---
        const obtenerPixelDesdeEvento = (e) => {
            const rect = canvas2D.getBoundingClientRect();
            const localX = e.clientX - rect.left;
            const localY = e.clientY - rect.top;
            const px = Math.floor(localX / zoom);
            const py = Math.floor(localY / zoom);
            if (px < 0 || py < 0 || px >= TEX_SIZE || py >= TEX_SIZE) return null;
            return { px, py };
        };

        // --- Conversión RGB <-> HSL, usada por Aclarar/Oscurecer para ajustar el tono sin cambiar el color ---
        const rgbAHsl = (r, g, b) => {
            r /= 255; g /= 255; b /= 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h = 0, s = 0;
            const l = (max + min) / 2;
            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            return [h, s, l];
        };

        const hslARgb = (h, s, l) => {
            let r, g, b;
            if (s === 0) { r = g = b = l; }
            else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1 / 6) return p + (q - p) * 6 * t;
                    if (t < 1 / 2) return q;
                    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                    return p;
                };
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1 / 3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1 / 3);
            }
            return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
        };

        const hexARgb = (hex) => {
            const limpio = hex.replace('#', '');
            const bigint = parseInt(limpio, 16);
            return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
        };

        const rgbAHex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

        // --- Pinta o borra un bloque cuadrado (1x1 para Pincel/Borrador, 3x3 para Marcador) ---
        const pintarBloque = (px, py, tamano) => {
            const offset = Math.floor(tamano / 2);
            dataCtx.clearRect(px - offset, py - offset, tamano, tamano);
            dataCtx.fillStyle = colorActual;
            dataCtx.fillRect(px - offset, py - offset, tamano, tamano);
        };

        const borrarBloque = (px, py, tamano) => {
            const offset = Math.floor(tamano / 2);
            dataCtx.clearRect(px - offset, py - offset, tamano, tamano);
        };

        // --- Degradado: mezcla el píxel con sus 8 vecinos (promedio ponderado), ideal para
        // suavizar la frontera entre dos colores ya pintados en la skin ---
        const aplicarDegradado = (px, py) => {
            let rTotal = 0, gTotal = 0, bTotal = 0, contador = 0;
            for (let oy = -1; oy <= 1; oy++) {
                for (let ox = -1; ox <= 1; ox++) {
                    const nx = px + ox, ny = py + oy;
                    if (nx < 0 || ny < 0 || nx >= TEX_SIZE || ny >= TEX_SIZE) continue;
                    const d = dataCtx.getImageData(nx, ny, 1, 1).data;
                    if (d[3] === 0) continue; // Ignora vecinos transparentes al promediar
                    rTotal += d[0]; gTotal += d[1]; bTotal += d[2]; contador++;
                }
            }
            if (contador === 0) return; // No hay nada pintado alrededor para mezclar
            const r = Math.round(rTotal / contador), g = Math.round(gTotal / contador), b = Math.round(bTotal / contador);
            dataCtx.clearRect(px, py, 1, 1);
            dataCtx.fillStyle = `rgb(${r},${g},${b})`;
            dataCtx.fillRect(px, py, 1, 1);
        };

        // --- Despachador: aplica la herramienta activa sobre un píxel (usado por clic y por arrastre) ---
        const aplicarHerramientaEnPixel = (px, py) => {
            switch (herramientaActual) {
                case 'brush': pintarBloque(px, py, 1); break;
                case 'eraser': borrarBloque(px, py, 1); break;
                case 'marker': pintarBloque(px, py, 3); break;
                case 'gradient': aplicarDegradado(px, py); break;
            }
        };

        // --- Deshacer/Rehacer: guarda instantáneas completas del canvas de datos.
        // Es más simple y confiable que revertir operación por operación, y el costo en
        // memoria es insignificante (64x64 píxeles por instantánea). ---
        const MAX_HISTORIAL = 50;
        let pilaDeshacer = [];
        let pilaRehacer = [];
        let hayCambiosSinGuardar = false; // Usada por Cargar Skin para avisar antes de sobrescribir

        const guardarEstadoParaDeshacer = () => {
            pilaDeshacer.push(dataCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE));
            if (pilaDeshacer.length > MAX_HISTORIAL) pilaDeshacer.shift();
            pilaRehacer = []; // Cualquier acción nueva invalida el historial de "rehacer" pendiente
            hayCambiosSinGuardar = true;
        };

        const deshacer = () => {
            if (pilaDeshacer.length === 0) return;
            pilaRehacer.push(dataCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE));
            dataCtx.putImageData(pilaDeshacer.pop(), 0, 0);
            dibujarVista2D();
        };

        const rehacer = () => {
            if (pilaRehacer.length === 0) return;
            pilaDeshacer.push(dataCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE));
            dataCtx.putImageData(pilaRehacer.pop(), 0, 0);
            dibujarVista2D();
        };

        if (btnUndo) btnUndo.addEventListener('click', deshacer);
        if (btnRedo) btnRedo.addEventListener('click', rehacer);

        document.addEventListener('keydown', (e) => {
            if (!e.ctrlKey) return;
            const tecla = e.key.toLowerCase();
            if (tecla === 'z' && !e.shiftKey) { e.preventDefault(); deshacer(); }
            else if (tecla === 'y' || (tecla === 'z' && e.shiftKey)) { e.preventDefault(); rehacer(); }
        });

        // --- Interpolación simple (Bresenham) para no dejar huecos si el mouse se mueve rápido al arrastrar ---
        const pintarLinea = (p0, p1) => {
            let x = p0.px, y = p0.py;
            const dx = Math.abs(p1.px - x), dy = Math.abs(p1.py - y);
            const sx = x < p1.px ? 1 : -1, sy = y < p1.py ? 1 : -1;
            let err = dx - dy;
            while (true) {
                aplicarHerramientaEnPixel(x, y);
                if (x === p1.px && y === p1.py) break;
                const e2 = 2 * err;
                if (e2 > -dy) { err -= dy; x += sx; }
                if (e2 < dx) { err += dx; y += sy; }
            }
        };

        // --- Rellena una región/cara completa (Cubo, con doble clic) ---
        const rellenarRegion = (px, py) => {
            const cara = carasRellenoActuales.find(c => px >= c.x && px < c.x + c.w && py >= c.y && py < c.y + c.h);
            if (!cara) return;
            guardarEstadoParaDeshacer();
            dataCtx.clearRect(cara.x, cara.y, cara.w, cara.h);
            dataCtx.fillStyle = colorActual;
            dataCtx.fillRect(cara.x, cara.y, cara.w, cara.h);
            dibujarVista2D();
        };

        // --- Eventos de pintado (clic y arrastre) ---
        canvas2D.addEventListener('mousedown', (e) => {
            const pix = obtenerPixelDesdeEvento(e);
            if (!pix) return;

            // El Cuentagotas no pinta: toma el color del píxel y vuelve al Pincel automáticamente
            if (herramientaActual === 'eyedropper') {
                const muestra = dataCtx.getImageData(pix.px, pix.py, 1, 1).data;
                if (muestra[3] > 0) { // Solo si el píxel no está vacío/transparente
                    const hex = '#' + [muestra[0], muestra[1], muestra[2]]
                        .map(v => v.toString(16).padStart(2, '0')).join('');
                    establecerColorActivo(hex);
                }
                activarHerramienta('brush');
                return;
            }

            // El Cubo solo actúa con doble clic (ver listener aparte); un solo clic no hace nada
            if (herramientaActual === 'bucket') return;

            guardarEstadoParaDeshacer(); // Un solo checkpoint por trazo, no por píxel
            isPainting = true;
            aplicarHerramientaEnPixel(pix.px, pix.py);
            lastPixel = pix;
            dibujarVista2D();
        });

        window.addEventListener('mouseup', () => { isPainting = false; lastPixel = null; });

        canvas2D.addEventListener('mousemove', (e) => {
            if (!isPainting) return;
            if (!(e.buttons & 1)) { isPainting = false; lastPixel = null; return; } // Defensa: mismo criterio que el 3D
            const pix = obtenerPixelDesdeEvento(e);
            if (!pix) return;
            if (lastPixel) { pintarLinea(lastPixel, pix); } else { aplicarHerramientaEnPixel(pix.px, pix.py); }
            lastPixel = pix;
            dibujarVista2D();
        });

        // El Cubo: doble clic rellena toda la cara/región anatómica tocada
        canvas2D.addEventListener('dblclick', (e) => {
            if (herramientaActual !== 'bucket') return;
            const pix = obtenerPixelDesdeEvento(e);
            if (!pix) return;
            rellenarRegion(pix.px, pix.py);
        });

        // Evita que el navegador intente "arrastrar" el canvas como si fuera una imagen
        canvas2D.addEventListener('dragstart', (e) => e.preventDefault());

        // --- Selección de herramienta (Aclarar/Oscurecer NO son herramientas de lienzo: ver más abajo) ---
        const botonesHerramientas = [
            { btn: toolBrushBtn, id: 'brush' },
            { btn: toolEraserBtn, id: 'eraser' },
            { btn: toolEyedropperBtn, id: 'eyedropper' },
            { btn: toolMarkerBtn, id: 'marker' },
            { btn: toolGradientBtn, id: 'gradient' },
            { btn: toolBucketBtn, id: 'bucket' }
        ];

        const activarHerramienta = (idHerramienta) => {
            herramientaActual = idHerramienta;
            botonesHerramientas.forEach(({ btn, id }) => {
                if (!btn) return;
                btn.classList.toggle('active', id === idHerramienta);
            });
        };

        botonesHerramientas.forEach(({ btn, id }) => {
            if (btn) btn.addEventListener('click', () => activarHerramienta(id));
        });

        // --- Complexión Default/Slim: recalcula el ancho de brazo usado por la grilla y el Cubo ---
        const actualizarComplexion = (slim) => {
            isSlim = slim;
            if (btnComplexionDefault) btnComplexionDefault.classList.toggle('active', !slim);
            if (btnComplexionSlim) btnComplexionSlim.classList.toggle('active', slim);
            const anchoBrazo = slim ? 3 : 4;
            regionesActuales = construirRegiones(anchoBrazo);
            carasRellenoActuales = construirCarasRelleno(anchoBrazo);
            dibujarVista2D();
        };

        if (btnComplexionDefault) btnComplexionDefault.addEventListener('click', () => actualizarComplexion(false));
        if (btnComplexionSlim) btnComplexionSlim.addEventListener('click', () => actualizarComplexion(true));

        // --- Color activo: un solo punto de verdad, sincronizado entre el picker, la paleta, el Cuentagotas y la barra RGB ---
        const establecerColorActivo = (hex) => {
            colorActual = hex;
            if (colorPicker) colorPicker.value = hex;
            actualizarSeleccionEnPaleta();
            const [r, g, b] = hexARgb(hex);
            if (rgbInputR) rgbInputR.value = r;
            if (rgbInputG) rgbInputG.value = g;
            if (rgbInputB) rgbInputB.value = b;
            if (rgbPreviewSwatch) rgbPreviewSwatch.style.background = hex;
        };

        // --- Aclarar / Oscurecer: ajustan el COLOR ACTIVO (no el lienzo). Escalan la luminosidad
        // hacia blanco o negro, y ese nuevo tono queda listo para pintar con Pincel/Marcador/Cubo. ---
        const ajustarColorActivo = (factor) => {
            const [r, g, b] = hexARgb(colorActual);
            const [h, s, l] = rgbAHsl(r, g, b);
            const nuevaL = Math.min(1, Math.max(0, l + factor));
            const [nr, ng, nb] = hslARgb(h, s, nuevaL);
            establecerColorActivo(rgbAHex(nr, ng, nb));
        };

        if (toolLightenBtn) toolLightenBtn.addEventListener('click', () => ajustarColorActivo(0.08));
        if (toolDarkenBtn) toolDarkenBtn.addEventListener('click', () => ajustarColorActivo(-0.08));

        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                colorActual = e.target.value;
                actualizarSeleccionEnPaleta();
            });
        }

        // --- Paleta (Bloque Rojo): 16 slots (4x4) que el jugador va llenando a su gusto ---
        const TOTAL_SLOTS_PALETA = 16;
        let coloresPaleta = new Array(TOTAL_SLOTS_PALETA).fill(null);
        let slotsPaletaEls = [];

        const actualizarSeleccionEnPaleta = () => {
            slotsPaletaEls.forEach((slot, i) => {
                const coincide = coloresPaleta[i] && coloresPaleta[i].toLowerCase() === colorActual.toLowerCase();
                slot.classList.toggle('selected', coincide);
            });
        };

        const renderizarPaleta = () => {
            if (!paletteGrid) return;
            paletteGrid.innerHTML = '';
            slotsPaletaEls = [];

            coloresPaleta.forEach((hex, i) => {
                const slot = document.createElement('div');
                slot.className = 'studio-palette-slot';
                slot.title = hex ? hex : 'Slot vacío';
                if (hex) slot.style.background = hex;

                slot.addEventListener('click', () => {
                    if (coloresPaleta[i]) {
                        // Slot con color: lo activa para pintar
                        establecerColorActivo(coloresPaleta[i]);
                    } else {
                        // Slot vacío: guarda ahí el color activo actual
                        coloresPaleta[i] = colorActual;
                        renderizarPaleta();
                        actualizarSeleccionEnPaleta();
                    }
                });

                // Clic derecho: vacía el slot (sin importar si tenía color o no)
                slot.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    coloresPaleta[i] = null;
                    renderizarPaleta();
                    actualizarSeleccionEnPaleta();
                });

                paletteGrid.appendChild(slot);
                slotsPaletaEls.push(slot);
            });
        };

        renderizarPaleta();

        // ================= FASE 5: MOTOR 3D PINTABLE (COMPARTE EL MISMO dataCanvas QUE EL 2D) =================
        let scene3D, camera3D, renderer3D, playerGroup3D;
        let zoom3D = 1;
        const ZOOM3D_MIN = 0.5, ZOOM3D_MAX = 3, ZOOM3D_STEP = 0.15;

        scene3D = new THREE.Scene();
        camera3D = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        camera3D.position.set(0, 0, 42);

        renderer3D = new THREE.WebGLRenderer({ canvas: canvas3D, antialias: false, alpha: true });

        const luzAmbiente3D = new THREE.AmbientLight(0xffffff, 0.85);
        scene3D.add(luzAmbiente3D);
        const luzDireccional3D = new THREE.DirectionalLight(0xffffff, 0.35);
        luzDireccional3D.position.set(12, 24, 15);
        scene3D.add(luzDireccional3D);

        playerGroup3D = new THREE.Group();
        scene3D.add(playerGroup3D);

        // --- La textura 3D lee directamente del mismo lienzo de datos que usa el 2D: pintar en
        // cualquiera de los dos modos se refleja automáticamente en el otro, sin conversiones ---
        const texturaDatos = new THREE.CanvasTexture(dataCanvas);
        texturaDatos.magFilter = THREE.NearestFilter;
        texturaDatos.minFilter = THREE.NearestFilter;

        const ajustarTamano3D = () => {
            const w = viewerContainer.clientWidth, h = viewerContainer.clientHeight;
            if (w === 0 || h === 0) return;
            renderer3D.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer3D.setSize(w, h, false);
            camera3D.aspect = w / h;
            camera3D.updateProjectionMatrix();
        };
        ajustarTamano3D();
        window.addEventListener('resize', ajustarTamano3D);

        // --- Mapa UV: mismas fórmulas y mismo criterio de espejo que en viewer3d.js (Preview) ---
        const pixelsAUV3D = (x, y, w, h) => [x / TEX_SIZE, 1 - (y + h) / TEX_SIZE, (x + w) / TEX_SIZE, 1 - y / TEX_SIZE];

        const asignarCaraUV3D = (geometry, faceIndex, rectPx, flipV = false) => {
            let [u0, v0, u1, v1] = pixelsAUV3D(...rectPx);
            if (flipV) { const tmp = v0; v0 = v1; v1 = tmp; }
            const uv = geometry.attributes.uv;
            const o = faceIndex * 4;
            uv.setXY(o + 0, u0, v1); uv.setXY(o + 1, u1, v1); uv.setXY(o + 2, u0, v0); uv.setXY(o + 3, u1, v0);
        };

        const aplicarUVCompleto3D = (geometry, faces) => {
            asignarCaraUV3D(geometry, 0, faces.left);
            asignarCaraUV3D(geometry, 1, faces.right);
            asignarCaraUV3D(geometry, 2, faces.top);
            asignarCaraUV3D(geometry, 3, faces.bottom, true);
            asignarCaraUV3D(geometry, 4, faces.front);
            asignarCaraUV3D(geometry, 5, faces.back);
            geometry.attributes.uv.needsUpdate = true;
        };

        const UV_MAP_3D = {
            head: {
                base: { top: [8,0,8,8], bottom: [16,0,8,8], right: [0,8,8,8], left: [16,8,8,8], front: [8,8,8,8], back: [24,8,8,8] },
                overlay: { top: [40,0,8,8], bottom: [48,0,8,8], right: [32,8,8,8], left: [48,8,8,8], front: [40,8,8,8], back: [56,8,8,8] }
            },
            torso: {
                base: { top: [20,16,8,4], bottom: [28,16,8,4], right: [16,20,4,12], left: [28,20,4,12], front: [20,20,8,12], back: [32,20,8,12] },
                overlay: { top: [20,32,8,4], bottom: [28,32,8,4], right: [16,36,4,12], left: [28,36,4,12], front: [20,36,8,12], back: [32,36,8,12] }
            },
            rightArmRegion: {
                base: (w) => ({ top: [44,16,w,4], bottom: [44+w,16,w,4], right: [40,20,4,12], left: [40+4+w,20,4,12], front: [44,20,w,12], back: [44+w+4,20,w,12] }),
                overlay: (w) => ({ top: [44,32,w,4], bottom: [44+w,32,w,4], right: [40,36,4,12], left: [40+4+w,36,4,12], front: [44,36,w,12], back: [44+w+4,36,w,12] })
            },
            leftArmRegion: {
                base: (w) => ({ top: [36,48,w,4], bottom: [36+w,48,w,4], right: [32,52,4,12], left: [32+4+w,52,4,12], front: [36,52,w,12], back: [36+w+4,52,w,12] }),
                overlay: (w) => ({ top: [52,48,w,4], bottom: [52+w,48,w,4], right: [48,52,4,12], left: [48+4+w,52,4,12], front: [52,52,w,12], back: [52+w+4,52,w,12] })
            },
            rightLegRegion: {
                base: { top: [4,16,4,4], bottom: [8,16,4,4], right: [0,20,4,12], left: [8,20,4,12], front: [4,20,4,12], back: [12,20,4,12] },
                overlay: { top: [4,32,4,4], bottom: [8,32,4,4], right: [0,36,4,12], left: [8,36,4,12], front: [4,36,4,12], back: [12,36,4,12] }
            },
            leftLegRegion: {
                base: { top: [20,48,4,4], bottom: [24,48,4,4], right: [16,52,4,12], left: [24,52,4,12], front: [20,52,4,12], back: [28,52,4,12] },
                overlay: { top: [4,48,4,4], bottom: [8,48,4,4], right: [0,52,4,12], left: [8,52,4,12], front: [4,52,4,12], back: [12,52,4,12] }
            }
        };

        let meshesPorParte = {}; // Referencias directas, para alternar visibilidad sin reconstruir todo el modelo

        const armarPersonaje3D = () => {
            while (playerGroup3D.children.length > 0) { playerGroup3D.remove(playerGroup3D.children[0]); }
            meshesPorParte = {};
            const material = new THREE.MeshLambertMaterial({ map: texturaDatos, transparent: true, alphaTest: 0.5 });
            const anchoBrazo = isSlim ? 3 : 4;

            const partes = [
                { key: 'head', geo: new THREE.BoxGeometry(8, 8, 8), uv: UV_MAP_3D.head.base, pos: [0, 10, 0] },
                { key: 'torso', geo: new THREE.BoxGeometry(8, 12, 4), uv: UV_MAP_3D.torso.base, pos: [0, 0, 0] },
                { key: 'leftArm', geo: new THREE.BoxGeometry(anchoBrazo, 12, 4), uv: UV_MAP_3D.rightArmRegion.base(anchoBrazo), pos: [-(4 + anchoBrazo / 2), 0, 0] },
                { key: 'rightArm', geo: new THREE.BoxGeometry(anchoBrazo, 12, 4), uv: UV_MAP_3D.leftArmRegion.base(anchoBrazo), pos: [(4 + anchoBrazo / 2), 0, 0] },
                { key: 'leftLeg', geo: new THREE.BoxGeometry(4, 12, 4), uv: UV_MAP_3D.rightLegRegion.base, pos: [-2, -12, 0] },
                { key: 'rightLeg', geo: new THREE.BoxGeometry(4, 12, 4), uv: UV_MAP_3D.leftLegRegion.base, pos: [2, -12, 0] },
                { key: 'jacketHead', geo: new THREE.BoxGeometry(8.5, 8.5, 8.5), uv: UV_MAP_3D.head.overlay, pos: [0, 10, 0] },
                { key: 'jacketTorso', geo: new THREE.BoxGeometry(8.5, 12.5, 4.5), uv: UV_MAP_3D.torso.overlay, pos: [0, 0, 0] },
                { key: 'jacketLeftArm', geo: new THREE.BoxGeometry(anchoBrazo + 0.5, 12.5, 4.5), uv: UV_MAP_3D.rightArmRegion.overlay(anchoBrazo), pos: [-(4 + anchoBrazo / 2), 0, 0] },
                { key: 'jacketRightArm', geo: new THREE.BoxGeometry(anchoBrazo + 0.5, 12.5, 4.5), uv: UV_MAP_3D.leftArmRegion.overlay(anchoBrazo), pos: [(4 + anchoBrazo / 2), 0, 0] },
                { key: 'jacketLeftLeg', geo: new THREE.BoxGeometry(4.5, 12.5, 4.5), uv: UV_MAP_3D.rightLegRegion.overlay, pos: [-2, -12, 0] },
                { key: 'jacketRightLeg', geo: new THREE.BoxGeometry(4.5, 12.5, 4.5), uv: UV_MAP_3D.leftLegRegion.overlay, pos: [2, -12, 0] }
            ];

            partes.forEach(p => {
                aplicarUVCompleto3D(p.geo, p.uv);
                const mesh = new THREE.Mesh(p.geo, material);
                mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
                mesh.visible = capasVisibles[p.key];
                playerGroup3D.add(mesh);
                meshesPorParte[p.key] = mesh;
            });
        };

        armarPersonaje3D();

        // --- Bucle de render: estático (sin auto-rotación), pero mantiene la textura sincronizada
        // con cualquier cambio hecho en el lienzo de datos (desde el 2D o desde el propio 3D) ---
        const renderizarLoop3D = () => {
            requestAnimationFrame(renderizarLoop3D);
            texturaDatos.needsUpdate = true;
            renderer3D.render(scene3D, camera3D);
        };
        renderizarLoop3D();

        // --- Zoom 3D ---
        const aplicarZoom3D = (nuevo) => {
            zoom3D = Math.min(ZOOM3D_MAX, Math.max(ZOOM3D_MIN, nuevo));
            camera3D.zoom = zoom3D;
            camera3D.updateProjectionMatrix();
        };

        // --- Zoom con la rueda del mouse (3D) ---
        canvas3D.addEventListener('wheel', (e) => {
            e.preventDefault();
            aplicarZoom3D(zoom3D + (e.deltaY < 0 ? ZOOM3D_STEP : -ZOOM3D_STEP));
        }, { passive: false });

        // --- Raycasting: convierte un clic en la posición 3D exacta de píxel en la textura ---
        const raycaster3D = new THREE.Raycaster();
        const mouseNDC3D = new THREE.Vector2();

        // Three.js no ignora automáticamente los objetos invisibles al lanzar el rayo, así que
        // filtramos a mano: solo las partes que están realmente visibles ahora mismo (nunca la
        // grilla decorativa ni el Overlay oculto) pueden recibir el clic de pintado.
        const obtenerObjetosPintables = () => Object.values(meshesPorParte).filter(m => m.visible);

        const obtenerPixelDesdeRaycast = (e) => {
            const rect = canvas3D.getBoundingClientRect();
            mouseNDC3D.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouseNDC3D.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster3D.setFromCamera(mouseNDC3D, camera3D);
            const intersecciones = raycaster3D.intersectObjects(obtenerObjetosPintables());
            if (intersecciones.length === 0 || !intersecciones[0].uv) return null;
            const uv = intersecciones[0].uv;
            const px = Math.min(TEX_SIZE - 1, Math.max(0, Math.floor(uv.x * TEX_SIZE)));
            const py = Math.min(TEX_SIZE - 1, Math.max(0, Math.floor((1 - uv.y) * TEX_SIZE)));
            return { px, py };
        };

        // --- Interacción: clic izquierdo pinta (raycasting), clic derecho + arrastre rota (manual, sin auto-rotación) ---
        let isPainting3D = false;
        let isRotating3D = false;
        let lastPixel3D = null;
        let lastMouseX3D = 0, lastMouseY3D = 0;

        canvas3D.addEventListener('contextmenu', (e) => e.preventDefault());

        canvas3D.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                isRotating3D = true;
                lastMouseX3D = e.clientX;
                lastMouseY3D = e.clientY;
                return;
            }
            if (e.button !== 0) return;

            if (herramientaActual === 'eyedropper') {
                const pix = obtenerPixelDesdeRaycast(e);
                if (pix) {
                    const muestra = dataCtx.getImageData(pix.px, pix.py, 1, 1).data;
                    if (muestra[3] > 0) establecerColorActivo(rgbAHex(muestra[0], muestra[1], muestra[2]));
                    activarHerramienta('brush');
                }
                return;
            }

            if (herramientaActual === 'bucket') return; // El Cubo actúa por doble clic

            const pix = obtenerPixelDesdeRaycast(e);
            if (!pix) return;
            guardarEstadoParaDeshacer();
            isPainting3D = true;
            aplicarHerramientaEnPixel(pix.px, pix.py);
            dibujarVista2D();
            lastPixel3D = pix;
        });

        window.addEventListener('mouseup', () => { isPainting3D = false; isRotating3D = false; lastPixel3D = null; });

        canvas3D.addEventListener('mousemove', (e) => {
            // Defensa: si el botón ya no está realmente presionado (se perdió el mouseup, p. ej.
            // al soltar fuera de la ventana), cortamos acá en vez de arrastrar desde una posición
            // vieja — eso era lo que causaba la "fila completa" pintada de golpe.
            if ((isRotating3D && !(e.buttons & 2)) || (isPainting3D && !(e.buttons & 1))) {
                isRotating3D = false;
                isPainting3D = false;
                lastPixel3D = null;
                return;
            }

            if (isRotating3D) {
                const deltaX = e.clientX - lastMouseX3D, deltaY = e.clientY - lastMouseY3D;
                playerGroup3D.rotation.y += deltaX * 0.01;
                playerGroup3D.rotation.x += deltaY * 0.01;
                lastMouseX3D = e.clientX;
                lastMouseY3D = e.clientY;
                return;
            }
            if (!isPainting3D) return;
            const pix = obtenerPixelDesdeRaycast(e);
            if (!pix) return;

            // Si el salto es demasiado grande, probablemente cruzamos una costura hacia otra pieza
            // (cabeza→torso, etc.) que en la textura plana está en una zona totalmente distinta.
            // En ese caso no conectamos con línea — solo pintamos el punto nuevo, suelto.
            const SALTO_MAXIMO_3D = 10;
            const saltoSospechoso = lastPixel3D &&
                (Math.abs(pix.px - lastPixel3D.px) > SALTO_MAXIMO_3D || Math.abs(pix.py - lastPixel3D.py) > SALTO_MAXIMO_3D);

            if (lastPixel3D && !saltoSospechoso) { pintarLinea(lastPixel3D, pix); } else { aplicarHerramientaEnPixel(pix.px, pix.py); }
            lastPixel3D = pix;
            dibujarVista2D();
        });

        canvas3D.addEventListener('dblclick', (e) => {
            if (herramientaActual !== 'bucket') return;
            const pix = obtenerPixelDesdeRaycast(e);
            if (!pix) return;
            rellenarRegion(pix.px, pix.py);
        });

        // --- Reconstruye el modelo 3D con el ancho de brazo correcto cuando cambia Default/Slim ---
        if (btnComplexionDefault) btnComplexionDefault.addEventListener('click', armarPersonaje3D);
        if (btnComplexionSlim) btnComplexionSlim.addEventListener('click', armarPersonaje3D);

        // ================= CARGAR SKIN (con aviso si hay cambios sin guardar) =================
        const skinInput = document.getElementById('studioSkinInput');
        const confirmModal = document.getElementById('studioConfirmModal');
        const btnConfirmCancel = document.getElementById('studioConfirmCancel');
        const btnConfirmProceed = document.getElementById('studioConfirmProceed');
        let confirmCallback = null;

        const mostrarConfirmacion = (onConfirm) => {
            confirmCallback = onConfirm;
            if (confirmModal) confirmModal.classList.add('open');
        };

        if (btnConfirmCancel) btnConfirmCancel.addEventListener('click', () => {
            if (confirmModal) confirmModal.classList.remove('open');
            confirmCallback = null;
        });

        if (btnConfirmProceed) btnConfirmProceed.addEventListener('click', () => {
            if (confirmModal) confirmModal.classList.remove('open');
            if (confirmCallback) confirmCallback();
            confirmCallback = null;
        });

        if (skinInput) {
            skinInput.addEventListener('change', (e) => {
                const archivo = e.target.files[0];
                if (!archivo) return;

                const cargarArchivo = () => {
                    const url = URL.createObjectURL(archivo);
                    const img = new Image();
                    img.onload = () => {
                        dataCtx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);
                        dataCtx.drawImage(img, 0, 0, TEX_SIZE, TEX_SIZE);
                        pilaDeshacer = [];
                        pilaRehacer = [];
                        hayCambiosSinGuardar = false;
                        dibujarVista2D();
                        URL.revokeObjectURL(url);
                    };
                    img.src = url;
                };

                if (hayCambiosSinGuardar) { mostrarConfirmacion(cargarArchivo); } else { cargarArchivo(); }
                skinInput.value = ''; // Permite volver a elegir el mismo archivo más adelante si hace falta
            });
        }

        // ================= FASE 6: MENÚ DE OPCIONES AVANZADAS =================
        const btnOpenAdvanced = document.getElementById('btnOpenAdvanced');
        const btnCloseAdvanced = document.getElementById('btnCloseAdvanced');
        const advancedModal = document.getElementById('studioAdvancedModal');

        if (btnOpenAdvanced && advancedModal) {
            btnOpenAdvanced.addEventListener('click', () => advancedModal.classList.add('open'));
        }
        if (btnCloseAdvanced && advancedModal) {
            btnCloseAdvanced.addEventListener('click', () => advancedModal.classList.remove('open'));
        }

        // --- Barra RGB manual: se muestra/oculta según el interruptor, y mantiene sincronizado
        // el color activo en ambas direcciones (escribir RGB actualiza el color, y viceversa) ---
        const toggleRGBBar = document.getElementById('toggleRGBBar');
        const rgbBar = document.getElementById('studioRGBBar');

        if (toggleRGBBar && rgbBar) {
            toggleRGBBar.addEventListener('change', () => {
                rgbBar.style.display = toggleRGBBar.checked ? 'flex' : 'none';
            });
        }

        const aplicarColorDesdeCamposRGB = () => {
            const r = Math.min(255, Math.max(0, parseInt(rgbInputR.value, 10) || 0));
            const g = Math.min(255, Math.max(0, parseInt(rgbInputG.value, 10) || 0));
            const b = Math.min(255, Math.max(0, parseInt(rgbInputB.value, 10) || 0));
            establecerColorActivo(rgbAHex(r, g, b));
        };

        [rgbInputR, rgbInputG, rgbInputB].forEach(input => {
            if (input) input.addEventListener('input', aplicarColorDesdeCamposRGB);
        });

        // --- Generador visual de degradado: puramente de referencia, no toca la Paleta.
        // Un clic en cualquier tono generado lo vuelve el color activo. ---
        const gradGenColor1 = document.getElementById('gradGenColor1');
        const gradGenColor2 = document.getElementById('gradGenColor2');
        const gradGenCount = document.getElementById('gradGenCount');
        const gradGenStrip = document.getElementById('gradGenStrip');

        const interpolarColor = (hexA, hexB, t) => {
            const [r1, g1, b1] = hexARgb(hexA);
            const [r2, g2, b2] = hexARgb(hexB);
            return rgbAHex(
                Math.round(r1 + (r2 - r1) * t),
                Math.round(g1 + (g2 - g1) * t),
                Math.round(b1 + (b2 - b1) * t)
            );
        };

        const regenerarDegradadoVisual = () => {
            if (!gradGenStrip || !gradGenColor1 || !gradGenColor2 || !gradGenCount) return;
            const n = Math.max(2, Math.min(10, parseInt(gradGenCount.value, 10) || 5));
            gradGenStrip.innerHTML = '';
            for (let i = 0; i < n; i++) {
                const t = i / (n - 1);
                const hex = interpolarColor(gradGenColor1.value, gradGenColor2.value, t);
                const swatch = document.createElement('div');
                swatch.className = 'studio-gradient-swatch';
                swatch.style.background = hex;
                swatch.title = hex;
                swatch.addEventListener('click', () => establecerColorActivo(hex));
                gradGenStrip.appendChild(swatch);
            }
        };

        [gradGenColor1, gradGenColor2, gradGenCount].forEach(el => {
            if (el) el.addEventListener('input', regenerarDegradadoVisual);
        });
        regenerarDegradadoVisual(); // Genera la tira inicial con los valores por defecto

        // ================= FASE 7: DESCARGAR SKIN (PNG 64x64) =================
        // dataCanvas ya ES la textura final de 64x64, así que no hace falta ninguna conversión.
        const btnDownloadSkin = document.getElementById('btnDownloadSkin');
        if (btnDownloadSkin) {
            btnDownloadSkin.addEventListener('click', () => {
                const enlace = document.createElement('a');
                enlace.download = 'skin-craftity.png';
                enlace.href = dataCanvas.toDataURL('image/png');
                enlace.click();
            });
        }

        // ================= CAPAS (BODY/OVERLAY): AFECTA TANTO AL 2D COMO AL 3D =================
        const dollParts = document.querySelectorAll('.doll-part');
        dollParts.forEach(part => {
            part.addEventListener('click', () => {
                part.classList.toggle('active-part');
                const key = part.dataset.part;
                const visible = part.classList.contains('active-part');
                capasVisibles[key] = visible;
                if (meshesPorParte[key]) meshesPorParte[key].visible = visible; // 3D: inmediato, sin reconstruir
                dibujarVista2D(); // 2D: refresca el tablero de "oculto" sobre esa región
            });
        });
    }

    // ================= PENDIENTE (a propósito) =================
    // Bloque Verde de Opciones Avanzadas (rueda cromática vs. picker básico)
});