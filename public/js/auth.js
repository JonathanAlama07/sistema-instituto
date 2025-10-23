class AuthService {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
    }

    async login(email, password) {
        try {
            console.log('🔐 Enviando login a la API...', { email });
            
            const response = await fetch('/api/auth/login', {
                method: 'POST', // ✅ Asegurar que sea POST
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    email: email.trim(),
                    password: password 
                })
            });

            console.log('📡 Respuesta del servidor:', response.status);

            if (!response.ok) {
                // Si el status no es 200-299, manejar el error
                const errorText = await response.text();
                console.error('❌ Error del servidor:', errorText);
                
                try {
                    const errorData = JSON.parse(errorText);
                    return { 
                        success: false, 
                        error: errorData.error || 'Error en el login' 
                    };
                } catch {
                    return { 
                        success: false, 
                        error: `Error del servidor: ${response.status} ${response.statusText}` 
                    };
                }
            }

            const data = await response.json();

            this.token = data.token;
            this.user = data.user;
            
            localStorage.setItem('token', this.token);
            localStorage.setItem('user', JSON.stringify(this.user));
            
            console.log('✅ Login exitoso');
            return { success: true, data };

        } catch (error) {
            console.error('❌ Error de conexión:', error);
            return { 
                success: false, 
                error: 'No se pudo conectar al servidor. Verifica que el servidor esté ejecutándose.' 
            };
        }
    }

    async register(userData) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST', // ✅ Asegurar que sea POST
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    return { 
                        success: false, 
                        error: errorData.error || 'Error en el registro' 
                    };
                } catch {
                    return { 
                        success: false, 
                        error: `Error del servidor: ${response.status}` 
                    };
                }
            }

            const data = await response.json();
            return { success: true, data };

        } catch (error) {
            return { 
                success: false, 
                error: 'Error de conexión con el servidor' 
            };
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    isAuthenticated() {
        return !!this.token;
    }

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }

    async makeAuthenticatedRequest(url, options = {}) {
        const headers = this.getAuthHeaders();
        const config = {
            method: 'GET', // Por defecto GET para requests autenticados
            ...options,
            headers: { ...headers, ...options.headers }
        };

        const response = await fetch(url, config);
        return response;
    }
}

// Instancia global del servicio de autenticación
const authService = new AuthService();