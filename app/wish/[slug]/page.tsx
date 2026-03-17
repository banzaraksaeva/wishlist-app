'use client'
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

const API = "http://5.42.111.157:8000"

export default function EditWishlist() {
  const { slug } = useParams()
  const router = useRouter()
  const [wishlist, setWishlist] = useState(null)
  const [items, setItems] = useState([])
  const [token] = useState(() => typeof window !== "undefined" ? localStorage.getItem("token") : "")
  const [form, setForm] = useState({name:"", url:"", price:"", image_url:"", group_funding:false, funding_goal:""})
  const [loading, setLoading] = useState(false)
  const [autofilling, setAutofilling] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { if (slug && token) fetchWishlist() }, [slug, token])

  const fetchWishlist = async () => {
    const res = await fetch(`${API}/wishlists/public/${slug}`)
    if (res.ok) {
      const data = await res.json()
      setWishlist(data)
      setItems(data.items)
    }
  }

  const autofill = async (url) => {
    if (!url.startsWith("http")) return
    setAutofilling(true)
    try {
      const res = await fetch(`${API}/wishlists/items/0/autofill?url=${encodeURIComponent(url)}`)
      if (res.ok) {
        const data = await res.json()
        setForm(f => ({...f, name: data.name || f.name, image_url: data.image_url || f.image_url, price: data.price || f.price}))
      }
    } catch(e) {}
    setAutofilling(false)
  }

  const addItem = async () => {
    if (!form.name) return
    setLoading(true)
    const res = await fetch(`${API}/wishlists/${wishlist.id}/items`, {
      method:"POST",
      headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body: JSON.stringify({
        name: form.name, url: form.url || null,
        price: form.price ? parseFloat(form.price) : null,
        image_url: form.image_url || null,
        group_funding: form.group_funding,
        funding_goal: form.funding_goal ? parseFloat(form.funding_goal) : null
      })
    })
    if (res.ok) {
      await fetchWishlist()
      setForm({name:"", url:"", price:"", image_url:"", group_funding:false, funding_goal:""})
    }
    setLoading(false)
  }

  const deleteItem = async (id) => {
    await fetch(`${API}/wishlists/items/${id}`, {
      method:"DELETE", headers:{Authorization:`Bearer ${token}`}
    })
    setItems(items.filter(i => i.id !== id))
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/w/${slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!wishlist) return (
    <div style={{minHeight:"100vh", background:"linear-gradient(135deg,#667eea,#764ba2)", display:"flex", alignItems:"center", justifyContent:"center"}}>
      <div style={{color:"white", fontSize:24}}>Загрузка...</div>
    </div>
  )

  return (
    <div style={{minHeight:"100vh", background:"linear-gradient(135deg,#667eea,#764ba2)", padding:20}}>
      <div style={{maxWidth:800, margin:"0 auto"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24}}>
          <Link href="/"><span style={{color:"rgba(255,255,255,0.8)", cursor:"pointer"}}>← Назад</span></Link>
          <button onClick={copyLink} className="btn-primary" style={{width:"auto", padding:"10px 20px", background: copied ? "#28a745" : undefined}}>
            {copied ? "✅ Скопировано!" : "🔗 Поделиться"}
          </button>
        </div>

        <h1 style={{color:"white", fontSize:28, fontWeight:800, marginBottom:4}}>{wishlist.title}</h1>
        {wishlist.description && <p style={{color:"rgba(255,255,255,0.7)", marginBottom:24}}>{wishlist.description}</p>}

        {/* ADD ITEM */}
        <div className="card" style={{padding:24, marginBottom:24}}>
          <h3 style={{marginTop:0}}>➕ Добавить желание</h3>
          <div style={{display:"grid", gap:12}}>
            <div style={{position:"relative"}}>
              <input className="input" placeholder="🔗 Вставь ссылку для автозаполнения" value={form.url}
                onChange={e => { setForm({...form, url:e.target.value}); autofill(e.target.value) }} />
              {autofilling && <span style={{position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"#845EC2"}}>заполняю...</span>}
            </div>
            <input className="input" placeholder="Название подарка *" value={form.name}
              onChange={e => setForm({...form, name:e.target.value})} />
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
              <input className="input" placeholder="Цена ₽" type="number" value={form.price}
                onChange={e => setForm({...form, price:e.target.value})} />
              <input className="input" placeholder="Ссылка на фото" value={form.image_url}
                onChange={e => setForm({...form, image_url:e.target.value})} />
            </div>
            <label style={{display:"flex", alignItems:"center", gap:10, cursor:"pointer"}}>
              <input type="checkbox" checked={form.group_funding}
                onChange={e => setForm({...form, group_funding:e.target.checked})} />
              <span>💰 Групповой сбор (несколько человек скидываются)</span>
            </label>
            {form.group_funding && (
              <input className="input" placeholder="Цель сбора ₽" type="number" value={form.funding_goal}
                onChange={e => setForm({...form, funding_goal:e.target.value})} />
            )}
            <button className="btn-primary" onClick={addItem} disabled={!form.name || loading}>
              {loading ? "Добавляю..." : "Добавить желание"}
            </button>
          </div>
        </div>

        {/* ITEMS */}
        {items.length === 0 ? (
          <div className="card" style={{padding:48, textAlign:"center"}}>
            <div style={{fontSize:48, marginBottom:12}}>✨</div>
            <h3>Добавь первое желание!</h3>
            <p style={{color:"#666"}}>Вставь ссылку на товар — название и фото подтянутся автоматически</p>
          </div>
        ) : (
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:16}}>
            {items.map(item => {
              const pct = item.funding_goal ? Math.min(100, Math.round((item.funding_collected/item.funding_goal)*100)) : 0
              return (
                <div key={item.id} className="item-card">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} style={{width:"100%", height:160, objectFit:"cover"}} />
                  ) : (
                    <div style={{height:100, background:"linear-gradient(135deg,#f093fb,#f5576c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:40}}>🎁</div>
                  )}
                  <div style={{padding:14}}>
                    <h4 style={{margin:"0 0 4px"}}>{item.name}</h4>
                    {item.price && <p style={{color:"#845EC2", fontWeight:700, margin:"0 0 6px"}}>{item.price.toLocaleString()} ₽</p>}
                    {item.group_funding && (
                      <div style={{marginBottom:8}}>
                        <div className="progress-bar" style={{marginBottom:4}}>
                          <div className="progress-fill" style={{width:`${pct}%`}} />
                        </div>
                        <p style={{fontSize:11, color:"#666", margin:0}}>{pct}% собрано</p>
                      </div>
                    )}
                    {item.is_reserved && <span className="reserved-badge">✅ Зарезервировано</span>}
                    <button onClick={() => deleteItem(item.id)}
                      style={{background:"none", border:"none", color:"#ccc", cursor:"pointer", float:"right", fontSize:16}}>🗑</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
