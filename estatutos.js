console.log("¡Buscador optimizado sin acentos y con navegación activo!");

let matches = [];
let currentMatchIndex = -1;
let timeoutId = null;

// Función para quitar acentos (ej. 'á' -> 'a')
function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Función para crear expresión regular que ignora acentos
function buildAccentInsensitiveRegex(str) {
    const safeStr = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const map = {
        'a': '[aáàäâAÁÀÄÂ]', 'e': '[eéèëêEÉÈËÊ]', 'i': '[iíìïîIÍÌÏÎ]',
        'o': '[oóòöôOÓÒÖÔ]', 'u': '[uúùüûUÚÙÜÛ]', 'n': '[nñNÑ]'
    };
    let pattern = '';
    for (let i = 0; i < safeStr.length; i++) {
        const char = safeStr[i];
        const lowerChar = char.toLowerCase();
        pattern += map[lowerChar] ? map[lowerChar] : char;
    }
    return new RegExp(`(?![^<]*>)(${pattern})`, 'gi');
}

// 1. FUNCIÓN DE BÚSQUEDA
function buscarEnEstatutos() {
    const inputVal = document.getElementById('searchInput').value.trim();
    const term = inputVal.toLowerCase();
    const normalizedTerm = removeAccents(term); 
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

    // Si la barra está vacía, resetear
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

    const regex = buildAccentInsensitiveRegex(inputVal);

    allArticles.forEach(article => {
        const normalizedOriginal = removeAccents(article.dataset.original.toLowerCase());
        
        if (normalizedOriginal.includes(normalizedTerm)) {
            article.innerHTML = article.dataset.original.replace(regex, '<mark class="resaltado">$1</mark>');
            hasGlobalResults = true;
        }
    });

    detailsElements.forEach(details => {
        const tieneResaltado = details.querySelector('mark.resaltado') !== null;
        details.style.display = tieneResaltado ? 'block' : 'none';
        if (tieneResaltado) details.open = true;
    });

    matches = Array.from(document.querySelectorAll('mark.resaltado'));
    
    if (matches.length > 0) {
        if (noResults) noResults.style.display = 'none';
        if (navControls) navControls.style.display = 'flex'; // Muestra los controles
        currentMatchIndex = 0;
        actualizarNavegacion();
    } else {
        if (noResults) noResults.style.display = 'block';
        if (navControls) navControls.style.display = 'none';
        currentMatchIndex = -1;
    }
}

// 2. FUNCIONES DE NAVEGACIÓN
function actualizarNavegacion() {
    matches.forEach(m => m.classList.remove('resaltado-activo'));

    if (matches.length > 0 && currentMatchIndex >= 0) {
        const currentMark = matches[currentMatchIndex];
        currentMark.classList.add('resaltado-activo');
        
        const counter = document.getElementById('matchCounter');
        if (counter) counter.textContent = `${currentMatchIndex + 1} de ${matches.length}`;
        
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
        searchInput.addEventListener('input', () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(buscarEnEstatutos, 300); 
        });
    }

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
