class SystemBlocker {
    constructor() {
        this.startHour = 6; // 6:00
        this.endHour = 22;  // 22:00
        this.setupCountdown();
    }

    setupCountdown() {
        this.hoursElement = document.getElementById('hours');
        this.minutesElement = document.getElementById('minutes');
        this.secondsElement = document.getElementById('seconds');
        
        this.updateCountdown();
        // Atualiza a cada segundo
        setInterval(() => this.updateCountdown(), 1000);
    }

    updateCountdown() {
        const now = new Date();
        let target = new Date(now);

        // Se estiver antes do horário de início (6:00)
        if (now.getHours() < this.startHour) {
            target.setHours(this.startHour, 0, 0, 0);
        }
        // Se estiver depois do horário de término (22:00)
        else {
            target.setDate(target.getDate() + 1); // Próximo dia
            target.setHours(this.startHour, 0, 0, 0);
        }

        const diff = target - now;
        
        // Converter para horas, minutos e segundos
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        // Atualizar o display
        this.hoursElement.textContent = hours.toString().padStart(2, '0');
        this.minutesElement.textContent = minutes.toString().padStart(2, '0');
        this.secondsElement.textContent = seconds.toString().padStart(2, '0');
    }

    static checkSystemAvailability() {
        const now = new Date();
        const currentHour = now.getHours();
        
        // Se estiver fora do horário de funcionamento
        if (currentHour < 6 || currentHour >= 22) {
            // Redireciona para a página de bloqueio se não estiver nela
            if (!window.location.pathname.includes('/pages/blocked/blocked.html')) {
                window.location.href = '/pages/blocked/blocked.html';
            }
            return false;
        }
        
        // Se estiver no horário de funcionamento e estiver na página de bloqueio
        if (window.location.pathname.includes('/pages/blocked/blocked.html')) {
            window.location.href = '/index.html';
        }
        return true;
    }
}

// Inicializa o contador quando estiver na página de bloqueio
if (window.location.pathname.includes('/pages/blocked/blocked.html')) {
    new SystemBlocker();
}

// Verifica a disponibilidade do sistema a cada minuto
setInterval(SystemBlocker.checkSystemAvailability, 60000);

// Verifica imediatamente ao carregar qualquer página
document.addEventListener('DOMContentLoaded', SystemBlocker.checkSystemAvailability);
