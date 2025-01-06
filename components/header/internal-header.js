class InternalHeader {
    constructor() {
        this.headerElement = null;
        this.init();
    }

    init() {
        this.loadHeader();
        this.setupScrollEffect();
    }

    loadHeader() {
        const headerHTML = `
            <header>
                <nav class="navbar">
                    <div class="logo">
                        <i class="fas fa-infinity"></i>
                        Eternal Pay
                    </div>
                    <ul class="nav-links">
                        <li><a href="/"><i class="fas fa-home"></i> Início</a></li>
                        <li><a href="#converter"><i class="fas fa-exchange-alt"></i> Converter</a></li>
                        <li><a href="/pages/sobre.html"><i class="fas fa-info-circle"></i> Sobre</a></li>
                    </ul>
                </nav>
            </header>
        `;

        document.body.insertAdjacentHTML('afterbegin', headerHTML);
        this.headerElement = document.querySelector('header');
    }

    setupScrollEffect() {
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if (navbar) {
                requestAnimationFrame(() => {
                    if (window.scrollY > 50) {
                        navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    } else {
                        navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }
                });
            }
        });
    }
}

// Inicializar o header quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new InternalHeader();
});
