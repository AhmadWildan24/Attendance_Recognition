import mysql.connector
from config import Config


def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            connection_timeout=5
        )

        return connection

    except mysql.connector.Error as error:
        print(f"Database connection error: {error}")
        return None