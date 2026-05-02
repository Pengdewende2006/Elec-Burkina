import { useState, useEffect } from "react";
import { auth, provider, db } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  getDoc
} from "firebase/firestore";

const COLORS = {
  bg: "#0a0f1e",
  card: "#111827",
  cardBorder: "#1e2d45",
  accent: "#f59e0b",
  text: "#f1f5f9",
  muted: "#94a3b8",
  green: "#22c55e",
  blue: "#3b82f6",
  red: "#ef4444",
};

const FONT = "'Sora', sans-serif";
const ADMIN_EMAIL = "emailnabonswendepourde@gmail.com";
const CLOUDINARY_CLOUD = "doqq7quf4";
const CLOUDINARY_UPLOAD_PRESET = "elec_burkina";
export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState("feed");
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ name: "", ville: "", specialite: "", email: "", password: "" });
  const [newPost, setNewPost] = useState("");
  const [postType, setPostType] = useState("post");
  const [chatWith, setChatWith] = useState(null);
  const [newMsg, setNewMsg] = useState("");
  const [notification, setNotification] = useState(null);
  const [viewProfile, setViewProfile] = useState(null);
  const [loading, setLoading] = useState(true);

 const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("cloud_name", CLOUDINARY_CLOUD);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: "POST", body: formData }
  );
  const data = await res.json();
  return data.secure_url;
};

const handleImageUpload = async (e) => {
  const files = Array.from(e.target.files);
  if (postImages.length + files.length > 4) {
    showNotif("Maximum 4 photos", "error");
    return;
  }
  setUploading(true);
  for (const file of files) {
    const url = await uploadImage(file);
    setPostImages(prev => [...prev, url]);
  }
  setUploading(false);
};
  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) setProfile(snap.data());
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
    } catch (e) {
      showNotif("Email ou mot de passe incorrect", "error");
    }
  };

  const handleGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      const snap = await getDoc(doc(db, "users", u.uid));
      if (!snap.exists()) {
        await setDoc(doc(db, "users", u.uid), {
          name: u.displayName,
          email: u.email,
          avatar: u.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
          ville: "",
          specialite: "",
          bio: "",
          approved: u.email === ADMIN_EMAIL,
          role: u.email === ADMIN_EMAIL ? "admin" : "electricien",
          online: true,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      showNotif("Erreur connexion Google", "error");
    }
  };

  const handleRegister = async () => {
    if (!registerData.name || !registerData.ville || !registerData.email) {
      showNotif("Remplis tous les champs", "error");
      return;
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, registerData.email, registerData.password);
      await setDoc(doc(db, "users", result.user.uid), {
        name: registerData.name,
        email: registerData.email,
        avatar: registerData.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
        ville: registerData.ville,
        specialite: registerData.specialite || "Électricité générale",
        bio: "",
        approved: registerData.email === ADMIN_EMAIL,
        role: registerData.email === ADMIN_EMAIL ? "admin" : "electricien",
        online: false,
        createdAt: serverTimestamp()
      });
      showNotif("Inscription envoyée ! En attente de validation.");
    } catch (e) {
      showNotif("Erreur inscription : " + e.message, "error");
    }
  };

  const approveUser = async (userId) => {
    await updateDoc(doc(db, "users", userId), { approved: true });
    showNotif("Électricien approuvé !");
  };

  const submitPost = async () => {
    if (!newPost.trim()) return;
    await addDoc(collection(db, "posts"), {
      userId: user.uid,
      content: newPost,
      likes: [],
      comments: [],
      type: postType,
      createdAt: serverTimestamp()
    });
    setNewPost("");
    showNotif("Publication ajoutée !");
  };

  const toggleLike = async (postId, likes) => {
    const liked = likes.includes(user.uid);
    await updateDoc(doc(db, "posts", postId), {
      likes: liked ? likes.filter(id => id !== user.uid) : [...likes, user.uid]
    });
  };

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    const key = [user.uid, chatWith.id].sort().join("_");
    await addDoc(collection(db, "messages", key, "chats"), {
      from: user.uid,
      text: newMsg,
      createdAt: serverTimestamp()
    });
    setNewMsg("");
  };

  const openChat = async (u) => {
    setChatWith(u);
    const key = [user.uid, u.id].sort().join("_");
    const q = query(collection(db, "messages", key, "chats"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    setActiveTab("messages");
  };

  const styles = {
    app: { fontFamily: FONT, background: COLORS.bg, minHeight: "100vh", color: COLORS.text, maxWidth: 480, margin: "0 auto" },
    card: { background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 16, padding: 16, marginBottom: 12 },
    btn: { background: COLORS.accent, color: "#0a0f1e", border: "none", borderRadius: 10, padding: "10px 20px", fontFamily: FONT, fontWeight: 700, fontSize: 14, cursor: "pointer" },
    btnOutline: { background: "transparent", color: COLORS.accent, border: `1.5px solid ${COLORS.accent}`, borderRadius: 10, padding: "8px 16px", fontFamily: FONT, fontWeight: 600, fontSize: 13, cursor: "pointer" },
    input: { background: "#1e2d45", border: `1px solid ${COLORS.cardBorder}`, borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontFamily: FONT, fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none" },
    avatar: (color = COLORS.accent) => ({ width: 42, height: 42, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#0a0f1e", flexShrink: 0 }),
    tab: (active) => ({ flex: 1, padding: "12px 0", background: active ? COLORS.accent : "transparent", color: active ? "#0a0f1e" : COLORS.muted, border: "none", fontFamily: FONT, fontWeight: 700, fontSize: 12, cursor: "pointer" }),
  };

  if (loading) return (
    <div style={{ ...styles.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>⚡</div>
        <p style={{ color: COLORS.accent, fontWeight: 700 }}>Chargement...</p>
      </div>
    </div>
  );

  if (!user || !profile) return (
    <LoginPage
      styles={styles}
      loginData={loginData}
      setLoginData={setLoginData}
      registerData={registerData}
      setRegisterData={setRegisterData}
      handleLogin={handleLogin}
      handleGoogle={handleGoogle}
      handleRegister={handleRegister}
      notification={notification}
    />
  );

  if (!profile.approved) return (
    <div style={{ ...styles.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>⏳</div>
        <h2 style={{ color: COLORS.accent }}>En attente</h2>
        <p style={{ color: COLORS.muted }}>Ton compte est en attente de validation par l'administrateur.</p>
        <button style={{ ...styles.btnOutline, marginTop: 16 }} onClick={() => signOut(auth)}>Se déconnecter</button>
      </div>
    </div>
  );

  const pendingUsers = users.filter(u => !u.approved && u.role !== "admin");
  const approvedUsers = users.filter(u => u.approved && u.id !== user.uid);

  return (
    <div style={{ ...styles.app, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {notification && <Notif notif={notification} />}
      <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.cardBorder}`, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <span style={{ fontWeight: 900, fontSize: 18, color: COLORS.accent }}>ElecBurkina</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={styles.avatar(COLORS.accent)}>{profile.avatar}</div>
          <button style={{ ...styles.btnOutline, padding: "6px 12px", fontSize: 11 }} onClick={() => signOut(auth)}>Quitter</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 70 }}>
        {activeTab === "feed" && (
          <div style={{ padding: 14 }}>
            <div style={styles.card}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {["post", "mission"].map(t => (
                  <button key={t} style={{ ...postType === t ? styles.btn : styles.btnOutline, padding: "6px 14px", fontSize: 12 }} onClick={() => setPostType(t)}>
                    {t === "post" ? "📸 Publication" : "🚨 Mission"}
                  </button>
                ))}
              </div>
              <textarea style={{ ...styles.input, minHeight: 80, resize: "none", marginBottom: 10 }}
                placeholder={postType === "post" ? "Montre ton travail..." : "Décris la mission..."}
                value={newPost} onChange={e => setNewPost(e.target.value)} />
              <button style={{ ...styles.btn, width: "100%" }} onClick={submitPost}>Publier</button>
            </div>
            {posts.map(post => {
              const author = users.find(u => u.id === post.userId);
              if (!author) return null;
              const liked = (post.likes || []).includes(user.uid);
              return (
                <div key={post.id} style={styles.card}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ ...styles.avatar(COLORS.blue), cursor: "pointer" }} onClick={() => setViewProfile(author)}>{author.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{author.name}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>{author.ville}</div>
                    </div>
                    {post.type === "mission" && <span style={{ background: "#ef444420", color: COLORS.red, borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>🚨 MISSION</span>}
                  </div>
                  <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{post.content}</p>
                  <div style={{ display: "flex", gap: 16, borderTop: `1px solid ${COLORS.cardBorder}`, paddingTop: 10 }}>
                    <button style={{ background: "none", border: "none", color: liked ? COLORS.accent : COLORS.muted, fontFamily: FONT, fontSize: 13, cursor: "pointer" }} onClick={() => toggleLike(post.id, post.likes || [])}>
                      ⚡ {(post.likes || []).length}
                    </button>
                    <button style={{ background: "none", border: "none", color: COLORS.muted, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>
                      💬 {(post.comments || []).length}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "membres" && (
          <div style={{ padding: 14 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800 }}>Membres</h3>
            {users.filter(u => u.approved).map(u => (
              <div key={u.id} style={{ ...styles.card, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setViewProfile(u)}>
                <div style={styles.avatar(u.role === "admin" ? COLORS.accent : COLORS.blue)}>{u.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.accent }}>{u.specialite}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted }}>📍 {u.ville}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "messages" && !chatWith && (
          <div style={{ padding: 14 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800 }}>Messages</h3>
            {approvedUsers.map(u => (
              <div key={u.id} style={{ ...styles.card, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => openChat(u)}>
                <div style={styles.avatar(COLORS.blue)}>{u.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted }}>{u.specialite}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "messages" && chatWith && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>
            <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.cardBorder}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ cursor: "pointer", color: COLORS.accent, fontSize: 20 }} onClick={() => setChatWith(null)}>←</span>
              <div style={styles.avatar(COLORS.blue)}>{chatWith.avatar}</div>
              <div style={{ fontWeight: 700 }}>{chatWith.name}</div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map((m, i) => {
                const mine = m.from === user.uid;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                    <div style={{ background: mine ? COLORS.accent : COLORS.card, color: mine ? "#0a0f1e" : COLORS.text, borderRadius: 16, padding: "10px 14px", maxWidth: "75%", fontSize: 14, border: mine ? "none" : `1px solid ${COLORS.cardBorder}` }}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: 12, borderTop: `1px solid ${COLORS.cardBorder}`, display: "flex", gap: 8 }}>
              <input style={{ ...styles.input, flex: 1 }} placeholder="Message..." value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} />
              <button style={{ ...styles.btn, padding: "10px 16px" }} onClick={sendMessage}>➤</button>
            </div>
          </div>
        )}

        {activeTab === "admin" && profile.role === "admin" && (
          <div style={{ padding: 14 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800 }}>⚙️ Administration</h3>
            <div style={{ ...styles.card, background: "#22c55e10", borderColor: "#22c55e30" }}>
              <div style={{ fontSize: 13, color: COLORS.muted }}>Membres approuvés</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: COLORS.green }}>{users.filter(u => u.approved).length}</div>
            </div>
            <h4 style={{ color: COLORS.muted, fontSize: 13, margin: "16px 0 10px" }}>En attente</h4>
            {pendingUsers.length === 0 && <p style={{ color: COLORS.muted, fontSize: 13 }}>Aucune demande en attente.</p>}
            {pendingUsers.map(u => (
              <div key={u.id} style={styles.card}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={styles.avatar("#64748b")}>{u.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: COLORS.muted }}>{u.ville} · {u.specialite}</div>
                  </div>
                </div>
                <button style={{ ...styles.btn, width: "100%", background: COLORS.green }} onClick={() => approveUser(u.id)}>✅ Approuver</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: COLORS.card, borderTop: `1px solid ${COLORS.cardBorder}`, display: "flex", zIndex: 10 }}>
        {[
          { id: "feed", icon: "🏠", label: "Accueil" },
          { id: "membres", icon: "👷", label: "Membres" },
          { id: "messages", icon: "💬", label: "Messages" },
          ...(profile.role === "admin" ? [{ id: "admin", icon: "⚙️", label: "Admin" }] : []),
        ].map(tab => (
          <button key={tab.id} style={styles.tab(activeTab === tab.id)} onClick={() => { setActiveTab(tab.id); setChatWith(null); }}>
            <div style={{ fontSize: 18 }}>{tab.icon}</div>
            <div style={{ marginTop: 2 }}>{tab.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LoginPage({ styles, loginData, setLoginData, registerData, setRegisterData, handleLogin, handleGoogle, handleRegister, notification }) {
  const [page, setPage] = useState("login");
  return (
    <div style={{ ...styles.app, padding: 24, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100vh" }}>
      {notification && <Notif notif={notification} />}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&display=swap');`}</style>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48 }}>⚡</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: "#f59e0b" }}>ElecBurkina</h1>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: "4px 0 0" }}>Réseau des Électriciens du Burkina Faso</p>
      </div>
      {page === "login" ? (
        <div style={styles.card}>
          <input style={{ ...styles.input, marginBottom: 10 }} placeholder="Email" value={loginData.email} onChange={e => setLoginData({ ...loginData, email: e.target.value })} />
          <input style={{ ...styles.input, marginBottom: 16 }} placeholder="Mot de passe" type="password" value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} />
          <button style={{ ...styles.btn, width: "100%", marginBottom: 10 }} onClick={handleLogin}>Se connecter</button>
          <button style={{ ...styles.btnOutline, width: "100%", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={handleGoogle}>
            🌐 Continuer avec Google
          </button>
          <div style={{ textAlign: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: 13 }}>Pas encore membre ? </span>
            <span style={{ color: "#f59e0b", fontSize: 13, cursor: "pointer", fontWeight: 700 }} onClick={() => setPage("register")}>S'inscrire</span>
          </div>
        </div>
      ) : (
        <div style={styles.card}>
          <span style={{ cursor: "pointer", color: "#f59e0b", fontSize: 14, display: "block", marginBottom: 12 }} onClick={() => setPage("login")}>← Retour</span>
          {[["Nom complet","name","text"],["Ville","ville","text"],["Spécialité","specialite","text"],["Email","email","email"],["Mot de passe","password","password"]].map(([label, key, type]) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <input style={styles.input} type={type} placeholder={label} value={registerData[key]} onChange={e => setRegisterData({ ...registerData, [key]: e.target.value })} />
            </div>
          ))}
          <button style={{ ...styles.btn, width: "100%" }} onClick={handleRegister}>Envoyer la demande</button>
        </div>
      )}
    </div>
  );
}

function Notif({ notif }) {
  return (
    <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 100, background: notif.type === "error" ? "#ef4444" : "#22c55e", color: "#fff", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", fontFamily: "'Sora', sans-serif" }}>
      {notif.msg}
    </div>
  );
}
