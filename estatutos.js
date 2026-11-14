console.log("¡Buscador con resaltado v4 activo!");

// 1. FUNCIÓN DE BÚSQUEDA CON RESALTADO
function buscarEnEstatutos() {
    const inputVal = document.getElementById('searchInput').value.trim();
    const term = inputVal.toLowerCase();
    const detailsElements = document.querySelectorAll('details');
    const noResults = document.getElementById('noResults');
    const allArticles = document.querySelectorAll('.article');
    
    let hasGlobalResults = false;

    // Limpiar resaltados anteriores y restaurar texto original
    allArticles.forEach(article => {
        if (article.dataset.original) {
            article.innerHTML = article.dataset.original;
        } else {
            article.dataset.original = article.innerHTML; // Guardar original en la primera búsqueda
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

    // Escapar caracteres especiales para evitar errores en la búsqueda
    const safeTerm = inputVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Expresión regular que ignora las etiquetas HTML y busca solo en el texto
    const regex = new RegExp(`(?![^<]*>)(${safeTerm})`, 'gi');

    allArticles.forEach(article => {
        if (article.dataset.original.toLowerCase().includes(term)) {
            // Reemplazar la palabra con la etiqueta <mark> para el resaltado
            article.innerHTML = article.dataset.original.replace(regex, '<mark class="resaltado">$1</mark>');
            hasGlobalResults = true;
        }
    });

    // Mostrar/Ocultar capítulos dependiendo de si tienen coincidencias
    detailsElements.forEach(details => {
        const tieneResaltado = details.querySelector('mark.resaltado') !== null;
        
        if (tieneResaltado) {
            details.style.display = 'block';
            details.open = true; // Abrir automáticamente si hay coincidencia
        } else {
            details.style.display = 'none';
            details.open = false;
        }
    });

    if (noResults) {
        noResults.style.display = hasGlobalResults ? 'none' : 'block';
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
            // Abrir todos los capítulos para que el PDF salga completo
            const details = document.querySelectorAll('details');
            const wasOpen = [];
            details.forEach((d, i) => { wasOpen[i] = d.open; d.open = true; d.style.display = 'block'; });
            
            // Ocultar barra de búsqueda temporalmente
            const searchCont = document.getElementById('searchContainer');
            if(searchCont) searchCont.style.display = 'none';
            
            window.print();
            
            // Restaurar estado
            setTimeout(() => {
                details.forEach((d, i) => { d.open = wasOpen[i]; });
                if(searchCont) searchCont.style.display = 'block';
                if (document.getElementById('searchInput').value.trim() !== '') {
                    buscarEnEstatutos(); // Volver a aplicar el filtro
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
