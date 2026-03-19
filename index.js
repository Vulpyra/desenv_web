document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-visibility');
    const valuesToHide = document.querySelectorAll('.hide-value');

    toggleBtn.addEventListener('click', () => {
        valuesToHide.forEach(el => {
            el.classList.toggle('value-hidden');
        });

        // Alterna o ícone (olho aberto / olho fechado)
        if (toggleBtn.classList.contains('fa-eye')) {
            toggleBtn.classList.replace('fa-eye', 'fa-eye-slash');
            toggleBtn.setAttribute('title', 'Mostrar valores');
        } else {
            toggleBtn.classList.replace('fa-eye-slash', 'fa-eye');
            toggleBtn.setAttribute('title', 'Ocultar valores');
        }
    });
});