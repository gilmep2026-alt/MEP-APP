console.log("¡Cargando el buscador v2!");

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
                const input = document.getElementById('searchInput');
                if (input && input.value.trim() !== '') input.dispatchEvent(new Event('input'));
            }, 500);
        });
    }

    window.onscroll = function() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progressBar = document.getElementById("progress-bar");
        if (progressBar) progressBar.style.width = (winScroll / height) * 100 + "%";
    };

    const searchInput = document.getElementById('searchInput');
    const detailsElements = document.querySelectorAll('details');
    const noResults = document.getElementById('noResults');

    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase().trim();
            let hasResults = false;
            detailsElements.forEach(details => {
                const text = details.textContent.toLowerCase();
                if (text.includes(term)) {
                    details.style.display = 'block';
                    if (term !== '') { details.open = true; hasResults = true; } 
                    else { details.open = false; hasResults = true; }
                } else {
                    details.style.display = 'none';
                }
            });
            if (noResults) noResults.style.display = (!hasResults && term !== '') ? 'block' : 'none';
        });
    }
});
