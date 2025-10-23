const usuariosValidos = [
    { email: "admin@instituto.edu", password: "admin123", nombre: "Administrador", rol: "admin" },
    { email: "profesor@instituto.edu", password: "profesor123", nombre: "Profesor", rol: "profesor" },
    { email: "estudiante@instituto.edu", password: "estudiante123", nombre: "Estudiante", rol: "estudiante" }
];

async function loginUser(email, password) {
    console.log('@ Enviando login...', { email });
    
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const usuario = usuariosValidos.find(user => 
            user.email === email && user.password === password
        );
        
        if (usuario) {
            console.log('@ Login exitoso:', usuario);
            localStorage.setItem('user', JSON.stringify(usuario));
            localStorage.setItem('isLoggedIn', 'true');
            return { success: true, user: usuario };
        } else {
            console.log('@ Credenciales incorrectas');
            return { success: false, error: "Credenciales incorrectas" };
        }
        
    } catch (error) {
        console.error('@ Error:', error);
        return { success: false, error: "Error: " + error.message };
    }
}

function logoutUser() {
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
}

function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function isAuthenticated() {
    return localStorage.getItem('isLoggedIn') === 'true';
}