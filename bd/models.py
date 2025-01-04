from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID, uuid4
import random
import string

def gerar_codigo_transacao(tamanho=12):
    """Gera um código alfanumérico único para a transação com o tamanho especificado"""
    caracteres = string.ascii_uppercase + string.digits
    return ''.join(random.choices(caracteres, k=tamanho))

class TransacaoBase(BaseModel):
    valor: float = Field(..., gt=0)
    moeda_origem: str = Field(..., min_length=3, max_length=3)
    moeda_destino: str = Field(..., min_length=3, max_length=3)
    taxa_conversao: float = Field(..., gt=0)
    valor_convertido: float = Field(..., gt=0)
    chave_destino: str

class TransacaoCriar(TransacaoBase):
    codigo_transacao: str = Field(default_factory=lambda: gerar_codigo_transacao(12))

class Transacao(TransacaoBase):
    id: int
    codigo_transacao: str
    status: str = "pendente"
    criado_em: datetime
    atualizado_em: Optional[datetime] = None

    class Config:
        from_attributes = True
