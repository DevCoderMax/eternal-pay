// Import required functions from config.js
import { API_URL, fetchCotacoes, formatPrice } from '../../config.js';

class HeaderComponent {
    constructor() {
        this.priceBrlElement = null;
        this.priceUsdElement = null;
        this.timerElement = null;
        this.timeLeft = 10;
        this.timerInterval = null;
        this.headerElement = null;
        this.initialized = false;
        this.fetchInProgress = false;
    }

    async init() {
        try {
            await this.loadHeader();
            await this.initialFetch();
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showError();
        }
    }

    async loadHeader() {
        try {
            const headerTemplate = `
                <header>
                    <nav class="navbar">
                        <div class="logo">
                            <i class="fas fa-infinity"></i>
                            Eternal Pay
                        </div>
                        <div class="price-container">
                            <div class="btc-price">
                                <i class="fab fa-bitcoin"></i>
                                <span class="price-value">
                                    <span class="price-brl">Carregando...</span>
                                    <span class="price-usd">Carregando...</span>
                                </span>
                            </div>
                            <div class="timer">10s</div>
                        </div>
                        <ul class="nav-links">
                            <li><a href="#converter"><i class="fas fa-exchange-alt"></i> Converter</a></li>
                            <li><a href="#atualizacoes"><i class="fas fa-bell"></i> Atualizações</a></li>
                            <li><a href="#sobre"><i class="fas fa-info-circle"></i> Sobre</a></li>
                        </ul>
                    </nav>
                </header>
            `;

            const mainContent = document.querySelector('.main-content');
            if (!mainContent) {
                throw new Error('Elemento main-content não encontrado');
            }

            mainContent.insertAdjacentHTML('afterbegin', headerTemplate);
            
            // Aguarda um momento para garantir que o DOM foi atualizado
            await new Promise(resolve => setTimeout(resolve, 50));

            // Inicializa os elementos
            this.headerElement = document.querySelector('header');
            this.priceBrlElement = document.querySelector('.price-brl');
            this.priceUsdElement = document.querySelector('.price-usd');
            this.timerElement = document.querySelector('.timer');

            if (!this.headerElement || !this.priceBrlElement || !this.priceUsdElement || !this.timerElement) {
                throw new Error('Elementos do header não encontrados');
            }

        } catch (error) {
            console.error('Erro ao carregar o header:', error);
            throw error;
        }
    }

    async fetchPrices() {
        if (this.fetchInProgress) return null;
        this.fetchInProgress = true;
        
        try {
            const cotacoes = await fetchCotacoes();
            this.fetchInProgress = false;
            return cotacoes;
        } catch (error) {
            console.error('Erro ao buscar preços:', error);
            this.fetchInProgress = false;
            return null;
        }
    }

    async initialFetch() {
        const cotacoes = await this.fetchPrices();
        if (cotacoes) {
            this.updatePrices(cotacoes);
            this.showContent();
            this.initialized = true;
        } else {
            this.showError();
        }
    }

    showContent() {
        document.body.classList.add('content-ready');
        this.startTimer();
    }

    showError() {
        if (this.priceBrlElement) this.priceBrlElement.textContent = 'Erro ao carregar';
        if (this.priceUsdElement) this.priceUsdElement.textContent = 'Erro ao carregar';
        this.startTimer();
    }

    showUpdatingStatus() {
        if (this.timerElement) this.timerElement.textContent = 'Atualizando...';
    }

    updateTimer() {
        this.timerElement.textContent = `${this.timeLeft}s`;
        this.timeLeft -= 1;
        
        if (this.timeLeft < 0) {
            this.timeLeft = 10;
            this.fetchPrices().then(cotacoes => {
                if (cotacoes) {
                    this.updatePrices(cotacoes);
                }
            });
        }
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timeLeft = 10;
        this.timerElement.textContent = `${this.timeLeft}s`;
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    }

    updatePrices(cotacoes) {
        if (this.priceBrlElement && this.priceUsdElement) {
            requestAnimationFrame(() => {
                if (cotacoes['BTC/BRL']) {
                    this.priceBrlElement.textContent = formatPrice(cotacoes['BTC/BRL'].valor, 'BRL');
                }
                
                if (cotacoes['BTC/USD']) {
                    this.priceUsdElement.textContent = formatPrice(cotacoes['BTC/USD'].valor, 'USD');
                }
            });
        }
    }
}

// Inicializar o componente quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', async () => {
    const header = new HeaderComponent();
    header.init().catch(error => {
        console.error('Erro fatal ao inicializar o header:', error);
    });
});
