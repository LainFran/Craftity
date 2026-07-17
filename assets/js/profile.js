// ================= ASSETS/JS/PROFILE.JS (MÓDULO PROFILE - FASE 2) =================
document.addEventListener('DOMContentLoaded', async () => {
    const client = window.craftitySupabase;
    if (!client) {
        console.warn('Supabase no está listo (revisa que auth.js cargue antes que profile.js).');
        return;
    }

    // ================= DETERMINAR QUÉ PERFIL MOSTRAR =================
    // ?user=NombreDeUsuario muestra el perfil de esa persona (público);
    // sin parámetro, muestra el perfil de quien tenga la sesión iniciada.
    const params = new URLSearchParams(window.location.search);
    const usernameParam = params.get('user');

    const { data: { session } } = await client.auth.getSession();

    let perfil = null;
    let esPropio = false;

    if (usernameParam) {
        const { data } = await client.from('profiles').select('*').eq('username', usernameParam).single();
        perfil = data;
        esPropio = !!(session && perfil && session.user.id === perfil.id);
    } else if (session) {
        const { data } = await client.from('profiles').select('*').eq('id', session.user.id).single();
        perfil = data;
        esPropio = true;
    } else {
        // Sin parámetro de usuario y sin sesión: no hay nada que mostrar
        window.location.href = 'login.html';
        return;
    }

    if (!perfil) {
        const tituloEl = document.getElementById('passportUsername');
        if (tituloEl) tituloEl.textContent = 'Usuario no encontrado';
        return;
    }

    // ================= PINTAR LOS DATOS EN LA FICHA =================
    // Muestra la bandera del idioma elegido; si esa bandera no existe todavía como archivo
    // (por ahora solo confirmamos que existen flag-es.png y flag-en.png), cae de vuelta a texto.
    const pintarIdioma = (idioma) => {
        const flagEl = document.getElementById('passportIdiomaFlag');
        const fallbackEl = document.getElementById('passportIdiomaFallback');
        if (!flagEl || !fallbackEl) return;

        if (!idioma) {
            flagEl.style.display = 'none';
            fallbackEl.style.display = 'inline';
            fallbackEl.textContent = 'No especificado';
            return;
        }

        flagEl.onerror = () => {
            flagEl.style.display = 'none';
            fallbackEl.style.display = 'inline';
            fallbackEl.textContent = idioma.toUpperCase();
        };
        flagEl.onload = () => {
            flagEl.style.display = 'inline';
            fallbackEl.style.display = 'none';
        };
        flagEl.src = `../assets/images/flag-${idioma}.png`;
        flagEl.alt = idioma.toUpperCase();
    };

    const pintarPerfil = (p) => {
        const setTexto = (id, valor) => { const el = document.getElementById(id); if (el) el.textContent = valor; };

        setTexto('passportUsername', p.username);
        setTexto('passportNumber', p.passport_number || '----‑----‑----‑----');

        const fecha = p.created_at
            ? new Date(p.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '--';
        setTexto('passportCreated', fecha);
        pintarIdioma(p.idioma);
        setTexto('passportBio', p.biography || 'Sin biografía todavía.');

        const tagsEl = document.getElementById('passportTags');
        if (tagsEl) {
            tagsEl.innerHTML = '';
            (p.tags || []).forEach(t => {
                const chip = document.createElement('span');
                chip.className = 'passport-tag-chip';
                chip.textContent = t;
                tagsEl.appendChild(chip);
            });
        }

        const badgesEl = document.getElementById('passportBadges');
        if (badgesEl) {
            badgesEl.innerHTML = '';
            (p.badges || []).forEach(b => {
                const chip = document.createElement('span');
                chip.className = 'passport-badge-chip';
                chip.textContent = b;
                badgesEl.appendChild(chip);
            });
        }

        if (p.profile_skin_url) dibujarCabezaDesdeSkin(p.profile_skin_url);
    };

    // ================= VISOR 2D: RECORTA SOLO LA CABEZA (8x8 + OVERLAY) DE LA SKIN =================
    const dibujarCabezaDesdeSkin = (url) => {
        const canvas = document.getElementById('headCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Cara frontal de la cabeza: x8-16, y8-16 del PNG de 64x64 (mismas coordenadas del UV_MAP)
            ctx.drawImage(img, 8, 8, 8, 8, 0, 0, canvas.width, canvas.height);
            // Overlay de la cabeza (pelo, gorro, etc.), encima — si tiene zonas transparentes, se ve la base
            ctx.drawImage(img, 40, 8, 8, 8, 0, 0, canvas.width, canvas.height);
        };
        img.onerror = () => console.warn('No se pudo cargar la skin de perfil desde', url);
        img.src = url;
    };

    pintarPerfil(perfil);

    // ================= SEGUIDORES / SIGUIENDO (funciona en cualquier perfil, propio o ajeno) =================
    const actualizarContadoresSociales = async () => {
        const [{ count: seguidores }, { count: siguiendo }] = await Promise.all([
            client.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', perfil.id),
            client.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', perfil.id)
        ]);
        const setTexto = (id, valor) => { const el = document.getElementById(id); if (el) el.textContent = valor; };
        setTexto('followersCount', seguidores ?? 0);
        setTexto('followingCount', siguiendo ?? 0);
    };

    const inicializarBotonSeguir = async () => {
        const btnFollow = document.getElementById('btnFollowToggle');
        if (!btnFollow) return;

        // No tiene sentido "seguirte a vos mismo", ni seguir sin haber iniciado sesión
        if (esPropio || !session) {
            btnFollow.style.display = 'none';
            return;
        }
        btnFollow.style.display = 'inline-flex';

        const actualizarEstadoBoton = async () => {
            const { data: yaSigue } = await client
                .from('follows')
                .select('follower_id')
                .eq('follower_id', session.user.id)
                .eq('following_id', perfil.id)
                .maybeSingle();
            btnFollow.textContent = yaSigue ? 'DEJAR DE SEGUIR' : 'SEGUIR';
            btnFollow.classList.toggle('following-active', !!yaSigue);
        };

        await actualizarEstadoBoton();

        // El listener se conecta UNA sola vez acá afuera; las funciones de arriba solo refrescan datos
        btnFollow.addEventListener('click', async () => {
            btnFollow.disabled = true;
            if (btnFollow.textContent === 'SEGUIR') {
                await client.from('follows').insert({ follower_id: session.user.id, following_id: perfil.id });
            } else {
                await client.from('follows').delete()
                    .eq('follower_id', session.user.id)
                    .eq('following_id', perfil.id);
            }
            await actualizarEstadoBoton();
            await actualizarContadoresSociales();
            btnFollow.disabled = false;
        });
    };

    await actualizarContadoresSociales();
    await inicializarBotonSeguir();

    // ================= GALERÍA PERSONAL =================
    // RLS ya filtra solo: si es tu perfil ves todo (público+privado); si es ajeno, solo lo público.
    const cargarGaleria = async () => {
        const grid = document.getElementById('galleryGrid');
        const emptyMsg = document.getElementById('galleryEmptyMsg');
        if (!grid) return;

        const { data: skins, error } = await client
            .from('skins')
            .select('*')
            .eq('owner_id', perfil.id)
            .order('created_at', { ascending: false });

        grid.innerHTML = '';

        if (error || !skins || skins.length === 0) {
            if (emptyMsg) emptyMsg.style.display = 'block';
            return;
        }
        if (emptyMsg) emptyMsg.style.display = 'none';

        // Construimos el DOM a mano (nada de innerHTML con datos del usuario) para que un título
        // de skin con caracteres raros nunca pueda inyectar HTML/JS en la página de otra persona.
        skins.forEach(s => {
            const card = document.createElement('div');
            card.className = 'gallery-item';

            const img = document.createElement('img');
            img.src = s.image_url;
            img.alt = s.title;
            card.appendChild(img);

            const tituloEl = document.createElement('p');
            tituloEl.className = 'gallery-item-title';
            tituloEl.textContent = s.title;
            card.appendChild(tituloEl);

            const metaEl = document.createElement('p');
            metaEl.className = 'gallery-item-meta';
            let metaTexto = `❤️ ${s.likes_count}`;
            if (esPropio) metaTexto += s.is_public ? ' · Pública' : ' · Privada';
            metaEl.textContent = metaTexto;
            card.appendChild(metaEl);

            grid.appendChild(card);
        });
    };

    await cargarGaleria();

    // ================= EDICIÓN (solo visible si es tu propio perfil) =================
    const btnEditProfile = document.getElementById('btnEditProfile');
    if (!esPropio || !btnEditProfile) return; // Perfil ajeno: nada más que hacer

    btnEditProfile.style.display = 'inline-flex';

    const editModal = document.getElementById('profileEditModal');
    const btnCloseEdit = document.getElementById('btnCloseEdit');
    const formEdit = document.getElementById('formEditProfile');
    const editBio = document.getElementById('editBio');
    const bioCounter = document.getElementById('bioCounter');
    const editTagInput = document.getElementById('editTagInput');
    const tagsChips = document.getElementById('tagsChips');
    const editIdioma = document.getElementById('editIdioma');
    const editSkinFile = document.getElementById('editSkinFile');
    const editError = document.getElementById('editProfileError');

    let tagsActuales = [...(perfil.tags || [])];

    const renderizarChips = () => {
        tagsChips.innerHTML = '';
        tagsActuales.forEach((t, i) => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.innerHTML = `${t} <button type="button">✕</button>`;
            chip.querySelector('button').addEventListener('click', () => {
                tagsActuales.splice(i, 1);
                renderizarChips();
            });
            tagsChips.appendChild(chip);
        });
    };

    const precargarFormulario = () => {
        editBio.value = perfil.biography || '';
        bioCounter.textContent = editBio.value.length;
        editIdioma.value = perfil.idioma || '';
        tagsActuales = [...(perfil.tags || [])];
        renderizarChips();
        editError.textContent = '';
    };

    btnEditProfile.addEventListener('click', () => {
        precargarFormulario();
        editModal.classList.add('open');
    });

    if (btnCloseEdit) btnCloseEdit.addEventListener('click', () => editModal.classList.remove('open'));

    editBio.addEventListener('input', () => { bioCounter.textContent = editBio.value.length; });

    editTagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const valor = editTagInput.value.trim();
            if (valor && tagsActuales.length < 3 && !tagsActuales.includes(valor)) {
                tagsActuales.push(valor);
                renderizarChips();
            }
            editTagInput.value = '';
        }
    });

    formEdit.addEventListener('submit', async (e) => {
        e.preventDefault();
        editError.textContent = '';

        let profileSkinUrl = perfil.profile_skin_url || null;
        const archivo = editSkinFile.files[0];

        if (archivo) {
            const nombreArchivo = `avatars/${session.user.id}-${Date.now()}.png`;
            const { error: errorSubida } = await client.storage.from('skins').upload(nombreArchivo, archivo, { upsert: true });
            if (errorSubida) { editError.textContent = 'Error subiendo la imagen: ' + errorSubida.message; return; }
            const { data: urlData } = client.storage.from('skins').getPublicUrl(nombreArchivo);
            profileSkinUrl = urlData.publicUrl;
        }

        const { error } = await client.from('profiles').update({
            idioma: editIdioma.value || null,
            tags: tagsActuales,
            biography: editBio.value || null,
            profile_skin_url: profileSkinUrl
        }).eq('id', session.user.id);

        if (error) { editError.textContent = error.message; return; }

        editModal.classList.remove('open');
        window.location.reload();
    });
});