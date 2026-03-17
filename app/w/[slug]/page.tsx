'use client'
import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"

const API = "http://5.42.111.157:8000"

export default function PublicWishlist() {
  const { slug } = useParams()
  const [wishlist, setWishlist] = useState(null)
  const [items, setItems] = useState([])
  const [name, setName] = useState("")
  const [nameSet, setNameSet] = useState(false)
  const [modal, setModal] = useState(null)
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const ws = useRef(null)

  useEffect(() => {
    if (!slug) return
    fetchWishlist()
    const savedName = localStorage.getItem("visitor_name")
    if (savedName) { setName(savedName); setNameSet(true) }
    ws.current = new WebSocket(`ws://5.42.111.157:8000/ws/${slug}`)
    ws.current.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === "update") fetchWishlist()
    }
    return () => ws.current?.close()
  }, [slug])

  const fetchWishlist = async () => {
    const res = await fetch(`${API}/wishlists/public/${slug}`)
    if (res.ok) {
      const data = await res.json()
      setWishlist(data)
      setItems(data.items)
    }
  }

  const broadcast = () => {
    if (ws.current?.readyState === 1)
      ws.current.send(JSON.stringify({type:"update"}))
  }

  const saveName = () => {
    if (!name.trim()) return
    localStorage.setItem("visitor_name", name)
    setNameSet(true)
  }

  const reserve = async (item) => {
    if (!nameSet) return alert("Сначала введи имя!")
    if (item.is_reserved) return
    setLoading(true)
    await fetch(`${API}/wishlists/items/${item.id}/reserve`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({contributor_name: name})
    })
    await fetchWishlist()
    broadcast()
    setModal(null)
    setLoading(false)
  }

  const contribute = async (item) => {
    if (!nameSet) return alert("Сначала введи имя!")
    if (!amount || parseFloat(amount) < 100) return alert("Минимум 100 ₽")
    setLoading(true)
    await fetch(`${API}/wishlists/items/${item.id}/contribute`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({contributor_name: name, amount: parseFloat(amount)})
    })
    await fetchWishlist()
    broadcast()
    setModal(null)
    setAmount("")
    setLoading(false)
  }

  if (!wishlist) return (
    <div style={{minHeight:"100vh", background:"linear-gradient(135deg,#667eea,#764ba2)", display:"flex", alignItems:"center", justifyContent:"center"}}>
      <div style={{color:"white", fontSize:24}}>Загрузка...</div>
    </div>
  )

  const occasions = {birthday:"🎂 День рождения", wedding:"💍 Свадьба", newyear:"🎄 Новый год", other:"🎁"}

  return (
    <div style={{minHeight:"100vh", background:"linear-gradient(135deg,#667eea,#764ba2)", padding:20}}>
      <div style={{maxWidth:800, margin:"0 auto"}}>
        <div style={{textAlign:"center", marginBottom:32}}>
          <h1 style={{color:"white", fontSize:36, fontWeight:800, margin:"0 0 8px"}}>
            {occasions[wishlist.occasion]} {wishlist.title}
          </h1>
          {wishlist.description && <p style={{color:"rgba(255,255,255,0.8)", fontSize:16}}>{wishlist.description}</p>}
        </div>

        {!nameSet ? (
          <div className="card" style={{padding:32, maxWidth:400, margin:"0 auto", textAlign:"center"}}>
            <div style={{fontSize:48, marginBottom:16}}>👋</div>
            <h3 style={{marginTop:0}}>Как тебя зовут?</h3>
            <p style={{color:"#666", marginBottom:16}}>Нужно чтобы зарезервировать подарок</p>
            <input className="input" placeholder="Твоё имя" value={name}
              onChange={e => setName(e.target.value)} style={{marginBottom:12}}
              onKeyDown={e => e.key === "Enter" && saveName()} />
            <button className="btn-primary" onClick={saveName}>Продолжить →</button>
          </div>
        ) : (
          <div>
            <div style={{background:"rgba(255,255,255,0.15)", borderRadius:12, padding:"8px 16px", marginBottom:20, display:"inline-block"}}>
              <span style={{color:"white"}}>👤 {name} · <span style={{opacity:0.7, cursor:"pointer", fontSize:13}} onClick={() => setNameSet(false)}>изменить</span></span>
            </div>

            {items.length === 0 ? (
              <div className="card" style={{padding:48, textAlign:"center"}}>
                <div style={{fontSize:48}}>🌟</div>
                <h3>Список пока пуст</h3>
              </div>
            ) : (
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:16}}>
                {items.map(item => {
                  const pct = item.funding_goal ? Math.min(100, Math.round((item.funding_collected/item.funding_goal)*100)) : 0
                  const isFunded = pct >= 100
                  return (
                    <div key={item.id} className="item-card">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} style={{width:"100%", height:180, objectFit:"cover"}} />
                      ) : (
                        <div style={{height:120, background:"linear-gradient(135deg,#f093fb,#f5576c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:48}}>🎁</div>
                      )}
                      <div style={{padding:16}}>
                        <h3 style={{margin:"0 0 4px", fontSize:16}}>{item.name}</h3>
                        {item.price && <p style={{color:"#845EC2", fontWeight:700, margin:"0 0 8px"}}>{item.price.toLocaleString()} ₽</p>}
                        {item.url && <a href={item.url} target="_blank" style={{color:"#666", fontSize:12, display:"block", marginBottom:8}}>🔗 Смотреть товар</a>}

                        {item.group_funding ? (
                          <div>
                            <div className="progress-bar" style={{marginBottom:6}}>
                              <div className="progress-fill" style={{width:`${pct}%`}} />
                            </div>
                            <p style={{fontSize:12, color:"#666", margin:"0 0 10px"}}>
                              {item.funding_collected.toLocaleString()} ₽ из {item.funding_goal?.toLocaleString()} ₽ ({pct}%)
                            </p>
                            {isFunded ? (
                              <span className="funded-badge">✅ Полностью собрано!</span>
                            ) : (
                              <button className="btn-primary" style={{fontSize:13, padding:"8px"}}
                                onClick={() => setModal({...item, type:"contribute"})}>
                                💰 Скинуться
                              </button>
                            )}
                          </div>
                        ) : (
                          <div>
                            {item.is_reserved ? (
                              <span className="reserved-badge">✅ Зарезервировано</span>
                            ) : (
                              <button className="btn-primary" style={{fontSize:13, padding:"8px"}}
                                onClick={() => reserve(item)}>
                                🎁 Забрать подарок
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {modal && modal.type === "contribute" && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100}}>
          <div className="card" style={{padding:32, width:380, maxWidth:"90vw"}}>
            <h3 style={{marginTop:0}}>💰 Скинуться на {modal.name}</h3>
            <p style={{color:"#666"}}>Цель: {(modal.funding_goal||0).toLocaleString()} ₽ · Собрано: {(modal.funding_collected||0).toLocaleString()} ₽</p>
            <input className="input" type="number" placeholder="Сумма (мин. 100 ₽)" value={amount}
              onChange={e => setAmount(e.target.value)} style={{marginBottom:16}} />
            <div style={{display:"flex", gap:12}}>
              <button className="btn-primary" onClick={() => contribute(modal)} disabled={loading}>
                {loading ? "..." : "Скинуться"}
              </button>
              <button className="btn-secondary" onClick={() => setModal(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
