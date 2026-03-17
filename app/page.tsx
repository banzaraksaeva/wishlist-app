'use client'
import { useState, useEffect } from "react"
import Link from "next/link"

const API = "http://5.42.111.157:8000"

export default function Home() {
  const [user, setUser] = useState<{token: string, name: string} | null>(null)
  const [wishlists, setWishlists] = useState([])
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState("login")
  const [form, setForm] = useState({email:"", name:"", password:""})
  const [newWishlist, setNewWishlist] = useState({title:"", description:"", occasion:"birthday"})
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userName = localStorage.getItem("userName")
    if (token && userName) {
      setUser({token, name: userName})
      fetchWishlists(token)
    }
  }, [])

  const fetchWishlists = async (token: string) => {
    const res = await fetch(`${API}/wishlists/my`, {
      headers: {Authorization: `Bearer ${token}`}
    })
    if (res.ok) setWishlists(await res.json())
  }

  const auth = async (): Promise<void> => {
    setLoading(true)
    setError("")
    try {
      const url = authMode === "login" ? `${API}/auth/login` : `${API}/auth/register`
      const body = authMode === "login"
        ? new URLSearchParams({username: form.email, password: form.password})
        : JSON.stringify({email: form.email, name: form.name, password: form.password})
      const headers = authMode === "login"
        ? {"Content-Type": "application/x-www-form-urlencoded"}
        : {"Content-Type": "application/json"}
      const res = await fetch(url, {method:"POST", headers, body})
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Error")
      localStorage.setItem("token", data.access_token)
      localStorage.setItem("userName", data.user_name)
      setUser({token: data.access_token, name: data.user_name})
      setShowAuth(false)
      fetchWishlists(data.access_token)
    } catch(e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    setLoading(false)
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
    setWishlists([])
  }

  const createWishlist = async () => {
    setLoading(true)
    const res = await fetch(`${API}/wishlists/`, {
      method: "POST",
      headers: {"Content-Type":"application/json", Authorization:`Bearer ${user?.token}`},
      body: JSON.stringify(newWishlist)
    })
    if (res.ok) {
      const data = await res.json()
      setWishlists([...wishlists, data])
      setShowCreate(false)
      setNewWishlist({title:"", description:"", occasion:"birthday"})
    }
    setLoading(false)
  }

  const deleteWishlist = async (id) => {
    if (!confirm("Удалить вишлист?")) return
    await fetch(`${API}/wishlists/${id}`, {
      method:"DELETE",
      headers:{Authorization:`Bearer ${user.token}`}
    })
    setWishlists(wishlists.filter(w => w.id !== id))
  }

  const occasions = {birthday:"🎂 День рождения", wedding:"💍 Свадьба", newyear:"🎄 Новый год", other:"🎁 Другое"}

  return (
    <div style={{minHeight:"100vh", background:"linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding:"20px"}}>
      {/* HEADER */}
      <div style={{maxWidth:800, margin:"0 auto"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:32}}>
          <div>
            <h1 style={{color:"white", fontSize:32, fontWeight:800, margin:0}}>✨ WishList</h1>
            <p style={{color:"rgba(255,255,255,0.7)", margin:0}}>Делись мечтами с друзьями</p>
          </div>
          {user ? (
            <div style={{display:"flex", gap:12, alignItems:"center"}}>
              <span style={{color:"white", fontWeight:600}}>👋 {user.name}</span>
              <button onClick={logout} className="btn-secondary" style={{width:"auto"}}>Выйти</button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} className="btn-primary" style={{width:"auto", padding:"10px 24px"}}>
              Войти
            </button>
          )}
        </div>

        {/* AUTH MODAL */}
        {showAuth && (
          <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100}}>
            <div className="card" style={{padding:32, width:400, maxWidth:"90vw"}}>
              <h2 style={{marginTop:0}}>{authMode === "login" ? "Войти" : "Регистрация"}</h2>
              {error && <div style={{background:"#fee", color:"#c00", padding:"10px 14px", borderRadius:8, marginBottom:16}}>{error}</div>}
              {authMode === "register" && (
                <input className="input" placeholder="Ваше имя" value={form.name}
                  onChange={e => setForm({...form, name:e.target.value})} style={{marginBottom:12}} />
              )}
              <input className="input" placeholder="Email" value={form.email}
                onChange={e => setForm({...form, email:e.target.value})} style={{marginBottom:12}} />
              <input className="input" type="password" placeholder="Пароль" value={form.password}
                onChange={e => setForm({...form, password:e.target.value})} style={{marginBottom:16}} />
              <button className="btn-primary" onClick={auth} disabled={loading} style={{marginBottom:12}}>
                {loading ? "..." : authMode === "login" ? "Войти" : "Зарегистрироваться"}
              </button>
              <p style={{textAlign:"center", margin:0}}>
                {authMode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
                <span style={{color:"#845EC2", cursor:"pointer", fontWeight:600}}
                  onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
                  {authMode === "login" ? "Регистрация" : "Войти"}
                </span>
              </p>
              <button onClick={() => setShowAuth(false)} style={{position:"absolute", top:16, right:16, background:"none", border:"none", fontSize:20, cursor:"pointer"}}>✕</button>
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        {!user ? (
          <div className="card" style={{padding:48, textAlign:"center"}}>
            <div style={{fontSize:64, marginBottom:16}}>🎁</div>
            <h2 style={{fontSize:28, fontWeight:800, marginBottom:8}}>Создай свой вишлист</h2>
            <p style={{color:"#666", marginBottom:24}}>Добавляй желания, делись с друзьями, получай подарки мечты</p>
            <button className="btn-primary" style={{width:"auto", padding:"14px 32px", fontSize:16}}
              onClick={() => { setShowAuth(true); setAuthMode("register") }}>
              Начать бесплатно →
            </button>
          </div>
        ) : (
          <div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
              <h2 style={{color:"white", margin:0}}>Мои вишлисты</h2>
              <button className="btn-primary" style={{width:"auto", padding:"10px 20px"}}
                onClick={() => setShowCreate(true)}>+ Создать</button>
            </div>

            {showCreate && (
              <div className="card" style={{padding:24, marginBottom:20}}>
                <h3 style={{marginTop:0}}>Новый вишлист</h3>
                <input className="input" placeholder="Название (День рождения 🎂)" value={newWishlist.title}
                  onChange={e => setNewWishlist({...newWishlist, title:e.target.value})} style={{marginBottom:12}} />
                <input className="input" placeholder="Описание (необязательно)" value={newWishlist.description}
                  onChange={e => setNewWishlist({...newWishlist, description:e.target.value})} style={{marginBottom:12}} />
                <select className="input" value={newWishlist.occasion}
                  onChange={e => setNewWishlist({...newWishlist, occasion:e.target.value})} style={{marginBottom:16}}>
                  {Object.entries(occasions).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <div style={{display:"flex", gap:12}}>
                  <button className="btn-primary" onClick={createWishlist} disabled={!newWishlist.title}>Создать</button>
                  <button className="btn-secondary" onClick={() => setShowCreate(false)}>Отмена</button>
                </div>
              </div>
            )}

            {wishlists.length === 0 ? (
              <div className="card" style={{padding:48, textAlign:"center"}}>
                <div style={{fontSize:48, marginBottom:12}}>🌟</div>
                <h3>Пока нет вишлистов</h3>
                <p style={{color:"#666"}}>Создай первый и поделись с друзьями!</p>
              </div>
            ) : (
              <div style={{display:"grid", gap:16}}>
                {wishlists.map(w => (
                  <div key={w.id} className="card" style={{padding:20}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"start"}}>
                      <div>
                        <h3 style={{margin:"0 0 4px"}}>{occasions[w.occasion]} {w.title}</h3>
                        {w.description && <p style={{color:"#666", margin:"0 0 12px", fontSize:14}}>{w.description}</p>}
                        <div style={{display:"flex", gap:10}}>
                          <Link href={`/wish/${w.slug}`}>
                            <button className="btn-primary" style={{width:"auto", padding:"8px 16px", fontSize:13}}>
                              📝 Редактировать
                            </button>
                          </Link>
                          <button className="btn-secondary" style={{padding:"8px 16px", fontSize:13}}
                            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/w/${w.slug}`)}>
                            🔗 Скопировать ссылку
                          </button>
                        </div>
                      </div>
                      <button onClick={() => deleteWishlist(w.id)}
                        style={{background:"none", border:"none", cursor:"pointer", fontSize:20, color:"#ccc"}}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
