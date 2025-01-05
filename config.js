// Configurações globais
const API_URL = 'https://max-apiepay.uvxtdw.easypanel.host';

// Função para formatar o preço
const formatPrice = (price, currency) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(price);
};

// Função para buscar as cotações
const fetchCotacoes = async () => {
    try {
        // Garante que estamos usando HTTPS
        const baseUrl = new URL(API_URL);
        baseUrl.protocol = 'https:';
        const url = new URL('/cotacoes', baseUrl);

        console.log('Fazendo requisição para:', url.toString()); // Log para debug

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            mode: 'cors', // Adiciona modo CORS explícito
            cache: 'no-cache' // Desativa cache
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Criar um objeto com os valores das cotações
        const cotacoes = {};
        data.forEach(item => {
            cotacoes[item.par_moedas] = {
                valor: item.valor,
                atualizado_em: new Date(item.atualizado_em)
            };
        });
        
        return cotacoes;
    } catch (error) {
        console.error('Erro ao buscar cotações:', error);
        throw error;
    }
};

// Função para formatar a data de atualização
const formatarDataAtualizacao = (data) => {
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(data);
};

// Exporta as funções para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_URL,
        formatPrice,
        fetchCotacoes,
        formatarDataAtualizacao
    };
}
