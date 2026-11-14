console.log("¡Buscador avanzado con navegación activo!");

let matches = [];
let currentMatchIndex = -1;
let timeoutId = null;

// 1. FUNCIÓN DE BÚSQUEDA
function buscarEnEstatutos() {
    const inputVal = document.getElementById('searchInput').value.trim();
    const term = inputVal.toLowerCase();
    const detailsElements = document.querySelectorAll('details');
    const noResults = document.getElementById('noResults');
    const allArticles = document.querySelectorAll('.article');
    const navControls = document.getElementById('searchNav');
    
    let hasGlobalResults = false;

    // Limpiar resaltados anteriores
    allArticles.forEach(article => {
        if (article.dataset.original) {
            article.innerHTML = article.dataset.original;
        } else {
            article.dataset.original = article.innerHTML;
        }
    });

    // Si la barra está vacía, resetear todo
    if (term === '') {
        detailsElements.forEach(details => {
            details.style.display = 'block';
            details.open = false;
        });
        if (noResults) noResults.style.display = 'none';
        if (navControls) navControls.style.display = 'none';
        matches = [];
        currentMatchIndex = -1;
        return;
    }

    const safeTerm = inputVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?![^<]*>)(${safeTerm})`, 'gi');

    allArticles.forEach(article => {
        if (article.dataset.original.toLowerCase().includes(term)) {
            article.innerHTML = article.dataset.original.replace(regex, '<mark class="resaltado">$1</mark>');
            hasGlobalResults = true;
        }
    });

    // Mostrar/Ocultar capítulos
    detailsElements.forEach(details => {
        const tieneResaltado = details.querySelector('mark.resaltado') !== null;
        if (tieneResaltado) {
            details.style.display = 'block';
            details.open = true; 
        } else {
            details.style.display = 'none';
            details.open = false;
        }
    });

    // Manejo de resultados y navegación
    matches = Array.from(document.querySelectorAll('mark.resaltado'));
    
    if (matches.length > 0) {
        if (noResults) noResults.style.display = 'none';
        if (navControls) navControls.style.display = 'flex';
        
        currentMatchIndex = 0; // Reiniciar al primer resultado
        actualizarNavegacion();
    } else {
        if (noResults) noResults.style.display = 'block';
        if (navControls) navControls.style.display = 'none';
        currentMatchIndex = -1;
    }
}

// 2. FUNCIONES DE NAVEGACIÓN (Siguiente / Anterior)
function actualizarNavegacion() {
    // Quitar el resaltado "activo" de todas las coincidencias
    matches.forEach(m => m.classList.remove('resaltado-activo'));

    if (matches.length > 0 && currentMatchIndex >= 0) {
        // Iluminar la coincidencia actual
        const currentMark = matches[currentMatchIndex];
        currentMark.classList.add('resaltado-activo');
        
        // Actualizar el contador
        const counter = document.getElementById('matchCounter');
        if (counter) counter.textContent = `${currentMatchIndex + 1} de ${matches.length}`;
        
        // Hacer scroll suave a la coincidencia actual
        currentMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function irSiguiente() {
    if (currentMatchIndex < matches.length - 1) {
        currentMatchIndex++;
        actualizarNavegacion();
    }
}

function irAnterior() {
    if (currentMatchIndex > 0) {
        currentMatchIndex--;
        actualizarNavegacion();
    }
}

// 3. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // Usamos un "Debounce" para que no busque en cada letra y así evitar lentitud
        searchInput.addEventListener('input', () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(buscarEnEstatutos, 300); // Espera 300ms
        });
    }

    // Botones de navegación
    const btnNext = document.getElementById('btnNextMatch');
    const btnPrev = document.getElementById('btnPrevMatch');
    if (btnNext) btnNext.addEventListener('click', irSiguiente);
    if (btnPrev) btnPrev.addEventListener('click', irAnterior);

    // Modo Oscuro / Claro
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    if (themeToggle) {
        const savedTheme = localStorage.getItem('mep-estatutos-theme') || 'dark';
        htmlElement.setAttribute('data-theme', savedTheme);
        themeToggle.innerHTML = savedTheme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
        
        themeToggle.addEventListener('click', () => {
            const newTheme = htmlElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('mep-estatutos-theme', newTheme);
            themeToggle.innerHTML = newTheme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
        });
    }

    // Descargar PDF
    const downloadPdf = document.getElementById('downloadPdf');
    if (downloadPdf) {
        downloadPdf.addEventListener('click', () => {
            const details = document.querySelectorAll('details');
            const wasOpen = [];
            details.forEach((d, i) => { wasOpen[i] = d.open; d.open = true; d.style.display = 'block'; });
            
            const searchCont = document.getElementById('searchContainer');
            if(searchCont) searchCont.style.display = 'none';
            
            window.print();
            
            setTimeout(() => {
                details.forEach((d, i) => { d.open = wasOpen[i]; });
                if(searchCont) searchCont.style.display = 'block';
                if (document.getElementById('searchInput').value.trim() !== '') {
                    buscarEnEstatutos(); 
                }
            }, 500);
        });
    }

    // Barra de Progreso
    window.onscroll = function() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progressBar = document.getElementById("progress-bar");
        if (progressBar) progressBar.style.width = (winScroll / height) * 100 + "%";
    };
});
