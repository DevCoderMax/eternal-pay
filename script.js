import { checkMaintenance } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // Verificar modo de manutenção antes de qualquer outra operação
    checkMaintenance();

    // Animação de entrada dos elementos
    const animateHeroElements = () => {
        const heroElements = document.querySelectorAll('.hero > *');
        heroElements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            setTimeout(() => {
                element.style.transition = 'all 0.5s ease';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, 200 * index);
        });
    };

    // Adiciona efeito de scroll suave para os links de navegação
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Só anima os elementos quando o conteúdo estiver pronto
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.classList.contains('content-ready')) {
                animateHeroElements();
                observer.disconnect();
            }
        });
    });

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });
});