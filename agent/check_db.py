import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.environ.get("SUPABASE_DB_URL")
if not db_url:
    print("Error: SUPABASE_DB_URL not found")
    exit(1)

# Remove quotes if they exist
db_url = db_url.strip('"').strip("'")
print(f"Connecting to: {db_url.split('@')[-1]}")

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    cursor.execute("SELECT 1;")
    result = cursor.fetchone()
    print("Success! Database connection works.")
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")
