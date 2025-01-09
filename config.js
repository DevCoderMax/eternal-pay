// Configurações globais
export const API_URL = 'http://localhost:3000';

// Configuração do modo de manutenção
export const MAINTENANCE_MODE = false;

// Horário de funcionamento
export const OPERATION_HOURS = {
    start: 6,  // 6:00
    end: 22    // 22:00
};

// Páginas que não devem redirecionar mesmo em modo de manutenção
const MAINTENANCE_WHITELIST = [
    '/pages/maintenance.html',
    'maintenance.html'
];

// Verifica se o sistema está no horário de funcionamento
export function checkOperatingHours() {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Se estiver fora do horário de funcionamento
    if (currentHour < OPERATION_HOURS.start || currentHour >= OPERATION_HOURS.end) {
        // Redireciona para a página de bloqueio se não estiver nela
        if (!window.location.pathname.includes('/pages/blocked/blocked.html')) {
            window.location.href = '/pages/blocked/blocked.html';
        }
        return false;
    }
    return true;
}

export function checkMaintenance() {
    if (MAINTENANCE_MODE) {
        const currentPath = window.location.pathname;
        const isWhitelisted = MAINTENANCE_WHITELIST.some(path => currentPath.endsWith(path));
        
        if (!isWhitelisted) {
            window.location.href = '/pages/maintenance.html';
        }
    }
}

// Executar verificação de manutenção e horário de funcionamento automaticamente quando o arquivo for carregado
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        checkMaintenance();
        checkOperatingHours();
    });
}

// Função para formatar o preço
export const formatPrice = (price, currency) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(price);
};

// Função para garantir que a URL use HTTPS
export const ensureHttps = (url) => {
    // Se estamos em HTTPS, garantimos que a API também use HTTPS
    if (window.location.protocol === 'https:') {
        return url.replace(/^http:\/\//i, 'https://');
    }
    return url;
};

// Função para buscar as cotações
export const fetchCotacoes = async () => {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const url = `${API_URL}/cotacoes`;
            console.log(`Tentativa ${attempt + 1}/${maxRetries} - Fazendo requisição para:`, url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Criar um objeto com os valores das cotações
            const cotacoes = {};
            data.forEach(item => {
                // Remove a barra do par de moedas para manter compatibilidade
                const parMoedas = item.par_moedas.replace('/', '_');
                cotacoes[item.par_moedas] = {
                    valor: item.valor,
                    atualizado_em: new Date(item.atualizado_em)
                };
            });
            
            return cotacoes;
        } catch (error) {
            console.error(`Tentativa ${attempt + 1} falhou:`, error);
            lastError = error;
            
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }

    console.error('Todas as tentativas falharam. Último erro:', lastError);
    throw lastError;
};

// Função para formatar a data de atualização
export const formatarDataAtualizacao = (data) => {
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(data);
};
