// ================= ASSETS/JS/APP.JS (LÓGICA GLOBAL ESTABLE BLINDADA) =================
document.addEventListener('DOMContentLoaded', () => {
    // ELEMENTOS DE LA INTERFAZ CENTRAL
    const btnAjustes = document.getElementById('btnAjustes');
    const btnCloseSettings = document.getElementById('btnCloseSettings');
    const settingsModal = document.getElementById('settingsModal');
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const sidebar = document.getElementById('sidebar');
    const body = document.body;

    // ELEMENTOS DEL REPRODUCTOR JUKEBOX
    const jukeboxAudio = document.getElementById('jukeboxAudio');
    const visorTrackName = document.getElementById('visorTrackName');
    const volumeRange = document.getElementById('volumeRange');
    const btnResetAmbient = document.getElementById('btnResetAmbient');
    const btnJukeboxPlay = document.getElementById('btnJukeboxPlay');
    const btnJukeboxPause = document.getElementById('btnJukeboxPause');
    const discButtons = document.querySelectorAll('.jukebox-grid .disc-btn');
    let volumenObjetivo = 0.5;

    // 1. CONTROL DE APERTURA Y CIERRE DEL PANEL DE CONFIGURACIÓN
    if (btnAjustes && settingsModal) {
        btnAjustes.addEventListener('click', (e) => {
            e.preventDefault();
            settingsModal.classList.add('open');
        });
    }
    if (btnCloseSettings && settingsModal) {
        btnCloseSettings.addEventListener('click', () => { settingsModal.classList.remove('open'); });
    }

    // 2. INTERRUPTOR PARA COLAPSAR LA BARRA LATERAL (EL PISTÓN)
    if (btnToggleSidebar && sidebar) {
        btnToggleSidebar.addEventListener('click', () => { sidebar.classList.toggle('collapsed'); });
    }

    // 3. VIAJE DE DIMENSIONES (4 BOTONES INDEPENDIENTES DE ENLACE)
    const configTemas = [
        { btnId: 'btnThemeOverworld', claseTema: 'theme-overworld' },
        { btnId: 'btnThemeCuarzo', claseTema: 'theme-cuarzo' },
        { btnId: 'btnThemeNether', claseTema: 'theme-nether' },
        { btnId: 'btnThemeEnd', claseTema: 'theme-end' }
    ];

    configTemas.forEach(item => {
        const boton = document.getElementById(item.btnId);
        if (boton) {
            boton.addEventListener('click', () => {
                configTemas.forEach(t => body.classList.remove(t.claseTema));
                body.classList.add(item.claseTema);
                configTemas.forEach(t => {
                    const btn = document.getElementById(t.btnId);
                    if (btn) btn.classList.remove('active');
                });
                boton.classList.add('active');
            });
        }
    });

    // 4. LÓGICA INTEGRAL DEL JUKEBOX (MÚSICA, FADE-IN Y CONTROLES)
    if (jukeboxAudio && visorTrackName) {
        jukeboxAudio.src = '/assets/sounds/ambient.mp3';
        jukeboxAudio.volume = 0; 
        visorTrackName.textContent = 'Minecraft Soundtrack - Ambient';

        const ejecutarFadeIn = () => {
            let volActual = 0;
            jukeboxAudio.volume = volActual;
            const intervaloFade = setInterval(() => {
                if (volActual < volumenObjetivo) {
                    volActual += 0.01; 
                    if (volActual > volumenObjetivo) volActual = volumenObjetivo;
                    jukeboxAudio.volume = volActual;
                } else { clearInterval(intervaloFade); }
            }, 100); 
        };

        const iniciarMusicaBase = () => {
            jukeboxAudio.play().then(() => {
                ejecutarFadeIn(); 
                document.removeEventListener('click', iniciarMusicaBase);
            }).catch(error => {});
        };
        document.addEventListener('click', iniciarMusicaBase);

        if (btnJukeboxPlay) { btnJukeboxPlay.addEventListener('click', () => { jukeboxAudio.play(); }); }
        if (btnJukeboxPause) { btnJukeboxPause.addEventListener('click', () => { jukeboxAudio.pause(); }); }

        if (volumeRange) {
            volumeRange.addEventListener('input', (e) => {
                volumenObjetivo = e.target.value / 100;
                jukeboxAudio.volume = volumenObjetivo;
            });
        }

        if (btnResetAmbient) {
            btnResetAmbient.addEventListener('click', () => {
                discButtons.forEach(b => b.classList.remove('active-disc'));
                btnResetAmbient.classList.add('active-disc');
                jukeboxAudio.src = '/assets/sounds/ambient.mp3';
                jukeboxAudio.volume = volumenObjetivo; 
                jukeboxAudio.play();
                visorTrackName.textContent = 'Minecraft Soundtrack - Ambient';
            });
        }

        discButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const trackName = btn.getAttribute('data-track');
                discButtons.forEach(b => b.classList.remove('active-disc'));
                if (btnResetAmbient) btnResetAmbient.classList.remove('active-disc');
                btn.classList.add('active-disc');
                jukeboxAudio.src = `/assets/sounds/${trackName}.mp3`;
                jukeboxAudio.volume = volumenObjetivo; 
                jukeboxAudio.play();
                const nombreFormateado = trackName.charAt(0).toUpperCase() + trackName.slice(1);
                visorTrackName.textContent = `Music Disc - ${nombreFormateado}`;
            });
        });
    }

    // ================= EASTER EGG: 16 CLICS CON RESPUESTA MECÁNICA =================
    const heroLogo = document.querySelector('.hero-logo');
    const totemOverlay = document.getElementById('totemOverlay');
    const totemAudio = document.getElementById('totemAudio');
    const totemImg = document.querySelector('.totem-img');
    let clickCount = 0;
    let clickTimeout;

    if (heroLogo && totemOverlay && totemAudio && totemImg) {
        heroLogo.addEventListener('click', () => {
            clickCount++;
            clearTimeout(clickTimeout);
            clickTimeout = setTimeout(() => { clickCount = 0; }, 3500);

            if (clickCount === 16) {
                clickCount = 0; 
                const srcOriginal = totemImg.src;
                totemImg.src = '';
                totemImg.src = srcOriginal;
                totemAudio.currentTime = 0;
                totemAudio.play();
                totemOverlay.classList.add('active');
                setTimeout(() => { totemOverlay.classList.remove('active'); }, 1800);
            }
        });
    }
});