// 1. Lógica del Modo Oscuro / Claro
const themeToggle = document.getElementById('themeToggle');
const htmlElement = document.documentElement;

const savedTheme = localStorage.getItem('mep-estatutos-theme') || 'dark';
htmlElement.setAttribute('data-theme', savedTheme);
themeToggle.innerHTML = savedTheme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro';

themeToggle.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    htmlElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('mep-estatutos-theme', newTheme);
    
    themeToggle.innerHTML = newTheme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
});

// 2. Lógica para Descargar PDF (Abre todos los acordeones antes de imprimir)
document.getElementById('downloadPdf').addEventListener('click', () => {
    const details = document.querySelectorAll('details');
    const wasOpen = [];
    
    // Guardar estado actual y abrir todos para que el PDF muestre todo
    details.forEach((d, i) => {
        wasOpen[i] = d.open;
        d.open = true; 
    });

    // Llamar a la ventana de impresión
    window.print();

    // Restaurar estado después de imprimir
    setTimeout(() => {
        details.forEach((d, i) => {
            d.open = wasOpen[i];
        });
    }, 500);
});

// 3. Barra de Progreso de Lectura
window.onscroll = function() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    document.getElementById("progress-bar").style.width = scrolled + "%";
};
