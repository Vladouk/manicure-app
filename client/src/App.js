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
const [reference, setReference] = useState([]);
const [currentHandsPhotos, setCurrentHandsPhotos] = useState([]);
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
  const [analyticsHours, setAnalyticsHours] = useState([]);
  const [analyticsDays, setAnalyticsDays] = useState([]);
  const [analyticsRevenue, setAnalyticsRevenue] = useState(null);
  const [analyticsForecast, setAnalyticsForecast] = useState(null);
  const [analyticsNewClients, setAnalyticsNewClients] = useState([]);

  // BOOKING INTERFACE HOOKS
  const [bookingStep, setBookingStep] = useState(1);
  const totalSteps = 4;

  const nextStep = () => setBookingStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setBookingStep(prev => Math.max(prev - 1, 1));
  const resetBooking = () => {
    setBookingStep(1);
    setSelectedSlotId("");
    setEnteredReferralCode("");
    setComment("");
    setReference([]);
    setCurrentHandsPhotos([]);
  };

  // Function to select service from price list and go to booking form
  const selectServiceFromPriceList = (serviceData) => {
    // Set the service details
    setType(serviceData.type || "Гель-лак");
    setLength(serviceData.length || "Середні");
    setDesign(serviceData.design || "Класичний френч");
    setServiceCategory(serviceData.category || "Покриття");
    setServiceSub(serviceData.serviceName || "");
    setPrice(serviceData.price || 0);
    
    // Go to client booking mode
    setMode("client");
  };

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
  // Fallback for non-Telegram (web) users
  const [manualName, setManualName] = useState("");
  const [manualTgId, setManualTgId] = useState("");

  useEffect(() => {
  WebApp.ready();
  WebApp.expand();
  WebApp.MainButton.hide();

  fetch(`${API}/api/slots`)
    .then(r => r.json())
    .then(data => setSlots(data.filter(s => s.is_booked === false)))
    .catch(err => console.error('Client: Error fetching slots:', err));

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
    fetch(`${API}/api/client/points?tg_id=${tgUser?.id}`)
      .then(r => r.json())
      .then(data => setBonusPoints(data.points || 0))
      .catch(() => setBonusPoints(0));

      const handleClick = () => {
        if (!selectedSlotId) {
          alert("❗ Обери дату і час");
          return;
        }

        const formData = new FormData();
        // Use Telegram user data when available, otherwise use manual inputs for web users
        const clientName = tgUser?.first_name || manualName || "Anon";
        const effectiveTgId = tgUser?.id || manualTgId || '';

        if (!effectiveTgId) {
          alert('❗ Вкажіть ваш Telegram ID або відкрийте додаток через Telegram Web App');
          return;
        }

        formData.append("client", clientName);
formData.append("slot_id", selectedSlotId);
formData.append("design", design);
formData.append("length", length);
formData.append("type", type);
formData.append("comment", comment);
        formData.append("tg_id", effectiveTgId);

        // Add current hands photos
        currentHandsPhotos.forEach((photo, index) => {
          formData.append(`current_hands_${index}`, photo);
        });

        // Add reference photos
        reference.forEach((ref, index) => {
          formData.append(`reference_${index}`, ref);
        });

fetch(`${API}/api/appointment`, {
  method: "POST",
  body: formData
})
  .then(r => r.json())
  .then(() => {
    alert("✅ Запис створено!");
  })
  .catch(() => alert("❌ Помилка при відправці"));

          
      };

      WebApp.MainButton.setText("📅 Записатися");
      WebApp.MainButton.show();
      WebApp.MainButton.onClick(handleClick);

    }

    WebApp.MainButton.hide();
  }, [effectiveMode, selectedSlotId, design, length, type, comment, reference, currentHandsPhotos, tgUser?.first_name, tgUser?.id, manualName, manualTgId]);

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

  // Refresh slots when entering client booking mode
  useEffect(() => {
    if (mode === "client") {
      fetch(`${API}/api/slots`)
        .then(r => r.json())
        .then(data => setSlots(data.filter(s => s.is_booked === false)))
        .catch(err => console.error('Client: Error refreshing slots:', err));
    }
  }, [mode]);

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
        <h2>� ПРАЙС НА ПОСЛУГИ МАНІКЮРУ</h2>
        <p style={{ opacity: 0.7 }}>Професійний догляд за вашими нігтями</p>
      </div>

      {/* ПОКРИТТЯ */}
      <div className="card" style={{ backgroundColor: "#fff8f4", borderLeft: "4px solid #ff6b6b" }}>
        <h3 style={{ color: "#ff6b6b", marginBottom: 16 }}>💅 ПОКРИТТЯ</h3>

        <div style={{ marginBottom: 20 }}>
          <h4 
            style={{ color: "#2c3e50", marginBottom: 8, cursor: "pointer" }}
            onClick={() => selectServiceFromPriceList({
              type: "Гель-лак",
              length: "Середні", 
              design: "Класичний френч",
              category: "Покриття",
              serviceName: "Покриття «гель-лак» (100 zł)",
              price: 100
            })}
          >
            1. Покриття «гель-лак» — 100 zł
          </h4>
          <div style={{ backgroundColor: "#f8f9fa", padding: 12, borderRadius: 8, marginBottom: 8 }}>
            <strong>У вартість входить:</strong>
            <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
              <li>Гігієнічний манікюр</li>
              <li>База</li>
              <li>Колір (однотонне покриття)</li>
              <li>Топ</li>
            </ul>
          </div>
          <p style={{ fontSize: 14, color: "#e74c3c", fontStyle: "italic" }}>
            ⭐ Підходить тим, хто хоче акуратні та міцні нігті на 3–4 тижні.
          </p>
        </div>

        <div>
          <h4 
            style={{ color: "#2c3e50", marginBottom: 8, cursor: "pointer" }}
            onClick={() => selectServiceFromPriceList({
              type: "Гель-лак",
              length: "Середні",
              design: "Класичний френч", 
              category: "Покриття",
              serviceName: "Покриття з укріпленням (120 zł)",
              price: 120
            })}
          >
            2. Покриття з укріпленням — 120 zł
          </h4>
          <div style={{ backgroundColor: "#f8f9fa", padding: 12, borderRadius: 8, marginBottom: 8 }}>
            <strong>У вартість входить:</strong>
            <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
              <li>Гігієнічний манікюр</li>
              <li>База</li>
              <li>Гель для зміцнення нігтів</li>
              <li>Колір</li>
              <li>Топ</li>
            </ul>
          </div>
          <p style={{ fontSize: 14, color: "#e74c3c", fontStyle: "italic" }}>
            ⭐ Рекомендую для слабких, ламких або м'яких нігтів — укріплення додає міцності та зносостійкості.
          </p>
        </div>
      </div>

      {/* НАРОЩЕННЯ НІГТІВ */}
      <div className="card" style={{ backgroundColor: "#f0f8ff", borderLeft: "4px solid #3498db" }}>
        <h3 style={{ color: "#3498db", marginBottom: 16 }}>✨ НАРОЩЕННЯ НІГТІВ</h3>
        <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 16 }}>
          (Включає форму, довжину, моделювання матеріалом, опил, базове вирівнювання)
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div 
            style={{ backgroundColor: "#e8f4fd", padding: 12, borderRadius: 8, cursor: "pointer" }}
            onClick={() => selectServiceFromPriceList({
              type: "Акрил",
              length: "Короткі",
              design: "Класичний френч",
              category: "Нарощення",
              serviceName: "Нарощення нігтів S (130 zł)",
              price: 130
            })}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: 16 }}>S — 130 zł</strong>
                <p style={{ fontSize: 14, margin: "4px 0", opacity: 0.8 }}>Коротка довжина, класична та найзручніша.</p>
              </div>
            </div>
          </div>

          <div 
            style={{ backgroundColor: "#e8f4fd", padding: 12, borderRadius: 8, cursor: "pointer" }}
            onClick={() => selectServiceFromPriceList({
              type: "Акрил",
              length: "Середні",
              design: "Класичний френч",
              category: "Нарощення", 
              serviceName: "Нарощення нігтів M (150 zł)",
              price: 150
            })}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: 16 }}>M — 150 zł</strong>
                <p style={{ fontSize: 14, margin: "4px 0", opacity: 0.8 }}>Середня довжина — оптимальний варіант для дизайнів.</p>
              </div>
            </div>
          </div>

          <div 
            style={{ backgroundColor: "#e8f4fd", padding: 12, borderRadius: 8, cursor: "pointer" }}
            onClick={() => selectServiceFromPriceList({
              type: "Акрил",
              length: "Довгі",
              design: "Класичний френч",
              category: "Нарощення",
              serviceName: "Нарощення нігтів L (170 zł)",
              price: 170
            })}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: 16 }}>L — 170 zł</strong>
                <p style={{ fontSize: 14, margin: "4px 0", opacity: 0.8 }}>Довгі нігті — для виразних форм і складних дизайнів.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ДОДАТКОВІ ПОСЛУГИ */}
      <div className="card" style={{ backgroundColor: "#f8fff8", borderLeft: "4px solid #27ae60" }}>
        <h3 style={{ color: "#27ae60", marginBottom: 16 }}>🎨 ДОДАТКОВІ ПОСЛУГИ</h3>
        <h4 style={{ color: "#2c3e50", marginBottom: 12 }}>Дизайн</h4>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <div 
            style={{ backgroundColor: "#f0f9f0", padding: 10, borderRadius: 6, cursor: "pointer" }}
            onClick={() => selectServiceFromPriceList({
              type: "Гель-лак",
              length: "Середні",
              design: "Мінімалізм",
              category: "Дизайн",
              serviceName: "Дизайн 1–5 нігтів (20 zł)",
              price: 20
            })}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span><strong>1–5 нігтів — 20 zł</strong></span>
            </div>
            <p style={{ fontSize: 13, margin: "4px 0", opacity: 0.8 }}>
              (Малюнки, стемпінг, наклейки, френч, втирки тощо)
            </p>
          </div>

          <div 
            style={{ backgroundColor: "#f0f9f0", padding: 10, borderRadius: 6, cursor: "pointer" }}
            onClick={() => selectServiceFromPriceList({
              type: "Гель-лак",
              length: "Середні", 
              design: "Гліттер",
              category: "Дизайн",
              serviceName: "Дизайн на всі нігті (35 zł)",
              price: 35
            })}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span><strong>Дизайн на всі нігті — 35 zł</strong></span>
            </div>
            <p style={{ fontSize: 13, margin: "4px 0", opacity: 0.8 }}>
              Повністю оформлені руки у будь-якому стилі.
            </p>
          </div>
        </div>

        <div style={{ backgroundColor: "#e8f8e8", padding: 12, borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span><strong>Фігурки — 3 zł / шт</strong></span>
          </div>
          <p style={{ fontSize: 13, margin: "4px 0", opacity: 0.8 }}>
            Об'ємні декори, камінці, 3D-елементи.
          </p>
        </div>

        <div style={{ backgroundColor: "#fff3cd", padding: 12, borderRadius: 8, marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span><strong>Зняття + гігієнічний манікюр — 40 zł</strong></span>
          </div>
          <p style={{ fontSize: 13, margin: "4px 0", opacity: 0.8 }}>
            Повне акуратне зняття старого покриття + чистка нігтів і кутикули.
          </p>
        </div>
      </div>

      {/* ІНШІ ПОСЛУГИ */}
      <div className="card" style={{ backgroundColor: "#fff8f0", borderLeft: "4px solid #e67e22" }}>
        <h3 style={{ color: "#e67e22", marginBottom: 16 }}>💼 ІНШІ ПОСЛУГИ</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div 
            style={{ backgroundColor: "#fef5e7", padding: 10, borderRadius: 6, cursor: "pointer" }}
            onClick={() => selectServiceFromPriceList({
              type: "Гель-лак",
              length: "Середні",
              design: "Класичний френч",
              category: "Чоловічий манікюр",
              serviceName: "Чоловічий манікюр (50 zł)",
              price: 50
            })}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span><strong>Чоловічий манікюр — 50 zł</strong></span>
            </div>
            <p style={{ fontSize: 13, margin: "4px 0", opacity: 0.8 }}>
              Обрізний чи комбінований, з вирівнюванням і наданням форми.
            </p>
          </div>

          <div 
            style={{ backgroundColor: "#fef5e7", padding: 10, borderRadius: 6, cursor: "pointer" }}
            onClick={() => selectServiceFromPriceList({
              type: "Гель-лак",
              length: "Середні",
              design: "Класичний френч",
              category: "Покриття",
              serviceName: "Прозоре матове покриття (30 zł)",
              price: 30
            })}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span><strong>Прозоре матове покриття — 30 zł</strong></span>
            </div>
            <p style={{ fontSize: 13, margin: "4px 0", opacity: 0.8 }}>
              Ідеально для природного, «чистого» ефекту нігтів.
            </p>
          </div>
        </div>

        <div style={{ backgroundColor: "#f9f9f9", padding: 12, borderRadius: 8, marginTop: 12, border: "1px solid #ddd" }}>
          <p style={{ fontSize: 14, margin: 0, fontStyle: "italic" }}>
            💅 <strong>Покриття «гель-лак» / дизайн за стандартним прайсом</strong>
          </p>
          <p style={{ fontSize: 13, margin: "8px 0 0 0", opacity: 0.8 }}>
            Тобто дизайн та декор розраховується відповідно до вказаних вище цін.
          </p>
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
            fetch(`${API}/api/my-appointments`, {
              headers: { "x-init-data": WebApp.initData }
            })
              .then(r => r.json())
              .then(data => {
                setMyHistory(data);
                setMode("myAppointments");
              })
              .catch(err => {
                console.error('Error fetching appointments:', err);
                setMyHistory([]);
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
        onClick={() => {
          Promise.all([
            fetch(`${API}/api/admin/analytics/hours`, {
              headers: { "x-init-data": WebApp.initData }
            }).then(r => r.json()),
            fetch(`${API}/api/admin/analytics/days`, {
              headers: { "x-init-data": WebApp.initData }
            }).then(r => r.json()),
            fetch(`${API}/api/admin/analytics/monthly-revenue`, {
              headers: { "x-init-data": WebApp.initData }
            }).then(r => r.json()),
            fetch(`${API}/api/admin/analytics/forecast`, {
              headers: { "x-init-data": WebApp.initData }
            }).then(r => r.json()),
            fetch(`${API}/api/admin/analytics/new-clients`, {
              headers: { "x-init-data": WebApp.initData }
            }).then(r => r.json()),
          ])
            .then(([hours, days, revenue, forecast, newClients]) => {
              setAnalyticsHours(hours);
              setAnalyticsDays(days);
              setAnalyticsRevenue(revenue);
              setAnalyticsForecast(forecast);
              setAnalyticsNewClients(newClients);
              setMode("analytics");
            })
            .catch(err => {
              console.error('Error fetching analytics:', err);
              alert('❌ Помилка завантаження аналітики');
            });
        }}
      >
        💎 Аналітика 🔥
      </button>

      <button
        className="primary-btn"
        style={{ marginTop: 16 }}
        onClick={() => setMode("menu")}
      >
        ← Назад
      </button>

      {modal}
    </div>
  );
}

if (mode === "analytics") {
  return (
    <div className="app-container">
      <div className="card">
        <h2>💎 Аналітика 🔥</h2>
        <p style={{ opacity: 0.7 }}>Статистика вашого бізнесу</p>
      </div>

      {/* Monthly Revenue */}
      {analyticsRevenue && (
        <div className="card" style={{ backgroundColor: "#f0f8ff", borderLeft: "4px solid #3498db" }}>
          <h3>💰 Дохід цього місяця</h3>
          <div style={{ fontSize: 28, fontWeight: "bold", color: "#27ae60", marginBottom: 10 }}>
            {analyticsRevenue.total_revenue} zł
          </div>
          <p>📅 {analyticsRevenue.year}-{String(analyticsRevenue.month).padStart(2, '0')}</p>
          <p>📋 Записів: {analyticsRevenue.total_appointments}</p>
          <p>👥 Унікальних клієнтів: {analyticsRevenue.unique_clients}</p>
        </div>
      )}

      {/* Forecast */}
      {analyticsForecast && (
        <div className="card" style={{ backgroundColor: "#fff8f0", borderLeft: "4px solid #e67e22" }}>
          <h3>🔮 Прогноз на наступний місяць</h3>
          <p style={{ fontSize: 20, fontWeight: "bold", color: "#e67e22" }}>
            💵 {analyticsForecast.forecast_revenue} zł
          </p>
          <p>📊 Очікується записів: {analyticsForecast.forecast_appointments}</p>
          <p style={{ fontSize: 12, opacity: 0.7 }}>Розраховано на основі {analyticsForecast.based_on_months} місяців</p>
        </div>
      )}

      {/* Popular Hours */}
      {analyticsHours && analyticsHours.length > 0 && (
        <div className="card" style={{ backgroundColor: "#f0fff4", borderLeft: "4px solid #9b59b6" }}>
          <h3>⏰ Найпопулярніші години</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {analyticsHours.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: "10px 15px",
                  backgroundColor: "#e8daef",
                  borderRadius: 8,
                  fontWeight: "bold",
                  color: "#8e44ad"
                }}
              >
                {Math.round(item.hour)}:00 - {item.count} записів
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Days */}
      {analyticsDays && analyticsDays.length > 0 && (
        <div className="card" style={{ backgroundColor: "#fff5f5", borderLeft: "4px solid #e74c3c" }}>
          <h3>📅 Найпопулярніші дні</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {analyticsDays.map((item, idx) => {
              const dayNames = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    backgroundColor: "#fadbd8",
                    borderRadius: 6,
                  }}
                >
                  <span>{dayNames[item.day_num]}</span>
                  <span style={{ fontWeight: "bold", color: "#c0392b" }}>{item.count} записів</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Clients Graph */}
      {analyticsNewClients && analyticsNewClients.length > 0 && (
        <div className="card" style={{ backgroundColor: "#f5f9e9", borderLeft: "4px solid #16a085" }}>
          <h3>📈 Нові клієнти (останні 30 днів)</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 150, justifyContent: "space-around", paddingTop: 20 }}>
            {analyticsNewClients.map((item, idx) => {
              const maxClients = Math.max(...analyticsNewClients.map(x => x.new_clients || 0)) || 1;
              const height = (item.new_clients / maxClients) * 120;
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: height,
                      backgroundColor: "#16a085",
                      borderRadius: "4px 4px 0 0",
                      minHeight: item.new_clients > 0 ? 10 : 2,
                    }}
                  />
                  <span style={{ fontSize: 10, fontWeight: "bold" }}>{item.new_clients}</span>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 11, opacity: 0.7, marginTop: 10 }}>
            Графік показує новых клієнтів за день
          </p>
        </div>
      )}

      <button
        className="primary-btn"
        style={{ marginTop: 16 }}
        onClick={() => setMode("adminMenu")}
      >
        ← Назад в адмінку
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


  return (
    <div className="app-container" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', padding: '20px 0' }}>

      {isAdmin && (
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
          <button
            className="primary-btn"
            onClick={() => setMode("adminMenu")}
            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            🔒 Адмінка
          </button>
        </div>
      )}

      {/* Progress Indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        padding: '0 20px'
      }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: bookingStep > i + 1 ? '#4CAF50' : bookingStep === i + 1 ? '#FF6B9D' : 'rgba(255,255,255,0.3)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: 16,
              transition: 'all 0.3s ease'
            }}>
              {i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div style={{
                width: 60,
                height: 2,
                background: bookingStep > i + 1 ? '#4CAF50' : 'rgba(255,255,255,0.3)',
                margin: '0 10px',
                transition: 'background 0.3s ease'
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '0 20px'
      }}>

        {/* Step 1: Welcome & Service Selection */}
        {bookingStep === 1 && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 20,
            padding: 30,
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 30 }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>💅</div>
              <h1 style={{ color: '#333', marginBottom: 10, fontSize: 28 }}>Запис на манікюр</h1>
              <p style={{ color: '#666', fontSize: 16 }}>
                Привіт{tgUser?.first_name ? `, ${tgUser.first_name}` : ''}! Давайте створимо ваш ідеальний манікюр
              </p>
            </div>

            <div style={{ marginBottom: 30 }}>
              <h3 style={{ color: '#333', marginBottom: 20, textAlign: 'center' }}>Оберіть послугу</h3>

              {/* Service Category Selection */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', color: '#555' }}>
                  Категорія послуги:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                  {dynamicPrices.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setServiceCategory(cat.name);
                        setServiceSub("");
                      }}
                      style={{
                        padding: 15,
                        borderRadius: 12,
                        border: serviceCategory === cat.name ? '2px solid #FF6B9D' : '2px solid #e0e0e0',
                        background: serviceCategory === cat.name ? 'rgba(255,107,157,0.1)' : 'white',
                        cursor: 'pointer',
                        fontSize: 16,
                        fontWeight: serviceCategory === cat.name ? 'bold' : 'normal',
                        transition: 'all 0.3s ease',
                        textAlign: 'center'
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Selection */}
              {serviceCategory && (
                <div>
                  <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', color: '#555' }}>
                    Конкретна послуга:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                    {dynamicPrices.find(cat => cat.name === serviceCategory)?.services.map(service => {
                      const displayName = service.is_promotion
                        ? `${service.name} (${service.discount_price} zł 🔥 Акція)`
                        : `${service.name} (${service.price} zł)`;
                      const isSelected = serviceSub === displayName;

                      return (
                        <div
                          key={service.id}
                          onClick={() => {
                            setServiceSub(displayName);
                            setPrice(service.is_promotion ? service.discount_price : service.price);
                          }}
                          style={{
                            padding: 15,
                            borderRadius: 12,
                            border: isSelected ? '2px solid #FF6B9D' : '2px solid #e0e0e0',
                            background: isSelected ? 'rgba(255,107,157,0.1)' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            position: 'relative'
                          }}
                        >
                          {service.is_promotion && (
                            <div style={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              background: '#FF6B9D',
                              color: 'white',
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 'bold'
                            }}>
                              🔥
                            </div>
                          )}
                          <div style={{ fontWeight: 'bold', marginBottom: 5, color: '#333' }}>
                            {service.name}
                          </div>
                          <div style={{
                            color: service.is_promotion ? '#FF6B9D' : '#666',
                            fontWeight: service.is_promotion ? 'bold' : 'normal'
                          }}>
                            {service.is_promotion ? `${service.discount_price} zł` : `${service.price} zł`}
                            {service.is_promotion && <span style={{ marginLeft: 5 }}>🔥 Акція</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setMode("menu")}
                style={{
                  padding: '12px 24px',
                  borderRadius: 25,
                  border: 'none',
                  background: '#f0f0f0',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                ← Назад до меню
              </button>

              <button
                onClick={nextStep}
                disabled={!serviceSub}
                style={{
                  padding: '12px 24px',
                  borderRadius: 25,
                  border: 'none',
                  background: serviceSub ? 'linear-gradient(45deg, #FF6B9D, #C44569)' : '#ccc',
                  color: 'white',
                  cursor: serviceSub ? 'pointer' : 'not-allowed',
                  fontSize: 16,
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
              >
                Далі →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Date & Time Selection */}
        {bookingStep === 2 && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 20,
            padding: 30,
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 30 }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>📅</div>
              <h2 style={{ color: '#333', marginBottom: 10 }}>Оберіть дату та час</h2>
              <p style={{ color: '#666' }}>Виберіть зручний для вас час візиту</p>
            </div>

            <div style={{ marginBottom: 30 }}>
              <button
                onClick={() => setIsSlotModalOpen(true)}
                style={{
                  width: '100%',
                  padding: 20,
                  borderRadius: 15,
                  border: selectedSlot ? '2px solid #4CAF50' : '2px solid #e0e0e0',
                  background: selectedSlot ? 'rgba(76, 175, 80, 0.1)' : 'white',
                  fontSize: 18,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10
                }}
              >
                <span>📅</span>
                {selectedSlot ? (
                  <div>
                    <div>{selectedSlot.date}</div>
                    <div style={{ fontSize: 14, fontWeight: 'normal', color: '#666' }}>
                      {selectedSlot.time}
                    </div>
                  </div>
                ) : (
                  <span>Обрати дату та час</span>
                )}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={prevStep}
                style={{
                  padding: '12px 24px',
                  borderRadius: 25,
                  border: 'none',
                  background: '#f0f0f0',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                ← Назад
              </button>

              <button
                onClick={nextStep}
                disabled={!selectedSlot}
                style={{
                  padding: '12px 24px',
                  borderRadius: 25,
                  border: 'none',
                  background: selectedSlot ? 'linear-gradient(45deg, #FF6B9D, #C44569)' : '#ccc',
                  color: 'white',
                  cursor: selectedSlot ? 'pointer' : 'not-allowed',
                  fontSize: 16,
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
              >
                Далі →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preferences & Details */}
        {bookingStep === 3 && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 20,
            padding: 30,
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 30 }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>✨</div>
              <h2 style={{ color: '#333', marginBottom: 10 }}>Деталі та побажання</h2>
              <p style={{ color: '#666' }}>Розкажіть про ваші вподобання</p>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>

              {/* Design Selection */}
              <div>
                <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', color: '#555' }}>
                  Дизайн манікюру:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                  {[
                    { value: 'Класичний френч', emoji: '💅', desc: 'Елегантний класик' },
                    { value: 'Гліттер', emoji: '✨', desc: 'Блискучий дизайн' },
                    { value: 'Мінімалізм', emoji: '⚪', desc: 'Стильний мінімум' }
                  ].map(item => (
                    <button
                      key={item.value}
                      onClick={() => {
                        setDesign(item.value);
                      }}
                      style={{
                        padding: 15,
                        borderRadius: 12,
                        border: design === item.value ? '2px solid #FF6B9D' : '2px solid #e0e0e0',
                        background: design === item.value ? 'rgba(255,107,157,0.1)' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 5 }}>{item.emoji}</div>
                      <div style={{ fontWeight: 'bold', marginBottom: 3 }}>{item.value}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Length Selection */}
              <div>
                <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', color: '#555' }}>
                  Довжина нігтів:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                  {[
                    { value: 'Короткі', emoji: '✂️', desc: 'Практично' },
                    { value: 'Середні', emoji: '💅', desc: 'Класика' },
                    { value: 'Довгі', emoji: '👑', desc: 'Ефектно' }
                  ].map(item => (
                    <button
                      key={item.value}
                      onClick={() => {
                        setLength(item.value);
                      }}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        border: length === item.value ? '2px solid #FF6B9D' : '2px solid #e0e0e0',
                        background: length === item.value ? 'rgba(255,107,157,0.1)' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: 20, marginBottom: 3 }}>{item.emoji}</div>
                      <div style={{ fontWeight: 'bold' }}>{item.value}</div>
                      <div style={{ fontSize: 11, color: '#666' }}>{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Selection */}
              <div>
                <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', color: '#555' }}>
                  Тип покриття:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                  {[
                    { value: 'Гель-лак', desc: 'Стійке покриття' },
                    { value: 'Гібрид', desc: 'Міцне та натуральне' },
                    { value: 'Акрил', desc: 'Для нарощення' }
                  ].map(item => (
                    <button
                      key={item.value}
                      onClick={() => {
                        setType(item.value);
                      }}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        border: type === item.value ? '2px solid #FF6B9D' : '2px solid #e0e0e0',
                        background: type === item.value ? 'rgba(255,107,157,0.1)' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: 3 }}>{item.value}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Referral Code */}
              <div>
                <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', color: '#555' }}>
                  Реферальний код (якщо є):
                </label>
                <input
                  type="text"
                  placeholder="Введіть код подруги для знижки"
                  value={enteredReferralCode}
                  onChange={e => setEnteredReferralCode(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: 15,
                    borderRadius: 12,
                    border: '2px solid #e0e0e0',
                    fontSize: 16,
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#FF6B9D'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
                <small style={{ color: '#666', fontSize: 12, marginTop: 5, display: 'block' }}>
                  Якщо у вас є реферальний код від подруги, введіть його тут для отримання знижки
                </small>
              </div>

              {/* Comment */}
              <div>
                <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', color: '#555' }}>
                  Ваші побажання:
                </label>
                <textarea
                  placeholder="Опишіть бажаний дизайн, кольори, особливі побажання..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 15,
                    borderRadius: 12,
                    border: '2px solid #e0e0e0',
                    fontSize: 16,
                    minHeight: 80,
                    resize: 'vertical',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#FF6B9D'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>

              {/* Current Hands Photos */}
              <div>
                <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', color: '#555' }}>
                  Фото ваших рук зараз (допоможе майстру):
                </label>
                <div style={{
                  border: '2px dashed #e0e0e0',
                  borderRadius: 12,
                  padding: 20,
                  textAlign: 'center',
                  transition: 'border-color 0.3s ease',
                  cursor: 'pointer',
                  marginBottom: 10
                }}
                onClick={() => document.getElementById('current-hands-input').click()}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>🤲</div>
                  <div style={{ color: '#666' }}>
                    {currentHandsPhotos.length > 0
                      ? `Вибрано ${currentHandsPhotos.length} фото`
                      : 'Натисніть щоб додати фото ваших рук'
                    }
                  </div>
                </div>
                {currentHandsPhotos.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                    {currentHandsPhotos.map((photo, index) => (
                      <div key={index} style={{
                        position: 'relative',
                        display: 'inline-block'
                      }}>
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Current hands ${index + 1}`}
                          style={{
                            width: 80,
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: '2px solid #e0e0e0'
                          }}
                        />
                        <button
                          onClick={() => {
                            setCurrentHandsPhotos(currentHandsPhotos.filter((_, i) => i !== index));
                          }}
                          style={{
                            position: 'absolute',
                            top: -5,
                            right: -5,
                            background: '#ff4757',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: 20,
                            height: 20,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  id="current-hands-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => {
                    const files = Array.from(e.target.files);
                    setCurrentHandsPhotos([...currentHandsPhotos, ...files]);
                  }}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Reference Images */}
              <div>
                <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', color: '#555' }}>
                  Фото-референси (необов'язково):
                </label>
                <div style={{
                  border: '2px dashed #e0e0e0',
                  borderRadius: 12,
                  padding: 20,
                  textAlign: 'center',
                  transition: 'border-color 0.3s ease',
                  cursor: 'pointer',
                  marginBottom: 10
                }}
                onClick={() => document.getElementById('reference-input').click()}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>💅</div>
                  <div style={{ color: '#666' }}>
                    {reference.length > 0
                      ? `Вибрано ${reference.length} фото`
                      : 'Натисніть щоб додати фото манікюру'
                    }
                  </div>
                </div>
                {reference.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                    {reference.map((ref, index) => (
                      <div key={index} style={{
                        position: 'relative',
                        display: 'inline-block'
                      }}>
                        <img
                          src={URL.createObjectURL(ref)}
                          alt={`Reference ${index + 1}`}
                          style={{
                            width: 80,
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: '2px solid #e0e0e0'
                          }}
                        />
                        <button
                          onClick={() => {
                            setReference(reference.filter((_, i) => i !== index));
                          }}
                          style={{
                            position: 'absolute',
                            top: -5,
                            right: -5,
                            background: '#ff4757',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: 20,
                            height: 20,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  id="reference-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => {
                    const files = Array.from(e.target.files);
                    setReference([...reference, ...files]);
                  }}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Manual inputs for non-Telegram users */}
              {!tgUser?.id && (
                <div style={{ background: '#fff3cd', borderRadius: 12, padding: 15, marginTop: 20 }}>
                  <h4 style={{ marginBottom: 10, color: '#856404' }}>Інформація для підтвердження</h4>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Ваше ім'я:</label>
                    <input
                      type="text"
                      placeholder="Ім'я"
                      value={manualName}
                      onChange={e => setManualName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 8,
                        border: '1px solid #ccc'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Telegram ID:</label>
                    <input
                      type="text"
                      placeholder="Наприклад: 7058392354"
                      value={manualTgId}
                      onChange={e => setManualTgId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 8,
                        border: '1px solid #ccc'
                      }}
                    />
                    <small style={{ color: '#856404', fontSize: 12, marginTop: 5, display: 'block' }}>
                      Якщо ви не в Telegram, введіть свій Telegram ID або відкрийте цей вебзастосунок через Telegram Web App.
                    </small>
                  </div>
                </div>
              )}

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 30 }}>
              <button
                onClick={prevStep}
                style={{
                  padding: '12px 24px',
                  borderRadius: 25,
                  border: 'none',
                  background: '#f0f0f0',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                ← Назад
              </button>

              <button
                onClick={nextStep}
                style={{
                  padding: '12px 24px',
                  borderRadius: 25,
                  border: 'none',
                  background: 'linear-gradient(45deg, #FF6B9D, #C44569)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
              >
                Далі →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {bookingStep === 4 && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 20,
            padding: 30,
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 30 }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>✅</div>
              <h2 style={{ color: '#333', marginBottom: 10 }}>Підтвердження запису</h2>
              <p style={{ color: '#666' }}>Перевірте ваші дані перед підтвердженням</p>
            </div>

            {/* Summary Card */}
            <div style={{
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
              borderRadius: 15,
              padding: 25,
              marginBottom: 30,
              border: '1px solid #e0e0e0'
            }}>
              <h3 style={{ marginBottom: 20, color: '#333', textAlign: 'center' }}>📋 Деталі вашого запису</h3>

              <div style={{ display: 'grid', gap: 15 }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#555' }}>Послуга:</span>
                  <span style={{ color: '#333' }}>{serviceSub.split(' (')[0]}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#555' }}>Дата та час:</span>
                  <span style={{ color: '#333' }}>{selectedSlot?.date} о {selectedSlot?.time}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#555' }}>Дизайн:</span>
                  <span style={{ color: '#333' }}>{design}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#555' }}>Довжина:</span>
                  <span style={{ color: '#333' }}>{length}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#555' }}>Тип покриття:</span>
                  <span style={{ color: '#333' }}>{type}</span>
                </div>

                {comment && (
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#555' }}>Побажання:</span>
                    <div style={{ marginTop: 5, color: '#333', fontStyle: 'italic' }}>{comment}</div>
                  </div>
                )}

                {reference && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#555' }}>Референс:</span>
                    <span style={{ color: '#333' }}>📸 {reference.name}</span>
                  </div>
                )}

                <div style={{
                  borderTop: '2px solid #e0e0e0',
                  paddingTop: 15,
                  marginTop: 15,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 'bold', fontSize: 18, color: '#333' }}>Загальна ціна:</span>
                  <span style={{ fontWeight: 'bold', fontSize: 20, color: '#FF6B9D' }}>{price} zł</span>
                </div>

                {isFirstTime && (
                  <div style={{
                    background: '#d4edda',
                    border: '1px solid #c3e6cb',
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 10,
                    textAlign: 'center'
                  }}>
                    <span style={{ color: '#155724', fontWeight: 'bold' }}>
                      🎉 Застосовано знижку за перший манікюр 20%
                    </span>
                  </div>
                )}

                {enteredReferralCode && (
                  <div style={{
                    background: '#d1ecf1',
                    border: '1px solid #bee5eb',
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 10,
                    textAlign: 'center'
                  }}>
                    <span style={{ color: '#0c5460', fontWeight: 'bold' }}>
                      🎁 Використано реферальний код: {enteredReferralCode}
                    </span>
                  </div>
                )}

              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={prevStep}
                style={{
                  padding: '12px 24px',
                  borderRadius: 25,
                  border: 'none',
                  background: '#f0f0f0',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                ← Назад
              </button>

              <button
                onClick={() => {
                  if (!selectedSlotId) return alert("❗ Обери дату і час");

                  const formData = new FormData();
                  const clientName = tgUser?.first_name || manualName || "Anon";
                  const effectiveTgId = tgUser?.id || manualTgId || '';

                  if (!effectiveTgId) return alert('❗ Вкажіть ваш Telegram ID або відкрийте додаток через Telegram Web App');

                  formData.append("client", clientName);
                  formData.append("slot_id", selectedSlotId);
                  formData.append("design", design);
                  formData.append("length", length);
                  formData.append("type", type);
                  formData.append("service", serviceSub.split(' (')[0]);
                  formData.append("price", price);
                  formData.append("comment", comment);
                  formData.append("tg_id", effectiveTgId);
                  formData.append("username", tgUser?.username || '');
                  if (enteredReferralCode.trim()) {
                    formData.append("referral_code", enteredReferralCode.trim());
                  }

                  // Add current hands photos
                  currentHandsPhotos.forEach((photo, index) => {
                    formData.append(`current_hands_${index}`, photo);
                  });

                  // Add reference photos
                  reference.forEach((ref, index) => {
                    formData.append(`reference_${index}`, ref);
                  });

                  fetch(`${API}/api/appointment`, {
                    method: "POST",
                    body: formData
                  })
                    .then(r => {
                      if (!r.ok) {
                        throw new Error(`HTTP error! status: ${r.status}`);
                      }
                      return r.json();
                    })
                    .then(data => {
                      let message = "✅ Запис створено успішно!";
                      if (data.discount > 0) {
                        message += `\n💸 Застосовано знижку: ${data.discount} zł`;
                      }
                      if (data.final_price) {
                        message += `\n💰 Остаточна ціна: ${data.final_price} zł`;
                      }
                      alert(message);
                      resetBooking();
                      setMode("menu");
                    })
                    .catch((error) => {
                      console.error("Booking error:", error);
                      alert("❌ Помилка при створенні запису. Спробуйте ще раз.");
                    });
                }}
                style={{
                  padding: '15px 30px',
                  borderRadius: 25,
                  border: 'none',
                  background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 18,
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)'
                }}
              >
                ✅ Підтвердити запис
              </button>
            </div>
          </div>
        )}

      </div>

      {/* SLOT MODAL */}
      {isSlotModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: 'blur(5px)'
          }}
          onClick={() => setIsSlotModalOpen(false)}
        >
          <div
            style={{
              background: "white",
              padding: 30,
              borderRadius: 20,
              maxWidth: 500,
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 10, color: '#333' }}>
                📅 Оберіть дату і час
              </h2>
              <p style={{ color: '#666' }}>Доступні слоти для запису</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 25 }}>
              {grouped.map((group) => {
                const dateObj = new Date(group.date);
                const isToday = getSlotLabel(group.date) === 'today';
                const isTomorrow = getSlotLabel(group.date) === 'tomorrow';

                return (
                  <div key={group.date} style={{
                    border: `2px solid ${isToday ? '#4CAF50' : isTomorrow ? '#2196F3' : '#e0e0e0'}`,
                    borderRadius: 15,
                    padding: 20,
                    background: isToday ? 'rgba(76, 175, 80, 0.05)' : isTomorrow ? 'rgba(33, 150, 243, 0.05)' : 'white'
                  }}>
                    <div style={{ textAlign: "center", marginBottom: 15 }}>
                      <div style={{ fontSize: 20, fontWeight: "bold", color: '#333' }}>
                        {dateObj.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
                      </div>
                      <div style={{
                        fontSize: 14,
                        color: isToday ? '#4CAF50' : isTomorrow ? '#2196F3' : '#666',
                        fontWeight: 'bold'
                      }}>
                        {isToday ? '• Сьогодні' : isTomorrow ? '• Завтра' : dateObj.toLocaleDateString('uk-UA', { weekday: 'long' })}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: 'center' }}>
                      {group.slots.map((slot) => (
                        <button
                          key={slot.id}
                          style={{
                            padding: "12px 16px",
                            borderRadius: 12,
                            background: "#f8f9fa",
                            border: "2px solid #e9ecef",
                            cursor: "pointer",
                            fontSize: 16,
                            fontWeight: 'bold',
                            color: '#495057',
                            transition: 'all 0.3s ease',
                            minWidth: 70
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#FF6B9D';
                            e.target.style.color = 'white';
                            e.target.style.borderColor = '#FF6B9D';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#f8f9fa';
                            e.target.style.color = '#495057';
                            e.target.style.borderColor = '#e9ecef';
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

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                onClick={() => setIsSlotModalOpen(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 25,
                  border: 'none',
                  background: '#6c757d',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}

      {modal}
    </div>
    
  );
}

export default App;