class TransactionStatus {
    constructor() {
        this.transactionId = new URLSearchParams(window.location.search).get('id');
        if (!this.transactionId) {
            window.location.href = '/pages/anonymous/anonymous.html';
            return;
        }

        this.setupElements();
        this.startStatusCheck();
    }

    setupElements() {
        // Elementos de ID e status
        this.transactionIdElement = document.getElementById('transactionId');
        this.statusMessageElement = document.getElementById('statusMessage');
        
        // Elementos da timeline
        this.stepCreated = document.getElementById('stepCreated');
        this.stepProcessing = document.getElementById('stepProcessing');
        this.stepCompleted = document.getElementById('stepCompleted');
        this.stepCancelled = document.getElementById('stepCancelled');
        
        // Elementos do Pix
        this.pixQRCode = document.getElementById('pixQRCode');
        this.pixValue = document.getElementById('pixValue');
        this.copyPixCodeButton = document.getElementById('copyPixCode');
        this.copyFeedback = document.getElementById('copyFeedback');
        
        // Timestamps
        this.createdTimeElement = document.getElementById('createdTime');
        this.processingTimeElement = document.getElementById('processingTime');
        this.completedTimeElement = document.getElementById('completedTime');
        this.cancelledTimeElement = document.getElementById('cancelledTime');
        
        // Detalhes da transação
        this.originalValueElement = document.getElementById('originalValue');
        this.conversionRateElement = document.getElementById('conversionRate');
        this.finalValueElement = document.getElementById('finalValue');
        this.destinationAddressElement = document.getElementById('destinationAddress');

        // Mostrar ID da transação
        this.transactionIdElement.textContent = this.transactionId;

        // Setup do botão de copiar
        if (this.copyPixCodeButton) {
            this.copyPixCodeButton.addEventListener('click', () => this.copyPixCode());
        }
    }

    async startStatusCheck() {
        try {
            const response = await fetch(`${API_URL}/transacoes/${this.transactionId}`);
            if (!response.ok) throw new Error('Falha ao obter status da transação');
            
            const transaction = await response.json();
            this.updateStatus(transaction);

            // Se a transação não estiver concluída, continua verificando
            if (transaction.status !== 'concluida' && transaction.status !== 'cancelado') {
                setTimeout(() => this.startStatusCheck(), 5000); // Verifica a cada 5 segundos
            }
        } catch (error) {
            console.error('Erro ao verificar status:', error);
        }
    }

    updateStatus(transaction) {
        // Atualiza detalhes da transação
        this.updateTransactionDetails(transaction);

        // Atualiza a mensagem de status
        this.updateStatusMessage(transaction.status);

        // Se for uma transação pendente de BRL para BTC, gera o QR code Pix
        if (transaction.status === 'pendente' && 
            transaction.moeda_origem === 'BRL' && 
            transaction.moeda_destino === 'BTC') {
            this.generatePixQR(transaction);
        }

        // Limpa todos os estados ativos primeiro
        this.stepCreated.classList.remove('active');
        this.stepProcessing.classList.remove('active');
        this.stepCompleted.classList.remove('active');
        this.stepCancelled.classList.remove('active');

        // Atualiza timeline baseado no status
        switch (transaction.status) {
            case 'pendente':
                this.stepCreated.classList.add('active');
                this.updateTimestamp(this.createdTimeElement, transaction.criado_em);
                break;
            case 'processando':
                this.stepCreated.classList.add('active');
                this.stepProcessing.classList.add('active');
                this.updateTimestamp(this.createdTimeElement, transaction.criado_em);
                this.updateTimestamp(this.processingTimeElement, transaction.atualizado_em);
                break;
            case 'concluida':
                this.stepCreated.classList.add('active');
                this.stepProcessing.classList.add('active');
                this.stepCompleted.classList.add('active');
                this.updateTimestamp(this.createdTimeElement, transaction.criado_em);
                this.updateTimestamp(this.processingTimeElement, transaction.atualizado_em);
                this.updateTimestamp(this.completedTimeElement, transaction.atualizado_em);
                break;
            case 'cancelado':
                this.stepCreated.classList.add('active');
                this.stepCancelled.classList.add('active');
                this.updateTimestamp(this.createdTimeElement, transaction.criado_em);
                this.updateTimestamp(this.cancelledTimeElement, transaction.atualizado_em);
                break;
        }
    }

    updateTransactionDetails(transaction) {
        const formatCurrency = (value, currency) => {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(value);
        };

        const formatBTC = (value) => {
            return value.toFixed(8) + ' BTC';
        };

        // Formata o valor original sempre em BRL
        const originalValue = formatCurrency(transaction.valor, 'BRL');
        
        // O valor final sempre será em BTC
        const finalValue = formatBTC(transaction.valor_convertido);

        this.originalValueElement.textContent = originalValue;
        this.conversionRateElement.textContent = (transaction.taxa_conversao * 100).toFixed(0) + '%';
        this.finalValueElement.textContent = finalValue;
        this.destinationAddressElement.textContent = transaction.chave_destino;
    }

    updateTimestamp(element, timestamp) {
        if (timestamp) {
            const date = new Date(timestamp);
            element.textContent = date.toLocaleString('pt-BR');
        } else {
            element.textContent = '-';
        }
    }

    updateStatusMessage(status) {
        let message = '';
        let className = '';

        switch (status) {
            case 'pendente':
                message = 'Aguardando pagamento...';
                className = 'pending';
                break;
            case 'processando':
                message = 'Processando pagamento...';
                className = 'processing';
                break;
            case 'concluida':
                message = 'Pagamento concluído com sucesso!';
                className = 'completed';
                break;
            case 'cancelado':
                message = 'Transação cancelada';
                className = 'cancelled';
                break;
        }

        this.statusMessageElement.textContent = message;
        this.statusMessageElement.className = 'status-message ' + className;
    }

    generatePixQR(transaction) {
        // Dados base do Pix
        const pixData = {
            nome: 'EternalPay',
            cidade: 'SaoPaulo',
            valor: transaction.valor,
            chave: '20253e05-7207-40b5-9386-cc5655448829',
            txid: transaction.codigo_transacao
        };

        // Gera QR code
        const qrParams = new URLSearchParams({
            ...pixData,
            valor: pixData.valor.toFixed(2),
            saida: 'qr'
        });
        this.pixQRCode.src = `https://gerarqrcodepix.com.br/api/v1?${qrParams.toString()}`;

        // Busca o código Pix (BR Code) do nosso backend
        const brParams = new URLSearchParams(pixData);
        
        fetch(`${API_URL}/pix/brcode?${brParams.toString()}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao buscar código Pix');
                }
                return response.json();
            })
            .then(data => {
                this.pixBRCode = data.brcode;
            })
            .catch(error => {
                console.error('Erro ao buscar código Pix:', error);
                // Em caso de erro, ainda podemos mostrar o QR code
            });
        
        // Atualiza o valor a ser pago
        this.pixValue.textContent = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(transaction.valor);
    }

    async copyPixCode() {
        if (!this.pixBRCode) return;

        try {
            await navigator.clipboard.writeText(this.pixBRCode);
            this.copyFeedback.classList.add('show');
            setTimeout(() => {
                this.copyFeedback.classList.remove('show');
            }, 2000);
        } catch (err) {
            console.error('Erro ao copiar código Pix:', err);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TransactionStatus();
});
