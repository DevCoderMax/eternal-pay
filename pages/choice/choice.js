document.addEventListener('DOMContentLoaded', () => {
    // Animação de entrada dos cards
    const cards = document.querySelectorAll('.choice-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 200 * index);
    });

    // Adicionar evento de clique apenas no botão anônimo
    const anonymousBtn = document.querySelector('.choice-card:last-child .choice-btn');

    anonymousBtn.addEventListener('click', () => {
        // Adicionar animação de saída
        cards.forEach(card => {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateY(-20px)';
        });
        
        // Redirecionar após a animação
        setTimeout(() => {
            window.location.href = '../anonymous/anonymous.html';
        }, 300);
    });
});