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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('list');
  const [selectedDate, setSelectedDate] = useState(null);
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
      {/* Modern Header */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '30px 20px',
        marginBottom: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(168, 237, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'pulse 3s ease-in-out infinite'
        }}></div>
        <h2 style={{
          fontSize: '2.5rem',
          margin: '0 0 10px 0',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 1,
          position: 'relative'
        }}>
          📖 Мої записи
        </h2>
        <p style={{
          fontSize: '1.1rem',
          margin: '0',
          opacity: 0.9,
          fontWeight: '300',
          zIndex: 1,
          position: 'relative'
        }}>
          Історія ваших візитів
        </p>
      </div>

      {/* Appointments List */}
      {myHistory.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: '20px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
          margin: '0 10px 30px 10px'
        }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: '20px',
            opacity: 0.6
          }}>💭</div>
          <h3 style={{
            margin: '0 0 10px 0',
            color: '#666',
            fontSize: '1.3rem',
            fontWeight: '600'
          }}>У вас поки немає записів</h3>
          <p style={{
            margin: '0',
            color: '#888',
            fontSize: '1rem'
          }}>Час записатися на перший манікюр! 💅</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '20px',
          padding: '0 10px'
        }}>
          {myHistory.map(h => {
            const label = getSlotLabel(h.date);
            return (
              <div
                key={h.id}
                className="menu-card"
                style={{
                  background:
                    label === "today"
                      ? "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)"
                      : label === "tomorrow"
                      ? "linear-gradient(135deg, #2196F3 0%, #1976D2 100%)"
                      : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
                  borderRadius: '16px',
                  padding: '25px',
                  boxShadow:
                    label === "today"
                      ? "0 8px 25px rgba(76, 175, 80, 0.3)"
                      : label === "tomorrow"
                      ? "0 8px 25px rgba(33, 150, 243, 0.3)"
                      : "0 8px 25px rgba(0,0,0,0.1)",
                  border: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  color: (label === "today" || label === "tomorrow") ? 'white' : '#333'
                }}
              >
                {/* Status indicator */}
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'rgba(255,255,255,0.2)',
                  color: (label === "today" || label === "tomorrow") ? 'white' : '#666',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {h.status}
                </div>

                {/* Date and time */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '15px',
                  fontSize: '1.2rem',
                  fontWeight: '600'
                }}>
                  <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>📅</span>
                  <div>
                    <div>{h.date} — {h.time}</div>
                    {label === "today" && (
                      <div style={{
                        color: (label === "today" || label === "tomorrow") ? 'rgba(255,255,255,0.9)' : '#4CAF50',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        marginTop: '2px'
                      }}>
                        • Сьогодні
                      </div>
                    )}
                    {label === "tomorrow" && (
                      <div style={{
                        color: (label === "today" || label === "tomorrow") ? 'rgba(255,255,255,0.9)' : '#2196F3',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        marginTop: '2px'
                      }}>
                        • Завтра
                      </div>
                    )}
                  </div>
                </div>

                {/* Service details */}
                <div style={{
                  background: (label === "today" || label === "tomorrow")
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.05)',
                  borderRadius: '12px',
                  padding: '15px',
                  marginBottom: '15px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '8px',
                    fontSize: '1rem'
                  }}>
                    <span style={{ marginRight: '8px' }}>🎨</span>
                    <span>{h.design}, {h.length}, {h.type}</span>
                  </div>
                  {h.comment && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      fontSize: '0.9rem',
                      opacity: 0.8
                    }}>
                      <span style={{ marginRight: '8px', marginTop: '2px' }}>💬</span>
                      <span>{h.comment}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Back Button */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button
          className="primary-btn"
          onClick={() => setMode("menu")}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '15px 30px',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
          }}
        >
          ← Назад до меню
        </button>
      </div>

      {modal}
    </div>
  );
}

if (mode === "priceList") {
  return (
    <div className="app-container">
      {/* Modern Header */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '30px 20px',
        marginBottom: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(240, 147, 251, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'pulse 3s ease-in-out infinite'
        }}></div>
        <h2 style={{
          fontSize: '2.2rem',
          margin: '0 0 10px 0',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 1,
          position: 'relative'
        }}>
          💅 ПРАЙС НА ПОСЛУГИ
        </h2>
        <p style={{
          fontSize: '1rem',
          margin: '0',
          opacity: 0.9,
          fontWeight: '300',
          zIndex: 1,
          position: 'relative'
        }}>
          Професійний догляд за вашими нігтями
        </p>
      </div>

      {/* Services Grid */}
      <div style={{
        display: 'grid',
        gap: '25px',
        padding: '0 10px'
      }}>
        {/* ПОКРИТТЯ */}
        <div
          className="menu-card"
          style={{
            background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            borderRadius: '16px',
            padding: '25px',
            boxShadow: '0 8px 25px rgba(255, 154, 158, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '15px',
            left: '15px',
            background: 'rgba(255,255,255,0.9)',
            color: '#ff6b6b',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: '600',
            textTransform: 'uppercase'
          }}>
            💅 Покриття
          </div>

          <div style={{ paddingTop: '20px' }}>
            {/* Service 1 */}
            <div
              style={{
                background: 'rgba(255,255,255,0.9)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '15px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onClick={() => selectServiceFromPriceList({
                type: "Гель-лак",
                length: "Середні",
                design: "Класичний френч",
                category: "Покриття",
                serviceName: "Покриття «гель-лак» (100 zł)",
                price: 100
              })}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                e.target.querySelector('.price-tag').style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
                e.target.querySelector('.price-tag').style.transform = 'scale(1)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: '0', color: '#2c3e50', fontSize: '1.1rem', fontWeight: '600' }}>
                  Покриття «гель-лак»
                </h4>
                <div className="price-tag" style={{
                  background: '#ff6b6b',
                  color: 'white',
                  padding: '5px 12px',
                  borderRadius: '15px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}>
                  100 zł
                </div>
              </div>
              <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <strong style={{ color: '#2c3e50' }}>У вартість входить:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#666', fontSize: '0.9rem' }}>
                  <li>Гігієнічний манікюр</li>
                  <li>База</li>
                  <li>Колір (однотонне покриття)</li>
                  <li>Топ</li>
                </ul>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#e74c3c', fontStyle: 'italic', margin: '0' }}>
                ⭐ Підходить тим, хто хоче акуратні та міцні нігті на 3–4 тижні.
              </p>
            </div>

            {/* Service 2 */}
            <div
              style={{
                background: 'rgba(255,255,255,0.9)',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onClick={() => selectServiceFromPriceList({
                type: "Гель-лак",
                length: "Середні",
                design: "Класичний френч",
                category: "Покриття",
                serviceName: "Покриття з укріпленням (120 zł)",
                price: 120
              })}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                e.target.querySelector('.price-tag').style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
                e.target.querySelector('.price-tag').style.transform = 'scale(1)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: '0', color: '#2c3e50', fontSize: '1.1rem', fontWeight: '600' }}>
                  Покриття з укріпленням
                </h4>
                <div className="price-tag" style={{
                  background: '#ff6b6b',
                  color: 'white',
                  padding: '5px 12px',
                  borderRadius: '15px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}>
                  120 zł
                </div>
              </div>
              <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <strong style={{ color: '#2c3e50' }}>У вартість входить:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#666', fontSize: '0.9rem' }}>
                  <li>Гігієнічний манікюр</li>
                  <li>База</li>
                  <li>Гель для зміцнення нігтів</li>
                  <li>Колір</li>
                  <li>Топ</li>
                </ul>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#e74c3c', fontStyle: 'italic', margin: '0' }}>
                ⭐ Рекомендую для слабких, ламких або м'яких нігтів.
              </p>
            </div>
          </div>
        </div>

        {/* НАРОЩЕННЯ НІГТІВ */}
        <div
          className="menu-card"
          style={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            borderRadius: '16px',
            padding: '25px',
            boxShadow: '0 8px 25px rgba(79, 172, 254, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '15px',
            left: '15px',
            background: 'rgba(255,255,255,0.9)',
            color: '#3498db',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: '600',
            textTransform: 'uppercase'
          }}>
            ✨ Нарощення
          </div>

          <div style={{ paddingTop: '20px' }}>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '20px', color: 'white' }}>
              (Включає форму, довжину, моделювання матеріалом, опил, базове вирівнювання)
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              {/* S Size */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => selectServiceFromPriceList({
                  type: "Акрил",
                  length: "Короткі",
                  design: "Класичний френч",
                  category: "Нарощення",
                  serviceName: "Нарощення нігтів S (130 zł)",
                  price: 130
                })}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                  e.target.querySelector('.size-indicator').style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                  e.target.querySelector('.size-indicator').style.transform = 'scale(1)';
                }}
              >
                <div className="size-indicator" style={{
                  fontSize: '2rem',
                  marginBottom: '10px',
                  transition: 'all 0.3s ease'
                }}>S</div>
                <div style={{
                  background: '#3498db',
                  color: 'white',
                  padding: '5px 12px',
                  borderRadius: '15px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  display: 'inline-block',
                  marginBottom: '10px'
                }}>
                  130 zł
                </div>
                <p style={{ fontSize: '0.85rem', color: '#666', margin: '0', lineHeight: '1.4' }}>
                  Коротка довжина, класична та найзручніша.
                </p>
              </div>

              {/* M Size */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => selectServiceFromPriceList({
                  type: "Акрил",
                  length: "Середні",
                  design: "Класичний френч",
                  category: "Нарощення",
                  serviceName: "Нарощення нігтів M (150 zł)",
                  price: 150
                })}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                  e.target.querySelector('.size-indicator').style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                  e.target.querySelector('.size-indicator').style.transform = 'scale(1)';
                }}
              >
                <div className="size-indicator" style={{
                  fontSize: '2rem',
                  marginBottom: '10px',
                  transition: 'all 0.3s ease'
                }}>M</div>
                <div style={{
                  background: '#3498db',
                  color: 'white',
                  padding: '5px 12px',
                  borderRadius: '15px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  display: 'inline-block',
                  marginBottom: '10px'
                }}>
                  150 zł
                </div>
                <p style={{ fontSize: '0.85rem', color: '#666', margin: '0', lineHeight: '1.4' }}>
                  Середня довжина — оптимальний варіант для дизайнів.
                </p>
              </div>

              {/* L Size */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => selectServiceFromPriceList({
                  type: "Акрил",
                  length: "Довгі",
                  design: "Класичний френч",
                  category: "Нарощення",
                  serviceName: "Нарощення нігтів L (170 zł)",
                  price: 170
                })}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                  e.target.querySelector('.size-indicator').style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                  e.target.querySelector('.size-indicator').style.transform = 'scale(1)';
                }}
              >
                <div className="size-indicator" style={{
                  fontSize: '2rem',
                  marginBottom: '10px',
                  transition: 'all 0.3s ease'
                }}>L</div>
                <div style={{
                  background: '#3498db',
                  color: 'white',
                  padding: '5px 12px',
                  borderRadius: '15px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  display: 'inline-block',
                  marginBottom: '10px'
                }}>
                  170 zł
                </div>
                <p style={{ fontSize: '0.85rem', color: '#666', margin: '0', lineHeight: '1.4' }}>
                  Довгі нігті — для виразних форм і складних дизайнів.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ДОДАТКОВІ ПОСЛУГИ */}
        <div
          className="menu-card"
          style={{
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            borderRadius: '16px',
            padding: '25px',
            boxShadow: '0 8px 25px rgba(67, 233, 123, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '15px',
            left: '15px',
            background: 'rgba(255,255,255,0.9)',
            color: '#27ae60',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: '600',
            textTransform: 'uppercase'
          }}>
            🎨 Додаткові послуги
          </div>

          <div style={{ paddingTop: '20px' }}>
            <h4 style={{ color: 'white', marginBottom: '15px', fontSize: '1.1rem' }}>Дизайн</h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              {/* 1-5 nails */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: '12px',
                  padding: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => selectServiceFromPriceList({
                  type: "Гель-лак",
                  length: "Середні",
                  design: "Мінімалізм",
                  category: "Дизайн",
                  serviceName: "Дизайн 1–5 нігтів (20 zł)",
                  price: 20
                })}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#2c3e50' }}>1–5 нігтів</span>
                  <div style={{
                    background: '#27ae60',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    20 zł
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#666', margin: '0', lineHeight: '1.4' }}>
                  (Малюнки, стемпінг, наклейки, френч, втирки тощо)
                </p>
              </div>

              {/* All nails */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: '12px',
                  padding: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => selectServiceFromPriceList({
                  type: "Гель-лак",
                  length: "Середні",
                  design: "Гліттер",
                  category: "Дизайн",
                  serviceName: "Дизайн на всі нігті (35 zł)",
                  price: 35
                })}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#2c3e50' }}>Дизайн на всі нігті</span>
                  <div style={{
                    background: '#27ae60',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    35 zł
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#666', margin: '0', lineHeight: '1.4' }}>
                  Повністю оформлені руки у будь-якому стилі.
                </p>
              </div>
            </div>

            {/* Figurki */}
            <div style={{
              background: 'rgba(255,255,255,0.9)',
              borderRadius: '12px',
              padding: '15px',
              marginBottom: '15px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: '#2c3e50' }}>Фігурки</span>
                <div style={{
                  background: '#27ae60',
                  color: 'white',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  3 zł / шт
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#666', margin: '5px 0 0 0', lineHeight: '1.4' }}>
                Об'ємні декори, камінці, 3D-елементи.
              </p>
            </div>

            {/* Removal */}
            <div style={{
              background: 'rgba(255,255,255,0.9)',
              borderRadius: '12px',
              padding: '15px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: '#2c3e50' }}>Зняття + гігієнічний манікюр</span>
                <div style={{
                  background: '#e67e22',
                  color: 'white',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  40 zł
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#666', margin: '5px 0 0 0', lineHeight: '1.4' }}>
                Повне акуратне зняття старого покриття + чистка нігтів і кутикули.
              </p>
            </div>
          </div>
        </div>

        {/* ІНШІ ПОСЛУГИ */}
        <div
          className="menu-card"
          style={{
            background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            borderRadius: '16px',
            padding: '25px',
            boxShadow: '0 8px 25px rgba(255, 236, 210, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '15px',
            left: '15px',
            background: 'rgba(255,255,255,0.9)',
            color: '#e67e22',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: '600',
            textTransform: 'uppercase'
          }}>
            💼 Інші послуги
          </div>

          <div style={{ paddingTop: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              {/* Men's manicure */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: '12px',
                  padding: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => selectServiceFromPriceList({
                  type: "Гель-лак",
                  length: "Середні",
                  design: "Класичний френч",
                  category: "Чоловічий манікюр",
                  serviceName: "Чоловічий манікюр (50 zł)",
                  price: 50
                })}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#2c3e50' }}>Чоловічий манікюр</span>
                  <div style={{
                    background: '#e67e22',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    50 zł
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#666', margin: '0', lineHeight: '1.4' }}>
                  Обрізний чи комбінований, з вирівнюванням і наданням форми.
                </p>
              </div>

              {/* Transparent matte */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: '12px',
                  padding: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => selectServiceFromPriceList({
                  type: "Гель-лак",
                  length: "Середні",
                  design: "Класичний френч",
                  category: "Покриття",
                  serviceName: "Прозоре матове покриття (30 zł)",
                  price: 30
                })}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#2c3e50' }}>Прозоре матове покриття</span>
                  <div style={{
                    background: '#e67e22',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    30 zł
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#666', margin: '0', lineHeight: '1.4' }}>
                  Ідеально для природного, «чистого» ефекту нігтів.
                </p>
              </div>
            </div>

            {/* Note */}
            <div style={{
              background: 'rgba(255,255,255,0.9)',
              borderRadius: '12px',
              padding: '15px',
              marginTop: '15px',
              border: '1px solid #ddd'
            }}>
              <p style={{ fontSize: '0.85rem', margin: '0', fontStyle: 'italic', color: '#666' }}>
                💅 <strong>Покриття «гель-лак» / дизайн за стандартним прайсом</strong>
              </p>
              <p style={{ fontSize: '0.8rem', margin: '8px 0 0 0', color: '#888' }}>
                Тобто дизайн та декор розраховується відповідно до вказаних вище цін.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button
          className="primary-btn"
          onClick={() => setMode("menu")}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '15px 30px',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
          }}
        >
          ← Назад до меню
        </button>
      </div>

      {modal}
    </div>
  );
}

if (mode === "clientPromotions") {
  return (
    <div className="app-container">
      {/* Modern Header */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '30px 20px',
        marginBottom: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(255, 154, 158, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'pulse 3s ease-in-out infinite'
        }}></div>
        <h2 style={{
          fontSize: '2.5rem',
          margin: '0 0 10px 0',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 1,
          position: 'relative'
        }}>
          🎉 Акції
        </h2>
        <p style={{
          fontSize: '1.1rem',
          margin: '0',
          opacity: 0.9,
          fontWeight: '300',
          zIndex: 1,
          position: 'relative'
        }}>
          Спеціальні пропозиції та знижки
        </p>
      </div>

      {/* Promotions Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        padding: '0 10px'
      }}>
        {/* First-time discount */}
        <div
          className="menu-card"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '25px',
            textAlign: 'center',
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{
            fontSize: '4rem',
            marginBottom: '15px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>🎁</div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '1.4rem',
            fontWeight: '600',
            color: 'white'
          }}>Перший запис</h3>
          <div style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            margin: '15px 0',
            color: 'white',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>20% OFF</div>
          <p style={{
            margin: '0',
            fontSize: '0.9rem',
            opacity: '0.9',
            color: 'white'
          }}>Знижка на перше відвідування</p>
        </div>

        {/* Referral system */}
        <div
          className="menu-card"
          style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            borderRadius: '16px',
            padding: '25px',
            textAlign: 'center',
            boxShadow: '0 8px 25px rgba(240, 147, 251, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{
            fontSize: '4rem',
            marginBottom: '15px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>💖</div>
          <h3 style={{
            margin: '0 0 15px 0',
            fontSize: '1.4rem',
            fontWeight: '600',
            color: 'white'
          }}>Приведи подругу</h3>
          <p style={{
            margin: '0 0 20px 0',
            fontSize: '0.9rem',
            opacity: '0.9',
            color: 'white',
            lineHeight: '1.4'
          }}>
            Запроси подругу та отримай 20% знижку на наступний манікюр!
          </p>

          {/* Referral Code Section */}
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '15px'
          }}>
            <h4 style={{
              color: 'white',
              margin: '0 0 15px 0',
              fontSize: '1.1rem',
              fontWeight: '600'
            }}>🎫 Твій реферальний код</h4>
            {!referralCode ? (
              <button
                className="primary-btn"
                onClick={() => {
                  fetch(`${API}/api/referral/code?tg_id=${tgUser?.id}`)
                    .then(r => r.json())
                    .then(data => setReferralCode(data))
                    .catch(() => alert("Помилка завантаження коду"));
                }}
                style={{
                  background: 'white',
                  color: '#f5576c',
                  border: 'none',
                  fontWeight: '600'
                }}
              >
                Отримати код
              </button>
            ) : (
              <div>
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  background: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  margin: '8px 0',
                  fontFamily: 'monospace',
                  color: '#333'
                }}>
                  {referralCode.code}
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  opacity: 0.9,
                  marginBottom: '12px',
                  color: 'white'
                }}>
                  Використано: {referralCode.used_count} разів
                </div>
                <button
                  className="primary-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(referralCode.code);
                    alert("Код скопійовано!");
                  }}
                  style={{
                    background: 'white',
                    color: '#f5576c',
                    border: 'none',
                    fontWeight: '600'
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
          <div
            className="menu-card"
            style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: '16px',
              padding: '25px',
              boxShadow: '0 8px 25px rgba(79, 172, 254, 0.3)',
              border: 'none',
              position: 'relative',
              overflow: 'hidden',
              gridColumn: '1 / -1'
            }}
          >
            <div style={{
              fontSize: '3rem',
              marginBottom: '15px',
              textAlign: 'center',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }}>🔥</div>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '1.4rem',
              fontWeight: '600',
              color: 'white',
              textAlign: 'center'
            }}>Поточні акції</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {promotions.map(promo => (
                <div key={promo.id} style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '15px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.3)'
                }}>
                  <h4 style={{
                    margin: '0 0 8px 0',
                    color: 'white',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>{promo.name}</h4>
                  <p style={{
                    margin: '0 0 10px 0',
                    color: 'white',
                    opacity: '0.9',
                    fontSize: '0.9rem'
                  }}>{promo.description}</p>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    color: 'white',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                  }}>
                    Знижка: {promo.discount_value}{promo.discount_type === 'percentage' ? '%' : ' zł'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bonuses section */}
        <div
          className="menu-card"
          style={{
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            borderRadius: '16px',
            padding: '25px',
            boxShadow: '0 8px 25px rgba(67, 233, 123, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden',
            gridColumn: '1 / -1'
          }}
        >
          <div style={{
            fontSize: '3rem',
            marginBottom: '15px',
            textAlign: 'center',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>🎁</div>
          <h3 style={{
            margin: '0 0 15px 0',
            fontSize: '1.4rem',
            fontWeight: '600',
            color: '#2c3e50',
            textAlign: 'center'
          }}>Бонусна система</h3>

          <div style={{
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h4 style={{
              margin: '0 0 10px 0',
              color: '#2c3e50',
              fontSize: '1.1rem'
            }}>Ваші бали: <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#27ae60' }}>{bonusPoints}</span></h4>
            <p style={{
              margin: '0',
              fontSize: '0.9rem',
              color: '#666',
              fontStyle: 'italic'
            }}>1 запис = 1 бал</p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.9)',
              padding: '15px',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🔸</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
                10 балів
              </div>
              <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '12px', lineHeight: '1.3' }}>
                Безкоштовний дизайн
              </div>
              <button
                className="primary-btn"
                disabled={bonusPoints < 10}
                onClick={() => spendPoints(10)}
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  backgroundColor: bonusPoints < 10 ? '#ccc' : '#27ae60',
                  backgroundImage: bonusPoints < 10 ? 'none' : 'linear-gradient(135deg, #27ae60, #2ecc71)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: bonusPoints < 10 ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                Використати
              </button>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.9)',
              padding: '15px',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🔸</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
                20 балів
              </div>
              <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '12px', lineHeight: '1.3' }}>
                Знижка 30%
              </div>
              <button
                className="primary-btn"
                disabled={bonusPoints < 20}
                onClick={() => spendPoints(20)}
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  backgroundColor: bonusPoints < 20 ? '#ccc' : '#27ae60',
                  backgroundImage: bonusPoints < 20 ? 'none' : 'linear-gradient(135deg, #27ae60, #2ecc71)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: bonusPoints < 20 ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                Використати
              </button>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.9)',
              padding: '15px',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🔸</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
                30 балів
              </div>
              <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '12px', lineHeight: '1.3' }}>
                Повний манікюр 0 zł
              </div>
              <button
                className="primary-btn"
                disabled={bonusPoints < 30}
                onClick={() => spendPoints(30)}
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  backgroundColor: bonusPoints < 30 ? '#ccc' : '#27ae60',
                  backgroundImage: bonusPoints < 30 ? 'none' : 'linear-gradient(135deg, #27ae60, #2ecc71)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: bonusPoints < 30 ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                Використати
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button
          className="primary-btn"
          onClick={() => setMode("menu")}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '15px 30px',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
          }}
        >
          ← Назад до меню
        </button>
      </div>

      {modal}
    </div>
  );
}


if (mode === "menu") {
  return (
    <div className="app-container">
      {/* Modern Header */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '30px 20px',
        marginBottom: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'pulse 3s ease-in-out infinite'
        }}></div>
        <h2 style={{
          fontSize: '2.5rem',
          margin: '0 0 10px 0',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 1,
          position: 'relative'
        }}>
          💅 nailbysp
        </h2>
        <p style={{
          fontSize: '1.1rem',
          margin: '0',
          opacity: 0.9,
          fontWeight: '300',
          zIndex: 1,
          position: 'relative'
        }}>
          Привіт, {tgUser?.first_name} 💖
        </p>
      </div>

      {/* Modern Menu Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        padding: '0 10px'
      }}>
        {/* Booking Card */}
        <div
          className="menu-card"
          onClick={() => setMode("client")}
          style={{
            background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            borderRadius: '16px',
            padding: '25px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 25px rgba(255, 154, 158, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.boxShadow = '0 15px 35px rgba(255, 154, 158, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(255, 154, 158, 0.3)';
          }}
        >
          <div style={{
            fontSize: '3rem',
            marginBottom: '15px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>📅</div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '1.3rem',
            fontWeight: '600',
            color: 'white'
          }}>Записатися на манікюр</h3>
          <p style={{
            margin: '0',
            fontSize: '0.9rem',
            opacity: '0.9',
            color: 'white'
          }}>Оберіть час та послугу</p>
        </div>

        {/* My Appointments Card */}
        <div
          className="menu-card"
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
          style={{
            background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            borderRadius: '16px',
            padding: '25px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 25px rgba(168, 237, 234, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.boxShadow = '0 15px 35px rgba(168, 237, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(168, 237, 234, 0.3)';
          }}
        >
          <div style={{
            fontSize: '3rem',
            marginBottom: '15px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>📖</div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '1.3rem',
            fontWeight: '600',
            color: '#2c3e50'
          }}>Мої записи</h3>
          <p style={{
            margin: '0',
            fontSize: '0.9rem',
            opacity: '0.8',
            color: '#2c3e50'
          }}>Переглянути мої візити</p>
        </div>

        {/* Admin Panel Card - Only for admins */}
        {isAdmin && (
          <div
            className="menu-card"
            onClick={() => setMode("adminMenu")}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              padding: '25px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
              border: 'none',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-5px)';
              e.target.style.boxShadow = '0 15px 35px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
            }}
          >
            <div style={{
              fontSize: '3rem',
              marginBottom: '15px',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }}>🔒</div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '1.3rem',
              fontWeight: '600',
              color: 'white'
            }}>Адмінка</h3>
            <p style={{
              margin: '0',
              fontSize: '0.9rem',
              opacity: '0.9',
              color: 'white'
            }}>Панель управління</p>
          </div>
        )}

        {/* Price List Card */}
        <div
          className="menu-card"
          onClick={() => {
            fetch(`${API}/api/prices`)
              .then(r => r.json())
              .then(data => {
                setDynamicPrices(data);
                setMode("priceList");
              });
          }}
          style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            borderRadius: '16px',
            padding: '25px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 25px rgba(240, 147, 251, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.boxShadow = '0 15px 35px rgba(240, 147, 251, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(240, 147, 251, 0.3)';
          }}
        >
          <div style={{
            fontSize: '3rem',
            marginBottom: '15px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>💰</div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '1.3rem',
            fontWeight: '600',
            color: 'white'
          }}>Прайс</h3>
          <p style={{
            margin: '0',
            fontSize: '0.9rem',
            opacity: '0.9',
            color: 'white'
          }}>Ціни на послуги</p>
        </div>

        {/* Promotions Card */}
        <div
          className="menu-card"
          onClick={() => {
            fetch(`${API}/api/promotions`)
              .then(r => r.json())
              .then(data => {
                setPromotions(data);
                setMode("clientPromotions");
              });
          }}
          style={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            borderRadius: '16px',
            padding: '25px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 25px rgba(79, 172, 254, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.boxShadow = '0 15px 35px rgba(79, 172, 254, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(79, 172, 254, 0.3)';
          }}
        >
          <div style={{
            fontSize: '3rem',
            marginBottom: '15px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>🎉</div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '1.3rem',
            fontWeight: '600',
            color: 'white'
          }}>Акції</h3>
          <p style={{
            margin: '0',
            fontSize: '0.9rem',
            opacity: '0.9',
            color: 'white'
          }}>Спеціальні пропозиції</p>
        </div>

        {/* Contact Master Card */}
        <div
          className="menu-card"
          onClick={() => WebApp.openTelegramLink("https://t.me/vlad0uk")}
          style={{
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            borderRadius: '16px',
            padding: '25px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 25px rgba(67, 233, 123, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.boxShadow = '0 15px 35px rgba(67, 233, 123, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(67, 233, 123, 0.3)';
          }}
        >
          <div style={{
            fontSize: '3rem',
            marginBottom: '15px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>💬</div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '1.3rem',
            fontWeight: '600',
            color: '#2c3e50'
          }}>Звʼязатись з майстром</h3>
          <p style={{
            margin: '0',
            fontSize: '0.9rem',
            opacity: '0.8',
            color: '#2c3e50'
          }}>Написати в Telegram</p>
        </div>
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
      {/* Modern Header */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '30px 20px',
        marginBottom: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'pulse 3s ease-in-out infinite'
        }}></div>
        <h2 style={{
          fontSize: '2.5rem',
          margin: '0 0 10px 0',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 1,
          position: 'relative'
        }}>
          🔧 Адмін-панель
        </h2>
        <p style={{
          fontSize: '1.1rem',
          margin: '0',
          opacity: 0.9,
          fontWeight: '300',
          zIndex: 1,
          position: 'relative'
        }}>
          Керування салоном краси
        </p>
      </div>

      {/* Admin Menu Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        padding: '0 10px'
      }}>
        {/* All Appointments Card */}
        <div
          className="menu-card"
          onClick={() => {
            loadAppointments();
            setMode("admin");
          }}
          style={{
            background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            borderRadius: '16px',
            padding: '25px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 25px rgba(255, 154, 158, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.boxShadow = '0 15px 35px rgba(255, 154, 158, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(255, 154, 158, 0.3)';
          }}
        >
          <div style={{
            fontSize: '3rem',
            marginBottom: '15px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>📋</div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '1.3rem',
            fontWeight: '600',
            color: 'white'
          }}>Усі записи</h3>
          <p style={{
            margin: '0',
            fontSize: '0.9rem',
            opacity: '0.9',
            color: 'white'
          }}>Перегляд та управління</p>
        </div>

        {/* Clients Card */}
        <div
          className="menu-card"
          onClick={() => {
            fetch(`${API}/api/admin/clients`, {
              headers: { "x-init-data": WebApp.initData }
            })
              .then(r => r.json())
              .then(setClientList);
            setMode("clients");
          }}
          style={{
            background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            borderRadius: '16px',
            padding: '25px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 25px rgba(168, 237, 234, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.boxShadow = '0 15px 35px rgba(168, 237, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(168, 237, 234, 0.3)';
          }}
        >
          <div style={{
            fontSize: '3rem',
            marginBottom: '15px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>👥</div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '1.3rem',
            fontWeight: '600',
            color: '#2c3e50'
          }}>Клієнти</h3>
          <p style={{
            margin: '0',
            fontSize: '0.9rem',
            opacity: '0.8',
            color: '#2c3e50'
          }}>База клієнтів</p>
        </div>

        {/* Working Slots Card */}
        <div
          className="menu-card"
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
          style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            borderRadius: '16px',
            padding: '25px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 25px rgba(240, 147, 251, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.boxShadow = '0 15px 35px rgba(240, 147, 251, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(240, 147, 251, 0.3)';
          }}
        >
          <div style={{
            fontSize: '3rem',
            marginBottom: '15px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>🗓</div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '1.3rem',
            fontWeight: '600',
            color: 'white'
          }}>Робочі слоти</h3>
          <p style={{
            margin: '0',
            fontSize: '0.9rem',
            opacity: '0.9',
            color: 'white'
          }}>Графік роботи</p>
        </div>

        {/* Price List Card */}
        <div
          className="menu-card"
          onClick={() => {
            fetch(`${API}/api/admin/prices`, {
              headers: { "x-init-data": WebApp.initData }
            })
              .then(r => r.json())
              .then(setPriceList);
            setMode("prices");
          }}
          style={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            borderRadius: '16px',
            padding: '25px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 25px rgba(79, 172, 254, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.boxShadow = '0 15px 35px rgba(79, 172, 254, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(79, 172, 254, 0.3)';
          }}
        >
          <div style={{
            fontSize: '3rem',
            marginBottom: '15px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>💰</div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '1.3rem',
            fontWeight: '600',
            color: 'white'
          }}>Прайс</h3>
          <p style={{
            margin: '0',
            fontSize: '0.9rem',
            opacity: '0.9',
            color: 'white'
          }}>Ціни на послуги</p>
        </div>

        {/* Promotions Card */}
        <div
          className="menu-card"
          onClick={() => {
            fetch(`${API}/api/admin/promotions`, {
              headers: { "x-init-data": WebApp.initData }
            })
              .then(r => r.json())
              .then(setPromotions);
            setMode("promotions");
          }}
          style={{
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            borderRadius: '16px',
            padding: '25px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 25px rgba(67, 233, 123, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.boxShadow = '0 15px 35px rgba(67, 233, 123, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(67, 233, 123, 0.3)';
          }}
        >
          <div style={{
            fontSize: '3rem',
            marginBottom: '15px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>🎉</div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '1.3rem',
            fontWeight: '600',
            color: '#2c3e50'
          }}>Акції</h3>
          <p style={{
            margin: '0',
            fontSize: '0.9rem',
            opacity: '0.8',
            color: '#2c3e50'
          }}>Спеціальні пропозиції</p>
        </div>

        {/* Analytics Card */}
        <div
          className="menu-card"
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
          style={{
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            borderRadius: '16px',
            padding: '25px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 25px rgba(250, 112, 154, 0.3)',
            border: 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.boxShadow = '0 15px 35px rgba(250, 112, 154, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(250, 112, 154, 0.3)';
          }}
        >
          <div style={{
            fontSize: '3rem',
            marginBottom: '15px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>💎</div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '1.3rem',
            fontWeight: '600',
            color: 'white'
          }}>Аналітика</h3>
          <p style={{
            margin: '0',
            fontSize: '0.9rem',
            opacity: '0.9',
            color: 'white'
          }}>Статистика бізнесу</p>
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(255,255,255,0.9)',
            color: '#fa709a',
            borderRadius: '12px',
            padding: '2px 8px',
            fontSize: '0.7rem',
            fontWeight: 'bold'
          }}>🔥 HOT</div>
        </div>
      </div>

      {/* Back Button */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button
          className="primary-btn"
          onClick={() => setMode("menu")}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '15px 30px',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
          }}
        >
          ← Назад до меню
        </button>
      </div>

      {modal}
    </div>
  );
}

if (mode === "analytics") {
  return (
    <div className="app-container">
      {/* Modern Header */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '30px 20px',
        marginBottom: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'pulse 3s ease-in-out infinite'
        }}></div>
        <h2 style={{
          fontSize: '2.5rem',
          margin: '0 0 10px 0',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 1,
          position: 'relative'
        }}>
          💎 Аналітика 🔥
        </h2>
        <p style={{
          fontSize: '1rem',
          margin: '0',
          opacity: 0.9,
          fontWeight: '300',
          zIndex: 1,
          position: 'relative'
        }}>
          Статистика вашого бізнесу
        </p>
      </div>

      {/* Analytics Grid */}
      <div style={{
        display: 'grid',
        gap: '25px',
        padding: '0 10px'
      }}>
        {/* Monthly Revenue */}
        {analyticsRevenue && (
          <div
            className="menu-card"
            style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: '16px',
              padding: '25px',
              boxShadow: '0 8px 25px rgba(79, 172, 254, 0.3)',
              border: 'none',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '15px',
              background: 'rgba(255,255,255,0.9)',
              color: '#3498db',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              💰 Дохід
            </div>

            <div style={{ paddingTop: '20px', textAlign: 'center' }}>
              <div style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '15px',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                {analyticsRevenue.total_revenue} zł
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.9)',
                borderRadius: '12px',
                padding: '15px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '10px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2c3e50' }}>
                    📅 {analyticsRevenue.year}-{String(analyticsRevenue.month).padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Поточний місяць</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2c3e50' }}>
                    📋 {analyticsRevenue.total_appointments}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Всього записів</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2c3e50' }}>
                    👥 {analyticsRevenue.unique_clients}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Унікальних клієнтів</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Forecast */}
        {analyticsForecast && (
          <div
            className="menu-card"
            style={{
              background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
              borderRadius: '16px',
              padding: '25px',
              boxShadow: '0 8px 25px rgba(255, 154, 158, 0.3)',
              border: 'none',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '15px',
              background: 'rgba(255,255,255,0.9)',
              color: '#ff6b6b',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              🔮 Прогноз
            </div>

            <div style={{ paddingTop: '20px', textAlign: 'center' }}>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '15px',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                💵 {analyticsForecast.forecast_revenue} zł
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.9)',
                borderRadius: '12px',
                padding: '15px'
              }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2c3e50', marginBottom: '8px' }}>
                  📊 Очікується записів: {analyticsForecast.forecast_appointments}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  Розраховано на основі {analyticsForecast.based_on_months} місяців
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Popular Hours & Days Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
          {/* Popular Hours */}
          {analyticsHours && analyticsHours.length > 0 && (
            <div
              className="menu-card"
              style={{
                background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                borderRadius: '16px',
                padding: '25px',
                boxShadow: '0 8px 25px rgba(168, 237, 234, 0.3)',
                border: 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '15px',
                left: '15px',
                background: 'rgba(255,255,255,0.9)',
                color: '#9b59b6',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                ⏰ Популярні години
              </div>

              <div style={{ paddingTop: '20px' }}>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  justifyContent: 'center'
                }}>
                  {analyticsHours.slice(0, 5).map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 18px',
                        background: 'rgba(255,255,255,0.9)',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        color: '#8e44ad',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      }}
                    >
                      <div style={{ fontSize: '1.1rem', marginBottom: '4px' }}>
                        {Math.round(item.hour)}:00
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        {item.count} записів
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Popular Days */}
          {analyticsDays && analyticsDays.length > 0 && (
            <div
              className="menu-card"
              style={{
                background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                borderRadius: '16px',
                padding: '25px',
                boxShadow: '0 8px 25px rgba(255, 236, 210, 0.3)',
                border: 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '15px',
                left: '15px',
                background: 'rgba(255,255,255,0.9)',
                color: '#e74c3c',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                📅 Популярні дні
              </div>

              <div style={{ paddingTop: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {analyticsDays.map((item, idx) => {
                    const dayNames = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 18px',
                          background: 'rgba(255,255,255,0.9)',
                          borderRadius: '10px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateX(5px)';
                          e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateX(0)';
                          e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        }}
                      >
                        <span style={{ fontWeight: '600', color: '#2c3e50' }}>
                          {dayNames[item.day_num]}
                        </span>
                        <span style={{
                          fontWeight: 'bold',
                          color: '#c0392b',
                          background: '#fadbd8',
                          padding: '4px 10px',
                          borderRadius: '15px',
                          fontSize: '0.9rem'
                        }}>
                          {item.count} записів
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* New Clients Graph */}
        {analyticsNewClients && analyticsNewClients.length > 0 && (
          <div
            className="menu-card"
            style={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              borderRadius: '16px',
              padding: '25px',
              boxShadow: '0 8px 25px rgba(67, 233, 123, 0.3)',
              border: 'none',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '15px',
              background: 'rgba(255,255,255,0.9)',
              color: '#16a085',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              📈 Нові клієнти
            </div>

            <div style={{ paddingTop: '20px' }}>
              <h4 style={{ color: 'white', marginBottom: '20px', textAlign: 'center', fontSize: '1.2rem' }}>
                Нові клієнти (останні 30 днів)
              </h4>

              <div style={{
                background: 'rgba(255,255,255,0.9)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '3px',
                  height: '150px',
                  justifyContent: 'space-around',
                  paddingTop: '20px',
                  marginBottom: '15px'
                }}>
                  {analyticsNewClients.map((item, idx) => {
                    const maxClients = Math.max(...analyticsNewClients.map(x => x.new_clients || 0)) || 1;
                    const height = (item.new_clients / maxClients) * 120;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <div
                          style={{
                            width: '20px',
                            height: height,
                            backgroundColor: '#16a085',
                            borderRadius: '4px 4px 0 0',
                            minHeight: item.new_clients > 0 ? '10px' : '2px',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#138f7a';
                            e.target.style.transform = 'scale(1.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#16a085';
                            e.target.style.transform = 'scale(1)';
                          }}
                        />
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          color: '#2c3e50'
                        }}>
                          {item.new_clients}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p style={{
                  fontSize: '0.9rem',
                  color: '#666',
                  textAlign: 'center',
                  margin: '0',
                  fontStyle: 'italic'
                }}>
                  Графік показує нових клієнтів за день
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Back Button */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button
          className="primary-btn"
          onClick={() => setMode("adminMenu")}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '15px 30px',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
          }}
        >
          ← Назад в адмінку
        </button>
      </div>

      {modal}
    </div>
  );
}

if (mode === "slots") {
  return (
    <div className="app-container">
      {/* Modern Header */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '30px 20px',
        marginBottom: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'pulse 3s ease-in-out infinite'
        }}></div>
        <h2 style={{
          fontSize: '2.5rem',
          margin: '0 0 10px 0',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 1,
          position: 'relative'
        }}>
          🗓 Робочі слоти 🔥
        </h2>
        <p style={{
          fontSize: '1rem',
          margin: '0',
          opacity: 0.9,
          fontWeight: '300',
          zIndex: 1,
          position: 'relative'
        }}>
          Керуйте доступними годинами
        </p>
      </div>

      {/* Add Slot Card */}
      <div
        className="menu-card"
        style={{
          background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
          borderRadius: '16px',
          padding: '25px',
          marginBottom: '30px',
          boxShadow: '0 8px 25px rgba(255, 154, 158, 0.3)',
          border: 'none',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          background: 'rgba(255,255,255,0.9)',
          color: '#ff6b6b',
          padding: '5px 12px',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}>
          ➕ Додати слот
        </div>

        <div style={{ paddingTop: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: 'white',
                marginBottom: '8px',
                fontSize: '0.9rem'
              }}>
                📅 Дата
              </label>
              <input
                id="newSlotDate"
                type="date"
                className="slot-input"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '1rem',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#2c3e50',
                  fontWeight: '500'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: 'white',
                marginBottom: '8px',
                fontSize: '0.9rem'
              }}>
                ⏰ Час
              </label>
              <input
                id="newSlotTime"
                type="time"
                className="slot-input"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '1rem',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#2c3e50',
                  fontWeight: '500'
                }}
              />
            </div>
          </div>

          <button
            className="primary-btn"
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
                    });
                });
            }}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '15px 30px',
              fontSize: '1rem',
              fontWeight: '600',
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
            }}
          >
            ➕ Додати слот
          </button>
        </div>
      </div>

      {/* Slots List */}
      <div style={{
        display: 'grid',
        gap: '15px',
        padding: '0 10px'
      }}>
        {slotsAdmin.map((s) => {
          const label = getSlotLabel(s.date);

          return (
            <div
              className="menu-card"
              key={s.id}
              style={{
                background: label === "today"
                  ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                  : label === "tomorrow"
                  ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                  : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: label === "today"
                  ? '0 8px 25px rgba(79, 172, 254, 0.3)'
                  : label === "tomorrow"
                  ? '0 8px 25px rgba(67, 233, 123, 0.3)'
                  : '0 8px 25px rgba(240, 147, 251, 0.3)',
                border: 'none',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = label === "today"
                  ? '0 12px 35px rgba(79, 172, 254, 0.4)'
                  : label === "tomorrow"
                  ? '0 12px 35px rgba(67, 233, 123, 0.4)'
                  : '0 12px 35px rgba(240, 147, 251, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = label === "today"
                  ? '0 8px 25px rgba(79, 172, 254, 0.3)'
                  : label === "tomorrow"
                  ? '0 8px 25px rgba(67, 233, 123, 0.3)'
                  : '0 8px 25px rgba(240, 147, 251, 0.3)';
              }}
            >
              {/* Status Badge */}
              <div style={{
                position: 'absolute',
                top: '15px',
                left: '15px',
                background: 'rgba(255,255,255,0.9)',
                color: label === "today" ? '#3498db' : label === "tomorrow" ? '#16a085' : '#e74c3c',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {label === "today" ? "📅 Сьогодні" : label === "tomorrow" ? "📅 Завтра" : "📅 Майбутнє"}
              </div>

              {/* Booking Status Badge */}
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: s.is_booked ? 'rgba(231, 76, 60, 0.9)' : 'rgba(46, 204, 113, 0.9)',
                color: 'white',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {s.is_booked ? "🔴 Зайнято" : "🟢 Вільно"}
              </div>

              <div style={{ paddingTop: '40px' }}>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: 'white',
                  marginBottom: '10px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                  {s.date} {s.time}
                </div>

                {s.is_booked ? (
                  <div style={{
                    background: 'rgba(255,255,255,0.9)',
                    borderRadius: '12px',
                    padding: '15px',
                    marginBottom: '15px'
                  }}>
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#2c3e50',
                      marginBottom: '8px'
                    }}>
                      👤 Клієнт:
                    </div>
                    <div
                      onClick={() =>
                        WebApp.openTelegramLink(
                          `https://t.me/${s.client_username}`
                        )
                      }
                      style={{
                        color: '#d63384',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        textDecoration: 'underline',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = '#c2185b';
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '#d63384';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      {s.client_name}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: 'rgba(255,255,255,0.9)',
                    borderRadius: '12px',
                    padding: '15px',
                    marginBottom: '15px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#27ae60'
                    }}>
                      ✅ Слот вільний
                    </div>
                  </div>
                )}

                {!s.is_booked && (
                  <button
                    className="btn-cancel"
                    onClick={() => deleteSlot(s.id)}
                    style={{
                      background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: 'white',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
                      transition: 'all 0.3s ease',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.3)';
                    }}
                  >
                    ✖ Видалити слот
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Back Button */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button
          className="primary-btn"
          onClick={() => setMode("adminMenu")}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '15px 30px',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
          }}
        >
          ← Назад в адмінку
        </button>
      </div>

      {modal}
    </div>
  );
}


if (mode === "prices") {
  return (
    <div className="app-container">
      {/* Modern Header */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '30px 20px',
        marginBottom: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'pulse 3s ease-in-out infinite'
        }}></div>
        <h2 style={{
          fontSize: '2.5rem',
          margin: '0 0 10px 0',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 1,
          position: 'relative'
        }}>
          💰 Прайс-лист 🔥
        </h2>
        <p style={{
          fontSize: '1rem',
          margin: '0',
          opacity: 0.9,
          fontWeight: '300',
          zIndex: 1,
          position: 'relative'
        }}>
          Керуйте цінами та послугами
        </p>
      </div>

      {/* Add Category Card */}
      <div
        className="menu-card"
        style={{
          background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
          borderRadius: '16px',
          padding: '25px',
          marginBottom: '30px',
          boxShadow: '0 8px 25px rgba(255, 154, 158, 0.3)',
          border: 'none',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          background: 'rgba(255,255,255,0.9)',
          color: '#ff6b6b',
          padding: '5px 12px',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}>
          ➕ Нова категорія
        </div>

        <div style={{ paddingTop: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              color: 'white',
              marginBottom: '8px',
              fontSize: '0.9rem'
            }}>
              📁 Назва категорії
            </label>
            <input
              id="newCategoryName"
              placeholder="Назва категорії"
              className="input"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '1rem',
                background: 'rgba(255,255,255,0.9)',
                color: '#2c3e50',
                fontWeight: '500'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              color: 'white',
              marginBottom: '8px',
              fontSize: '0.9rem'
            }}>
              📝 Опис (необов'язково)
            </label>
            <textarea
              id="newCategoryDesc"
              placeholder="Опис категорії"
              className="input"
              rows="3"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '1rem',
                background: 'rgba(255,255,255,0.9)',
                color: '#2c3e50',
                fontWeight: '500',
                resize: 'vertical'
              }}
            />
          </div>

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
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '15px 30px',
              fontSize: '1rem',
              fontWeight: '600',
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
            }}
          >
            ➕ Додати категорію
          </button>
        </div>
      </div>

      {/* Categories and Services */}
      <div style={{
        display: 'grid',
        gap: '25px',
        padding: '0 10px'
      }}>
        {priceList.map(category => (
          <div
            key={category.id}
            className="menu-card"
            style={{
              background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
              borderRadius: '16px',
              padding: '25px',
              boxShadow: '0 8px 25px rgba(168, 237, 234, 0.3)',
              border: 'none',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Category Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '2px solid rgba(255,255,255,0.3)'
            }}>
              <div>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: 'white',
                  margin: '0 0 5px 0',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                  📁 {category.name}
                </h3>
                {category.description && (
                  <p style={{
                    fontSize: '0.9rem',
                    color: 'white',
                    margin: '0',
                    opacity: 0.8
                  }}>
                    {category.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
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
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#f39c12',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
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
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#e74c3c',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Add Service Form */}
            <div style={{
              background: 'rgba(255,255,255,0.9)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h4 style={{
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: '#2c3e50',
                margin: '0 0 15px 0'
              }}>
                ➕ Додати послугу
              </h4>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '15px',
                marginBottom: '15px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    color: '#2c3e50',
                    marginBottom: '5px',
                    fontSize: '0.9rem'
                  }}>
                    💅 Назва послуги
                  </label>
                  <input
                    id={`serviceName-${category.id}`}
                    placeholder="Назва послуги"
                    className="input"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    color: '#2c3e50',
                    marginBottom: '5px',
                    fontSize: '0.9rem'
                  }}>
                    💰 Ціна (zł)
                  </label>
                  <input
                    id={`servicePrice-${category.id}`}
                    type="number"
                    placeholder="Ціна"
                    className="input"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  color: '#2c3e50',
                  marginBottom: '5px',
                  fontSize: '0.9rem'
                }}>
                  📝 Опис (необов'язково)
                </label>
                <textarea
                  id={`serviceDesc-${category.id}`}
                  placeholder="Опис послуги"
                  className="input"
                  rows="2"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '0.9rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
                alignItems: 'end'
              }}>
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: '600',
                    color: '#2c3e50',
                    marginBottom: '5px',
                    fontSize: '0.9rem'
                  }}>
                    <input
                      type="checkbox"
                      id={`servicePromo-${category.id}`}
                      style={{ marginRight: '8px' }}
                    />
                    🔥 Акція
                  </label>
                  <input
                    id={`serviceDiscount-${category.id}`}
                    type="number"
                    placeholder="Ціна зі знижкою"
                    className="input"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

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
                  style={{
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 20px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'white',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(67, 233, 123, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(67, 233, 123, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(67, 233, 123, 0.3)';
                  }}
                >
                  ➕ Додати послугу
                </button>
              </div>
            </div>

            {/* Services List */}
            <div style={{ display: 'grid', gap: '10px' }}>
              {category.services.map(service => (
                <div
                  key={service.id}
                  style={{
                    padding: '15px',
                    background: service.is_promotion ? 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)' : 'rgba(255,255,255,0.9)',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateX(5px)';
                    e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateX(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      color: service.is_promotion ? '#d63031' : '#2c3e50',
                      marginBottom: '5px'
                    }}>
                      💅 {service.name}
                    </div>
                    {service.description && (
                      <div style={{
                        fontSize: '0.9rem',
                        color: service.is_promotion ? '#636e72' : '#7f8c8d',
                        marginBottom: '8px'
                      }}>
                        {service.description}
                      </div>
                    )}
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: service.is_promotion ? '#e17055' : '#27ae60'
                    }}>
                      {service.is_promotion ? (
                        <>
                          <span style={{
                            textDecoration: 'line-through',
                            color: '#d63031',
                            marginRight: '8px'
                          }}>
                            {service.price} zł
                          </span>
                          <span style={{ color: '#00b894' }}>
                            {service.discount_price} zł
                          </span>
                          <span style={{
                            background: '#fdcb6e',
                            color: '#d63031',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.8rem',
                            marginLeft: '8px',
                            fontWeight: 'bold'
                          }}>
                            🔥 Акція
                          </span>
                        </>
                      ) : (
                        <span>{service.price} zł</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
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
                      style={{
                        background: 'rgba(52, 152, 219, 0.9)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.1)';
                        e.target.style.boxShadow = '0 2px 8px rgba(52, 152, 219, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
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
                      style={{
                        background: 'rgba(231, 76, 60, 0.9)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.1)';
                        e.target.style.boxShadow = '0 2px 8px rgba(231, 76, 60, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
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
      </div>

      {/* Back Button */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button
          className="primary-btn"
          onClick={() => setMode("adminMenu")}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '15px 30px',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
          }}
        >
          ← Назад в адмінку
        </button>
      </div>

      {modal}
    </div>
  );
}

if (mode === "promotions") {
  return (
    <div className="app-container">
      {/* Modern Header */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '30px 20px',
        marginBottom: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'pulse 3s ease-in-out infinite'
        }}></div>
        <h2 style={{
          fontSize: '2.5rem',
          margin: '0 0 10px 0',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 1,
          position: 'relative'
        }}>
          🎉 Акції та знижки 🔥
        </h2>
        <p style={{
          fontSize: '1rem',
          margin: '0',
          opacity: 0.9,
          fontWeight: '300',
          zIndex: 1,
          position: 'relative'
        }}>
          Керуйте акціями та спеціальними пропозиціями
        </p>
      </div>

      {/* Add Promotion Card */}
      <div
        className="menu-card"
        style={{
          background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
          borderRadius: '16px',
          padding: '25px',
          marginBottom: '30px',
          boxShadow: '0 8px 25px rgba(255, 154, 158, 0.3)',
          border: 'none',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          background: 'rgba(255,255,255,0.9)',
          color: '#ff6b6b',
          padding: '5px 12px',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}>
          ➕ Нова акція
        </div>

        <div style={{ paddingTop: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: 'white',
                marginBottom: '8px',
                fontSize: '0.9rem'
              }}>
                🎯 Назва акції
              </label>
              <input
                id="newPromoName"
                placeholder="Назва акції"
                className="input"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '1rem',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#2c3e50',
                  fontWeight: '500'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: 'white',
                marginBottom: '8px',
                fontSize: '0.9rem'
              }}>
                💰 Тип знижки
              </label>
              <select
                id="newPromoType"
                className="input"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '1rem',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#2c3e50',
                  fontWeight: '500'
                }}
              >
                <option value="percentage">📊 Відсоток (%)</option>
                <option value="fixed">💵 Фіксована сума (zł)</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              color: 'white',
              marginBottom: '8px',
              fontSize: '0.9rem'
            }}>
              📝 Опис акції
            </label>
            <textarea
              id="newPromoDesc"
              placeholder="Опис акції"
              className="input"
              rows="3"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '1rem',
                background: 'rgba(255,255,255,0.9)',
                color: '#2c3e50',
                fontWeight: '500',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: 'white',
                marginBottom: '8px',
                fontSize: '0.9rem'
              }}>
                🎯 Значення знижки
              </label>
              <input
                id="newPromoValue"
                type="number"
                placeholder="Значення"
                className="input"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '1rem',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#2c3e50',
                  fontWeight: '500'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: 'white',
                marginBottom: '8px',
                fontSize: '0.9rem'
              }}>
                📅 Діє від
              </label>
              <input
                id="newPromoValidFrom"
                type="datetime-local"
                className="input"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '1rem',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#2c3e50',
                  fontWeight: '500'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: 'white',
                marginBottom: '8px',
                fontSize: '0.9rem'
              }}>
                ⏰ Діє до
              </label>
              <input
                id="newPromoValidUntil"
                type="datetime-local"
                className="input"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '1rem',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#2c3e50',
                  fontWeight: '500'
                }}
              />
            </div>
          </div>

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
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '15px 30px',
              fontSize: '1rem',
              fontWeight: '600',
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
            }}
          >
            ➕ Додати акцію
          </button>
        </div>
      </div>

      {/* Promotions List */}
      <div style={{
        display: 'grid',
        gap: '20px',
        padding: '0 10px'
      }}>
        {promotions.map(promo => (
          <div
            key={promo.id}
            className="menu-card"
            style={{
              background: promo.is_active
                ? 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
                : 'linear-gradient(135deg, #d3d3d3 0%, #a9a9a9 100%)',
              borderRadius: '16px',
              padding: '25px',
              boxShadow: promo.is_active
                ? '0 8px 25px rgba(168, 237, 234, 0.3)'
                : '0 8px 25px rgba(211, 211, 211, 0.3)',
              border: 'none',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-3px)';
              e.target.style.boxShadow = promo.is_active
                ? '0 12px 35px rgba(168, 237, 234, 0.4)'
                : '0 12px 35px rgba(211, 211, 211, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = promo.is_active
                ? '0 8px 25px rgba(168, 237, 234, 0.3)'
                : '0 8px 25px rgba(211, 211, 211, 0.3)';
            }}
          >
            {/* Status Badge */}
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '15px',
              background: promo.is_active ? 'rgba(46, 204, 113, 0.9)' : 'rgba(149, 165, 166, 0.9)',
              color: 'white',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              {promo.is_active ? "✅ Активна" : "⏸️ Неактивна"}
            </div>

            {/* Action Buttons */}
            <div style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              display: 'flex',
              gap: '8px'
            }}>
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
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#f39c12',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = 'none';
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
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#e74c3c',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                🗑️
              </button>
            </div>

            <div style={{ paddingTop: '50px' }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'white',
                margin: '0 0 15px 0',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                🎯 {promo.name}
              </h3>

              {promo.description && (
                <p style={{
                  fontSize: '1rem',
                  color: 'white',
                  margin: '0 0 20px 0',
                  opacity: 0.9,
                  lineHeight: '1.5'
                }}>
                  {promo.description}
                </p>
              )}

              <div style={{
                background: 'rgba(255,255,255,0.9)',
                borderRadius: '12px',
                padding: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '1.8rem',
                    fontWeight: 'bold',
                    color: '#e74c3c',
                    marginBottom: '5px'
                  }}>
                    {promo.discount_value}{promo.discount_type === 'percentage' ? '%' : ' zł'}
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#666',
                    fontWeight: '600'
                  }}>
                    💰 Знижка
                  </div>
                </div>

                {promo.valid_from && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      color: '#27ae60',
                      marginBottom: '5px'
                    }}>
                      📅 {new Date(promo.valid_from).toLocaleDateString()}
                    </div>
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#666',
                      fontWeight: '600'
                    }}>
                      Діє від
                    </div>
                  </div>
                )}

                {promo.valid_until && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      color: '#e67e22',
                      marginBottom: '5px'
                    }}>
                      ⏰ {new Date(promo.valid_until).toLocaleDateString()}
                    </div>
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#666',
                      fontWeight: '600'
                    }}>
                      Діє до
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Back Button */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button
          className="primary-btn"
          onClick={() => setMode("adminMenu")}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '15px 30px',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
          }}
        >
          ← Назад в адмінку
        </button>
      </div>

      {modal}
    </div>
  );
}


if (mode === "addSlot") {
  return (
    <div className="app-container">
      {/* Modern Header */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '30px 20px',
        marginBottom: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'pulse 3s ease-in-out infinite'
        }}></div>
        <h2 style={{
          fontSize: '2.5rem',
          margin: '0 0 10px 0',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 1,
          position: 'relative'
        }}>
          ➕ Додати слот 🔥
        </h2>
        <p style={{
          fontSize: '1rem',
          margin: '0',
          opacity: 0.9,
          fontWeight: '300',
          zIndex: 1,
          position: 'relative'
        }}>
          Створіть новий час для запису
        </p>
      </div>

      {/* Add Slot Form */}
      <div
        className="menu-card"
        style={{
          background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
          borderRadius: '16px',
          padding: '25px',
          marginBottom: '30px',
          boxShadow: '0 8px 25px rgba(255, 154, 158, 0.3)',
          border: 'none',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          background: 'rgba(255,255,255,0.9)',
          color: '#ff6b6b',
          padding: '5px 12px',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}>
          📅 Новий слот
        </div>

        <div style={{ paddingTop: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: 'white',
                marginBottom: '12px',
                fontSize: '1rem'
              }}>
                📅 Виберіть дату
              </label>
              <input
                id="newDate"
                type="date"
                className="input"
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '1.1rem',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#2c3e50',
                  fontWeight: '500',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: 'white',
                marginBottom: '12px',
                fontSize: '1rem'
              }}>
                ⏰ Виберіть час
              </label>
              <input
                id="newTime"
                type="time"
                className="input"
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '1.1rem',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#2c3e50',
                  fontWeight: '500',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            </div>
          </div>

          <button
            className="primary-btn"
            onClick={() => {
              const date = document.getElementById("newDate").value;
              const time = document.getElementById("newTime").value;

              if (!date || !time) return alert("❗ Заповніть дату і час");

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
                  alert("✅ Слот додано успішно!");
                  setMode("adminMenu");
                });
            }}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '18px 40px',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
            }}
          >
            ➕ Додати слот
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div
        className="menu-card"
        style={{
          background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
          borderRadius: '16px',
          padding: '25px',
          boxShadow: '0 8px 25px rgba(168, 237, 234, 0.3)',
          border: 'none',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          background: 'rgba(255,255,255,0.9)',
          color: '#16a085',
          padding: '5px 12px',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}>
          ℹ️ Інформація
        </div>

        <div style={{ paddingTop: '20px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: '#2c3e50',
              marginBottom: '15px'
            }}>
              💡 Поради по створенню слотів
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
              textAlign: 'left'
            }}>
              <div style={{ padding: '10px' }}>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#27ae60',
                  marginBottom: '8px'
                }}>
                  ✅ Рекомендації
                </div>
                <ul style={{
                  fontSize: '0.9rem',
                  color: '#666',
                  margin: '0',
                  paddingLeft: '20px'
                }}>
                  <li>Створюйте слоти заздалегідь</li>
                  <li>Додавайте кілька годин поспіль</li>
                  <li>Перевіряйте наявність конфліктів</li>
                </ul>
              </div>

              <div style={{ padding: '10px' }}>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#e74c3c',
                  marginBottom: '8px'
                }}>
                  ⚠️ Важливо
                </div>
                <ul style={{
                  fontSize: '0.9rem',
                  color: '#666',
                  margin: '0',
                  paddingLeft: '20px'
                }}>
                  <li>Дата не може бути в минулому</li>
                  <li>Час має бути в робочий період</li>
                  <li>Уникайте дублювання слотів</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button
          className="primary-btn"
          onClick={() => setMode("adminMenu")}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '15px 30px',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
          }}
        >
          ← Назад в адмінку
        </button>
      </div>

      {modal}
    </div>
  );
}


if (mode === "admin") {
  // 🔥 Сортування: від найближчого до найновішого
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA - dateB;
  });

  // 📅 Функції календаря
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Додаємо пусті клітинки для днів перед першим днем місяця
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Додаємо дні місяця
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getAppointmentsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return sortedAppointments.filter(a => a.date === dateStr);
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const monthNames = [
    'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
  ];

  return (
    <div className="app-container">
      {/* Modern Header */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '30px 20px',
        marginBottom: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'pulse 3s ease-in-out infinite'
        }}></div>
        <h2 style={{
          fontSize: '2.5rem',
          margin: '0 0 10px 0',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 1,
          position: 'relative'
        }}>
          📋 Управління записами 🔥
        </h2>
        <p style={{
          fontSize: '1rem',
          margin: '0',
          opacity: 0.9,
          fontWeight: '300',
          zIndex: 1,
          position: 'relative'
        }}>
          Переглядайте та керуйте всіма бронюваннями
        </p>
      </div>

      {/* Filter Buttons */}
      <div
        className="menu-card"
        style={{
          background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
          borderRadius: '16px',
          padding: '25px',
          marginBottom: '30px',
          boxShadow: '0 8px 25px rgba(168, 237, 234, 0.3)',
          border: 'none',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          background: 'rgba(255,255,255,0.9)',
          color: '#16a085',
          padding: '5px 12px',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}>
          🔍 Фільтри
        </div>

        <div style={{ paddingTop: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px'
          }}>
            <button
              onClick={() => applyFilter("all")}
              style={{
                background: 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: '12px',
                padding: '15px 20px',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#3498db',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(52, 152, 219, 0.3)';
                e.target.style.background = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                e.target.style.background = 'rgba(255,255,255,0.9)';
              }}
            >
              📋 Усі записи
            </button>

            <button
              onClick={() => applyFilter("pending")}
              style={{
                background: 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: '12px',
                padding: '15px 20px',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#f39c12',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(243, 156, 18, 0.3)';
                e.target.style.background = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                e.target.style.background = 'rgba(255,255,255,0.9)';
              }}
            >
              ⏳ Очікують
            </button>

            <button
              onClick={() => applyFilter("approved")}
              style={{
                background: 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: '12px',
                padding: '15px 20px',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#27ae60',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(39, 174, 96, 0.3)';
                e.target.style.background = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                e.target.style.background = 'rgba(255,255,255,0.9)';
              }}
            >
              ✅ Підтверджені
            </button>

            <button
              onClick={() => applyFilter("canceled")}
              style={{
                background: 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: '12px',
                padding: '15px 20px',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#e74c3c',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(231, 76, 60, 0.3)';
                e.target.style.background = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                e.target.style.background = 'rgba(255,255,255,0.9)';
              }}
            >
              ❌ Скасовані
            </button>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <button
          onClick={() => setViewMode('list')}
          style={{
            background: viewMode === 'list' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.1)',
            border: viewMode === 'list' ? 'none' : '2px solid rgba(255,255,255,0.3)',
            borderRadius: '25px',
            padding: '12px 25px',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            boxShadow: viewMode === 'list' ? '0 4px 15px rgba(102, 126, 234, 0.3)' : 'none',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            if (viewMode !== 'list') {
              e.target.style.background = 'rgba(255,255,255,0.2)';
              e.target.style.borderColor = 'rgba(255,255,255,0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'list') {
              e.target.style.background = 'rgba(255,255,255,0.1)';
              e.target.style.borderColor = 'rgba(255,255,255,0.3)';
            }
          }}
        >
          📋 Список
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          style={{
            background: viewMode === 'calendar' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.1)',
            border: viewMode === 'calendar' ? 'none' : '2px solid rgba(255,255,255,0.3)',
            borderRadius: '25px',
            padding: '12px 25px',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            boxShadow: viewMode === 'calendar' ? '0 4px 15px rgba(102, 126, 234, 0.3)' : 'none',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            if (viewMode !== 'calendar') {
              e.target.style.background = 'rgba(255,255,255,0.2)';
              e.target.style.borderColor = 'rgba(255,255,255,0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'calendar') {
              e.target.style.background = 'rgba(255,255,255,0.1)';
              e.target.style.borderColor = 'rgba(255,255,255,0.3)';
            }
          }}
        >
          📅 Календар
        </button>
      </div>

      {/* Appointments Display */}
      {viewMode === 'calendar' ? (
        <>
          {/* Calendar Header */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            padding: '20px',
            marginBottom: '20px',
            borderRadius: '16px',
            boxShadow: '0 8px 25px rgba(240, 147, 251, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <button
              onClick={() => navigateMonth(-1)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                color: 'white',
                fontSize: '1.2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ‹
            </button>
            <h3 style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: '600'
            }}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button
              onClick={() => navigateMonth(1)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                color: 'white',
                fontSize: '1.2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ›
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="card" style={{
            background: 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
          }}>
            {/* Day Headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '10px',
              marginBottom: '15px'
            }}>
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(day => (
                <div key={day} style={{
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#666',
                  padding: '10px 0',
                  fontSize: '0.9rem'
                }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '10px'
            }}>
              {getDaysInMonth(currentDate).map((date, index) => {
                if (!date) {
                  return <div key={index} style={{ padding: '20px' }}></div>;
                }

                const dayAppointments = getAppointmentsForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

                return (
                  <div
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    style={{
                      minHeight: '80px',
                      padding: '8px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: isSelected
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : isToday
                        ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                        : dayAppointments.length > 0
                        ? 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
                        : 'rgba(248, 249, 250, 0.8)',
                      border: isSelected ? '2px solid #667eea' : '1px solid rgba(0,0,0,0.1)',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <div style={{
                      fontSize: '1.2rem',
                      fontWeight: '600',
                      color: isSelected || isToday ? 'white' : '#333',
                      marginBottom: '4px'
                    }}>
                      {date.getDate()}
                    </div>
                    {dayAppointments.length > 0 && (
                      <div style={{
                        fontSize: '0.8rem',
                        color: isSelected || isToday ? 'white' : '#666',
                        fontWeight: '500'
                      }}>
                        {dayAppointments.length} запис{dayAppointments.length === 1 ? '' : dayAppointments.length < 5 ? 'и' : 'ів'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Appointments */}
          {selectedDate && (
            <div className="card" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '25px',
              marginTop: '20px',
              borderRadius: '16px',
              boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
            }}>
              <h3 style={{
                margin: '0 0 20px 0',
                fontSize: '1.5rem',
                fontWeight: '600',
                textAlign: 'center'
              }}>
                📅 {selectedDate.toLocaleDateString('uk-UA', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>

              {getAppointmentsForDate(selectedDate).length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.7 }}>📭</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>
                    Немає записів на цю дату
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '15px'
                }}>
                  {getAppointmentsForDate(selectedDate).map(a => (
                    <div
                      key={a.id}
                      className="menu-card"
                      style={{
                        background: 'rgba(255,255,255,0.95)',
                        color: '#333',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        border: 'none'
                      }}
                    >
                      <div style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        marginBottom: '10px',
                        color: '#667eea'
                      }}>
                        🕐 {a.time}
                      </div>

                      <div style={{
                        background: 'rgba(102, 126, 234, 0.1)',
                        padding: '10px',
                        borderRadius: '8px',
                        marginBottom: '15px'
                      }}>
                        <div style={{ fontWeight: '600', marginBottom: '5px' }}>
                          👤 {a.client}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>
                          📞 {a.phone}
                        </div>
                        {a.service && (
                          <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
                            💅 {a.service}
                          </div>
                        )}
                      </div>

                      <div style={{
                        display: 'flex',
                        gap: '10px',
                        flexWrap: 'wrap'
                      }}>
                        {a.status === "pending" && (
                          <>
                            <button
                              className="btn-approve"
                              onClick={() => changeStatus(a.id, "approved")}
                              style={{
                                background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '10px 15px',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                color: 'white',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(39, 174, 96, 0.3)',
                                transition: 'all 0.3s ease',
                                flex: 1
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(39, 174, 96, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 2px 8px rgba(39, 174, 96, 0.3)';
                              }}
                            >
                              ✅ Підтвердити
                            </button>
                            <button
                              onClick={() => changeStatus(a.id, "canceled")}
                              style={{
                                background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '10px 15px',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                color: 'white',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(231, 76, 60, 0.3)',
                                transition: 'all 0.3s ease',
                                flex: 1
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(231, 76, 60, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 2px 8px rgba(231, 76, 60, 0.3)';
                              }}
                            >
                              ❌ Скасувати
                            </button>
                          </>
                        )}

                        {a.status === "approved" && (
                          <button
                            onClick={() => changeStatus(a.id, "canceled")}
                            style={{
                              background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '10px 15px',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              color: 'white',
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(231, 76, 60, 0.3)',
                              transition: 'all 0.3s ease',
                              width: '100%'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = '0 4px 12px rgba(231, 76, 60, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 2px 8px rgba(231, 76, 60, 0.3)';
                            }}
                          >
                            ❌ Скасувати
                          </button>
                        )}

                        {a.status === "canceled" && (
                          <button
                            onClick={() => changeStatus(a.id, "approved")}
                            style={{
                              background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '10px 15px',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              color: 'white',
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(39, 174, 96, 0.3)',
                              transition: 'all 0.3s ease',
                              width: '100%'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = '0 6px 20px rgba(39, 174, 96, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.3)';
                            }}
                          >
                            ✅ Відновити
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Calendar Empty State */}
          {(!selectedDate || getAppointmentsForDate(selectedDate).length === 0) && !getDaysInMonth(currentDate).some(date => date && getAppointmentsForDate(date).length > 0) && (
            <div
              className="menu-card"
              style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                borderRadius: '16px',
                padding: '40px 25px',
                boxShadow: '0 8px 25px rgba(240, 147, 251, 0.3)',
                border: 'none',
                textAlign: 'center',
                marginTop: '20px'
              }}
            >
              <div style={{
                fontSize: '4rem',
                marginBottom: '20px',
                opacity: 0.7
              }}>
                📅
              </div>
              <div style={{
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '10px',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                Немає записів у цьому місяці
              </div>
              <div style={{
                fontSize: '0.9rem',
                color: 'white',
                opacity: 0.8
              }}>
                Нові бронювання з'являться тут
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Appointments List */}
          <div style={{
            display: 'grid',
            gap: '20px',
          }}>
          {sortedAppointments.map(a => (
          <div
            className="menu-card"
            key={a.id}
            style={{
              background: getSlotLabel(a.date) === "today"
                ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                : getSlotLabel(a.date) === "tomorrow"
                ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '16px',
              padding: '25px',
              boxShadow: getSlotLabel(a.date) === "today"
                ? '0 8px 25px rgba(79, 172, 254, 0.3)'
                : getSlotLabel(a.date) === "tomorrow"
                ? '0 8px 25px rgba(67, 233, 123, 0.3)'
                : '0 8px 25px rgba(240, 147, 251, 0.3)',
              border: 'none',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-3px)';
              e.target.style.boxShadow = getSlotLabel(a.date) === "today"
                ? '0 12px 35px rgba(79, 172, 254, 0.4)'
                : getSlotLabel(a.date) === "tomorrow"
                ? '0 12px 35px rgba(67, 233, 123, 0.4)'
                : '0 12px 35px rgba(240, 147, 251, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = getSlotLabel(a.date) === "today"
                ? '0 8px 25px rgba(79, 172, 254, 0.3)'
                : getSlotLabel(a.date) === "tomorrow"
                ? '0 8px 25px rgba(67, 233, 123, 0.3)'
                : '0 8px 25px rgba(240, 147, 251, 0.3)';
            }}
          >
            {/* Date Badge */}
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '15px',
              background: 'rgba(255,255,255,0.9)',
              color: getSlotLabel(a.date) === "today" ? '#3498db' : getSlotLabel(a.date) === "tomorrow" ? '#16a085' : '#e74c3c',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              {getSlotLabel(a.date) === "today" ? "📅 Сьогодні" : getSlotLabel(a.date) === "tomorrow" ? "📅 Завтра" : "📅 Майбутнє"}
            </div>

            {/* Status Badge */}
            <div style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: a.status === "approved" ? 'rgba(46, 204, 113, 0.9)' : a.status === "canceled" ? 'rgba(231, 76, 60, 0.9)' : 'rgba(243, 156, 18, 0.9)',
              color: 'white',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              {a.status === "approved" ? "✅ Підтверджено" : a.status === "canceled" ? "❌ Скасовано" : "⏳ Очікує"}
            </div>

            <div style={{ paddingTop: '50px' }}>
              {/* Date and Time */}
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '15px',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                📅 {a.date} {a.time}
              </div>

              {/* Client Info */}
              <div style={{
                background: 'rgba(255,255,255,0.9)',
                padding: '15px',
                borderRadius: '12px',
                marginBottom: '15px'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                  👤 {a.clientName}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '5px' }}>
                  📞 {a.phone}
                </div>
                {a.service && (
                  <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                    💅 {a.service}
                  </div>
                )}
              </div>

              {/* Reference Image */}
              {a.reference_image && (
                <div style={{
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: '12px',
                  padding: '15px',
                  marginBottom: '15px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#2c3e50',
                    marginBottom: '10px'
                  }}>
                    🖼️ Фото-приклад:
                  </div>
                  <img
                    src={`${API}${a.reference_image}`}
                    alt="ref"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '200px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    onClick={() => setModalImage(`${API}${a.reference_image}`)}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.05)';
                      e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    }}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                {a.status === "approved" && (
                  <button
                    className="btn-approved-static"
                    onClick={() => {
                      if (!window.confirm("Ви хочете змінити статус запису?")) return;

                      const newStatus = window.prompt(
                        "Виберіть новий статус:\n- canceled\n- pending",
                        a.status
                      );

                      if (!newStatus || !["canceled", "pending"].includes(newStatus)) {
                        alert("❌ Невірний статус");
                        return;
                      }

                      changeStatus(a.id, newStatus);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: 'white',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)',
                      transition: 'all 0.3s ease',
                      flex: 1
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(231, 76, 60, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 15px rgba(231, 76, 60, 0.3)';
                    }}
                  >
                    ❌ Скасовано
                  </button>
                )}

                {a.status === "pending" && (
                  <>
                    <button
                      className="btn-approve"
                      onClick={() => changeStatus(a.id, "approved")}
                      style={{
                        background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '12px 20px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        color: 'white',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                        transition: 'all 0.3s ease',
                        flex: 1
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(39, 174, 96, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.3)';
                      }}
                    >
                      ✅ Підтвердити
                    </button>
                    <button
                      onClick={() => changeStatus(a.id, "canceled")}
                      style={{
                        background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '12px 20px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        color: 'white',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)',
                        transition: 'all 0.3s ease',
                        flex: 1
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(231, 76, 60, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(231, 76, 60, 0.3)';
                      }}
                    >
                      ❌ Скасувати
                    </button>
                  </>
                )}

                {a.status === "canceled" && (
                  <button
                    onClick={() => changeStatus(a.id, "approved")}
                    style={{
                      background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: 'white',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                      transition: 'all 0.3s ease',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(39, 174, 96, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.3)';
                    }}
                  >
                    ✅ Відновити
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {sortedAppointments.length === 0 && (
          <div
            className="menu-card"
            style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '16px',
              padding: '40px 25px',
              boxShadow: '0 8px 25px rgba(240, 147, 251, 0.3)',
              border: 'none',
              textAlign: 'center'
            }}
          >
            <div style={{
              fontSize: '4rem',
              marginBottom: '20px',
              opacity: 0.7
            }}>
              📭
            </div>
            <div style={{
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '10px',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              Записів поки що немає
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: 'white',
              opacity: 0.8
            }}>
              Нові бронювання з'являться тут
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {/* Back Button */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button
          className="primary-btn"
          onClick={() => setMode("adminMenu")}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '15px 30px',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
          }}
        >
          ← Назад в адмінку
        </button>
      </div>

      {modal}
    </div>
  );
}
}

export default App;
