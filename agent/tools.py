import os
import json
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, List, Any
from dotenv import load_dotenv

# Load environment variables from the .env file in the same directory
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path)

def _get_connection():
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        raise ValueError("SUPABASE_DB_URL environment variable is not set. Please set it in agent/.env")
    
    # Strip any accidental quotes from the .env file that might break psycopg2
    db_url = db_url.strip('"').strip("'")
    
    # Supabase connection string usually starts with postgresql:// or postgres://
    conn = psycopg2.connect(db_url)
    return conn

def _json_safe(value: Any) -> Any:
    """Converts Postgres values that json.dumps can't handle (numeric, timestamps, uuid)."""
    if isinstance(value, Decimal):
        # SUM/AVG return numeric: keep whole numbers as ints.
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, (UUID, timedelta)):
        return str(value)
    return value

def execute_sql_query(query: str) -> Dict[str, Any]:
    """
    Executes a read-only SQL SELECT query on the logistics PostgreSQL database.
    """
    if not query.strip().upper().startswith("SELECT") and not query.strip().upper().startswith("WITH"):
        return {"error": "Only SELECT queries are allowed for security."}
    # One statement only: "SELECT 1; DROP TABLE ..." would otherwise pass the check above.
    if ";" in query.strip().rstrip(";"):
        return {"error": "Only a single SELECT statement is allowed."}

    try:
        conn = _get_connection()
        # Enforced by Postgres, so data-modifying CTEs (WITH ... DELETE) fail too.
        conn.set_session(readonly=True)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SET statement_timeout = '15s';")
        
        # In PostgreSQL, we must use the correct schema. Usually it's 'moving_south_operation' or 'public'
        # To avoid forcing the LLM to guess, we'll set the search path automatically.
        cursor.execute("SET search_path TO moving_south_operation, public;")
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        # Get column names
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        
        results = [{key: _json_safe(value) for key, value in row.items()} for row in rows]
            
        conn.close()
        
        return {
            "status": "success",
            "count": len(results),
            "columns": columns,
            "data": results
        }
    except Exception as e:
        return {"error": str(e)}

def get_database_schema() -> Dict[str, Any]:
    """
    Returns the database schema (tables and columns) for the 'moving_south_operation' schema to help formulate SQL queries.
    """
    query = '''
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'moving_south_operation'
        ORDER BY table_name, ordinal_position;
    '''
    return execute_sql_query(query)

def list_missing_items() -> List[Dict[str, Any]]:
    """
    Returns a list of all items currently marked as 'Missing' or similar status.
    """
    query = '''
        SELECT 
            mr.id as report_id,
            mr.description,
            mr.quantity,
            mr.status,
            r.description as room_name,
            l.description as location_name
        FROM mapping_reports mr
        LEFT JOIN rooms r ON mr.room_id = r.id
        LEFT JOIN locations l ON r.location_id = l.id
        WHERE mr.status ILIKE '%missing%' OR mr.status ILIKE '%חסר%'
    '''
    result = execute_sql_query(query)
    if "error" in result:
        return [{"error": result["error"]}]
    return result.get("data", [])

def get_active_trucks() -> List[Dict[str, Any]]:
    """
    Returns the status of all transports.
    """
    query = '''
        SELECT 
            id as transport_id,
            moving_type,
            status,
            moving_date,
            vehicle_details
        FROM transports
    '''
    result = execute_sql_query(query)
    if "error" in result:
        return [{"error": result["error"]}]
    return result.get("data", [])

def generate_generic_bar_chart(title: str, x_label: str, y_label: str, data: Any) -> Dict[str, str]:
    """
    Generates and saves a bar chart from generic key-value data.
    Accepts data either as a dict {"Cat1": 10} or a list of dicts [{"label": "Cat1", "value": 10}].
    """
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        return {"error": "matplotlib is not installed."}
        
    if not data:
        return {"error": "No data provided to plot."}
        
    # Handle multiple structures
    if isinstance(data, dict):
        categories = list(data.keys())
        values = list(data.values())
    elif isinstance(data, list):
        categories = [str(item.get("label", item.get(list(item.keys())[0], f"Item {i}"))) for i, item in enumerate(data)]
        values = [float(item.get("value", item.get(list(item.keys())[1], 0))) for item in data]
    elif isinstance(data, str):
        try:
            parsed = json.loads(data)
            if isinstance(parsed, dict):
                categories = list(parsed.keys())
                values = list(parsed.values())
            elif isinstance(parsed, list):
                categories = [str(item.get("label", list(item.values())[0])) for i, item in enumerate(parsed)]
                values = [float(item.get("value", list(item.values())[1])) for item in parsed]
            else:
                return {"error": "JSON string must be a dict or list of dicts."}
        except:
            return {"error": "Could not parse data string."}
    else:
        return {"error": "Unsupported data format."}
    
    try:
        values = [float(v) for v in values]
    except ValueError:
        return {"error": "All data values must be numerical."}
        
    plt.figure(figsize=(10, 6))
    
    # Reverse labels for RTL support if they contain Hebrew
    display_categories = [str(cat)[::-1] if any("\u0590" <= c <= "\u05EA" for c in str(cat)) else str(cat) for cat in categories]
    
    plt.bar(range(len(categories)), values, color='#4CAF50', tick_label=display_categories)
    
    def r2l(text):
        if not text:
            return ""
        return str(text)[::-1] if any("\u0590" <= c <= "\u05EA" for c in str(text)) else str(text)
        
    plt.title(r2l(title))
    plt.xlabel(r2l(x_label))
    plt.ylabel(r2l(y_label))
    
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    
    safe_name = str(title).replace(' ', '_').replace('"', '').replace("'", "").replace("/", "")
    filename = f"images/custom_bar_chart_{safe_name}.png"
    filepath = os.path.join(os.path.dirname(__file__), filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    plt.savefig(filepath)
    plt.close()
    
    return {"status": "success", "message": f"Custom bar chart saved successfully as {filename}", "file_path": filename}

def generate_generic_pie_chart(title: str, data: Any) -> Dict[str, str]:
    """
    Generates and saves a pie chart from generic key-value data.
    Accepts data either as a dict {"Cat1": 10} or a list of dicts [{"label": "Cat1", "value": 10}].
    """
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        return {"error": "matplotlib is not installed."}
        
    if not data:
        return {"error": "No data provided to plot."}
        
    if isinstance(data, dict):
        categories = list(data.keys())
        values = list(data.values())
    elif isinstance(data, list):
        categories = [str(item.get("label", item.get(list(item.keys())[0], f"Item {i}"))) for i, item in enumerate(data)]
        values = [float(item.get("value", item.get(list(item.keys())[1], 0))) for item in data]
    elif isinstance(data, str):
        try:
            parsed = json.loads(data)
            if isinstance(parsed, dict):
                categories = list(parsed.keys())
                values = list(parsed.values())
            elif isinstance(parsed, list):
                categories = [str(item.get("label", list(item.values())[0])) for i, item in enumerate(parsed)]
                values = [float(item.get("value", list(item.values())[1])) for item in parsed]
            else:
                return {"error": "JSON string must be a dict or list of dicts."}
        except:
            return {"error": "Could not parse data string."}
    else:
        return {"error": "Unsupported data format."}
    
    try:
        values = [float(v) for v in values]
    except ValueError:
        return {"error": "All data values must be numerical."}
        
    filtered_cats = []
    filtered_vals = []
    for cat, val in zip(categories, values):
        if val > 0:
            filtered_cats.append(cat)
            filtered_vals.append(val)
            
    if not filtered_vals:
        return {"error": "No non-zero data to plot."}
        
    plt.figure(figsize=(8, 8))
    
    def r2l(text):
        if not text: return ""
        return str(text)[::-1] if any("\u0590" <= c <= "\u05EA" for c in str(text)) else str(text)
        
    display_categories = [r2l(cat) for cat in filtered_cats]
    
    plt.pie(filtered_vals, labels=display_categories, autopct='%1.1f%%', startangle=140)
    plt.title(r2l(title))
    
    safe_name = str(title).replace(' ', '_').replace('"', '').replace("'", "").replace("/", "")
    filename = f"images/custom_pie_chart_{safe_name}.png"
    filepath = os.path.join(os.path.dirname(__file__), filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    plt.savefig(filepath)
    plt.close()
    
    return {"status": "success", "message": f"Custom pie chart saved successfully as {filename}", "file_path": filename}

def calculate(expression: str) -> Dict[str, Any]:
    """
    Evaluates a mathematical expression (e.g., '11 / 43 * 100').
    Returns the result of the calculation.
    """
    try:
        allowed_names = {"__builtins__": None, "abs": abs, "round": round, "min": min, "max": max}
        result = eval(expression, allowed_names, {})
        return {"expression": expression, "result": result}
    except Exception as e:
        return {"error": f"Failed to evaluate '{expression}': {str(e)}"}

if __name__ == "__main__":
    print("--- Database Schema ---")
    print(json.dumps(get_database_schema(), indent=2, ensure_ascii=False))
    
    print("\n--- Missing Items ---")
    print(json.dumps(list_missing_items(), indent=2, ensure_ascii=False))
    
    print("\n--- Active Trucks ---")
    print(json.dumps(get_active_trucks(), indent=2, ensure_ascii=False))
