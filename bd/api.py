from fastapi import FastAPI, HTTPException, Depends, Request
from sqlalchemy import create_engine, Column, Integer, String, Numeric, DateTime, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
from typing import List
import uuid
from models import TransacaoCriar, Transacao
from config import HOST, DATABASE_NAME, PORT, USER, PASSWORD
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import requests

# Configuração do SQLAlchemy
DATABASE_URL = f"postgresql://{USER}:{PASSWORD}@{HOST}:{PORT}/{DATABASE_NAME}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Modelo SQLAlchemy para Transações
class TransacaoModel(Base):
    __tablename__ = "transacoes"

    id = Column(Integer, primary_key=True, index=True)
    codigo_transacao = Column(String(36), unique=True, nullable=False)
    valor = Column(Numeric(18, 8), nullable=False)
    moeda_origem = Column(String(3), nullable=False)
    moeda_destino = Column(String(3), nullable=False)
    taxa_conversao = Column(Numeric(18, 8), nullable=False)
    valor_convertido = Column(Numeric(18, 8), nullable=False)
    chave_destino = Column(String, nullable=False)
    status = Column(String(15), nullable=False, default='pendente')
    criado_em = Column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    atualizado_em = Column(DateTime, nullable=True)

# Modelo SQLAlchemy para Cotações
class CotacaoModel(Base):
    __tablename__ = "cotacoes"

    id = Column(Integer, primary_key=True, index=True)
    par_moedas = Column(String(7), nullable=False)
    valor = Column(Numeric(18, 8), nullable=False)
    atualizado_em = Column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

# Modelo Pydantic para resposta da API de cotações
class CotacaoResponse(BaseModel):
    par_moedas: str
    valor: float
    atualizado_em: datetime

    class Config:
        from_attributes = True

# Dependência para obter a sessão do banco
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI(title="Eternal Pay API")

# Middleware para forçar HTTPS
@app.middleware("http")
async def force_https(request: Request, call_next):
    response = await call_next(request)
    return response

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://max-epayweb.uvxtdw.easypanel.host"],  # Apenas HTTPS permitido
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    max_age=3600,  # Cache preflight por 1 hora
)

@app.post("/transacoes/", response_model=Transacao)
def criar_transacao(transacao: TransacaoCriar, db: Session = Depends(get_db)):
    db_transacao = TransacaoModel(
        codigo_transacao=str(transacao.codigo_transacao),
        valor=transacao.valor,
        moeda_origem=transacao.moeda_origem.upper(),
        moeda_destino=transacao.moeda_destino.upper(),
        taxa_conversao=transacao.taxa_conversao,
        valor_convertido=transacao.valor_convertido,
        chave_destino=transacao.chave_destino,
        status="pendente"
    )
    
    try:
        db.add(db_transacao)
        db.commit()
        db.refresh(db_transacao)
        return db_transacao
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/transacoes/", response_model=List[Transacao])
def listar_transacoes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    transacoes = db.query(TransacaoModel).offset(skip).limit(limit).all()
    return transacoes

@app.get("/transacoes/{codigo_transacao}", response_model=Transacao)
def obter_transacao(codigo_transacao: str, db: Session = Depends(get_db)):
    transacao = db.query(TransacaoModel).filter(
        TransacaoModel.codigo_transacao == codigo_transacao
    ).first()
    if transacao is None:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return transacao

@app.put("/transacoes/{codigo_transacao}/status")
def atualizar_status_transacao(
    codigo_transacao: str,
    status: str,
    db: Session = Depends(get_db)
):
    transacao = db.query(TransacaoModel).filter(
        TransacaoModel.codigo_transacao == codigo_transacao
    ).first()
    
    if transacao is None:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    if status not in ["pendente", "processando", "concluida", "falha"]:
        raise HTTPException(status_code=400, detail="Status inválido")
    
    transacao.status = status
    transacao.atualizado_em = datetime.utcnow()
    
    try:
        db.commit()
        return {"message": "Status atualizado com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/cotacoes/", response_model=List[CotacaoResponse])
def listar_cotacoes(db: Session = Depends(get_db)):
    """Lista todas as cotações disponíveis"""
    cotacoes = db.query(CotacaoModel).all()
    return cotacoes

@app.get("/cotacoes/{par_moedas}", response_model=CotacaoResponse)
def obter_cotacao(par_moedas: str, db: Session = Depends(get_db)):
    """Obtém a cotação de um par específico de moedas (ex: BTC/USD, USD/BRL)"""
    par_moedas = par_moedas.upper()
    cotacao = db.query(CotacaoModel).filter(CotacaoModel.par_moedas == par_moedas).first()
    if not cotacao:
        raise HTTPException(status_code=404, detail=f"Cotação {par_moedas} não encontrada")
    return cotacao

@app.get("/cotacoes/converter/{valor}/{moeda_origem}/{moeda_destino}")
def converter_moeda(
    valor: float,
    moeda_origem: str,
    moeda_destino: str,
    db: Session = Depends(get_db)
):
    """
    Converte um valor entre duas moedas usando as cotações disponíveis
    Exemplo: /cotacoes/converter/100/BRL/BTC
    """
    moeda_origem = moeda_origem.upper()
    moeda_destino = moeda_destino.upper()

    # Função auxiliar para buscar cotação
    def get_cotacao(par_moedas):
        cotacao = db.query(CotacaoModel).filter(CotacaoModel.par_moedas == par_moedas).first()
        if not cotacao:
            raise HTTPException(
                status_code=404,
                detail=f"Cotação {par_moedas} não encontrada"
            )
        return float(cotacao.valor)

    try:
        valor_convertido = valor

        # Se a origem é BRL e destino é BTC
        if moeda_origem == "BRL" and moeda_destino == "BTC":
            cotacao_btc_brl = get_cotacao("BTC/BRL")
            valor_convertido = valor / cotacao_btc_brl

        # Se a origem é BTC e destino é BRL
        elif moeda_origem == "BTC" and moeda_destino == "BRL":
            cotacao_btc_brl = get_cotacao("BTC/BRL")
            valor_convertido = valor * cotacao_btc_brl

        # Se a origem é USD e destino é BRL
        elif moeda_origem == "USD" and moeda_destino == "BRL":
            cotacao_usd_brl = get_cotacao("USD/BRL")
            valor_convertido = valor * cotacao_usd_brl

        # Se a origem é BRL e destino é USD
        elif moeda_origem == "BRL" and moeda_destino == "USD":
            cotacao_usd_brl = get_cotacao("USD/BRL")
            valor_convertido = valor / cotacao_usd_brl

        # Se a origem é BTC e destino é USD
        elif moeda_origem == "BTC" and moeda_destino == "USD":
            cotacao_btc_usd = get_cotacao("BTC/USD")
            valor_convertido = valor * cotacao_btc_usd

        # Se a origem é USD e destino é BTC
        elif moeda_origem == "USD" and moeda_destino == "BTC":
            cotacao_btc_usd = get_cotacao("BTC/USD")
            valor_convertido = valor / cotacao_btc_usd

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Conversão de {moeda_origem} para {moeda_destino} não suportada"
            )

        return {
            "valor_original": valor,
            "moeda_origem": moeda_origem,
            "moeda_destino": moeda_destino,
            "valor_convertido": valor_convertido,
            "timestamp": datetime.utcnow()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao converter valor: {str(e)}")

@app.get("/pix/brcode")
def get_pix_brcode(
    nome: str,
    cidade: str,
    valor: float,
    chave: str,
    txid: str
):
    """Busca o código Pix BR Code da API externa"""
    try:
        url = "https://gerarqrcodepix.com.br/api/v1"
        params = {
            "nome": nome,
            "cidade": cidade,
            "valor": f"{valor:.2f}",
            "chave": chave,
            "txid": txid,
            "saida": "br"
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
