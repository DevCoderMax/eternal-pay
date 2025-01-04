import psycopg2
from config import HOST, DATABASE_NAME, PORT, USER, PASSWORD

def setup_database():
    # Primeiro, conecta ao postgres para criar o banco de dados
    conn = psycopg2.connect(
        host=HOST,
        port=PORT,
        user=USER,
        password=PASSWORD,
        database="postgres"
    )
    conn.autocommit = True
    cursor = conn.cursor()

    # Tenta criar o banco de dados
    try:
        cursor.execute("CREATE DATABASE eternal_pay")
        print("Banco de dados eternal_pay criado com sucesso!")
    except psycopg2.Error as e:
        print(f"Banco de dados já existe ou erro ao criar: {e}")
    finally:
        cursor.close()
        conn.close()

    # Conecta ao banco eternal_pay para criar a tabela
    try:
        conn = psycopg2.connect(
            host=HOST,
            port=PORT,
            user=USER,
            password=PASSWORD,
            database="eternal_pay"
        )
        conn.autocommit = True
        cursor = conn.cursor()

        # Criação da tabela de transações
        create_table_query = """
        CREATE TABLE IF NOT EXISTS transacoes (
            id SERIAL PRIMARY KEY,
            codigo_transacao VARCHAR(12) UNIQUE NOT NULL,
            valor NUMERIC(18, 8) NOT NULL,
            moeda_origem VARCHAR(3) NOT NULL,
            moeda_destino VARCHAR(3) NOT NULL,
            taxa_conversao NUMERIC(18, 8) NOT NULL,
            valor_convertido NUMERIC(18, 8) NOT NULL,
            chave_destino TEXT NOT NULL,
            status VARCHAR(15) NOT NULL DEFAULT 'pendente',
            criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP
        )
        """
        cursor.execute(create_table_query)
        print("Tabela transacoes criada com sucesso!")

        # Criar função para atualizar status
        create_function_query = """
        CREATE OR REPLACE FUNCTION atualizar_status_transacao()
        RETURNS trigger AS $$
        BEGIN
            IF NEW.status = 'pendente' AND 
               (CURRENT_TIMESTAMP - NEW.criado_em) > INTERVAL '30 minutes' THEN
                NEW.status := 'cancelado';
                NEW.atualizado_em := CURRENT_TIMESTAMP;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
        cursor.execute(create_function_query)
        print("Função de atualização de status criada com sucesso!")

        # Criar trigger
        create_trigger_query = """
        DROP TRIGGER IF EXISTS verificar_tempo_transacao ON transacoes;
        CREATE TRIGGER verificar_tempo_transacao
        BEFORE UPDATE ON transacoes
        FOR EACH ROW
        EXECUTE FUNCTION atualizar_status_transacao();
        """
        cursor.execute(create_trigger_query)
        print("Trigger de verificação de tempo criado com sucesso!")

    except psycopg2.Error as e:
        print(f"Erro ao criar tabela: {e}")
    finally:
        cursor.close()
        conn.close()

def atualizar_transacoes_antigas():
    try:
        conn = psycopg2.connect(
            host=HOST,
            port=PORT,
            user=USER,
            password=PASSWORD,
            database="eternal_pay"
        )
        conn.autocommit = True
        cursor = conn.cursor()

        # Atualiza todas as transações pendentes com mais de 30 minutos
        update_query = """
        UPDATE transacoes 
        SET status = 'cancelado',
            atualizado_em = CURRENT_TIMESTAMP
        WHERE status = 'pendente'
        AND (CURRENT_TIMESTAMP - criado_em) > INTERVAL '30 minutes'
        """
        cursor.execute(update_query)
        
        rows_affected = cursor.rowcount
        print(f"{rows_affected} transações antigas foram atualizadas para cancelado")

    except psycopg2.Error as e:
        print(f"Erro ao atualizar transações antigas: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    setup_database()
    atualizar_transacoes_antigas()