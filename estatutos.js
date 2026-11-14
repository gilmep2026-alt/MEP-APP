console.log("¡Buscador definitivo activo!");

// 1. FUNCIÓN DE BÚSQUEDA CON RESALTADO Y SCROLL
function buscarEnEstatutos() {
    const inputVal = document.getElementById('searchInput').value.trim();
    const term = inputVal.toLowerCase();
    const detailsElements = document.querySelectorAll('details');
    const noResults = document.getElementById('noResults');
    const allArticles = document.querySelectorAll('.article');
    
    let hasGlobalResults = false;
    let primerResultado = null;

    // Limpiar resaltados anteriores
    allArticles.forEach(article => {
        if (article.dataset.original) {
            article.innerHTML = article.dataset.original;
        } else {
            article.dataset.original = article.innerHTML;
        }
    });

    if (term === '') {
        detailsElements.forEach(details => {
            details.style.display = 'block';
            details.open = false;
        });
        if (noResults) noResults.style.display = 'none';
        return;
    }

    const safeTerm = inputVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?![^<]*>)(${safeTerm})`, 'gi');

    allArticles.forEach(article => {
        if (article.dataset.original.toLowerCase().includes(term)) {
            article.innerHTML = article.dataset.original.replace(regex, '<mark class="resaltado">$1</mark>');
            
            if (!primerResultado) {
                const mark = article.querySelector('mark.resaltado');
                if (mark) primerResultado = mark;
            }
            hasGlobalResults = true;
        }
    });

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

    if (noResults) {
        noResults.style.display = hasGlobalResults ? 'none' : 'block';
    }

    // Scroll suave hasta la primera coincidencia
    if (primerResultado) {
        setTimeout(() => {
            primerResultado.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
    }
}

// 2. INICIALIZACIÓN (Aquí enganchamos los botones sin usar HTML)
document.addEventListener('DOMContentLoaded', () => {
    // Buscador
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', buscarEnEstatutos);
    }

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
