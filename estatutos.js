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

// 2. Lógica para Descargar PDF
document.getElementById('downloadPdf').addEventListener('click', () => {
    const details = document.querySelectorAll('details');
    const wasOpen = [];
    
    // Guardar estado y abrir todo
    details.forEach((d, i) => {
        wasOpen[i] = d.open;
        d.open = true; 
        d.style.display = 'block'; // Asegurar que nada esté oculto por la búsqueda
    });

    // Ocultar barra de búsqueda temporalmente para el PDF
    const searchCont = document.getElementById('searchContainer');
    const originalSearchDisplay = searchCont.style.display;
    searchCont.style.display = 'none';

    window.print();

    // Restaurar estado
    setTimeout(() => {
        details.forEach((d, i) => {
            d.open = wasOpen[i];
        });
        searchCont.style.display = originalSearchDisplay;
        // Re-aplicar búsqueda si había texto
        if (document.getElementById('searchInput').value.trim() !== '') {
            document.getElementById('searchInput').dispatchEvent(new Event('input'));
        }
    }, 500);
});

// 3. Barra de Progreso de Lectura
window.onscroll = function() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    document.getElementById("progress-bar").style.width = scrolled + "%";
};

// 4. MOTOR DE BÚSQUEDA
const searchInput = document.getElementById('searchInput');
const detailsElements = document.querySelectorAll('details');
const noResults = document.getElementById('noResults');

searchInput.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase().trim();
    let hasResults = false;

    detailsElements.forEach(details => {
        const text = details.textContent.toLowerCase();
        
        if (text.includes(term)) {
            details.style.display = 'block';
            // Si hay término de búsqueda, abrimos el capítulo automáticamente
            if (term !== '') {
                details.open = true;
                hasResults = true;
            } else {
                details.open = false; // Cerrar todo si se borra la búsqueda
                hasResults = true;
            }
        } else {
            details.style.display = 'none';
        }
    });

    // Mostrar mensaje si no hay resultados
    if (!hasResults && term !== '') {
        noResults.style.display = 'block';
    } else {
        noResults.style.display = 'none';
    }
});
