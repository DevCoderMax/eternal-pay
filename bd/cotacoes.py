from sqlalchemy import create_engine, Column, Integer, String, Numeric, DateTime, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
import requests
import time
from config import HOST, DATABASE_NAME, PORT, USER, PASSWORD

# Configuração do SQLAlchemy
DATABASE_URL = f"postgresql://{USER}:{PASSWORD}@{HOST}:{PORT}/{DATABASE_NAME}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Modelo para a tabela de cotações
class Cotacao(Base):
    __tablename__ = "cotacoes"

    id = Column(Integer, primary_key=True, index=True)
    par_moedas = Column(String(7), nullable=False)  # Exemplo: BTC/BRL
    valor = Column(Numeric(18, 8), nullable=False)
    atualizado_em = Column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

# Criar a tabela se não existir
Base.metadata.create_all(bind=engine)

class CotacaoService:
    def __init__(self):
        self.BASE_URL = 'https://max-apiscrapercripto.uvxtdw.easypanel.host'
        self.session = SessionLocal()
        self.ultima_atualizacao_usdbrl = datetime.min

    def buscar_cotacao(self, moeda, cotacao, exchange='binance'):
        try:
            url = f"{self.BASE_URL}/price/{moeda}/quote/{cotacao}/exchange/{exchange}"
            response = requests.get(url)
            if response.status_code == 200:
                return response.json()['price']
            return None
        except Exception as e:
            print(f"Erro ao buscar cotação {moeda}/{cotacao}: {e}")
            return None

    def atualizar_cotacao(self, par_moedas, valor):
        try:
            cotacao = self.session.query(Cotacao).filter(
                Cotacao.par_moedas == par_moedas
            ).first()

            if cotacao:
                cotacao.valor = valor
                cotacao.atualizado_em = datetime.utcnow()
            else:
                cotacao = Cotacao(
                    par_moedas=par_moedas,
                    valor=valor,
                    atualizado_em=datetime.utcnow()
                )
                self.session.add(cotacao)

            self.session.commit()
            print(f"Cotação {par_moedas} atualizada: {valor}")
        except Exception as e:
            self.session.rollback()
            print(f"Erro ao atualizar cotação: {e}")

    def deve_atualizar_usdbrl(self):
        agora = datetime.utcnow()
        return agora - self.ultima_atualizacao_usdbrl >= timedelta(minutes=5)

    def atualizar_todas_cotacoes(self):
        # BTC/BRL
        btc_brl = self.buscar_cotacao('BTC', 'BRL')
        if btc_brl:
            self.atualizar_cotacao('BTC/BRL', btc_brl)

        # BTC/USD (USDT)
        btc_usd = self.buscar_cotacao('BTC', 'USDT')
        if btc_usd:
            self.atualizar_cotacao('BTC/USD', btc_usd)

        # USD/BRL (USDT/BRL) - atualiza a cada 5 minutos
        if self.deve_atualizar_usdbrl():
            usd_brl = self.buscar_cotacao('USDT', 'BRL')
            if usd_brl:
                self.atualizar_cotacao('USD/BRL', usd_brl)
                self.ultima_atualizacao_usdbrl = datetime.utcnow()
                print("Cotação USD/BRL atualizada (próxima atualização em 5 minutos)")

    def executar_atualizacao_continua(self, intervalo_segundos=10):
        while True:
            print("\nAtualizando cotações...")
            self.atualizar_todas_cotacoes()
            time.sleep(intervalo_segundos)

if __name__ == "__main__":
    servico = CotacaoService()
    try:
        servico.executar_atualizacao_continua()
    except KeyboardInterrupt:
        print("\nServiço de atualização de cotações finalizado.")
    finally:
        servico.session.close()
