// ================= ASSETS/JS/AUTH.JS (SESIÓN DE USUARIO, COMPARTIDO EN TODO EL SITIO) =================
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof supabase === 'undefined') {
        console.warn('Supabase no cargó — revisa que el <script> del CDN esté antes de auth.js en esta página.');
        return;
    }

    const SUPABASE_URL = 'https://zwjnozitqetyjsnkejxb.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_USVyGkCXW6VART0ijcISUQ_TEnwR-Ah';
    const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.craftitySupabase = client; // Disponible para otros scripts de la página (ej. la futura Galería)

    // ================= SINCRONIZAR EL SIDEBAR CON LA SESIÓN ACTUAL =================
    const profileUsernameEl = document.querySelector('.user-profile-box .username');
    const loginBtn = document.querySelector('.login-btn');
    const loginBtnText = loginBtn ? loginBtn.querySelector('.sidebar-text') : null;

    const actualizarSidebarSegunSesion = async () => {
        const { data: { session } } = await client.auth.getSession();

        if (session) {
            const { data: perfil } = await client
                .from('profiles')
                .select('username')
                .eq('id', session.user.id)
                .single();

            if (profileUsernameEl) profileUsernameEl.textContent = perfil ? perfil.username : session.user.email;
            if (loginBtnText) loginBtnText.innerHTML = 'CERRAR<br>SESIÓN';
        } else {
            if (profileUsernameEl) profileUsernameEl.textContent = 'Invitado';
            if (loginBtnText) loginBtnText.innerHTML = 'INICIAR<br>SESIÓN';
        }
    };

    if (loginBtn) {
        loginBtn.addEventListener('click', async (e) => {
            const { data: { session } } = await client.auth.getSession();
            if (session) {
                // Si ya hay sesión, este botón cierra sesión en vez de llevar a login.html
                e.preventDefault();
                await client.auth.signOut();
                await actualizarSidebarSegunSesion();
                const enPaginaInterna = window.location.pathname.includes('/pages/');
                window.location.href = enPaginaInterna ? '../index.html' : 'index.html';
            }
            // Si NO hay sesión, no hacemos nada extra: el link normal a login.html sigue funcionando
        });
    }

    await actualizarSidebarSegunSesion();

    // ================= FORMULARIOS DE login.html (si existen en esta página) =================
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');

    if (tabLogin && tabRegister && formLogin && formRegister) {
        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            formLogin.style.display = 'flex';
            formRegister.style.display = 'none';
        });
        tabRegister.addEventListener('click', () => {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            formRegister.style.display = 'flex';
            formLogin.style.display = 'none';
        });
    }

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorEl = document.getElementById('loginError');
            errorEl.textContent = '';

            const { error } = await client.auth.signInWithPassword({ email, password });
            if (error) { errorEl.textContent = error.message; return; }
            window.location.href = '../index.html';
        });
    }

    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('registerUsername').value.trim();
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const errorEl = document.getElementById('registerError');
            const hintEl = document.getElementById('registerHint');
            errorEl.textContent = '';
            hintEl.textContent = '';

            const { error } = await client.auth.signUp({
                email,
                password,
                options: { data: { username } } // El trigger de Supabase lee esto para crear el perfil
            });

            if (error) { errorEl.textContent = error.message; return; }
            hintEl.textContent = '¡Cuenta creada! Revisa tu email para confirmar antes de iniciar sesión.';
            formRegister.reset();
        });
    }
});
