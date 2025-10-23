class App {
    constructor() {
        this.authService = authService;
        this.currentView = 'login';
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthentication();
    }

    bindEvents() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Navigation between login and register
        const registerLink = document.getElementById('register-link');
        if (registerLink) {
            registerLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showView('register');
            });
        }

        const loginLink = document.getElementById('login-link');
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showView('login');
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Navigation menu
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.getAttribute('data-view');
                this.loadView(view);
                
                // Update active nav link
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    checkAuthentication() {
        if (this.authService.isAuthenticated()) {
            this.showDashboard();
        } else {
            this.showView('login');
        }
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const messageEl = document.getElementById('login-message');
        const submitBtn = document.querySelector('#login-form button[type="submit"]');

        if (!email || !password) {
            messageEl.textContent = 'Por favor, completa todos los campos';
            messageEl.className = 'message error';
            return;
        }

        messageEl.textContent = '';
        messageEl.className = 'message';

        // Mostrar estado de carga
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Iniciando sesión...';
        submitBtn.disabled = true;

        const result = await this.authService.login(email, password);

        // Restaurar botón
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

        if (result.success) {
            messageEl.textContent = '¡Login exitoso! Redirigiendo...';
            messageEl.className = 'message success';
            setTimeout(() => this.showDashboard(), 1000);
        } else {
            messageEl.textContent = result.error;
            messageEl.className = 'message error';
        }
    }

    async handleRegister() {
        const formData = new FormData(document.getElementById('register-form'));
        const userData = {
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            email: formData.get('email'),
            username: formData.get('username'),
            password: formData.get('password')
        };

        const confirmPassword = formData.get('confirm_password');
        const messageEl = document.getElementById('register-message');
        const submitBtn = document.querySelector('#register-form button[type="submit"]');

        messageEl.textContent = '';
        messageEl.className = 'message';

        // Validaciones básicas
        if (!userData.first_name || !userData.last_name || !userData.email || !userData.username || !userData.password) {
            messageEl.textContent = 'Por favor, completa todos los campos';
            messageEl.className = 'message error';
            return;
        }

        if (userData.password !== confirmPassword) {
            messageEl.textContent = 'Las contraseñas no coinciden';
            messageEl.className = 'message error';
            return;
        }

        if (userData.password.length < 6) {
            messageEl.textContent = 'La contraseña debe tener al menos 6 caracteres';
            messageEl.className = 'message error';
            return;
        }

        // Mostrar estado de carga
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Registrando...';
        submitBtn.disabled = true;

        const result = await this.authService.register(userData);

        // Restaurar botón
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

        if (result.success) {
            messageEl.textContent = '¡Registro exitoso! Ahora puedes iniciar sesión';
            messageEl.className = 'message success';
            setTimeout(() => this.showView('login'), 2000);
        } else {
            messageEl.textContent = result.error;
            messageEl.className = 'message error';
        }
    }

    handleLogout() {
        this.authService.logout();
        this.showView('login');
    }

    showView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
        }

        // Clear forms when switching views
        if (viewName === 'login') {
            const loginForm = document.getElementById('login-form');
            if (loginForm) loginForm.reset();
            const loginMessage = document.getElementById('login-message');
            if (loginMessage) loginMessage.textContent = '';
        } else if (viewName === 'register') {
            const registerForm = document.getElementById('register-form');
            if (registerForm) registerForm.reset();
            const registerMessage = document.getElementById('register-message');
            if (registerMessage) registerMessage.textContent = '';
        }
    }

    showDashboard() {
        this.showView('dashboard');
        this.updateUserInfo();
        this.loadView('dashboard');
    }

    updateUserInfo() {
        if (this.authService.user) {
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = 
                    `${this.authService.user.first_name} ${this.authService.user.last_name}`;
            }
        }
    }

    async loadView(viewName) {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) return;
        
        switch (viewName) {
            case 'dashboard':
                contentArea.innerHTML = `
                    <div class="welcome-message">
                        <h2>¡Bienvenido, ${this.authService.user?.first_name || 'Usuario'}!</h2>
                        <p>Selecciona una opción del menú para gestionar el sistema académico.</p>
                        <div class="mt-20">
                            <h3>Resumen del Sistema</h3>
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <h4>Estudiantes</h4>
                                    <p id="students-count">-</p>
                                </div>
                                <div class="stat-card">
                                    <h4>Profesores</h4>
                                    <p id="teachers-count">-</p>
                                </div>
                                <div class="stat-card">
                                    <h4>Cursos</h4>
                                    <p id="courses-count">-</p>
                                </div>
                                <div class="stat-card">
                                    <h4>Carreras</h4>
                                    <p id="careers-count">-</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                this.loadStats();
                break;

            case 'profile':
                contentArea.innerHTML = `
                    <div class="profile-view">
                        <h2>Mi Perfil</h2>
                        <div class="profile-card">
                            <div id="profile-content">
                                <p>Cargando información del perfil...</p>
                            </div>
                        </div>
                    </div>
                `;
                this.loadProfile();
                break;

            default:
                contentArea.innerHTML = `
                    <div class="welcome-message">
                        <h2>${viewName.charAt(0).toUpperCase() + viewName.slice(1)}</h2>
                        <p>Vista de ${viewName} - En desarrollo</p>
                    </div>
                `;
        }
    }

    async loadStats() {
        try {
            // Simular carga de estadísticas
            setTimeout(() => {
                const studentsCount = document.getElementById('students-count');
                const teachersCount = document.getElementById('teachers-count');
                const coursesCount = document.getElementById('courses-count');
                const careersCount = document.getElementById('careers-count');
                
                if (studentsCount) studentsCount.textContent = '125';
                if (teachersCount) teachersCount.textContent = '25';
                if (coursesCount) coursesCount.textContent = '45';
                if (careersCount) careersCount.textContent = '8';
            }, 1000);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadProfile() {
        try {
            const response = await this.authService.makeAuthenticatedRequest('/api/auth/profile');
            if (response.ok) {
                const data = await response.json();
                const profileContent = document.getElementById('profile-content');
                
                if (profileContent) {
                    profileContent.innerHTML = `
                        <div style="display: grid; gap: 15px;">
                            <div><strong>Nombre:</strong> ${data.user.first_name} ${data.user.last_name}</div>
                            <div><strong>Email:</strong> ${data.user.email}</div>
                            <div><strong>Usuario:</strong> ${data.user.username}</div>
                            <div><strong>Rol:</strong> ${data.user.role_name}</div>
                            <div><strong>Último acceso:</strong> ${data.user.last_login ? new Date(data.user.last_login).toLocaleString() : 'Nunca'}</div>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            const profileContent = document.getElementById('profile-content');
            if (profileContent) {
                profileContent.innerHTML = '<p class="message error">Error cargando el perfil</p>';
            }
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new App();
});