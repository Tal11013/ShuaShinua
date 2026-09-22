import sqlite3
import uuid
import random
from typing import List, Optional
from datetime import date, timedelta
from enum import Enum
from pydantic import BaseModel, Field

# ==========================================
# 1. ENUMS
# ==========================================
class RoomStatus(str, Enum):
    WAITING_FOR_STATUS = "WAITING_FOR_STATUS"
    PACKING_PROCESS = "PACKING_PROCESS"
    CLOSED_ROOM = "CLOSED_ROOM"
    WAITING_GRITA = "WAITING_GRITA"

class ItemStatus(str, Enum):
    NOT_PACKED = "NOT_PACKED"
    PACKED = "PACKED"
    RECEIVED = "RECEIVED"
    MISSING = "MISSING"
    ITEM_DISTRIBUTED = "ITEM_DISTRIBUTED"

class Action(str, Enum):
    CREATE_PACKING = "CREATE_PACKING"
    CREATE_MOVING = "CREATE_MOVING"
    RECEIVE_ITEMS = "RECEIVE_ITEMS"
    DISTRIBUTE_ITEMS = "DISTRIBUTE_ITEMS"

class BoxType(str, Enum):
    PROF_BOX = "PROF_BOX"
    PERSONAL_BOX = "PERSONAL_BOX"
    DOLEV = "DOLEV"
    MISHTACH = "משטח"
    TIFZORET = "תפזורת"

class PackingUnitStatus(str, Enum):
    WAITING_FOR_PACKING = "WAITING_FOR_PACKING"
    PACKING_RECEIVED = "PACKING_RECEIVED"
    PACKING_PROCESS = "PACKING_PROCESS"
    PACKING_CLOSED = "PACKING_CLOSED"
    PACKING_ON_WAY = "PACKING_ON_WAY"
    MISSING = "MISSING"

class MovingType(str, Enum):
    TRACK = "TRACK"  # Assuming TRACK meant TRUCK, keeping as requested
    CAR = "CAR"

class MovingUnitStatus(str, Enum):
    WAITING_FOR_MOVING = "WAITING_FOR_MOVING"
    LOADING = "בתהליך העמסה"
    ON_THE_WAY = "יצא לדרך"
    UNLOADED = "הובלה נפרקה ביעד"
    CLOSED = "הובלה סגורה"


# ==========================================
# 2. PYDANTIC MODELS
# ==========================================
class Location(BaseModel):
    location_id: int
    building: int
    floor: int
    room_number: int

class IdfGroup(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    yehida: str = Field(alias="יחידה")
    anaf: str = Field(alias="ענף")
    mador: str = Field(alias="מדור")
    tzevet: str = Field(alias="צוות")

class Item(BaseModel):
    catalog_id: str
    description: str
    price: int
    item_status: ItemStatus
    is_balmas: bool
    room_id: uuid.UUID
    packing_id: Optional[uuid.UUID] = None

class Room(BaseModel):
    room_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    is_mapped: bool
    people_size: int
    location_id: int
    group_id: uuid.UUID
    room_status: RoomStatus

class Mapping(BaseModel):
    mapping_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    old_room_id: uuid.UUID
    new_room_id: uuid.UUID

class PackingUnit(BaseModel):
    packing_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    box_type: BoxType
    packing_status: PackingUnitStatus
    moving_id: Optional[uuid.UUID] = None

class MovingUnit(BaseModel):
    moving_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    moving_type: MovingType
    moving_status: MovingUnitStatus
    moving_date: date


# ==========================================
# 3. SQLITE DATABASE SETUP & MOCK DATA GENERATION
# ==========================================
def setup_database(db_path: str = "moving_project.db"):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create Tables
    cursor.executescript('''
        DROP TABLE IF EXISTS moving_units;
        DROP TABLE IF EXISTS packing_units;
        DROP TABLE IF EXISTS items;
        DROP TABLE IF EXISTS rooms;
        DROP TABLE IF EXISTS idf_groups;
        DROP TABLE IF EXISTS locations;
        
        CREATE TABLE locations (
            location_id INTEGER PRIMARY KEY,
            building INTEGER,
            floor INTEGER,
            room_number INTEGER
        );
        
        CREATE TABLE idf_groups (
            id TEXT PRIMARY KEY,
            yehida TEXT,
            anaf TEXT,
            mador TEXT,
            tzevet TEXT
        );
        
        CREATE TABLE rooms (
            room_id TEXT PRIMARY KEY,
            is_mapped BOOLEAN,
            people_size INTEGER,
            location_id INTEGER,
            group_id TEXT,
            room_status TEXT,
            FOREIGN KEY(location_id) REFERENCES locations(location_id),
            FOREIGN KEY(group_id) REFERENCES idf_groups(id)
        );
        
        CREATE TABLE moving_units (
            moving_id TEXT PRIMARY KEY,
            moving_type TEXT,
            moving_status TEXT,
            moving_date DATE
        );
        
        CREATE TABLE packing_units (
            packing_id TEXT PRIMARY KEY,
            box_type TEXT,
            packing_status TEXT,
            moving_id TEXT,
            FOREIGN KEY(moving_id) REFERENCES moving_units(moving_id)
        );
        
        CREATE TABLE items (
            catalog_id TEXT PRIMARY KEY,
            description TEXT,
            price INTEGER,
            item_status TEXT,
            is_balmas BOOLEAN,
            room_id TEXT,
            packing_id TEXT,
            FOREIGN KEY(room_id) REFERENCES rooms(room_id),
            FOREIGN KEY(packing_id) REFERENCES packing_units(packing_id)
        );
    ''')
    conn.commit()
    return conn

def generate_mock_data(conn):
    cursor = conn.cursor()
    
    # 1. Generate Locations
    locations = []
    for i in range(1, 21):
        loc = Location(location_id=i, building=random.randint(1, 3), floor=random.randint(1, 5), room_number=i*10)
        locations.append(loc)
        cursor.execute("INSERT INTO locations VALUES (?, ?, ?, ?)", 
                       (loc.location_id, loc.building, loc.floor, loc.room_number))

    # 2. Generate IDF Groups (Hierarchy)
    yehida = "קרית התקשוב"
    anafim = ["ענף לוגיסטיקה", "ענף פיתוח", "ענף מבצעים"]
    madorim_per_anaf = 2
    tzvatim_per_mador = 2
    
    idf_groups = []
    for anaf in anafim:
        for m in range(1, madorim_per_anaf + 1):
            mador = f"מדור {m}"
            for t in range(1, tzvatim_per_mador + 1):
                tzevet = f"צוות {t}"
                group = IdfGroup(יחידה=yehida, ענף=anaf, מדור=mador, צוות=tzevet)
                idf_groups.append(group)
                cursor.execute("INSERT INTO idf_groups VALUES (?, ?, ?, ?, ?)",
                               (str(group.id), group.yehida, group.anaf, group.mador, group.tzevet))

    # 3. Generate Rooms
    rooms = []
    for i, group in enumerate(idf_groups):
        # Assign 1-2 rooms per team
        for _ in range(random.randint(1, 2)):
            loc = random.choice(locations)
            room = Room(
                is_mapped=random.choice([True, False]),
                people_size=random.randint(3, 10),
                location_id=loc.location_id,
                group_id=group.id,
                room_status=random.choice(list(RoomStatus))
            )
            rooms.append(room)
            cursor.execute("INSERT INTO rooms VALUES (?, ?, ?, ?, ?, ?)",
                           (str(room.room_id), room.is_mapped, room.people_size, 
                            room.location_id, str(room.group_id), room.room_status.value))

    # 4. Generate Moving Units
    moving_units = []
    for _ in range(3):
        mu = MovingUnit(
            moving_type=random.choice(list(MovingType)),
            moving_status=random.choice(list(MovingUnitStatus)),
            moving_date=date.today() + timedelta(days=random.randint(-2, 5))
        )
        moving_units.append(mu)
        cursor.execute("INSERT INTO moving_units VALUES (?, ?, ?, ?)",
                       (str(mu.moving_id), mu.moving_type.value, mu.moving_status.value, mu.moving_date.isoformat()))

    # 5. Generate Packing Units
    packing_units = []
    for _ in range(15):
        mu = random.choice(moving_units) if random.random() > 0.3 else None
        pu = PackingUnit(
            box_type=random.choice(list(BoxType)),
            packing_status=random.choice(list(PackingUnitStatus)),
            moving_id=mu.moving_id if mu else None
        )
        packing_units.append(pu)
        cursor.execute("INSERT INTO packing_units VALUES (?, ?, ?, ?)",
                       (str(pu.packing_id), pu.box_type.value, pu.packing_status.value, 
                        str(pu.moving_id) if pu.moving_id else None))

    # 6. Generate Items
    item_descriptions = ["מחשב נייד", "מסך", "כיסא", "שולחן", "שרת", "מדפסת", "ארון", "ציוד קשר"]
    for i in range(1, 101):
        room = random.choice(rooms)
        pu = random.choice(packing_units) if random.random() > 0.4 else None
        
        # Determine status based on packing unit presence, or force missing
        status = random.choice(list(ItemStatus))
        if status == ItemStatus.MISSING:
            pu = None  # Missing items aren't packed
            
        item = Item(
            catalog_id=f"CAT-{1000+i}",
            description=random.choice(item_descriptions),
            price=random.randint(100, 5000),
            item_status=status,
            is_balmas=random.choice([True, False]),
            room_id=room.room_id,
            packing_id=pu.packing_id if pu else None
        )
        cursor.execute("INSERT INTO items VALUES (?, ?, ?, ?, ?, ?, ?)",
                       (item.catalog_id, item.description, item.price, item.item_status.value,
                        item.is_balmas, str(item.room_id), str(item.packing_id) if item.packing_id else None))

    conn.commit()
    print(f"Successfully generated mock data with {len(idf_groups)} teams, {len(rooms)} rooms, {len(packing_units)} packing units, {len(moving_units)} moving units, and 100 items.")

if __name__ == "__main__":
    conn = setup_database()
    generate_mock_data(conn)
    conn.close()
