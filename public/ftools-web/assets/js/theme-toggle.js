// ftools-web/assets/js/theme-toggle.js

document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    // Comprobar preferencia guardada o preferencia del sistema
    const savedTheme = localStorage.getItem('ftools-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    // Aplicar tema inicial
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateIcon(currentTheme);

    // Event listener para el botón
    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('ftools-theme', currentTheme);
        updateIcon(currentTheme);
    });

    function updateIcon(theme) {
        if (theme === 'dark') {
            themeIcon.textContent = '☀️'; // Mostrar sol para cambiar a claro
        } else {
            themeIcon.textContent = '🌙'; // Mostrar luna para cambiar a oscuro
        }
    }
});
