// Import required functions from config.js
import { API_URL, fetchCotacoes, formatPrice, checkMaintenance, MAINTENANCE_MODE } from '../../config.js';

class AnonymousConverter {
    constructor() {
        this.btcUsdRate = 0;
        this.btcBrlRate = 0;
        this.usdBrlRate = 0;
        this.isSwapped = false;
        this.lastInputValue = null;
        this.isUpdating = false;
        this.conversionFee = 0.02; // 2% de taxa
        this.minBrlValue = 100.00;   // Valor mínimo em BRL
        this.maxBrlValue = 1000.00; // Valor máximo em BRL
        this.setupElements();
        this.setupEventListeners();
        this.updateConvertButtonState(); // Atualiza estado inicial do botão
        this.startRateUpdates();
    }

    setupElements() {
        // Elementos de taxa
        this.btcUsdElement = document.getElementById('btcUsdRate');
        this.btcBrlElement = document.getElementById('btcBrlRate');
        this.usdBrlElement = document.getElementById('usdBrlRate');

        // Elementos do conversor
        this.brlInput = document.getElementById('brlInput');
        this.btcInput = document.getElementById('btcInput');
        this.swapButton = document.getElementById('swapButton');
        this.convertButton = document.getElementById('convertButton');
        this.convertButtonText = document.getElementById('convertButtonText');

        // Elementos de detalhes da conversão
        this.feeAmountElement = document.getElementById('feeAmount');
        this.finalAmountElement = document.getElementById('finalAmount');

        // Elementos do endereço
        this.addressInput = document.getElementById('addressInput');
        this.addressLabel = document.getElementById('addressLabel');
        this.addressError = document.getElementById('addressError');

        // Configurar estado inicial dos inputs
        this.brlInput.disabled = false;
        this.btcInput.disabled = true;
        this.updateAddressField();
    }

    setupEventListeners() {
        this.brlInput.addEventListener('input', (e) => {
            this.lastInputValue = e.target.value;
            this.handleBrlInput();
            this.updateConvertButtonState();
            this.updateConversionDetails();
        });
        
        this.btcInput.addEventListener('input', (e) => {
            this.lastInputValue = e.target.value;
            this.handleBtcInput();
            this.updateConvertButtonState();
            this.updateConversionDetails();
        });

        // Desabilitando temporariamente o botão de troca
        this.swapButton.disabled = true;
        this.swapButton.classList.add('disabled');
        
        this.swapButton.addEventListener('click', () => {
            // Função mantida para futura ativação
            if (!this.swapButton.disabled) {
                this.handleSwap();
                this.updateConvertButtonState();
                this.updateConversionDetails();
                this.updateAddressField();
            }
        });
        
        this.addressInput.addEventListener('input', () => {
            this.validateAddress();
            this.updateConvertButtonState();
        });

        this.convertButton.addEventListener('click', () => {
            if (!this.isUpdating && this.canConvert()) {
                this.handleConversion();
            }
        });
    }

    async fetchRates() {
        try {
            const cotacoes = await fetchCotacoes();
            
            if (!cotacoes['BTC/BRL'] || !cotacoes['BTC/USD'] || !cotacoes['USD/BRL']) {
                throw new Error('Cotações incompletas');
            }
            
            // Atualiza as taxas (arredondando BTC/USD para 2 casas decimais)
            this.btcBrlRate = cotacoes['BTC/BRL'].valor;
            this.btcUsdRate = parseFloat(cotacoes['BTC/USD'].valor.toFixed(2));
            this.usdBrlRate = cotacoes['USD/BRL'].valor;

            // Atualiza o display das taxas
            if (this.btcUsdElement && this.btcBrlElement && this.usdBrlElement) {
                this.btcUsdElement.textContent = this.formatValue(this.btcUsdRate, false);
                this.btcBrlElement.textContent = this.formatValue(this.btcBrlRate, false);
                this.usdBrlElement.textContent = this.formatValue(this.usdBrlRate, false);
            }

            // Força a atualização dos valores de conversão
            const activeInput = this.isSwapped ? this.btcInput : this.brlInput;
            if (activeInput.value) {
                const value = parseFloat(activeInput.value);
                if (!isNaN(value) && value > 0) {
                    if (this.isSwapped) {
                        const brlValue = value * this.btcBrlRate;
                        this.brlInput.value = brlValue.toFixed(2);
                    } else {
                        const btcValue = value / this.btcBrlRate;
                        this.btcInput.value = btcValue.toFixed(8);
                    }
                    this.updateConversionDetails();
                }
            }

        } catch (error) {
            console.error('Erro ao atualizar taxas:', error);
            this.showError();
        }
    }

    updateConversionDetails() {
        const activeInput = this.isSwapped ? this.btcInput : this.brlInput;
        const value = parseFloat(activeInput.value) || 0;

        if (value > 0) {
            let brlValue;
            if (this.isSwapped) {
                brlValue = value * this.btcBrlRate;
            } else {
                brlValue = value;
            }

            const fee = brlValue * this.conversionFee;
            const finalAmount = brlValue - fee;
            
            this.feeAmountElement.textContent = this.formatValue(fee, false);
            this.finalAmountElement.textContent = this.formatValue(finalAmount, false);
        } else {
            this.feeAmountElement.textContent = '-';
            this.finalAmountElement.textContent = '-';
        }
    }

    canConvert() {
        const activeInput = this.isSwapped ? this.btcInput : this.brlInput;
        const value = parseFloat(activeInput.value);
        return !this.isUpdating && value > 0 && this.validateAddress();
    }

    updateConvertButtonState() {
        const value = this.isSwapped ? this.btcInput.value : this.brlInput.value;
        const numericValue = parseFloat(value) || 0;
        const isValid = this.validateAmount(numericValue, this.isSwapped);
        
        // Desabilita o botão se não houver valor ou se o valor for inválido
        this.convertButton.disabled = !value || !isValid || !this.validateAddress();
        
        // Adiciona/remove classes de estilo
        if (!value || !isValid || !this.validateAddress()) {
            this.convertButton.classList.add('disabled');
            this.convertButtonText.style.color = '#808080'; // Cinza
        } else {
            this.convertButton.classList.remove('disabled');
            this.convertButtonText.style.color = ''; // Remove cor personalizada
        }
    }

    validateAmount(amount, isBtc = false) {
        if (isBtc) {
            // Converter BTC para BRL para validação
            const brlValue = amount * this.btcBrlRate;
            return brlValue >= this.minBrlValue && brlValue <= this.maxBrlValue;
        }
        // Validação direta em BRL
        return amount >= this.minBrlValue && amount <= this.maxBrlValue;
    }

    formatValue(value, isBtc) {
        if (isBtc) {
            return value.toFixed(8) + ' BTC';
        } else {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(value);
        }
    }

    handleBrlInput() {
        if (this.isUpdating) return;
        this.isUpdating = true;

        const brlValue = parseFloat(this.brlInput.value) || 0;
        const isValid = this.validateAmount(brlValue);

        if (brlValue && isValid) {
            const btcValue = brlValue / this.btcBrlRate;
            this.btcInput.value = btcValue.toFixed(8);
        } else {
            this.btcInput.value = '';
        }

        this.updateConversionDetails();
        this.isUpdating = false;
        this.updateConvertButtonState();
    }

    handleBtcInput() {
        if (this.isUpdating) return;
        this.isUpdating = true;

        const btcValue = parseFloat(this.btcInput.value) || 0;
        const isValid = this.validateAmount(btcValue, true);

        if (btcValue && isValid) {
            const brlValue = btcValue * this.btcBrlRate;
            this.brlInput.value = brlValue.toFixed(2);
        } else {
            this.brlInput.value = '';
        }

        this.updateConversionDetails();
        this.isUpdating = false;
        this.updateConvertButtonState();
    }

    async handleConversion() {
        try {
            const activeInput = this.isSwapped ? this.btcInput : this.brlInput;
            const value = parseFloat(activeInput.value);
            const brlIsSource = !this.isSwapped;
            
            // Calcula o valor final em BTC
            const btcValue = brlIsSource ? 
                (value * (1 - this.conversionFee)) / this.btcBrlRate : 
                value;
            
            // Prepara dados da transação
            const transactionData = {
                valor: value,
                moeda_origem: brlIsSource ? 'BRL' : 'BTC',
                moeda_destino: brlIsSource ? 'BTC' : 'BRL',
                taxa_conversao: this.conversionFee,
                valor_convertido: btcValue,
                chave_destino: this.addressInput.value.trim()
            };

            // Desabilita o botão durante a requisição
            this.convertButton.disabled = true;
            this.convertButtonText.textContent = 'Processando...';

            // Envia requisição para criar transação
            const response = await fetch(`${API_URL}/transacoes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transactionData)
            });

            if (!response.ok) {
                throw new Error('Falha ao criar transação');
            }

            const transaction = await response.json();
            
            // Redireciona para a página de status da transação
            window.location.href = `/pages/transaction/transaction.html?id=${transaction.codigo_transacao}`;
        } catch (error) {
            console.error('Erro ao processar transação:', error);
            this.showError('Falha ao processar transação. Por favor, tente novamente.');
            
            // Reabilita o botão em caso de erro
            this.convertButton.disabled = false;
            this.convertButtonText.textContent = 'Converter Anonimamente';
        }
    }

    animateInputChange(input, newValue) {
        input.style.transition = 'opacity 0.3s ease';
        input.style.opacity = '0.5';
        
        setTimeout(() => {
            input.value = newValue;
            input.style.opacity = '1';
        }, 150);
    }

    handleSwap() {
        this.isSwapped = !this.isSwapped;
        
        // Get the currency containers (parent elements)
        const leftContainer = this.brlInput.closest('.currency-input');
        const rightContainer = this.btcInput.closest('.currency-input');
        
        // Store current values
        const leftValue = this.brlInput.value;
        const rightValue = this.btcInput.value;
        
        // Get the parent element that contains both currency inputs
        const converterContainer = leftContainer.parentElement;
        
        // Remove both containers
        leftContainer.remove();
        rightContainer.remove();
        
        // Reinsert them in swapped order, but before the swap button
        if (this.isSwapped) {
            converterContainer.insertBefore(rightContainer, this.swapButton);
            converterContainer.insertBefore(leftContainer, this.swapButton.nextSibling);
            this.brlInput.disabled = true;
            this.btcInput.disabled = false;
        } else {
            converterContainer.insertBefore(leftContainer, this.swapButton);
            converterContainer.insertBefore(rightContainer, this.swapButton.nextSibling);
            this.brlInput.disabled = false;
            this.btcInput.disabled = true;
        }
        
        // Restore the values
        this.brlInput.value = leftValue;
        this.btcInput.value = rightValue;
        
        // Update the conversion if there are values
        if (leftValue || rightValue) {
            this.updateConversionDetails();
        }
    }

    updateAddressField() {
        const brlIsSource = this.brlInput.disabled === false;
        
        if (brlIsSource) {
            // BRL -> BTC: BRL está à esquerda, convertendo para BTC
            this.addressLabel.textContent = 'Endereço da Carteira Lightning Network';
            this.addressInput.placeholder = 'Endereço ln... ou email';
        } else {
            // BTC -> BRL: BTC está à esquerda, convertendo para BRL
            this.addressLabel.textContent = 'Chave PIX';
            this.addressInput.placeholder = 'CPF, email, telefone ou chave aleatória';
        }
        this.addressInput.value = '';
        this.addressError.textContent = '';
        this.validateAddress();
    }

    validateAddress() {
        const value = this.addressInput.value.trim();
        const brlIsSource = this.brlInput.disabled === false;
        
        if (!value) {
            this.addressError.textContent = 'Campo obrigatório';
            return false;
        }

        if (brlIsSource) {
            // Validação de endereço Lightning Network (BRL -> BTC)
            if (!value.startsWith('ln') && !value.includes('@')) {
                this.addressError.textContent = 'Endereço Lightning Network inválido';
                return false;
            }
        } else {
            // Validação básica de chave PIX (BTC -> BRL)
            if (value.length < 3) {
                this.addressError.textContent = 'Chave PIX inválida';
                return false;
            }
        }

        this.addressError.textContent = '';
        return true;
    }

    startRateUpdates() {
        this.fetchRates();
        setInterval(() => this.fetchRates(), 10000);
    }

    showError(message) {
        if (this.btcUsdElement && this.btcBrlElement && this.usdBrlElement) {
            this.btcUsdElement.textContent = 'Erro';
            this.btcBrlElement.textContent = 'Erro';
            this.usdBrlElement.textContent = 'Erro';
        }
        this.feeAmountElement.textContent = '-';
        this.finalAmountElement.textContent = '-';
        alert(message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Verifica o modo de manutenção antes de inicializar a aplicação
    checkMaintenance();
    
    // Só inicializa se não estiver em manutenção
    if (!MAINTENANCE_MODE) {
        new AnonymousConverter();
    }
});
