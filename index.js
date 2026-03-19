/**
 * Lógica de Controle de Visibilidade (Atividade 03)
 * Este script alterna a exibição de dados sensíveis para garantir a privacidade do usuário.
 */
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-visibility');
    const valuesToHide = document.querySelectorAll('.hide-value');

    toggleBtn.addEventListener('click', () => {
        // Alterna a classe de desfoque nos valores de patrimônio e renda
        valuesToHide.forEach(el => {
            el.classList.toggle('value-hidden');
        });

        // Alterna o ícone visual (olho aberto / olho fechado)
        if (toggleBtn.classList.contains('fa-eye')) {
            toggleBtn.classList.replace('fa-eye', 'fa-eye-slash');
            toggleBtn.setAttribute('title', 'Mostrar valores');
        } else {
            toggleBtn.classList.replace('fa-eye-slash', 'fa-eye');
            toggleBtn.setAttribute('title', 'Ocultar valores');
        }
    });
});