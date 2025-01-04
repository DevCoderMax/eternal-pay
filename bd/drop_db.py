import psycopg2
from config import HOST, PORT, USER, PASSWORD

def drop_database():
    # Conecta ao postgres (banco padrão) para poder dropar o eternal_pay
    conn = psycopg2.connect(
        host=HOST,
        port=PORT,
        user=USER,
        password=PASSWORD,
        database="postgres"
    )
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        # Primeiro, desconecta todos os usuários do banco eternal_pay
        cursor.execute("""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = 'eternal_pay'
            AND pid <> pg_backend_pid();
        """)
        
        # Agora dropa o banco de dados
        cursor.execute("DROP DATABASE IF EXISTS eternal_pay")
        print("Banco de dados eternal_pay foi removido com sucesso!")
        
    except psycopg2.Error as e:
        print(f"Erro ao remover banco de dados: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    resposta = input("⚠️ ATENÇÃO: Isso irá deletar todo o banco de dados. Tem certeza? (s/N): ")
    if resposta.lower() == 's':
        drop_database()
    else:
        print("Operação cancelada.")
