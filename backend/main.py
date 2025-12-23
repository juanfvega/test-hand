
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel

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

class SlotCreate(SlotBase):
    pass

class Slot(SlotBase):
    id: int
    class Config:
        orm_mode = True

# Endpoints
@app.post("/slots/", response_model=Slot)
def create_slot(slot: SlotCreate, db: Session = Depends(get_db)):
    # Check if slot already exists
    existing_slot = db.query(models.Slot).filter(
        models.Slot.date == slot.date, 
        models.Slot.time == slot.time
    ).first()
    if existing_slot:
        raise HTTPException(status_code=400, detail="Slot already exists")
    
    db_slot = models.Slot(date=slot.date, time=slot.time, is_booked=slot.is_booked)
    db.add(db_slot)
    db.commit()
    db.refresh(db_slot)
    return db_slot

@app.get("/slots/{date}", response_model=List[Slot])
def get_slots_by_date(date: str, db: Session = Depends(get_db)):
    return db.query(models.Slot).filter(models.Slot.date == date).all()

@app.get("/slots/", response_model=List[Slot])
def get_all_slots(db: Session = Depends(get_db)):
    return db.query(models.Slot).all() # Simple list for admin for now

@app.delete("/slots/{slot_id}")
def delete_slot(slot_id: int, db: Session = Depends(get_db)):
    slot = db.query(models.Slot).filter(models.Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    db.delete(slot)
    db.commit()
    return {"ok": True}

@app.delete("/slots_all/")
def delete_all_slots(db: Session = Depends(get_db)):
    num_deleted = db.query(models.Slot).delete()
    db.commit()
    return {"ok": True, "deleted": num_deleted}

@app.post("/book/{slot_id}")
def book_slot(slot_id: int, db: Session = Depends(get_db)):
    slot = db.query(models.Slot).filter(models.Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.is_booked:
        raise HTTPException(status_code=400, detail="Already booked")
    
    slot.is_booked = True
    db.commit()
    return {"ok": True, "message": "Slot booked"}
