
from sqlalchemy import Column, Integer, String, Boolean
from .database import Base

class Slot(Base):
    __tablename__ = "slots"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, index=True)  # YYYY-MM-DD
    time = Column(String, index=True)  # HH:MM
    is_booked = Column(Boolean, default=False)
    client_name = Column(String, nullable=True)
    client_email = Column(String, nullable=True)
