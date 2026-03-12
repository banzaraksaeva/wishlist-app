from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    hashed_password = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    wishlists = relationship("Wishlist", back_populates="owner")

class Wishlist(Base):
    __tablename__ = "wishlists"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String, nullable=True)
    occasion = Column(String, default="other")
    slug = Column(String, unique=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    owner = relationship("User", back_populates="wishlists")
    items = relationship("WishItem", back_populates="wishlist", cascade="all, delete")

class WishItem(Base):
    __tablename__ = "wish_items"
    id = Column(Integer, primary_key=True, index=True)
    wishlist_id = Column(Integer, ForeignKey("wishlists.id"))
    name = Column(String)
    url = Column(String, nullable=True)
    price = Column(Float, nullable=True)
    image_url = Column(String, nullable=True)
    is_reserved = Column(Boolean, default=False)
    reserved_by_name = Column(String, nullable=True)
    group_funding = Column(Boolean, default=False)
    funding_goal = Column(Float, nullable=True)
    funding_collected = Column(Float, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    wishlist = relationship("Wishlist", back_populates="items")
    contributions = relationship("Contribution", back_populates="item", cascade="all, delete")

class Contribution(Base):
    __tablename__ = "contributions"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("wish_items.id"))
    contributor_name = Column(String)
    amount = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    item = relationship("WishItem", back_populates="contributions")
