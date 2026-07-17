// ================= ASSETS/JS/VIEWER3D.JS (PARTE 1 DE 2 - REPARADA AL 100%) =================
document.addEventListener('DOMContentLoaded', () => {
    const viewerContainer = document.getElementById("skinViewerContainer");
    const realCanvas = document.getElementById("skinCanvas3D");
    const skinInput = document.getElementById("skinInput");
    const btnModifySkin = document.getElementById("btnModifySkin");
    const btnZoomIn = document.getElementById("btnZoomIn");
    const btnZoomOut = document.getElementById("btnZoomOut");
    const paletteSlots = document.querySelectorAll("#skinPaletteGrid .color-sample-slot");

    let scene, camera, renderer, playerGroup;
    let meshes = {};
    let isSlim = false;
    let zoomLevel = 1;
    let texturaActual = null; 
    const ZOOM_MIN = 0.6, ZOOM_MAX = 2.5, ZOOM_STEP = 0.15;

    if (!realCanvas || !viewerContainer) return;

    // A. CONFIGURACIÓN DEL ENTORNO THREE.JS NATIVO
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 42);

    renderer = new THREE.WebGLRenderer({ canvas: realCanvas, antialias: false, alpha: true });

    const lightAmbient = new THREE.AmbientLight(0xffffff, 0.85); scene.add(lightAmbient);
    const lightDir = new THREE.DirectionalLight(0xffffff, 0.35); lightDir.position.set(12, 24, 15); scene.add(lightDir);

    playerGroup = new THREE.Group(); scene.add(playerGroup);

    // REDIMENSIONADO ADAPTATIVO AL CONTENEDOR CSS
    const ajustarTamano = () => {
        const w = viewerContainer.clientWidth; const h = viewerContainer.clientHeight;
        if (w === 0 || h === 0) return;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h, false);
        camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    ajustarTamano();
    window.addEventListener('resize', ajustarTamano);

    // B. DICCIONARIO MATEMÁTICO DE COORDENADAS UV FORMATO MINECRAFT (64x64)
    const TEX_SIZE = 64;
    const pixelsAUV = (x, y, w, h) => {
        return [x / TEX_SIZE, 1 - (y + h) / TEX_SIZE, (x + w) / TEX_SIZE, 1 - y / TEX_SIZE];
    };
    const asignarCaraUV = (geometry, faceIndex, rectPx, flipV = false) => {
        let [u0, v0, u1, v1] = pixelsAUV(...rectPx);
        if (flipV) { const tmp = v0; v0 = v1; v1 = tmp; } // Corrige la cara inferior, que queda espejada en V por la geometría interna del cubo
        const uv = geometry.attributes.uv; const o = faceIndex * 4;
        uv.setXY(o + 0, u0, v1); uv.setXY(o + 1, u1, v1); uv.setXY(o + 2, u0, v0); uv.setXY(o + 3, u1, v0);
    };
    const aplicarUVCompleto = (geometry, faces) => {
        // Nota: intercambiamos right/left aquí a propósito. El eje +X del cubo (cara visualmente
        // a la derecha en pantalla) debe recibir el recorte de textura "left" del personaje, porque
        // el personaje nos mira de frente y su lado izquierdo queda del lado derecho de tu pantalla
        // (el mismo efecto espejo de estar cara a cara con alguien).
        asignarCaraUV(geometry, 0, faces.left);
        asignarCaraUV(geometry, 1, faces.right);
        asignarCaraUV(geometry, 2, faces.top);   asignarCaraUV(geometry, 3, faces.bottom, true);
        asignarCaraUV(geometry, 4, faces.front); asignarCaraUV(geometry, 5, faces.back);
        geometry.attributes.uv.needsUpdate = true;
    };

    // COORDENADAS OFICIALES COMPLETAS SIN ERRORES NI CORTES DE SINTAXIS
    const UV_MAP = {
        head: {
            base:    { top: [8,0,8,8],   bottom: [16,0,8,8], right: [0,8,8,8],   left: [16,8,8,8],  front: [8,8,8,8],   back: [24,8,8,8] },
            overlay: { top: [40,0,8,8],  bottom: [48,0,8,8], right: [32,8,8,8],  left: [48,8,8,8],  front: [40,8,8,8],  back: [56,8,8,8] }
        },
        torso: {
            base:    { top: [20,16,8,4], bottom: [28,16,8,4], right: [16,20,4,12], left: [28,20,4,12], front: [20,20,8,12], back: [32,20,8,12] },
            overlay: { top: [20,32,8,4], bottom: [28,32,8,4], right: [16,36,4,12], left: [28,36,4,12], front: [20,36,8,12], back: [32,36,8,12] }
        },
        // "Right Arm" oficial del juego (usada por la malla leftArm, ver nota arriba)
        rightArmRegion: {
            base:    (w) => ({ top: [44,16,w,4], bottom: [44+w,16,w,4], right: [40,20,4,12], left: [40+4+w,20,4,12], front: [44,20,w,12], back: [44+w+4,20,w,12] }),
            overlay: (w) => ({ top: [44,32,w,4], bottom: [44+w,32,w,4], right: [40,36,4,12], left: [40+4+w,36,4,12], front: [44,36,w,12], back: [44+w+4,36,w,12] })
        },
        // "Left Arm" oficial del juego (usada por la malla rightArm, ver nota arriba)
        leftArmRegion: {
            base:    (w) => ({ top: [36,48,w,4], bottom: [36+w,48,w,4], right: [32,52,4,12], left: [32+4+w,52,4,12], front: [36,52,w,12], back: [36+w+4,52,w,12] }),
            overlay: (w) => ({ top: [52,48,w,4], bottom: [52+w,48,w,4], right: [48,52,4,12], left: [48+4+w,52,4,12], front: [52,52,w,12], back: [52+w+4,52,w,12] })
        },
        // "Right Leg" oficial del juego (usada por la malla leftLeg)
        rightLegRegion: {
            base:    { top: [4,16,4,4],  bottom: [8,16,4,4],  right: [0,20,4,12],  left: [8,20,4,12],  front: [4,20,4,12],  back: [12,20,4,12] },
            overlay: { top: [4,32,4,4],  bottom: [8,32,4,4],  right: [0,36,4,12],  left: [8,36,4,12],  front: [4,36,4,12],  back: [12,36,4,12] }
        },
        // "Left Leg" oficial del juego (usada por la malla rightLeg)
        leftLegRegion: {
            base:    { top: [20,48,4,4], bottom: [24,48,4,4], right: [16,52,4,12], left: [24,52,4,12], front: [20,52,4,12], back: [28,52,4,12] },
            overlay: { top: [4,48,4,4],  bottom: [8,48,4,4],  right: [0,52,4,12],  left: [8,52,4,12],  front: [4,52,4,12],  back: [12,52,4,12] }
        }
    };
 

    // ================= C. CONSTRUCTOR DE ANATOMÍA CÚBICA (MÉTODO LIMPIO UNIFICADO) =================
    const armarPersonaje3D = (materialInyectado = null) => {
        while (playerGroup.children.length > 0) { playerGroup.remove(playerGroup.children[0]); }
        meshes = {};

        const matFinal = materialInyectado || new THREE.MeshLambertMaterial({ color: 0x555555 });
        const anchoBrazo = isSlim ? 3 : 4;

        // Cabeza
        const geoHead = new THREE.BoxGeometry(8, 8, 8); aplicarUVCompleto(geoHead, UV_MAP.head.base);
        meshes.head = new THREE.Mesh(geoHead, matFinal); meshes.head.position.set(0, 10, 0);
        // Torso
        const geoTorso = new THREE.BoxGeometry(8, 12, 4); aplicarUVCompleto(geoTorso, UV_MAP.torso.base);
        meshes.torso = new THREE.Mesh(geoTorso, matFinal); meshes.torso.position.set(0, 0, 0);
        // Brazos
        const geoLeftArm = new THREE.BoxGeometry(anchoBrazo, 12, 4); aplicarUVCompleto(geoLeftArm, UV_MAP.rightArmRegion.base(anchoBrazo));
        meshes.leftArm = new THREE.Mesh(geoLeftArm, matFinal); meshes.leftArm.position.set(-(4 + anchoBrazo / 2), 0, 0);
        const geoRightArm = new THREE.BoxGeometry(anchoBrazo, 12, 4); aplicarUVCompleto(geoRightArm, UV_MAP.leftArmRegion.base(anchoBrazo));
        meshes.rightArm = new THREE.Mesh(geoRightArm, matFinal); meshes.rightArm.position.set((4 + anchoBrazo / 2), 0, 0);
        // Piernas
        const geoLeftLeg = new THREE.BoxGeometry(4, 12, 4); aplicarUVCompleto(geoLeftLeg, UV_MAP.rightLegRegion.base);
        meshes.leftLeg = new THREE.Mesh(geoLeftLeg, matFinal); meshes.leftLeg.position.set(-2, -12, 0);
        const geoRightLeg = new THREE.BoxGeometry(4, 12, 4); aplicarUVCompleto(geoRightLeg, UV_MAP.leftLegRegion.base);
        meshes.rightLeg = new THREE.Mesh(geoRightLeg, matFinal); meshes.rightLeg.position.set(2, -12, 0);

        // CAPAS EXTERIORES (OVERLAYS)
        const geoJacketHead = new THREE.BoxGeometry(8.5, 8.5, 8.5); aplicarUVCompleto(geoJacketHead, UV_MAP.head.overlay);
        meshes.jacketHead = new THREE.Mesh(geoJacketHead, matFinal); meshes.jacketHead.position.copy(meshes.head.position);
        const geoJacketTorso = new THREE.BoxGeometry(8.5, 12.5, 4.5); aplicarUVCompleto(geoJacketTorso, UV_MAP.torso.overlay);
        meshes.jacketTorso = new THREE.Mesh(geoJacketTorso, matFinal); meshes.jacketTorso.position.copy(meshes.torso.position);
        const geoJacketLeftArm = new THREE.BoxGeometry(anchoBrazo + 0.5, 12.5, 4.5); aplicarUVCompleto(geoJacketLeftArm, UV_MAP.rightArmRegion.overlay(anchoBrazo));
        meshes.jacketLeftArm = new THREE.Mesh(geoJacketLeftArm, matFinal); meshes.jacketLeftArm.position.copy(meshes.leftArm.position);
        const geoJacketRightArm = new THREE.BoxGeometry(anchoBrazo + 0.5, 12.5, 4.5); aplicarUVCompleto(geoJacketRightArm, UV_MAP.leftArmRegion.overlay(anchoBrazo));
        meshes.jacketRightArm = new THREE.Mesh(geoJacketRightArm, matFinal); meshes.jacketRightArm.position.copy(meshes.rightArm.position);
        const geoJacketLeftLeg = new THREE.BoxGeometry(4.5, 12.5, 4.5); aplicarUVCompleto(geoJacketLeftLeg, UV_MAP.rightLegRegion.overlay);
        meshes.jacketLeftLeg = new THREE.Mesh(geoJacketLeftLeg, matFinal); meshes.jacketLeftLeg.position.copy(meshes.leftLeg.position);
        const geoJacketRightLeg = new THREE.BoxGeometry(4.5, 12.5, 4.5); aplicarUVCompleto(geoJacketRightLeg, UV_MAP.leftLegRegion.overlay);
        meshes.jacketRightLeg = new THREE.Mesh(geoJacketRightLeg, matFinal); meshes.jacketRightLeg.position.copy(meshes.rightLeg.position);

        Object.keys(meshes).forEach(key => { playerGroup.add(meshes[key]); });
    };

    armarPersonaje3D();

    // D. BUCLE DE ROTACIÓN AUTOMÁTICA
    const renderizarLoop = () => {
        requestAnimationFrame(renderizarLoop);
        playerGroup.rotation.y += 0.01; renderer.render(scene, camera);
    };
    renderizarLoop();

    // ROTACIÓN MANUAL POR ARRASTRE (horizontal Y vertical, libre en los 360°)
    let isDragging = false, lastMouseX = 0, lastMouseY = 0;
    realCanvas.addEventListener('mousedown', (e) => { isDragging = true; lastMouseX = e.clientX; lastMouseY = e.clientY; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    realCanvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - lastMouseX; playerGroup.rotation.y += deltaX * 0.01; lastMouseX = e.clientX;
            const deltaY = e.clientY - lastMouseY; playerGroup.rotation.x += deltaY * 0.01; lastMouseY = e.clientY; // Vertical: permite verla de arriba, abajo, e incluso "de cabeza"
        }
    });

    // CONTROLES DE ZOOM
    const aplicarZoom = (nuevoNivel) => {
        zoomLevel = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nuevoNivel));
        camera.zoom = zoomLevel; camera.updateProjectionMatrix();
    };
    if (btnZoomIn) btnZoomIn.addEventListener('click', () => aplicarZoom(zoomLevel + ZOOM_STEP));
    if (btnZoomOut) btnZoomOut.addEventListener('click', () => aplicarZoom(zoomLevel - ZOOM_STEP));
    realCanvas.addEventListener('wheel', (e) => {
        e.preventDefault(); aplicarZoom(zoomLevel + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    }, { passive: false });

    // ================= BLOQUE 3 (AISLADO): PALETA DE COLORES DOMINANTES DE LA SKIN =================
    // Este bloque es 100% independiente del motor 3D: solo lee píxeles de la imagen ya cargada
    // y pinta 10 divs. Si algo fallara aquí, el try/catch evita que rompa el resto del visor.
    const extraerPaletaColores = (imgEl) => {
        try {
            const w = imgEl.naturalWidth || imgEl.width;
            const h = imgEl.naturalHeight || imgEl.height;
            if (!w || !h) return [];

            const canvasAnalisis = document.createElement('canvas');
            canvasAnalisis.width = w;
            canvasAnalisis.height = h;
            const ctx = canvasAnalisis.getContext('2d');
            ctx.drawImage(imgEl, 0, 0, w, h);

            const pixelData = ctx.getImageData(0, 0, w, h).data;
            const conteoColores = new Map();

            for (let i = 0; i < pixelData.length; i += 4) {
                const r = pixelData[i], g = pixelData[i + 1], b = pixelData[i + 2], a = pixelData[i + 3];
                if (a < 128) continue; // Ignoramos píxeles transparentes (zonas vacías de la textura)
                const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
                conteoColores.set(hex, (conteoColores.get(hex) || 0) + 1);
            }

            return [...conteoColores.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 14)
                .map(entry => entry[0]);
        } catch (err) {
            console.warn("Paleta de colores: no se pudo analizar la skin (no afecta al visor 3D).", err);
            return [];
        }
    };

    const pintarPaletaEnDOM = (coloresHex) => {
        try {
            paletteSlots.forEach((slot, i) => {
                if (coloresHex[i]) {
                    slot.classList.remove('empty-slot');
                    slot.style.background = coloresHex[i];
                    slot.setAttribute('data-hex', coloresHex[i]);
                    slot.setAttribute('title', coloresHex[i]);
                } else {
                    slot.classList.add('empty-slot');
                    slot.style.background = '';
                    slot.removeAttribute('data-hex');
                    slot.setAttribute('title', 'Vacío');
                }
            });
        } catch (err) {
            console.warn("Paleta de colores: no se pudo pintar el resultado (no afecta al visor 3D).", err);
        }
    };

    // E. CARGADOR LOCAL POR OBJETO BLOB DIRECTO NATIVO (100% LIBRE DE ERRORES)
    if (skinInput) {
        skinInput.addEventListener("change", (event) => {
            const archivos = event.target.files;
            if (archivos && archivos.length > 0) {
                const urlRamLocal = URL.createObjectURL(archivos[0]);
                console.log("Mapeando textura universal local...");

                const loaderTextura = new THREE.TextureLoader();
                loaderTextura.load(urlRamLocal,
                    (texturaPNG) => {
                        texturaPNG.magFilter = THREE.NearestFilter;
                        texturaPNG.minFilter = THREE.NearestFilter;
                        texturaActual = texturaPNG;

                        const matMapeado = new THREE.MeshLambertMaterial({ map: texturaPNG, transparent: true, alphaTest: 0.5 });
                        armarPersonaje3D(matMapeado);
                        console.log("¡Éxito Absoluto! Visor 3D actualizado.");

                        // Bloque 3 aislado: si esto fallara, el visor de arriba ya quedó funcionando igual
                        pintarPaletaEnDOM(extraerPaletaColores(texturaPNG.image));

                        URL.revokeObjectURL(urlRamLocal);
                    }
                );
            }
        });
    }

    // CONMUTADORES STEVE / ALEX
    const btnModelDefault = document.getElementById("btnModelDefault");
    const btnModelSlim = document.getElementById("btnModelSlim");
    if (btnModelDefault && btnModelSlim) {
        btnModelDefault.addEventListener("click", () => { isSlim = false; btnModelSlim.classList.remove("active-model"); btnModelDefault.classList.add("active-model"); armarPersonaje3D(texturaActual ? new THREE.MeshLambertMaterial({ map: texturaActual, transparent: true, alphaTest: 0.5 }) : null); });
        btnModelSlim.addEventListener("click", () => { isSlim = true; btnModelDefault.classList.remove("active-model"); btnModelSlim.classList.add("active-model"); armarPersonaje3D(texturaActual ? new THREE.MeshLambertMaterial({ map: texturaActual, transparent: true, alphaTest: 0.5 }) : null); });
    }

    // MODIFICAR
    if (btnModifySkin) { btnModifySkin.addEventListener("click", (e) => { e.preventDefault(); window.location.href = "pages/studio.html"; }); }

    // INTERRUPTORES DEL MANIQUÍ
    const dollParts = document.querySelectorAll('.doll-part');
    dollParts.forEach(part => {
        part.addEventListener('click', () => {
            part.classList.toggle('active-part');
            const parteID = part.id; const estaEncendido = part.classList.contains('active-part');
            if (parteID === "toggleHead" && meshes.head) meshes.head.visible = estaEncendido;
            else if (parteID === "toggleTorso" && meshes.torso) meshes.torso.visible = estaEncendido;
            else if (parteID === "toggleLeftArm" && meshes.leftArm) meshes.leftArm.visible = estaEncendido;
            else if (parteID === "toggleRightArm" && meshes.rightArm) meshes.rightArm.visible = estaEncendido;
            else if (parteID === "toggleLeftLeg" && meshes.leftLeg) meshes.leftLeg.visible = estaEncendido;
            else if (parteID === "toggleRightLeg" && meshes.rightLeg) meshes.rightLeg.visible = estaEncendido;
            else if (parteID === "toggleLayerHead" && meshes.jacketHead) meshes.jacketHead.visible = estaEncendido;
            else if (parteID === "toggleLayerTorso" && meshes.jacketTorso) meshes.jacketTorso.visible = estaEncendido;
            else if (parteID === "toggleLayerLeftArm" && meshes.jacketLeftArm) meshes.jacketLeftArm.visible = estaEncendido;
            else if (parteID === "toggleLayerRightArm" && meshes.jacketRightArm) meshes.jacketRightArm.visible = estaEncendido;
            else if (parteID === "toggleLayerLeftLeg" && meshes.jacketLeftLeg) meshes.jacketLeftLeg.visible = estaEncendido;
            else if (parteID === "toggleLayerRightLeg" && meshes.jacketRightLeg) meshes.jacketRightLeg.visible = estaEncendido;
        });
    });
}); // Cierre maestro del DOMContentLoaded