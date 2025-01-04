import psycopg2
import time
from config import HOST, DATABASE_NAME, PORT, USER, PASSWORD
from datetime import datetime, timezone

def verificar_transacoes():
    while True:
        try:
            # Conecta ao banco de dados
            conn = psycopg2.connect(
                host=HOST,
                port=PORT,
                user=USER,
                password=PASSWORD,
                database="eternal_pay"
            )
            conn.autocommit = True
            cursor = conn.cursor()

            # Atualiza transações pendentes com mais de 30 minutos
            update_query = """
            WITH transacoes_antigas AS (
                SELECT codigo_transacao
                FROM transacoes
                WHERE status = 'pendente'
                AND criado_em < (CURRENT_TIMESTAMP - INTERVAL '30 minutes')
                FOR UPDATE
            )
            UPDATE transacoes t
            SET status = 'cancelado',
                atualizado_em = CURRENT_TIMESTAMP
            FROM transacoes_antigas ta
            WHERE t.codigo_transacao = ta.codigo_transacao
            RETURNING t.codigo_transacao, t.criado_em, t.atualizado_em;
            """
            
            cursor.execute(update_query)
            transacoes_atualizadas = cursor.fetchall()
            
            if transacoes_atualizadas:
                print(f"\n[{datetime.now(timezone.utc)}] Transações canceladas:")
                for transacao in transacoes_atualizadas:
                    codigo, criado, atualizado = transacao
                    tempo_ativo = atualizado - criado
                    print(f"- Código: {codigo}")
                    print(f"  Criada em: {criado}")
                    print(f"  Cancelada em: {atualizado}")
                    print(f"  Tempo ativo: {tempo_ativo}")
                print("------------------------")

        except psycopg2.Error as e:
            print(f"Erro no banco de dados: {e}")
        except Exception as e:
            print(f"Erro inesperado: {e}")
        finally:
            try:
                cursor.close()
                conn.close()
            except:
                pass

        # Aguarda 30 segundos antes da próxima verificação
        time.sleep(30)

if __name__ == "__main__":
    print("Iniciando verificador de transações...")
    print("Verificando transações a cada 30 segundos...")
    verificar_transacoes()
