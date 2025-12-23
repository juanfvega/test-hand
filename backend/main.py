
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, BackgroundTasks
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
import asyncio
import json

from . import models, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Schemas
class SlotBase(BaseModel):
    date: str
    time: str
    is_booked: bool = False
    client_name: Optional[str] = None
    client_email: Optional[str] = None

class SlotCreate(SlotBase):
    pass

class Slot(SlotBase):
    id: int
    class Config:
        orm_mode = True

class BookingRequest(BaseModel):
    client_name: str
    client_email: str

class LoginRequest(BaseModel):
    username: str
    password: str

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    print(f"WS Attempting connection from {websocket.client}")
    await manager.connect(websocket)
    print("WS Connected")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        print("WS Disconnected")
        manager.disconnect(websocket)

# Endpoints
@app.post("/slots/", response_model=Slot)
def create_slot(slot: SlotCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Check if slot already exists
    existing_slot = db.query(models.Slot).filter(
        models.Slot.date == slot.date, 
        models.Slot.time == slot.time
    ).first()
    if existing_slot:
        raise HTTPException(status_code=400, detail="Slot already exists")
    
    db_slot = models.Slot(
        date=slot.date, 
        time=slot.time, 
        is_booked=slot.is_booked,
        client_name=slot.client_name,
        client_email=slot.client_email
    )
    db.add(db_slot)
    db.commit()
    db.refresh(db_slot)
    background_tasks.add_task(manager.broadcast, {"type": "refresh"})
    return db_slot

@app.get("/slots/{date}", response_model=List[Slot])
def get_slots_by_date(date: str, db: Session = Depends(get_db)):
    return db.query(models.Slot).filter(models.Slot.date == date).all()

@app.get("/slots/", response_model=List[Slot])
def get_all_slots(db: Session = Depends(get_db)):
    return db.query(models.Slot).all() # Simple list for admin for now

@app.delete("/slots/{slot_id}")
def delete_slot(slot_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    slot = db.query(models.Slot).filter(models.Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    db.delete(slot)
    db.commit()
    db.commit()
    background_tasks.add_task(manager.broadcast, {"type": "refresh"})
    return {"ok": True}

@app.delete("/slots_all/")
def delete_all_slots(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    num_deleted = db.query(models.Slot).delete()
    db.commit()
    db.commit()
    background_tasks.add_task(manager.broadcast, {"type": "refresh"})
    return {"ok": True, "deleted": num_deleted}

@app.post("/book/{slot_id}")
def book_slot(slot_id: int, booking: BookingRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    slot = db.query(models.Slot).filter(models.Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.is_booked:
        raise HTTPException(status_code=400, detail="Already booked")
    
    slot.is_booked = True
    slot.client_name = booking.client_name
    slot.client_email = booking.client_email
    
    db.commit()
    
    event_data = {
        "type": "new_booking",
        "data": {
            "date": slot.date,
            "time": slot.time,
            "client_name": slot.client_name,
            "client_email": slot.client_email
        }
    }
    background_tasks.add_task(manager.broadcast, event_data)
    return {"ok": True, "message": "Slot booked"}

@app.post("/login")
def login(request: LoginRequest):
    if request.username == "admin" and request.password == "admin":
        return {"success": True, "token": "simple-admin-token"}
    raise HTTPException(status_code=401, detail="Invalid credentials")
