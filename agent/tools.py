import sqlite3
import json
from typing import Dict, List, Any

import os

DB_PATH = os.path.join(os.path.dirname(__file__), "moving_project.db")

def _get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_branch_packing_summary(branch_name: str) -> Dict[str, Any]:
    """
    Returns total items, packed items, missing items, and balmas count for a specific ענף (branch).
    """
    conn = _get_connection()
    cursor = conn.cursor()
    
    query = '''
        SELECT 
            COUNT(i.catalog_id) as total_items,
            SUM(CASE WHEN i.item_status = 'PACKED' THEN 1 ELSE 0 END) as packed_items,
            SUM(CASE WHEN i.item_status = 'MISSING' THEN 1 ELSE 0 END) as missing_items,
            SUM(CASE WHEN i.is_balmas = 1 THEN 1 ELSE 0 END) as balmas_items
        FROM items i
        JOIN rooms r ON i.room_id = r.room_id
        JOIN idf_groups g ON r.group_id = g.id
        WHERE g.anaf = ?
    '''
    
    cursor.execute(query, (branch_name,))
    row = cursor.fetchone()
    conn.close()
    
    if not row or row["total_items"] == 0:
        return {"error": f"Branch '{branch_name}' not found or has no items."}
        
    return {
        "branch_name": branch_name,
        "total_items": row["total_items"] or 0,
        "packed_items": row["packed_items"] or 0,
        "missing_items": row["missing_items"] or 0,
        "balmas_items": row["balmas_items"] or 0
    }

def list_missing_items() -> List[Dict[str, Any]]:
    """
    Returns a list of all items currently marked as MISSING, along with their location and team.
    """
    conn = _get_connection()
    cursor = conn.cursor()
    
    query = '''
        SELECT 
            i.catalog_id,
            i.description,
            l.building,
            l.floor,
            l.room_number,
            g.tzevet as team_name,
            g.anaf as branch_name
        FROM items i
        JOIN rooms r ON i.room_id = r.room_id
        JOIN locations l ON r.location_id = l.location_id
        JOIN idf_groups g ON r.group_id = g.id
        WHERE i.item_status = 'MISSING'
    '''
    
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    
    missing_items = []
    for row in rows:
        missing_items.append({
            "catalog_id": row["catalog_id"],
            "description": row["description"],
            "location": {
                "building": row["building"],
                "floor": row["floor"],
                "room_number": row["room_number"]
            },
            "team": row["team_name"],
            "branch": row["branch_name"]
        })
        
    return missing_items

def get_active_trucks() -> List[Dict[str, Any]]:
    """
    Returns the status of all moving units.
    """
    conn = _get_connection()
    cursor = conn.cursor()
    
    query = '''
        SELECT 
            moving_id,
            moving_type,
            moving_status,
            moving_date
        FROM moving_units
    '''
    
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    
    trucks = []
    for row in rows:
        trucks.append({
            "moving_id": row["moving_id"],
            "moving_type": row["moving_type"],
            "moving_status": row["moving_status"],
            "moving_date": row["moving_date"]
        })
        
    return trucks

def get_team_equipment_summary(team_name: str) -> Dict[str, Any]:
    """
    Returns total items, packed items, and missing items for a specific team (צוות).
    """
    conn = _get_connection()
    cursor = conn.cursor()
    
    query = '''
        SELECT 
            COUNT(i.catalog_id) as total_items,
            SUM(CASE WHEN i.item_status = 'PACKED' THEN 1 ELSE 0 END) as packed_items,
            SUM(CASE WHEN i.item_status = 'MISSING' THEN 1 ELSE 0 END) as missing_items
        FROM items i
        JOIN rooms r ON i.room_id = r.room_id
        JOIN idf_groups g ON r.group_id = g.id
        WHERE g.tzevet = ?
    '''
    
    cursor.execute(query, (team_name,))
    row = cursor.fetchone()
    conn.close()
    
    if not row or row["total_items"] == 0:
        return {"error": f"Team '{team_name}' not found or has no items."}
        
    return {
        "team_name": team_name,
        "total_items": row["total_items"] or 0,
        "packed_items": row["packed_items"] or 0,
        "missing_items": row["missing_items"] or 0
    }

def get_room_details(building: int, room_number: int) -> Dict[str, Any]:
    """
    Returns details about a specific room including its status, the team assigned, and capacity.
    """
    conn = _get_connection()
    cursor = conn.cursor()
    
    query = '''
        SELECT 
            r.room_status,
            r.people_size,
            r.is_mapped,
            g.tzevet as team_name,
            g.anaf as branch_name
        FROM rooms r
        JOIN locations l ON r.location_id = l.location_id
        JOIN idf_groups g ON r.group_id = g.id
        WHERE l.building = ? AND l.room_number = ?
    '''
    
    cursor.execute(query, (building, room_number))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return {"error": f"Room {room_number} in building {building} not found."}
        
    return {
        "building": building,
        "room_number": room_number,
        "status": row["room_status"],
        "capacity": row["people_size"],
        "is_mapped": bool(row["is_mapped"]),
        "team": row["team_name"],
        "branch": row["branch_name"]
    }

def get_expensive_unpacked_items(min_price: int = 1000) -> List[Dict[str, Any]]:
    """
    Returns a list of unpacked items that cost more than a specified minimum price.
    """
    conn = _get_connection()
    cursor = conn.cursor()
    
    query = '''
        SELECT 
            i.catalog_id,
            i.description,
            i.price,
            i.item_status,
            l.building,
            l.room_number,
            g.tzevet as team_name
        FROM items i
        JOIN rooms r ON i.room_id = r.room_id
        JOIN locations l ON r.location_id = l.location_id
        JOIN idf_groups g ON r.group_id = g.id
        WHERE i.price >= ? AND i.item_status != 'PACKED'
        ORDER BY i.price DESC
    '''
    
    cursor.execute(query, (min_price,))
    rows = cursor.fetchall()
    conn.close()
    
    items = []
    for row in rows:
        items.append({
            "catalog_id": row["catalog_id"],
            "description": row["description"],
            "price": row["price"],
            "status": row["item_status"],
            "location": f"Building {row['building']}, Room {row['room_number']}",
            "team": row["team_name"]
        })
        
    return items

def generate_branch_packing_pie_chart(branch_name: str) -> Dict[str, str]:
    """
    Generates and saves a pie chart summarizing the packing status for a given branch.
    Returns a success message with the path to the saved image.
    """
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        return {"error": "matplotlib is not installed. Run 'pip install matplotlib' in your active environment."}
        
    summary = get_branch_packing_summary(branch_name)
    if "error" in summary:
        return summary
        
    labels = ['Packed', 'Missing', 'Unpacked/Other']
    packed = summary.get("packed_items", 0)
    missing = summary.get("missing_items", 0)
    total = summary.get("total_items", 0)
    unpacked = max(0, total - packed - missing)
    
    # Filter out zero values so pie chart looks clean
    sizes = []
    plot_labels = []
    colors_map = {'Packed': '#4CAF50', 'Missing': '#F44336', 'Unpacked/Other': '#FFC107'}
    plot_colors = []
    
    for label, size in zip(labels, [packed, missing, unpacked]):
        if size > 0:
            sizes.append(size)
            plot_labels.append(label)
            plot_colors.append(colors_map[label])
            
    if not sizes:
        return {"error": f"No packing data available for branch '{branch_name}'."}
    
    plt.figure(figsize=(6, 6))
    plt.pie(sizes, labels=plot_labels, colors=plot_colors, autopct='%1.1f%%', startangle=140)
    
    # Keeping title simple to avoid bidi rendering crashes inside matplotlib
    plt.title(f"Packing Status")
    
    # Replace spaces for valid filename
    safe_name = branch_name.replace(' ', '_').replace('"', '').replace("'", "")
    filename = f"pie_chart_{safe_name}.png"
    plt.savefig(filename)
    plt.close()
    
    return {"status": "success", "message": f"Pie chart saved successfully as {filename}", "file_path": filename}


def generate_truck_status_bar_chart() -> Dict[str, str]:
    """
    Generates and saves a bar chart showing the count of trucks in each status.
    Returns a success message with the path to the saved image.
    """
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        return {"error": "matplotlib is not installed. Run 'pip install matplotlib' in your active environment."}
        
    from collections import Counter
    
    trucks = get_active_trucks()
    if not trucks:
        return {"error": "No active trucks found."}
        
    status_counts = Counter([t.get("moving_status", "UNKNOWN") for t in trucks])
    
    statuses = list(status_counts.keys())
    counts = list(status_counts.values())
    
    plt.figure(figsize=(8, 5))
    
    plt.bar(range(len(statuses)), counts, color='#2196F3', tick_label=statuses)
    
    plt.title("Truck Statuses")
    plt.ylabel("Number of Trucks")
    plt.xticks(rotation=45)
    plt.tight_layout()
    
    filename = "truck_status_bar_chart.png"
    plt.savefig(filename)
    plt.close()
    
    return {"status": "success", "message": f"Bar chart saved successfully as {filename}", "file_path": filename}

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
        
    # Handle multiple structures the LLM might naturally hallucinate
    if isinstance(data, dict):
        categories = list(data.keys())
        values = list(data.values())
    elif isinstance(data, list):
        # E.g. [{"label":"Packed", "value":43}]
        categories = [str(item.get("label", f"Item {i}")) for i, item in enumerate(data)]
        values = [float(item.get("value", 0)) for item in data]
    elif isinstance(data, str):
        try:
            import json
            parsed = json.loads(data)
            if isinstance(parsed, dict):
                categories = list(parsed.keys())
                values = list(parsed.values())
            else:
                return {"error": "JSON string parsed into unsupported format."}
        except:
            return {"error": "Could not parse data string."}
    else:
        return {"error": "Unsupported data format."}
    
    # Ensure values are numbers (LLM sometimes passes strings like "43")
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
    filename = f"custom_bar_chart_{safe_name}.png"
    plt.savefig(filename)
    plt.close()
    
    return {"status": "success", "message": f"Custom bar chart saved successfully as {filename}", "file_path": filename}


def calculate(expression: str) -> Dict[str, Any]:
    """
    Evaluates a mathematical expression (e.g., '11 / 43 * 100').
    Returns the result of the calculation.
    """
    try:
        # Provide a very restricted environment to prevent arbitrary code execution
        allowed_names = {"__builtins__": None, "abs": abs, "round": round, "min": min, "max": max}
        result = eval(expression, allowed_names, {})
        return {"expression": expression, "result": result}
    except Exception as e:
        return {"error": f"Failed to evaluate '{expression}': {str(e)}"}

if __name__ == "__main__":
    # Test block to verify tools work
    print("--- Branch Summary: ענף לוגיסטיקה ---")
    print(json.dumps(get_branch_packing_summary("ענף לוגיסטיקה"), indent=2, ensure_ascii=False))
    
    print("\n--- Missing Items ---")
    print(json.dumps(list_missing_items(), indent=2, ensure_ascii=False))
    
    print("\n--- Active Trucks ---")
    print(json.dumps(get_active_trucks(), indent=2, ensure_ascii=False))
