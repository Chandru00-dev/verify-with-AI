import pymysql
import os
from dotenv import load_dotenv

load_dotenv(override=True)

db_host = os.getenv('DB_HOST', 'localhost')
db_user = os.getenv('DB_USER', 'root')
db_pass = os.getenv('DB_PASSWORD', 'proceed')
db_name = os.getenv('DB_NAME', 'verify_ai')

# Connect to MySQL server (no database selected yet)
db_port = int(os.getenv('DB_PORT', 3306))
DB_CONFIG = {
    'host': db_host,
    'port': db_port,
    'user': db_user,
    'password': db_pass,
    'ssl': {'ssl': {}}
}

SQL_COMMANDS = [
    f"CREATE DATABASE IF NOT EXISTS {db_name};",
    f"USE {db_name};",
    """
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(120) UNIQUE NOT NULL,
        password VARCHAR(255) NULL,
        auth_provider VARCHAR(20) DEFAULT 'email',
        provider_id VARCHAR(255),
        profile_pic TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE INDEX idx_provider (provider_id, auth_provider)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS chat_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(50),
        input_type VARCHAR(20),
        input_content TEXT,
        response TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
]

def init_db():
    print(f"Connecting to MySQL as root...")
    try:
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("Connected! Running SQL commands...")
        for sql in SQL_COMMANDS:
            try:
                # Handle 'USE' command differently or just execute
                cursor.execute(sql)
                print(f"Executed: {sql.strip().split()[0]} ...")
            except Exception as e:
                print(f"Error executing SQL: {e}")
        
        conn.commit()
        cursor.close()
        conn.close()
        print(f"\nSUCCESS! Database '{db_name}' and tables created.")
        
    except Exception as e:
        print(f"\nCRITICAL ERROR: {e}")
        print("Double check your password in .env file.")

if __name__ == "__main__":
    init_db()
