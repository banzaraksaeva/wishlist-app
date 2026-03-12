from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import Wishlist, WishItem, Contribution
from app.routers.auth import get_current_user
import secrets
import httpx
from bs4 import BeautifulSoup

router = APIRouter()

class WishlistCreate(BaseModel):
    title: str
    description: Optional[str] = None
    occasion: str = "other"

class ItemCreate(BaseModel):
    name: str
    url: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    group_funding: bool = False
    funding_goal: Optional[float] = None

class ReserveItem(BaseModel):
    contributor_name: str

class ContributeItem(BaseModel):
    contributor_name: str
    amount: float

@router.post("/")
def create_wishlist(data: WishlistCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    slug = secrets.token_urlsafe(8)
    wishlist = Wishlist(title=data.title, description=data.description, occasion=data.occasion, slug=slug, owner_id=user.id)
    db.add(wishlist)
    db.commit()
    db.refresh(wishlist)
    return wishlist

@router.get("/my")
def my_wishlists(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Wishlist).filter(Wishlist.owner_id == user.id).all()

@router.get("/public/{slug}")
def get_public_wishlist(slug: str, db: Session = Depends(get_db)):
    wishlist = db.query(Wishlist).filter(Wishlist.slug == slug).first()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    items = db.query(WishItem).filter(WishItem.wishlist_id == wishlist.id).all()
    result = []
    for item in items:
        contributions = db.query(Contribution).filter(Contribution.item_id == item.id).all()
        result.append({
            "id": item.id,
            "name": item.name,
            "url": item.url,
            "price": item.price,
            "image_url": item.image_url,
            "is_reserved": item.is_reserved,
            "reserved_by_name": item.reserved_by_name,
            "group_funding": item.group_funding,
            "funding_goal": item.funding_goal,
            "funding_collected": item.funding_collected,
            "contributions_count": len(contributions)
        })
    return {
        "id": wishlist.id,
        "title": wishlist.title,
        "description": wishlist.description,
        "occasion": wishlist.occasion,
        "slug": wishlist.slug,
        "items": result
    }

@router.get("/{wishlist_id}")
def get_wishlist(wishlist_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    wishlist = db.query(Wishlist).filter(Wishlist.id == wishlist_id, Wishlist.owner_id == user.id).first()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Not found")
    items = db.query(WishItem).filter(WishItem.wishlist_id == wishlist_id).all()
    return {"wishlist": wishlist, "items": items}

@router.delete("/{wishlist_id}")
def delete_wishlist(wishlist_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    wishlist = db.query(Wishlist).filter(Wishlist.id == wishlist_id, Wishlist.owner_id == user.id).first()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(wishlist)
    db.commit()
    return {"ok": True}

@router.post("/{wishlist_id}/items")
def add_item(wishlist_id: int, data: ItemCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    wishlist = db.query(Wishlist).filter(Wishlist.id == wishlist_id, Wishlist.owner_id == user.id).first()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Not found")
    item = WishItem(wishlist_id=wishlist_id, name=data.name, url=data.url, price=data.price,
                    image_url=data.image_url, group_funding=data.group_funding, funding_goal=data.funding_goal)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = db.query(WishItem).join(Wishlist).filter(WishItem.id == item_id, Wishlist.owner_id == user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
    return {"ok": True}

@router.post("/items/{item_id}/reserve")
def reserve_item(item_id: int, data: ReserveItem, db: Session = Depends(get_db)):
    item = db.query(WishItem).filter(WishItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    if item.is_reserved:
        raise HTTPException(status_code=400, detail="Already reserved")
    item.is_reserved = True
    item.reserved_by_name = data.contributor_name
    db.commit()
    db.refresh(item)
    return {"ok": True, "item_id": item_id}

@router.post("/items/{item_id}/contribute")
def contribute(item_id: int, data: ContributeItem, db: Session = Depends(get_db)):
    if data.amount < 100:
        raise HTTPException(status_code=400, detail="Minimum contribution is 100 RUB")
    item = db.query(WishItem).filter(WishItem.id == item_id).first()
    if not item or not item.group_funding:
        raise HTTPException(status_code=404, detail="Not found or not group funding")
    remaining = (item.funding_goal or 0) - item.funding_collected
    actual = min(data.amount, remaining)
    contribution = Contribution(item_id=item_id, contributor_name=data.contributor_name, amount=actual)
    db.add(contribution)
    item.funding_collected = min(item.funding_collected + actual, item.funding_goal or actual)
    db.commit()
    return {"ok": True, "collected": item.funding_collected, "goal": item.funding_goal}

@router.get("/items/{item_id}/autofill")
async def autofill(url: str, db: Session = Depends(get_db)):
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            soup = BeautifulSoup(resp.text, "html.parser")
            title = ""
            image = ""
            price = None
            og_title = soup.find("meta", property="og:title")
            if og_title:
                title = og_title.get("content", "")
            elif soup.title:
                title = soup.title.string or ""
            og_image = soup.find("meta", property="og:image")
            if og_image:
                image = og_image.get("content", "")
            return {"name": title.strip(), "image_url": image, "price": price}
    except Exception:
        return {"name": "", "image_url": "", "price": None}

# Alias public route
