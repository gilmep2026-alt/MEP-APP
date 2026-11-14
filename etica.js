// 1. Lógica del Modo Oscuro / Claro
const themeToggle = document.getElementById('themeToggle');
const htmlElement = document.documentElement;

const savedTheme = localStorage.getItem('mep-etica-theme') || 'dark';
htmlElement.setAttribute('data-theme', savedTheme);
themeToggle.innerHTML = savedTheme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro';

themeToggle.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    htmlElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('mep-etica-theme', newTheme);
    
    themeToggle.innerHTML = newTheme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
});

// 2. Lógica para Descargar PDF
document.getElementById('downloadPdf').addEventListener('click', () => {
    window.print();
});

// 3. Barra de Progreso de Lectura
window.onscroll = function() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    document.getElementById("progress-bar").style.width = scrolled + "%";
};
