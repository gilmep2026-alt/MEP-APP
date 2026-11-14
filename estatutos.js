console.log("¡Buscador v4 con scroll automático activo!");

// 1. FUNCIÓN DE BÚSQUEDA CON RESALTADO Y SCROLL
function buscarEnEstatutos() {
    const inputVal = document.getElementById('searchInput').value.trim();
    const term = inputVal.toLowerCase();
    const detailsElements = document.querySelectorAll('details');
    const noResults = document.getElementById('noResults');
    const allArticles = document.querySelectorAll('.article');
    
    let hasGlobalResults = false;
    let primerResultado = null; // Para guardar dónde hacer scroll

    // Limpiar resaltados anteriores y restaurar texto original
    allArticles.forEach(article => {
        if (article.dataset.original) {
            article.innerHTML = article.dataset.original;
        } else {
            article.dataset.original = article.innerHTML;
        }
    });

    // Si la barra está vacía, mostrar todo y cerrar acordeones
    if (term === '') {
        detailsElements.forEach(details => {
            details.style.display = 'block';
            details.open = false;
        });
        if (noResults) noResults.style.display = 'none';
        return;
    }

    // Escapar caracteres especiales y buscar en el texto
    const safeTerm = inputVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?![^<]*>)(${safeTerm})`, 'gi');

    allArticles.forEach(article => {
        if (article.dataset.original.toLowerCase().includes(term)) {
            // Resaltar la palabra encontrada
            article.innerHTML = article.dataset.original.replace(regex, '<mark class="resaltado">$1</mark>');
            
            // Guardar la primera coincidencia para hacer scroll hasta ella
            if (!primerResultado) {
                const mark = article.querySelector('mark.resaltado');
                if (mark) primerResultado = mark;
            }
            hasGlobalResults = true;
        }
    });

    // Mostrar/Ocultar capítulos dependiendo de si tienen coincidencias
    detailsElements.forEach(details => {
        const tieneResaltado = details.querySelector('mark.resaltado') !== null;
        
        if (tieneResaltado) {
            details.style.display = 'block';
            details.open = true; // Abrir automáticamente
        } else {
            details.style.display = 'none';
            details.open = false;
        }
    });

    if (noResults) {
        noResults.style.display = hasGlobalResults ? 'none' : 'block';
    }

    // EL TRUCO: Si encontramos algo, bajamos suavemente hasta el resaltado
    if (primerResultado) {
        setTimeout(() => {
            primerResultado.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150); // Pequeña espera para que los acordeones terminen de abrirse
    }
}

// 2. FUNCIONES DE TEMA, PDF Y SCROLL
document.addEventListener('DOMContentLoaded', () => {
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

    window.onscroll = function() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progressBar = document.getElementById("progress-bar");
        if (progressBar) progressBar.style.width = (winScroll / height) * 100 + "%";
    };
});
