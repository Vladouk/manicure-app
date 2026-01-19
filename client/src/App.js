import React, { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import "./styles/theme.css";


const ADMIN_TG_IDS = [1342762796];



const API = process.env.REACT_APP_API_URL || '';
const getSlotLabel = (dateStr) => {
  const today = new Date();
  const slotDate = new Date(dateStr);

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(slotDate, today)) return "today";

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (isSameDay(slotDate, tomorrow)) return "tomorrow";

  return "other";
};

function App() {
  // COMMON
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [slots, setSlots] = useState([]);
  const [filter, setFilter] = useState('all');
  const tgUser = WebApp.initDataUnsafe?.user;
  const isAdmin = ADMIN_TG_IDS.includes(tgUser?.id);
  const [slotsAdmin, setSlotsAdmin] = useState([]);
  const [myHistory, setMyHistory] = useState([]);
  const [clientList, setClientList] = useState([]);
const [clientHistory, setClientHistory] = useState([]);
const [selectedClient, setSelectedClient] = useState(null);
const [comment, setComment] = useState("");
const [reference, setReference] = useState(null);
  const [mode, setMode] = useState("menu");
  const effectiveMode = mode === "auto" ? (isAdmin ? "admin" : "client") : mode;
  const [appointments, setAppointments] = useState([]);
  const [modalImage, setModalImage] = useState(null);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [priceList, setPriceList] = useState([]);
  const [dynamicPrices, setDynamicPrices] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [referralCode, setReferralCode] = useState(null);
  const [enteredReferralCode, setEnteredReferralCode] = useState("");
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  const spendPoints = async (points) => {
    if (bonusPoints < points) return;
    try {
      const response = await fetch(`${API}/api/client/spend-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tg_id: tgUser?.id, points_to_spend: points }),
      });
      if (response.ok) {
        setBonusPoints(bonusPoints - points);
        alert('Винагорода активована!');
      } else {
        alert('Помилка активації');
      }
    } catch (error) {
      alert('Помилка активації');
    }
  };

  const modal = modalImage ? (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
      onClick={() => setModalImage(null)}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '90%',
          maxHeight: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={modalImage}
          alt="Reference"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            borderRadius: '8px',
          }}
        />
        <button
          onClick={() => setModalImage(null)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            fontSize: '20px',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
        <a
          href={modalImage}
          download
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            background: '#4CAF50',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '5px',
            textDecoration: 'none',
            fontSize: '14px',
          }}
        >
          Скачати
        </a>
      </div>
    </div>
  ) : null;


  // CLIENT FORM
  const [design, setDesign] = useState("Класичний френч");
  const [length, setLength] = useState("Короткі");
  const [type, setType] = useState("Гель-лак");
  const [serviceCategory, setServiceCategory] = useState("Гібридний манікюр");
  const [serviceSub, setServiceSub] = useState("Гібридний манікюр — один колір 120–150 zł");
  const [price, setPrice] = useState(135);

  useEffect(() => {
  WebApp.ready();
  WebApp.expand();
  WebApp.MainButton.hide();

  fetch(`${API}/api/slots`)
    .then(r => r.json())
    .then(data => setSlots(data.filter(s => s.is_booked === 0)));

  fetch(`${API}/api/prices`)
    .then(r => r.json())
    .then(data => {
      setDynamicPrices(data);
      // Set defaults based on first category and service
      if (data.length > 0) {
        const firstCategory = data[0];
        setServiceCategory(firstCategory.name);
        if (firstCategory.services.length > 0) {
          const firstService = firstCategory.services[0];
          const displayName = firstService.is_promotion 
            ? `${firstService.name} (${firstService.discount_price} zł 🔥 Акція)`
            : `${firstService.name} (${firstService.price} zł)`;
          setServiceSub(displayName);
        }
      }
    });

  if (effectiveMode === "client") {
    fetch(`${API}/api/appointment/my?tg_id=${tgUser?.id}`)
      .then(r => r.json())
      .then(setMyAppointment);

    fetch(`${API}/api/client/points?tg_id=${tgUser?.id}`)
      .then(r => r.json())
      .then(data => setBonusPoints(data.points || 0))
      .catch(() => setBonusPoints(0));

      WebApp.MainButton.hide();

    }

    WebApp.MainButton.hide();
  }, [effectiveMode, selectedSlotId, design, length, type, comment, reference, tgUser?.first_name, tgUser?.id]);

  useEffect(() => {
    if (mode === "clientPromotions") {
      fetch(`${API}/api/client/points?tg_id=${tgUser?.id}`)
        .then(r => r.json())
        .then(data => setBonusPoints(data.points || 0))
        .catch(() => setBonusPoints(0));
    }
  }, [mode, tgUser?.id]);

  const calculatePrice = (sub) => {
    if (!sub) return 0;
    
    // Extract price from the serviceSub string (format: "Service Name (price zł ...)")
    const priceMatch = sub.match(/\((\d+) zł/);
    return priceMatch ? parseInt(priceMatch[1]) : 0;
  };

  useEffect(() => {
    setPrice(calculatePrice(serviceSub));
  }, [serviceSub]);

  useEffect(() => {
    if (tgUser?.id) {
      fetch(`${API}/api/client/first-time?tg_id=${tgUser.id}`)
        .then(r => r.json())
        .then(data => setIsFirstTime(data.first_time))
        .catch(() => setIsFirstTime(false));
    }
  }, [tgUser?.id]);

  const groupedSlots = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedSlots).sort();
  const grouped = sortedDates.map(date => ({
    date,
    slots: groupedSlots[date].sort((a, b) => a.time.localeCompare(b.time))
  }));

  const selectedSlot = slots.find(s => s.id === selectedSlotId);

  // ADMIN FUNCTIONS
  const applyFilter = (status) => {
    setFilter(status);

    fetch(`${API}/api/admin/appointments?status=${status}`, {
      headers: {
        "x-init-data": WebApp.initData
      }
    })
      .then(r => r.json())
      .then(setAppointments)
      .catch(() => alert("❌ Помилка завантаження"));
  };

  const loadAppointments = () => {
    fetch(`${API}/api/admin/appointments?status=${filter}`, {
      headers: {
        "x-init-data": WebApp.initData
      }
    })
      .then(r => r.json())
      .then(setAppointments)
      .catch(() => alert("❌ Помилка завантаження"));
  };

  const changeStatus = (id, status) => {
    fetch(`${API}/api/admin/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-init-data": WebApp.initData
      },
      body: JSON.stringify({ id, status })
    })
      .then(r => r.json())
      .then(() => {
        alert("Статус оновлено!");
        loadAppointments();
      })
      .catch(() => alert("❌ Помилка оновлення"));
  };

  // ADMIN PANEL



  if (effectiveMode === "clients") {
  return (
    <div className="app-container">

      <h1>👥 Усі клієнти</h1>

      <ul>
        {clientList.map(c => (
          <li
            key={c.tg_id}
            style={{ marginBottom: 10, cursor: "pointer" }}
            onClick={() => {
              setSelectedClient(c);
              fetch(`${API}/api/admin/client-history?tg_id=${c.tg_id}`, {
                headers: { "x-init-data": WebApp.initData }
              })
                .then(r => r.json())
                .then(data => {
                  setClientHistory(data);
                  setMode("clientHistory");
                });
            }}
          >
            <b>{c.client}</b>  
            <br />
            <small>Останній запис: {c.last_visit || "немає"}</small>
          </li>
        ))}
      </ul>

      <button
        className="primary-btn"
        onClick={() => setMode("adminMenu")}
        style={{ marginTop: 16 }}
      >
        ← Назад
      </button>

      {modal}
    </div>
  );
}
if (effectiveMode === "clientHistory") {
  return (
    <div className="app-container">

      <h1>📜 Історія — {selectedClient?.client}</h1>

      <div>
        {clientHistory.map(h => {
          const label = getSlotLabel(h.date);
          return (
            <div
              key={h.id}
              className="card"
              style={{
                marginBottom: 12,
                border:
                  label === "today"
                    ? "2px solid #4CAF50"
                    : label === "tomorrow"
                    ? "2px solid #2196F3"
                    : "1px solid #eee",
                background:
                  label === "today"
                    ? "rgba(76, 175, 80, 0.08)"
                    : label === "tomorrow"
                    ? "rgba(33, 150, 243, 0.08)"
                    : "#fff",
              }}
            >
              <div>
                <b>📅</b> {h.date} — {h.time}
              </div>
              <div>🎨 {h.design}, {h.length}, {h.type}</div>
              <div>
                Статус: <b>{h.status}</b>
              </div>
              {h.comment && <div>💬 {h.comment}</div>}
            </div>
          );
        })}
      </div>

      <button onClick={() => setMode("clients")}>⬅ Назад до клієнтів</button>

      {modal}
    </div>
  );
}
if (mode === "myAppointments") {
  return (
    <div className="app-container">

      <div className="card">
        <h2>📖 Мої записи</h2>
      </div>

      {myHistory.length === 0 && (
        <div className="card">
          <p>У вас поки немає записів 💭</p>
        </div>
      )}

      {myHistory.map(h => {
        const label = getSlotLabel(h.date);
        return (
          <div
            key={h.id}
            className="card"
            style={{
              marginBottom: 12,
              border:
                label === "today"
                  ? "2px solid #4CAF50"
                  : label === "tomorrow"
                  ? "2px solid #2196F3"
                  : "1px solid #eee",
              background:
                label === "today"
                  ? "rgba(76, 175, 80, 0.08)"
                  : label === "tomorrow"
                  ? "rgba(33, 150, 243, 0.08)"
                  : "#fff",
            }}
          >
            <div>
              <b>📅</b> {h.date} — {h.time}
              {label === "today" && (
                <span style={{ color: "#4CAF50", marginLeft: 6 }}>
                  • Сьогодні
                </span>
              )}
              {label === "tomorrow" && (
                <span style={{ color: "#2196F3", marginLeft: 6 }}>
                  • Завтра
                </span>
              )}

            </div>
            <div>🎨 {h.design}, {h.length}, {h.type}</div>
            <div>
              Статус: <b>{h.status}</b>
            </div>
            {h.comment && <div>💬 {h.comment}</div>}
          </div>
        );
      })}

      <button
        className="primary-btn"
        onClick={() => setMode("menu")}
        style={{ marginTop: 16 }}
      >
        ← Назад
      </button>

      {modal}
    </div>
  );
}

if (mode === "priceList") {
  return (
    <div className="app-container">

      <div className="card">
        <h2>💰 Прайс</h2>
        <p style={{ opacity: 0.7 }}>Наші послуги та ціни</p>
      </div>

      {dynamicPrices.map(category => (
        <div key={category.id} className="card" style={{ marginBottom: 16 }}>
          <h3>{category.name}</h3>
          {category.description && (
            <p style={{ opacity: 0.7, margin: '8px 0' }}>{category.description}</p>
          )}

          <div style={{ marginTop: 12 }}>
            {category.services.map(service => (
              <div key={service.id} style={{ 
                padding: '8px', 
                margin: '4px 0', 
                background: service.is_promotion ? '#fff3cd' : '#f8f9fa',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong>{service.name}</strong>
                  {service.description && <div style={{ fontSize: '14px', opacity: 0.7 }}>{service.description}</div>}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {service.is_promotion ? (
                    <>
                      <span style={{ textDecoration: 'line-through', color: '#dc3545', marginRight: '8px' }}>{service.price} zł</span>
                      <span style={{ color: '#28a745' }}>{service.discount_price} zł 🔥</span>
                    </>
                  ) : (
                    <span>{service.price} zł</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        className="primary-btn"
        onClick={() => setMode("menu")}
        style={{ marginTop: 16 }}
      >
        ← Назад
      </button>

      {modal}
    </div>
  );
}

if (mode === "clientPromotions") {
  return (
    <div className="app-container">

      <div className="card">
        <h2>🎉 Акції</h2>
        <p style={{ opacity: 0.7 }}>Поточні акції та спеціальні пропозиції</p>
      </div>

      {/* First-time discount */}
      <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <h3>🎁 Перший запис</h3>
        <p>Знижка 20% на перше відвідування!</p>
        <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>20% OFF</div>
      </div>

      {/* Referral system */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>💖 Приведи подругу</h3>
        <p>Запроси подругу та отримай 20% знижку на наступний манікюр! Подруга отримує знижку за перший запис.</p>
        
        <div style={{ marginTop: 16, padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
          <h4>🎫 Твій реферальний код</h4>
          {!referralCode ? (
            <button
              className="primary-btn"
              onClick={() => {
                fetch(`${API}/api/referral/code?tg_id=${tgUser?.id}`)
                  .then(r => r.json())
                  .then(data => setReferralCode(data))
                  .catch(() => alert("Помилка завантаження коду"));
              }}
            >
              Отримати код
            </button>
          ) : (
            <div>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                background: '#e9ecef', 
                padding: '8px', 
                borderRadius: '4px',
                margin: '8px 0',
                fontFamily: 'monospace'
              }}>
                {referralCode.code}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '8px' }}>
                Використано: {referralCode.used_count} разів
              </div>
              <button
                className="primary-btn"
                onClick={() => {
                  navigator.clipboard.writeText(referralCode.code);
                  alert("Код скопійовано!");
                }}
              >
                📋 Копіювати код
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active promotions */}
      {promotions.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>🔥 Поточні акції</h3>
          {promotions.map(promo => (
            <div key={promo.id} style={{ 
              padding: '12px', 
              margin: '8px 0', 
              background: '#fff3cd',
              borderRadius: '8px',
              border: '1px solid #ffeaa7'
            }}>
              <h4>{promo.name}</h4>
              <p>{promo.description}</p>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#856404' }}>
                Знижка: {promo.discount_value}{promo.discount_type === 'percentage' ? '%' : ' zł'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bonuses section */}
      <div className="card">
        <h3>🎁 Бонуси</h3>
        <p style={{ opacity: 0.7 }}>
          Клієнт збирає бали за кожен запис
        </p>
        <div style={{ marginTop: 16 }}>
          <h4>Ваші бали: {bonusPoints}</h4>
          <p>1 запис = 1 бал</p>
        </div>
        <div style={{ marginTop: 16 }}>
          <h4>Винагороди:</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🔸 10 балів → Безкоштовний дизайн</span>
              <button
                className="primary-btn"
                disabled={bonusPoints < 10}
                onClick={() => spendPoints(10)}
                style={{ 
                  fontSize: '12px', 
                  padding: '5px 10px',
                  backgroundColor: bonusPoints < 10 ? '#ccc' : undefined,
                  backgroundImage: bonusPoints < 10 ? 'none' : undefined,
                  cursor: bonusPoints < 10 ? 'not-allowed' : 'pointer'
                }}
              >
                Використати
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🔸 20 балів → Знижка 30%</span>
              <button
                className="primary-btn"
                disabled={bonusPoints < 20}
                onClick={() => spendPoints(20)}
                style={{ 
                  fontSize: '12px', 
                  padding: '5px 10px',
                  backgroundColor: bonusPoints < 20 ? '#ccc' : undefined,
                  backgroundImage: bonusPoints < 20 ? 'none' : undefined,
                  cursor: bonusPoints < 20 ? 'not-allowed' : 'pointer'
                }}
              >
                Використати
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🔸 30 балів → Повний манікюр 0 zł</span>
              <button
                className="primary-btn"
                disabled={bonusPoints < 30}
                onClick={() => spendPoints(30)}
                style={{ 
                  fontSize: '12px', 
                  padding: '5px 10px',
                  backgroundColor: bonusPoints < 30 ? '#ccc' : undefined,
                  backgroundImage: bonusPoints < 30 ? 'none' : undefined,
                  cursor: bonusPoints < 30 ? 'not-allowed' : 'pointer'
                }}
              >
                Використати
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        className="primary-btn"
        onClick={() => setMode("menu")}
        style={{ marginTop: 16 }}
      >
        ← Назад
      </button>

      {modal}
    </div>
  );
}


if (mode === "menu") {
  return (
    <div className="app-container">

      <div className="card">
        <h2>💅 nailbysp</h2>
        <p style={{ opacity: 0.7 }}>
          Привіт, {tgUser?.first_name} 💖
        </p>
      </div>

      <div className="menu-buttons">

        <button
          className="primary-btn"
          onClick={() => setMode("client")}
        >
          📅 Записатися на манікюр
        </button>

        <button
          className="primary-btn"
          onClick={() => {
            fetch(`${API}/api/admin/client-history?tg_id=${tgUser?.id}`, {
              headers: { "x-init-data": WebApp.initData }
            })
              .then(r => r.json())
              .then(data => {
                setMyHistory(data);
                setMode("myAppointments");
              });
          }}
        >
          📖 Мої записи
        </button>

        {isAdmin && (
          <button
            className="primary-btn"
            onClick={() => setMode("adminMenu")}
          >
            🔒 Адмінка
          </button>
        )}

        <button
          className="primary-btn"
          onClick={() => {
            fetch(`${API}/api/prices`)
              .then(r => r.json())
              .then(data => {
                setDynamicPrices(data);
                setMode("priceList");
              });
          }}
        >
          💰 Прайс
        </button>

        <button
          className="primary-btn"
          onClick={() => {
            fetch(`${API}/api/promotions`)
              .then(r => r.json())
              .then(data => {
                setPromotions(data);
                setMode("clientPromotions");
              });
          }}
        >
          🎉 Акції
        </button>

        <button
          className="primary-btn"
          onClick={() => WebApp.openTelegramLink("https://t.me/vlad0uk")}
        >
          💬 Звʼязатись з майстром
        </button>

      </div>

      {modal}
    </div>
  );
}
const deleteSlot = (id) => {
  if (!window.confirm("Видалити слот?")) return;

  fetch(`${API}/api/admin/delete-slot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-init-data": WebApp.initData,
    },
    body: JSON.stringify({ id }),
  })
    .then(r => r.json())
    .then(() => {
      alert("Слот видалено!");

      // ПЕРЕЗАВАНТАЖУЄМО АКТУАЛЬНИЙ СПИСОК
      fetch(`${API}/api/admin/slots`, {
        headers: { "x-init-data": WebApp.initData },
      })
        .then(r => r.json())
        .then(data => {
          setSlotsAdmin(
            data.sort(
              (a, b) =>
                new Date(`${a.date} ${a.time}`) -
                new Date(`${b.date} ${b.time}`)
            )
          );
        });
    })
    .catch(() => alert("❌ Помилка видалення"));
};

if (mode === "adminMenu") {
  return (
    <div className="app-container">

      <div className="card">
        <h2>🔧 Адмін-панель</h2>
        <p style={{ opacity: 0.7 }}>Оберіть дію</p>
      </div>

      <button
        className="primary-btn"
        onClick={() => {
  loadAppointments();
  setMode("admin");
}}

      >
        📋 Усі записи
      </button>

      <button
        className="primary-btn"
        onClick={() => {
          fetch(`${API}/api/admin/clients`, {
            headers: { "x-init-data": WebApp.initData }
          })
            .then(r => r.json())
            .then(setClientList);
          setMode("clients");
        }}
      >
        👥 Клієнти
      </button>

      <button
  className="primary-btn"
  onClick={() => {
    fetch(`${API}/api/admin/slots`, {
      headers: { "x-init-data": WebApp.initData }
    })
      .then(r => r.json())
      .then(data => {
        setSlotsAdmin(
          data.sort((a, b) =>
            new Date(`${a.date} ${a.time}`) -
            new Date(`${b.date} ${b.time}`)
          )
        );
      });

    setMode("slots");
  }}
>
  🗓 Робочі слоти
</button>

      <button
        className="primary-btn"
        onClick={() => {
          fetch(`${API}/api/admin/prices`, {
            headers: { "x-init-data": WebApp.initData }
          })
            .then(r => r.json())
            .then(setPriceList);
          setMode("prices");
        }}
      >
        💰 Прайс
      </button>

      <button
        className="primary-btn"
        onClick={() => {
          fetch(`${API}/api/admin/promotions`, {
            headers: { "x-init-data": WebApp.initData }
          })
            .then(r => r.json())
            .then(setPromotions);
          setMode("promotions");
        }}
      >
        🎉 Акції
      </button>

      

      <button
        className="primary-btn"
        style={{ marginTop: 16 }}
        onClick={() => setMode("adminMenu")}
      >
        ← Назад
      </button>

      {modal}
    </div>
  );
}
if (mode === "slots") {
  return (
    <div className="app-container">

      <div className="card">
        <h2>🗓 Робочі слоти</h2>
      </div>

      {/* 🔥 БЛОК ДОДАТИ СЛОТ */}
      <div className="card" style={{ marginBottom: 12 }}>
        <h3>➕ Додати слот</h3>

        <input id="newSlotDate" type="date" className="slot-input" />
        <input id="newSlotTime" type="time" className="slot-input" />

        <button
          className="primary-btn"
          style={{ marginTop: 10 }}
          onClick={() => {
            const date = document.getElementById("newSlotDate").value;
            const time = document.getElementById("newSlotTime").value;

            if (!date || !time) {
              return alert("❗ Вкажи дату і час");
            }

            fetch(`${API}/api/admin/add-slot`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-init-data": WebApp.initData
              },
              body: JSON.stringify({ date, time })
            })
              .then(r => r.json())
              .then(() => {
                alert("Слот додано!");

                fetch(`${API}/api/admin/slots`, {
    headers: { "x-init-data": WebApp.initData }
  })
    .then(r => r.json())
    .then(data => {
      setSlotsAdmin(
        data.sort((a, b) =>
          new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`)
        )
      );
    }); // ❗ ЦЕЇ ДУЖКИ У ТЕБЕ НЕ ВИСТАЧАЛО
});
              
          }}
        >
          ➕ Додати
        </button>
      </div>

         {/* 🔥 СПИСОК СЛОТІВ */}
      {slotsAdmin.map((s) => {
        const label = getSlotLabel(s.date);

        return (
          <div
            className="card"
            key={s.id}
            style={{
              border:
                label === "today"
                  ? "2px solid #4CAF50"
                  : label === "tomorrow"
                  ? "2px solid #2196F3"
                  : "1px solid #eee",
              background:
                label === "today"
                  ? "rgba(76, 175, 80, 0.08)"
                  : label === "tomorrow"
                  ? "rgba(33, 150, 243, 0.08)"
                  : "#fff",
            }}
          >
            <p>
              <b>{s.date} {s.time}</b>
              {label === "today" && (
                <span style={{ color: "#4CAF50", marginLeft: 6 }}>• Сьогодні</span>
              )}
              {label === "tomorrow" && (
                <span style={{ color: "#2196F3", marginLeft: 6 }}>• Завтра</span>
              )}
            </p>

            <p>
              {s.is_booked ? (
                <>
                  🔴 Зайнято —{" "}
                  <span
                    onClick={() =>
                      WebApp.openTelegramLink(
                        `https://t.me/${s.client_username}`
                      )
                    }
                    style={{
                      color: "#d63384",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    {s.client_name}
                  </span>
                </>
              ) : (
                "🟢 Вільно"
              )}
            </p>

            {!s.is_booked && (
              <button
                className="btn-cancel"
                onClick={() => deleteSlot(s.id)}
              >
                ✖ Видалити
              </button>
            )}
          </div>
        );
      })}

      <button
        className="primary-btn"
        onClick={() => setMode("adminMenu")}
        style={{ marginTop: 16 }}
      >
        ← Назад
      </button>

      {modal}
    </div>
  );
}

if (mode === "prices") {
  return (
    <div className="app-container">

      <div className="card">
        <h2>💰 Прайс</h2>
        <p style={{ opacity: 0.7 }}>Керуйте цінами та послугами</p>
      </div>

      {/* Add Category */}
      <div className="card" style={{ marginBottom: 12 }}>
        <h3>➕ Додати категорію</h3>
        <input id="newCategoryName" placeholder="Назва категорії" className="input" />
        <textarea id="newCategoryDesc" placeholder="Опис (необов'язково)" className="input" rows="2"></textarea>
        <button
          className="primary-btn"
          onClick={() => {
            const name = document.getElementById("newCategoryName").value.trim();
            if (!name) return alert("Введіть назву категорії");

            fetch(`${API}/api/admin/category`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-init-data": WebApp.initData
              },
              body: JSON.stringify({
                name,
                description: document.getElementById("newCategoryDesc").value.trim(),
                is_active: true
              })
            })
              .then(r => r.json())
              .then(() => {
                alert("Категорію додано!");
                document.getElementById("newCategoryName").value = "";
                document.getElementById("newCategoryDesc").value = "";
                // Reload prices
                fetch(`${API}/api/admin/prices`, {
                  headers: { "x-init-data": WebApp.initData }
                })
                  .then(r => r.json())
                  .then(setPriceList);
              });
          }}
        >
          ➕ Додати категорію
        </button>
      </div>

      {/* Categories and Services */}
      {priceList.map(category => (
        <div key={category.id} className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{category.name}</h3>
            <div>
              <button
                className="btn-small"
                onClick={() => {
                  const newName = prompt("Нова назва категорії:", category.name);
                  if (newName && newName.trim()) {
                    fetch(`${API}/api/admin/category`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "x-init-data": WebApp.initData
                      },
                      body: JSON.stringify({
                        id: category.id,
                        name: newName.trim(),
                        description: category.description,
                        is_active: category.is_active
                      })
                    })
                      .then(() => {
                        // Reload prices
                        fetch(`${API}/api/admin/prices`, {
                          headers: { "x-init-data": WebApp.initData }
                        })
                          .then(r => r.json())
                          .then(setPriceList);
                      });
                  }
                }}
              >
                ✏️
              </button>
              <button
                className="btn-small btn-cancel"
                onClick={() => {
                  if (window.confirm(`Видалити категорію "${category.name}" та всі її послуги?`)) {
                    fetch(`${API}/api/admin/category/${category.id}`, {
                      method: "DELETE",
                      headers: { "x-init-data": WebApp.initData }
                    })
                      .then(() => {
                        // Reload prices
                        fetch(`${API}/api/admin/prices`, {
                          headers: { "x-init-data": WebApp.initData }
                        })
                          .then(r => r.json())
                          .then(setPriceList);
                      });
                  }
                }}
              >
                🗑️
              </button>
            </div>
          </div>

          {category.description && (
            <p style={{ opacity: 0.7, margin: '8px 0' }}>{category.description}</p>
          )}

          {/* Add Service */}
          <div style={{ marginTop: 12, padding: '12px', background: '#f9f9f9', borderRadius: '8px' }}>
            <h4>➕ Додати послугу</h4>
            <input id={`serviceName-${category.id}`} placeholder="Назва послуги" className="input" />
            <textarea id={`serviceDesc-${category.id}`} placeholder="Опис (необов'язково)" className="input" rows="2"></textarea>
            <input id={`servicePrice-${category.id}`} type="number" placeholder="Ціна (zł)" className="input" />
            <label style={{ display: 'block', margin: '8px 0' }}>
              <input type="checkbox" id={`servicePromo-${category.id}`} /> Акція
            </label>
            <input id={`serviceDiscount-${category.id}`} type="number" placeholder="Ціна зі знижкою (якщо акція)" className="input" />
            <button
              className="primary-btn"
              onClick={() => {
                const name = document.getElementById(`serviceName-${category.id}`).value.trim();
                const price = parseInt(document.getElementById(`servicePrice-${category.id}`).value);
                const isPromo = document.getElementById(`servicePromo-${category.id}`).checked;
                const discountPrice = isPromo ? parseInt(document.getElementById(`serviceDiscount-${category.id}`).value) : null;

                if (!name || isNaN(price)) return alert("Введіть назву та ціну послуги");

                fetch(`${API}/api/admin/service`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-init-data": WebApp.initData
                  },
                  body: JSON.stringify({
                    category_id: category.id,
                    name,
                    description: document.getElementById(`serviceDesc-${category.id}`).value.trim(),
                    price,
                    is_promotion: isPromo,
                    discount_price: discountPrice,
                    is_active: true
                  })
                })
                  .then(r => r.json())
                  .then(() => {
                    alert("Послугу додано!");
                    document.getElementById(`serviceName-${category.id}`).value = "";
                    document.getElementById(`serviceDesc-${category.id}`).value = "";
                    document.getElementById(`servicePrice-${category.id}`).value = "";
                    document.getElementById(`servicePromo-${category.id}`).checked = false;
                    document.getElementById(`serviceDiscount-${category.id}`).value = "";
                    // Reload prices
                    fetch(`${API}/api/admin/prices`, {
                      headers: { "x-init-data": WebApp.initData }
                    })
                      .then(r => r.json())
                      .then(setPriceList);
                  });
              }}
            >
              ➕ Додати послугу
            </button>
          </div>

          {/* Services List */}
          <div style={{ marginTop: 12 }}>
            {category.services.map(service => (
              <div key={service.id} style={{ 
                padding: '8px', 
                margin: '4px 0', 
                background: service.is_promotion ? '#fff3cd' : '#f8f9fa',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong>{service.name}</strong>
                  {service.description && <div style={{ fontSize: '14px', opacity: 0.7 }}>{service.description}</div>}
                  <div style={{ fontSize: '14px', marginTop: '4px' }}>
                    {service.is_promotion ? (
                      <>
                        <span style={{ textDecoration: 'line-through', color: '#dc3545' }}>{service.price} zł</span>
                        {' → '}
                        <span style={{ color: '#28a745', fontWeight: 'bold' }}>{service.discount_price} zł</span>
                        <span style={{ color: '#ffc107', marginLeft: '8px' }}>🔥 Акція</span>
                      </>
                    ) : (
                      <span>{service.price} zł</span>
                    )}
                  </div>
                </div>
                <div>
                  <button
                    className="btn-small"
                    onClick={() => {
                      const newName = prompt("Нова назва послуги:", service.name);
                      const newPrice = prompt("Нова ціна:", service.price);
                      if (newName && newPrice && !isNaN(parseInt(newPrice))) {
                        fetch(`${API}/api/admin/service`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            "x-init-data": WebApp.initData
                          },
                          body: JSON.stringify({
                            id: service.id,
                            category_id: category.id,
                            name: newName.trim(),
                            description: service.description,
                            price: parseInt(newPrice),
                            is_promotion: service.is_promotion,
                            discount_price: service.discount_price,
                            is_active: service.is_active
                          })
                        })
                          .then(() => {
                            // Reload prices
                            fetch(`${API}/api/admin/prices`, {
                              headers: { "x-init-data": WebApp.initData }
                            })
                              .then(r => r.json())
                              .then(setPriceList);
                          });
                      }
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-small btn-cancel"
                    onClick={() => {
                      if (window.confirm(`Видалити послугу "${service.name}"?`)) {
                        fetch(`${API}/api/admin/service/${service.id}`, {
                          method: "DELETE",
                          headers: { "x-init-data": WebApp.initData }
                        })
                          .then(() => {
                            // Reload prices
                            fetch(`${API}/api/admin/prices`, {
                              headers: { "x-init-data": WebApp.initData }
                            })
                              .then(r => r.json())
                              .then(setPriceList);
                          });
                      }
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        className="primary-btn"
        style={{ marginTop: 16 }}
        onClick={() => setMode("adminMenu")}
      >
        ← Назад
      </button>

      {modal}
    </div>
  );
}

if (mode === "promotions") {
  return (
    <div className="app-container">

      <div className="card">
        <h2>🎉 Акції</h2>
        <p style={{ opacity: 0.7 }}>Керуйте акціями та знижками</p>
      </div>

      {/* Add Promotion */}
      <div className="card" style={{ marginBottom: 12 }}>
        <h3>➕ Додати акцію</h3>
        <input id="newPromoName" placeholder="Назва акції" className="input" />
        <textarea id="newPromoDesc" placeholder="Опис акції" className="input" rows="2"></textarea>
        <select id="newPromoType" className="input">
          <option value="percentage">Відсоток</option>
          <option value="fixed">Фіксована сума</option>
        </select>
        <input id="newPromoValue" type="number" placeholder="Значення (знижки)" className="input" />
        <input id="newPromoValidFrom" type="datetime-local" placeholder="Діє від" className="input" />
        <input id="newPromoValidUntil" type="datetime-local" placeholder="Діє до" className="input" />
        <button
          className="primary-btn"
          onClick={() => {
            const name = document.getElementById("newPromoName").value.trim();
            const description = document.getElementById("newPromoDesc").value.trim();
            const discount_type = document.getElementById("newPromoType").value;
            const discount_value = parseInt(document.getElementById("newPromoValue").value);
            const valid_from = document.getElementById("newPromoValidFrom").value;
            const valid_until = document.getElementById("newPromoValidUntil").value;

            if (!name || isNaN(discount_value)) return alert("Введіть назву та значення знижки");

            fetch(`${API}/api/admin/promotion`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-init-data": WebApp.initData
              },
              body: JSON.stringify({
                name,
                description,
                discount_type,
                discount_value,
                is_active: true,
                valid_from: valid_from || null,
                valid_until: valid_until || null
              })
            })
              .then(r => r.json())
              .then(() => {
                alert("Акцію додано!");
                document.getElementById("newPromoName").value = "";
                document.getElementById("newPromoDesc").value = "";
                document.getElementById("newPromoValue").value = "";
                document.getElementById("newPromoValidFrom").value = "";
                document.getElementById("newPromoValidUntil").value = "";
                // Reload promotions
                fetch(`${API}/api/admin/promotions`, {
                  headers: { "x-init-data": WebApp.initData }
                })
                  .then(r => r.json())
                  .then(setPromotions);
              });
          }}
        >
          ➕ Додати акцію
        </button>
      </div>

      {/* Promotions List */}
      {promotions.map(promo => (
        <div key={promo.id} className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{promo.name}</h3>
            <div>
              <button
                className="btn-small"
                onClick={() => {
                  const newName = prompt("Нова назва акції:", promo.name);
                  if (newName && newName.trim()) {
                    fetch(`${API}/api/admin/promotion`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "x-init-data": WebApp.initData
                      },
                      body: JSON.stringify({
                        id: promo.id,
                        name: newName.trim(),
                        description: promo.description,
                        discount_type: promo.discount_type,
                        discount_value: promo.discount_value,
                        is_active: promo.is_active,
                        valid_from: promo.valid_from,
                        valid_until: promo.valid_until
                      })
                    })
                      .then(() => {
                        // Reload promotions
                        fetch(`${API}/api/admin/promotions`, {
                          headers: { "x-init-data": WebApp.initData }
                        })
                          .then(r => r.json())
                          .then(setPromotions);
                      });
                  }
                }}
              >
                ✏️
              </button>
              <button
                className="btn-small btn-cancel"
                onClick={() => {
                  if (window.confirm(`Видалити акцію "${promo.name}"?`)) {
                    fetch(`${API}/api/admin/promotion/${promo.id}`, {
                      method: "DELETE",
                      headers: { "x-init-data": WebApp.initData }
                    })
                      .then(() => {
                        // Reload promotions
                        fetch(`${API}/api/admin/promotions`, {
                          headers: { "x-init-data": WebApp.initData }
                        })
                          .then(r => r.json())
                          .then(setPromotions);
                      });
                  }
                }}
              >
                🗑️
              </button>
            </div>
          </div>

          <p style={{ opacity: 0.7 }}>{promo.description}</p>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>
            <strong>Знижка:</strong> {promo.discount_value}{promo.discount_type === 'percentage' ? '%' : ' zł'}
            {promo.valid_from && <div><strong>Від:</strong> {new Date(promo.valid_from).toLocaleString()}</div>}
            {promo.valid_until && <div><strong>До:</strong> {new Date(promo.valid_until).toLocaleString()}</div>}
            <div><strong>Статус:</strong> {promo.is_active ? '✅ Активна' : '❌ Неактивна'}</div>
          </div>
        </div>
      ))}

      <button
        className="primary-btn"
        style={{ marginTop: 16 }}
        onClick={() => setMode("adminMenu")}
      >
        ← Назад
      </button>

      {modal}
    </div>
  );
}


if (mode === "addSlot") {
    <div className="app-container">
      {!["menu", "adminMenu"].includes(mode) && <button className="back-btn" onClick={() => setMode(["clients", "clientHistory", "slots", "prices", "promotions", "addSlot", "bookings"].includes(mode) ? "adminMenu" : "menu")}>←<br/>Назад</button>}

      <div className="admin-header">
        <button className="back-link" onClick={() => setMode("adminMenu")}>
          ← Назад
        </button>
        <h2>Додати слот</h2>
      </div>

      <input id="newDate" type="date" className="input" />
      <input id="newTime" type="time" className="input" />

      <button
        className="primary-btn"
        onClick={() => {
          const date = document.getElementById("newDate").value;
          const time = document.getElementById("newTime").value;

          if (!date || !time) return alert("Заповніть дату і час");

          fetch(`${API}/api/admin/add-slot`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-init-data": WebApp.initData
            },
            body: JSON.stringify({ date, time })
          })
            .then(r => r.json())
            .then(() => {
              alert("Слот додано");
              setMode("adminMenu");
            });
        }}
      >
        ➕ Додати
      </button>

      {modal}
    </div>
  ;
}


  if (mode === "admin") {
    // 🔥 Сортування: від найближчого до найновішого
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA - dateB;
  });
  return (
    <div className="app-container">

      <div className="admin-header">
        <button
          className="back-link"
          onClick={() => setMode("adminMenu")}
        >
          ← Назад
        </button>
        <h2>Записи</h2>
      </div>

      {/* ФІЛЬТРИ */}
      <div className="admin-filters">
        <button onClick={() => applyFilter("all")}>📋 Усі</button>
        <button onClick={() => applyFilter("pending")}>⏳ Очікують</button>
        <button onClick={() => applyFilter("approved")}>✔ Підтверджені</button>
        <button onClick={() => applyFilter("canceled")}>❌ Скасовані</button>
      </div>
      
      
      {/* СПИСОК */}

      {sortedAppointments.map(a => (
          <div
            className="admin-card"
            key={a.id}
            style={{
              border: getSlotLabel(a.date) === "today" ? "2px solid #4CAF50" : getSlotLabel(a.date) === "tomorrow" ? "2px solid #2196F3" : "1px solid #ddd",
              background: getSlotLabel(a.date) === "today" ? "rgba(76, 175, 80, 0.08)" : getSlotLabel(a.date) === "tomorrow" ? "rgba(33, 150, 243, 0.08)" : "#fff",
            }}
          >

            <div className="admin-date">
              {a.date} {a.time}
              {getSlotLabel(a.date) === "today" && (
                <span style={{ color: "#4CAF50", marginLeft: 6 }}>• Сьогодні</span>
              )}
              {getSlotLabel(a.date) === "tomorrow" && (
                <span style={{ color: "#2196F3", marginLeft: 6 }}>• Завтра</span>
              )}
            </div>
            <div className="admin-client">{a.client}</div>

            <div className="admin-desc">
              {a.design}, {a.length}, {a.type}
            </div>

            {a.comment && (
              <div className="admin-comment">💬 {a.comment}</div>
            )}

            {a.reference_image && (
              <img
                src={`${API}${a.reference_image}`}
                alt="ref"
                className="admin-ref"
                onClick={() => setModalImage(`${API}${a.reference_image}`)}
                style={{ cursor: 'pointer' }}
              />
            )}

            <div className="admin-actions">
  {a.status === "approved" && (
    <button
      className="btn-approved-static"
      onClick={() => {
        if (!window.confirm("Ви хочете змінити статус запису?")) return;

        const newStatus = window.prompt(
          "Виберіть новий статус:\n- canceled\n- pending",
          "pending"
        );

        if (!["canceled", "pending"].includes(newStatus)) {
          return alert("❌ Невірний статус");
        }

        changeStatus(a.id, newStatus);
      }}
    >
      ✔ Підтверджено
    </button>
  )}

  {/* Статус: СКАСОВАНО */}
  {a.status === "canceled" && (
    <button
      className="btn-canceled-static"
      onClick={() => {
        if (!window.confirm("Ви хочете змінити статус запису?")) return;

        const newStatus = window.prompt(
          "Виберіть новий статус:\n- approved\n- pending",
          "pending"
        );

        if (!["approved", "pending"].includes(newStatus)) {
          return alert("❌ Невірний статус");
        }

        changeStatus(a.id, newStatus);
      }}
    >
      ❌ Скасовано
    </button>
  )}

  {/* Статус: ОЧІКУЄ — показуємо старі 2 кнопки */}
  {a.status === "pending" && (
    <>
      <button
        className="btn-approve"
        onClick={() => changeStatus(a.id, "approved")}
      >
        ✓ Підтвердити
      </button>

      <button
        className="btn-cancel"
        onClick={() => changeStatus(a.id, "canceled")}
      >
        ✕ Скасувати
      </button>
    </>
  )}

</div>

        </div>
      ))}

      {/* EMPTY STATE */}
      {sortedAppointments.length === 0 && (
        <div className="admin-empty">
          <img src="/admin-empty.png" className="admin-empty-img" alt="" />
          <p>Записів поки що немає</p>
        </div>
      )}

      {modal}
    </div>
  );
}


  

  // CLIENT FORM
  return (
    <div className="app-container">

      {isAdmin && (
  <button className="primary-btn" onClick={() => setMode("adminMenu")}>
    🔒 Адмінка
  </button>
)}

      
      <div className="card">
  <h2>Запис 💅</h2>
</div>

      <p>Привіт, {tgUser?.first_name}!</p>
     
      <div className="field">
      <label>Оберіть дату і час:</label>
      <button
        className="field"
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 14,
          border: "none",
          background: "rgba(255,255,255,0.9)",
          fontSize: 15,
          textAlign: "left",
          cursor: "pointer",
        }}
        onClick={() => setIsSlotModalOpen(true)}
      >
        {selectedSlot ? `${selectedSlot.date} — ${selectedSlot.time}` : "📅 Обрати дату"}
      </button>
      </div>
      <div className="field">
      <label>Дизайн:</label>
      <select value={design} onChange={e => setDesign(e.target.value)}>
        <option>Класичний френч</option>
        <option>Гліттер</option>
        <option>Мінімалізм</option>
      </select>
      </div>

      <div className="field">
      <label>Довжина:</label>
      <select value={length} onChange={e => setLength(e.target.value)}>
        <option>Короткі</option>
        <option>Середні</option>
        <option>Довгі</option>
      </select>
      </div>
      <div className="field">
      <label>Тип:</label>
      <select value={type} onChange={e => setType(e.target.value)}>
        <option>Гель-лак</option>
        <option>Гібрид</option>
        <option>Акрил</option>
      </select>
      </div>
      <div className="field">
      <label>Категорія послуги:</label>
      <select value={serviceCategory} onChange={e => {
        setServiceCategory(e.target.value);
        // Скинути sub при зміні категорії
        setServiceSub("");
      }}>
        {dynamicPrices.map(cat => (
          <option key={cat.id} value={cat.name}>{cat.name}</option>
        ))}
      </select>
      </div>
      <div className="field">
      <label>Послуга:</label>
      <select value={serviceSub} onChange={e => setServiceSub(e.target.value)}>
        {dynamicPrices.find(cat => cat.name === serviceCategory)?.services.map(service => {
          const displayName = service.is_promotion 
            ? `${service.name} (${service.discount_price} zł 🔥 Акція)`
            : `${service.name} (${service.price} zł)`;
          return (
            <option key={service.id} value={displayName}>{displayName}</option>
          );
        })}
      </select>
      </div>
      <div className="field">
      <label>Реферальний код (якщо є):</label>
      <input
        type="text"
        placeholder="Введіть код подруги"
        value={enteredReferralCode}
        onChange={e => setEnteredReferralCode(e.target.value.toUpperCase())}
        style={{
          width: "100%",
          padding: 10,
          background: "#eef5ff",
          borderRadius: 6,
          marginBottom: 10,
          border: "1px solid #ccc"
        }}
      />
      <small style={{ opacity: 0.7 }}>Якщо у вас є реферальний код від подруги, введіть його тут для отримання знижки</small>
      </div>
      <div className="field">
      <label>Коментар від клієнта:</label>
<textarea
  placeholder="Наприклад: буду з дизайном з Pinterest"
  value={comment}
  onChange={e => setComment(e.target.value)}
  style={{
    width: "100%",
    minHeight: 60,
    marginBottom: 10
  }}
  />
</div>
<div className="field">
<label>Референс (фото манікюру):</label>
<input
  type="file"
  accept="image/*"
  onChange={e => setReference(e.target.files[0])}
  style={{
    width: "100%",
    padding: 10,
    background: "#eef5ff",
    borderRadius: 6,
    marginBottom: 15,
    border: "1px solid #ccc"

  }}/>
</div>
{isFirstTime && (
  <div style={{ color: 'green', fontWeight: 'bold', marginBottom: 10 }}>
    Застосовано знижку за перший манікюр 20%
  </div>
)}
<div style={{ marginBottom: 15, fontWeight: 'bold' }}>
  Загальна ціна: {price} zł
</div>
<button
  className="primary-btn"
  onClick={() => {
    if (!selectedSlotId) return alert("❗ Обери дату і час");

    const formData = new FormData();
    formData.append("client", tgUser?.first_name || "Anon");
    formData.append("slot_id", selectedSlotId);
    formData.append("design", design);
    formData.append("length", length);
    formData.append("type", type);
    formData.append("service", serviceSub.split(' (')[0]); // Remove price part
    formData.append("price", price);
    formData.append("comment", comment);
    formData.append("tg_id", tgUser?.id);
    formData.append("username", tgUser?.username);
    if (enteredReferralCode.trim()) {
      formData.append("referral_code", enteredReferralCode.trim());
    }


    if (reference) {
      formData.append("reference", reference);
    }

    fetch(`${API}/api/appointment`, {
      method: "POST",
      body: formData
    })
      .then(r => r.json())
      .then(data => {
        let message = "✅ Запис створено!";
        if (data.discount > 0) {
          message += `\n💸 Застосовано знижку: ${data.discount} zł`;
        }
        if (data.final_price) {
          message += `\n💰 Остаточна ціна: ${data.final_price} zł`;
        }
        alert(message);
        // Reset form
        setSelectedSlotId("");
        setEnteredReferralCode("");
        setComment("");
        setReference(null);
      })
      .catch(() => alert("❌ Помилка при відправці"));
  }}
>
  Записатися 💅
</button>
<button
  className="primary-btn"
  onClick={() => setMode("menu")}
  style={{ marginTop: 16 }}
>
  ← Назад
</button>
      {/* SLOT MODAL */}
      {isSlotModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setIsSlotModalOpen(false)}
        >
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 20,
              maxWidth: 400,
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" }}>
              Оберіть дату і час
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {grouped.map((group) => {
                const dateObj = new Date(group.date);
                return (
                  <div key={group.date} style={{ borderBottom: "1px solid #eee", paddingBottom: 10 }}>
                    <div
                      style={{
                        marginBottom: 10,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 24, fontWeight: "bold" }}>
                        {dateObj.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
                      </div>
                      <div style={{ fontSize: 16, marginTop: 4 }}>
                        {dateObj.toLocaleDateString('uk-UA', { weekday: 'long' })}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {group.slots.map((slot) => (
                        <button
                          key={slot.id}
                          style={{
                            padding: 10,
                            borderRadius: 8,
                            background: "#f7f1f4",
                            border: "1px solid #e0d3d7",
                            cursor: "pointer",
                            fontSize: 16,
                            minWidth: 60,
                          }}
                          onClick={() => {
                            setSelectedSlotId(slot.id);
                            setIsSlotModalOpen(false);
                          }}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {modal}
    </div>
    
  );
}

export default App;