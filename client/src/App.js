import React, { useEffect, useState, useCallback, useMemo } from 'react';
import WebApp from '@twa-dev/sdk';
import Calendar from 'react-calendar';
import "./styles/theme.css";
 
const ADMIN_TG_IDS = [1342762796, 1248276494];

const API = process.env.REACT_APP_API_URL || '';

// 🔧 API Helper - centralizes fetch logic & auto-adds auth header
// eslint-disable-next-line no-unused-vars
const apiCall = async (url, options = {}) => {
  const headers = {
    ...options.headers,
    'x-init-data': WebApp.initData
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API}${url}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
};

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
const [calendarDate, setCalendarDate] = useState(new Date());
  const [mode, setMode] = useState("menu");
  const effectiveMode = mode === "auto" ? (isAdmin ? "admin" : "client") : mode;
  const [appointments, setAppointments] = useState([]);
  const [modalImage, setModalImage] = useState(null);
  const [selectedAdminAppointment, setSelectedAdminAppointment] = useState(null);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [priceList, setPriceList] = useState([]);
  const [priceListServices, setPriceListServices] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [referralCode, setReferralCode] = useState(null);
  const [enteredReferralCode, setEnteredReferralCode] = useState("");
    const [hasReferralDiscount, setHasReferralDiscount] = useState(false);
  const [hasUsedReferralCode, setHasUsedReferralCode] = useState(false);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [bonusPointsToUse, setBonusPointsToUse] = useState(0);
  const [selectedBonusReward, setSelectedBonusReward] = useState(null);
  const [analyticsHours, setAnalyticsHours] = useState([]);
  const [analyticsDays, setAnalyticsDays] = useState([]);
  const [analyticsRevenue, setAnalyticsRevenue] = useState(null);
  const [analyticsForecast, setAnalyticsForecast] = useState(null);
  const [analyticsNewClients, setAnalyticsNewClients] = useState([]);
  const [adminPricesDraft, setAdminPricesDraft] = useState([]);
  const [isLoadingAdminPrices, setIsLoadingAdminPrices] = useState(false);
  const [isSavingAdminPrices, setIsSavingAdminPrices] = useState(false);
  const [adminCalendarView, setAdminCalendarView] = useState(false);
  
  // RESCHEDULE APPOINTMENT
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [rescheduleOldDate, setRescheduleOldDate] = useState(null);
  const [rescheduleOldTime, setRescheduleOldTime] = useState(null);
  const [rescheduleSelectedSlotId, setRescheduleSelectedSlotId] = useState(null);

  // EDIT PRICE MODAL
  const [editPriceModalOpen, setEditPriceModalOpen] = useState(false);
  const [editPriceAppointmentId, setEditPriceAppointmentId] = useState(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  const [editPriceOldValue, setEditPriceOldValue] = useState(null);

  // BOOKING INTERFACE HOOKS
  const [bookingStep, setBookingStep] = useState(1);
  const totalSteps = 4;

  const nextStep = () => setBookingStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setBookingStep(prev => Math.max(prev - 1, 1));
  const resetBooking = () => {
    setBookingStep(1);
    setServiceCategory("");
    setServiceSub("");
    setSizeCategory("");
    setDesignCategory("Однотонний");
    setMattingCategory("Глянцеве");
    setPrice(0);
    setSelectedSlotId("");
    setEnteredReferralCode("");
    setComment("");
    setReference([]);
    setCurrentHandsPhotos([]);
    setBonusPointsToUse(0);
    setSelectedBonusReward(null);
  };

  const submitBooking = async () => {
    if (!selectedSlotId) {
      alert("❗ Оберіть дату та час");
      return;
    }

    const clientName = tgUser?.first_name || "Anon";
    const effectiveTgId = tgUser?.id || '';

    if (!effectiveTgId) {
      alert('❗ Вкажіть ваш Telegram ID або відкрийте додаток через Telegram Web App');
      return;
    }

    // Ensure a service is selected (prefer specific sub-service)
    const selectedService = (serviceSub && String(serviceSub).trim()) || (serviceCategory && String(serviceCategory).trim());
    if (!selectedService) {
      alert("❗ Оберіть послугу");
      return;
    }

    const formData = new FormData();
    formData.append("client", clientName);
    formData.append("slot_id", selectedSlotId);
    formData.append("design", designCategory);
    formData.append("length", sizeCategory);
    formData.append("type", mattingCategory);
    formData.append("comment", comment);
    formData.append("tg_id", effectiveTgId);
      formData.append("username", tgUser?.username || "");
    formData.append("service_category", serviceCategory);
    formData.append("service_sub", serviceSub);
    // Add `service` field expected by server
    formData.append("service", selectedService);
    formData.append("price", price);
    formData.append("referral_code", enteredReferralCode);
    formData.append("bonus_points_to_use", bonusPointsToUse);
    formData.append("bonus_reward_type", selectedBonusReward);

    // Add current hands photos
    currentHandsPhotos.forEach((photo, index) => {
      formData.append(`current_hands_${index}`, photo);
    });

    // Add reference photos
    reference.forEach((ref, index) => {
      formData.append(`reference_${index}`, ref);
    });

    try {
      const response = await fetch(`${API}/api/appointment`, {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        alert("✅ Запис створено!");
        resetBooking();
        setMode("menu");
      } else {
        alert("❌ Помилка при відправці");
      }
    } catch (error) {
      console.error("Error submitting booking:", error);
      alert("❌ Помилка при відправці");
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

  // EDIT PRICE MODAL
  const priceEditModal = editPriceModalOpen ? (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1001,
      }}
      onClick={() => setEditPriceModalOpen(false)}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#2c3e50',
          marginBottom: '10px',
          textAlign: 'center'
        }}>
          💰 Змінити ціну
        </h2>
        
        <div style={{
          background: '#ecf0f1',
          borderRadius: '10px',
          padding: '15px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '0.9rem',
            color: '#666',
            marginBottom: '5px'
          }}>
            Стара ціна:
          </div>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 'bold',
            color: '#e74c3c'
          }}>
            {editPriceOldValue} zł
          </div>
        </div>

        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: '600',
          color: '#2c3e50',
          fontSize: '0.95rem'
        }}>
          Нова ціна (zł):
        </label>
        
        <input
          type="number"
          min="0"
          step="1"
          value={editPriceValue}
          onChange={(e) => setEditPriceValue(e.target.value)}
          placeholder="Введіть нову ціну"
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            border: '2px solid #3498db',
            fontSize: '1rem',
            boxSizing: 'border-box',
            marginBottom: '20px',
            fontWeight: '500'
          }}
        />

        <div style={{
          background: '#e8f4f8',
          borderRadius: '10px',
          padding: '15px',
          marginBottom: '20px',
          textAlign: 'center',
          display: editPriceValue ? 'block' : 'none'
        }}>
          <div style={{
            fontSize: '0.9rem',
            color: '#666',
            marginBottom: '5px'
          }}>
            Нова ціна:
          </div>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 'bold',
            color: '#27ae60'
          }}>
            {editPriceValue} zł
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '10px'
        }}>
          <button
            onClick={() => setEditPriceModalOpen(false)}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: '2px solid #bdc3c7',
              background: 'white',
              color: '#2c3e50',
              fontWeight: '600',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#ecf0f1';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            Скасувати
          </button>
          <button
            onClick={() => updatePrice(editPriceAppointmentId, parseInt(editPriceValue, 10))}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
              color: 'white',
              fontWeight: '600',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(52, 152, 219, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.3)';
            }}
          >
            ✓ Зберегти
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // ADMIN: Appointment detail modal
  const adminDetailModal = selectedAdminAppointment ? (
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
        zIndex: 1100,
      }}
      onClick={() => setSelectedAdminAppointment(null)}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          maxWidth: '900px',
          width: '95%',
          maxHeight: '90%',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ margin: 0 }}>Дані запису</h2>
          <button onClick={() => setSelectedAdminAppointment(null)} style={{ padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}>✕ Закрити</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <div style={{ fontWeight: 700 }}>Клієнт</div>
            <div>{selectedAdminAppointment.client} {selectedAdminAppointment.username ? `(@${selectedAdminAppointment.username})` : ''}</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>Телеграм ID</div>
            <div>{selectedAdminAppointment.tg_id}</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>Дата / Час</div>
            <div>{selectedAdminAppointment.date} {selectedAdminAppointment.time}</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>Послуга</div>
            <div>{selectedAdminAppointment.service || '—'}</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>Дизайн / Довжина</div>
            <div>{selectedAdminAppointment.design || '—'} / {selectedAdminAppointment.length || '—'}</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>Ціна</div>
            <div>{selectedAdminAppointment.price} zł</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>Статус</div>
            <div>{selectedAdminAppointment.status}</div>
          </div>

          <div>
            <div style={{ fontWeight: 700 }}>Коментар</div>
            <div style={{ whiteSpace: 'pre-wrap', marginBottom: 10 }}>{selectedAdminAppointment.comment || '—'}</div>

            <div style={{ fontWeight: 700, marginBottom: 6 }}>Фотографії (референси)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
              {(selectedAdminAppointment.reference_images || []).map((p, i) => (
                <img key={i} src={`${API}${p}`} alt={`ref-${i}`} style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }} onClick={() => setModalImage(`${API}${p}`)} />
              ))}
            </div>

            <div style={{ fontWeight: 700, marginTop: 12, marginBottom: 6 }}>Фотографії (поточний стан)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
              {(selectedAdminAppointment.current_hands_images || []).map((p, i) => (
                <img key={i} src={`${API}${p}`} alt={`current-${i}`} style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }} onClick={() => setModalImage(`${API}${p}`)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // BOOKING SYSTEM - NEW
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceSub, setServiceSub] = useState("");
  const [sizeCategory, setSizeCategory] = useState(""); // S, M, L, XL, 2XL, 3XL
  const [designCategory, setDesignCategory] = useState("Однотонний"); // Однотонний, Простий, Середній, Складний
  const [mattingCategory, setMattingCategory] = useState("Глянцеве"); // Глянцеве, Матове
  const [price, setPrice] = useState(0);
  
  // Memoized price calculation - only recalculates when dependencies change
  const calculatePrice = useMemo(() => {
    return (category, size, design, matting) => {
      let basePrice = 0;
      
      // Try to get price from priceListServices first
      if (priceListServices.length > 0 && category) {
        const categoryService = priceListServices.find(svc => 
          svc.title === category || svc.name === category
        );
        
        if (categoryService) {
          // For services with lengthOptions (Укріплення, Нарощення)
          if (categoryService.lengthOptions && size) {
            const sizeOption = categoryService.lengthOptions.find(opt => opt.size === size);
            if (sizeOption) {
              basePrice = sizeOption.price || 0;
            }
          } 
          // For fixed price services (Гігієнічний)
          else if (categoryService.fixedPrice) {
            basePrice = categoryService.fixedPrice;
          }
        }
      }
      
      // Try to get price from priceList as fallback
      if (basePrice === 0 && priceList.length > 0 && category) {
        const categoryData = priceList.find(cat => cat.name === category);
        if (categoryData && Array.isArray(categoryData.services) && categoryData.services.length > 0) {
          const serviceData = categoryData.services[0];
          basePrice = serviceData.price || 0;
        }
      }
      
      // Fallback to hardcoded prices only if no dynamic data available
      if (basePrice === 0) {
        if (category === 'Укріплення' && size) {
          basePrice = { 'Нульова': 100, S: 110, M: 120, L: 130, XL: 140, '2XL': 150, '3XL': 160 }[size] || 0;
        } else if (category === 'Нарощення' && size) {
          basePrice = { 'Нульова': 130, S: 130, M: 150, L: 170, XL: 190, '2XL': 210, '3XL': 230 }[size] || 0;
        } else if (category === 'Гігієнічний') {
          basePrice = 70;
        } else if (category === 'Ремонт') {
          basePrice = 0;
        }
      }
      
      // Get design price from dynamic data or fallback
      let designPrice = 0;
      if (design && priceListServices.length > 0) {
        const categoryService = priceListServices.find(svc => 
          svc.title === category || svc.name === category
        );
        if (categoryService && categoryService.designOptions) {
          const designOption = categoryService.designOptions.find(opt => opt.value === design);
          if (designOption) {
            designPrice = designOption.price || 0;
          }
        }
      }
      // Fallback to hardcoded if not found
      if (designPrice === 0) {
        designPrice = { 'Однотонний': 0, 'Простий': 15, 'Середній': 25, 'Складний': 35 }[design] || 0;
      }
      
      // Add matting price
      const mattingPrice = matting === 'Матове' ? 30 : 0;
      
      return basePrice + designPrice + mattingPrice;
    };
  }, [priceListServices, priceList]);
  
  // Clear size when service changes
  useEffect(() => {
    setSizeCategory('');
  }, [serviceCategory]);

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
      setPriceListServices(data);
      // Don't set defaults - let user choose manually
    })
    .catch(err => console.error('Client: Error fetching prices:', err));

  if (effectiveMode === "client") {
    fetch(`${API}/api/client/points?tg_id=${tgUser?.id}`)
      .then(r => r.json())
        .then(data => {
          setBonusPoints(data.points || 0);
          setHasReferralDiscount(data.referral_discount_available || false);
          setHasUsedReferralCode(data.has_used_referral || false);
        })
      .catch(() => setBonusPoints(0));

      const handleClick = () => {
        if (!selectedSlotId) {
          alert("❗ Обери дату і час");
          return;
        }

        const formData = new FormData();
        const clientName = tgUser?.first_name || "Anon";
        const effectiveTgId = tgUser?.id || '';

        if (!effectiveTgId) {
          alert('❗ Вкажіть ваш Telegram ID або відкрийте додаток через Telegram Web App');
          return;
        }

        formData.append("client", clientName);
formData.append("slot_id", selectedSlotId);
formData.append("design", designCategory);
formData.append("length", sizeCategory);
formData.append("type", mattingCategory);
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
  }, [effectiveMode, selectedSlotId, sizeCategory, designCategory, mattingCategory, comment, reference, currentHandsPhotos, tgUser?.first_name, tgUser?.id]);

  useEffect(() => {
    if (mode === "clientPromotions") {
      fetch(`${API}/api/client/points?tg_id=${tgUser?.id}`)
        .then(r => r.json())
          .then(data => {
            setBonusPoints(data.points || 0);
            setHasReferralDiscount(data.referral_discount_available || false);
            setHasUsedReferralCode(data.has_used_referral || false);
          })
        .catch(() => setBonusPoints(0));
    }
  }, [mode, tgUser?.id]);

  // Load full price structure for admin edit screen
  useEffect(() => {
    if (mode === "prices" && isAdmin) {
      setIsLoadingAdminPrices(true);
      fetch(`${API}/api/admin/prices-structure`, {
        headers: { 'x-init-data': WebApp.initData }
      })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAdminPricesDraft(data);
          }
        })
        .catch(() => setAdminPricesDraft([]))
        .finally(() => setIsLoadingAdminPrices(false));
    }
  }, [mode, isAdmin]);

  // Refresh bonuses when starting booking flow so points are available without opening promotions
  useEffect(() => {
    if (mode === "booking" && tgUser?.id) {
      fetch(`${API}/api/client/points?tg_id=${tgUser.id}`)
        .then(r => r.json())
        .then(data => {
          setBonusPoints(data.points || 0);
          setHasReferralDiscount(data.referral_discount_available || false);
          setHasUsedReferralCode(data.has_used_referral || false);
        })
        .catch(() => setBonusPoints(0));
      
      // Load active promotions
      fetch(`${API}/api/promotions`)
        .then(r => r.json())
        .then(data => setPromotions(data))
        .catch(() => setPromotions([]));
      
      // Reload price structure for booking
      fetch(`${API}/api/prices`)
        .then(r => r.json())
        .then(data => setPriceListServices(Array.isArray(data) ? data : []))
        .catch(() => setPriceListServices([]));
    }
  }, [mode, tgUser?.id]);

  useEffect(() => {
    setPrice(calculatePrice(serviceCategory, sizeCategory, designCategory, mattingCategory));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceCategory, sizeCategory, designCategory, mattingCategory, priceListServices]);

  // Refresh slots when entering client booking mode
  useEffect(() => {
    if (mode === "client") {
      fetch(`${API}/api/slots`)
        .then(r => r.json())
        .then(data => setSlots(data.filter(s => s.is_booked === false)))
        .catch(err => console.error('Client: Error refreshing slots:', err));
    }
  }, [mode]);


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

  const loadAppointments = useCallback(() => {
    fetch(`${API}/api/admin/appointments?status=${filter}`, {
      headers: {
        "x-init-data": WebApp.initData
      }
    })
      .then(r => r.json())
      .then(data => {
        setAppointments(data);
        
        // Mark appointments as viewed after a short delay
        // This allows the user to see which appointments are new
        setTimeout(() => {
          fetch(`${API}/api/admin/mark-viewed`, {
            method: "POST",
            headers: {
              "x-init-data": WebApp.initData
            }
          }).catch(err => console.error("Failed to mark as viewed:", err));
        }, 3000); // 3 seconds delay to show new appointments
      })
      .catch(() => alert("❌ Помилка завантаження"));
  }, [filter]);



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

  const deleteAppointment = (id) => {
    if (!window.confirm("Ви впевнені, що хочете видалити цей запис повністю? Цю дію неможливо скасувати.")) {
      return;
    }

    fetch(`${API}/api/admin/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-init-data": WebApp.initData
      },
      body: JSON.stringify({ id })
    })
      .then(r => r.json())
      .then(() => {
        alert("✅ Запис видалено!");
        loadAppointments();
      })
      .catch(() => alert("❌ Помилка видалення"));
  };

  const updatePrice = (id, newPrice) => {
    if (!newPrice || newPrice < 0) {
      alert("❌ Введіть коректну ціну");
      return;
    }

    fetch(`${API}/api/admin/appointment/price`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-init-data": WebApp.initData
      },
      body: JSON.stringify({ id, price: newPrice })
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(() => {
        alert("✅ Ціну оновлено!");
        setEditPriceModalOpen(false);
        setEditPriceValue('');
        setEditPriceAppointmentId(null);
        loadAppointments();
      })
      .catch(err => {
        console.error("Price update error:", err);
        alert(`❌ Помилка оновлення ціни: ${err.message}`);
      });
  };

  // ADMIN PANEL



  if (effectiveMode === "clients") {
  return (
    <div className="app-container">
      {/* Header */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '30px 20px',
        marginBottom: '25px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>👥</div>
        <h1 style={{ margin: '0 0 5px 0', fontSize: '1.8rem' }}>База клієнтів</h1>
        <p style={{ margin: '0', opacity: '0.9', fontSize: '0.95rem' }}>
          Всього клієнтів: {clientList.length}
        </p>
      </div>

      {/* Back Button */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
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

      {/* Clients Grid */}
      <div style={{
        display: 'grid',
        gap: '15px',
        marginBottom: '25px'
      }}>
        {clientList.map(c => (
          <div
            key={c.tg_id}
            className="menu-card"
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
            style={{
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
              borderRadius: '16px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
              border: 'none',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  color: '#2c3e50',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  👤 {c.client}
                </div>
                {c.username && (
                  <a
                    href={`https://t.me/${c.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      color: '#0088cc',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    📱 @{c.username} →
                  </a>
                )}
                {!c.username && c.tg_id && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      WebApp.openTelegramLink(`tg://user?id=${c.tg_id}`);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#0088cc',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    📱 Відкрити профіль →
                  </button>
                )}
              </div>
              <div style={{
                background: 'rgba(102, 126, 234, 0.15)',
                color: '#667eea',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>
                {c.total_visits || 0} {c.total_visits === 1 ? 'візит' : 'візитів'}
              </div>
            </div>
            
            <div style={{
              fontSize: '0.9rem',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ opacity: 0.7 }}>📅</span>
              <span>
                Останній візит: <strong>{c.last_visit ? new Date(c.last_visit.replace(' ', 'T')).toLocaleDateString('uk-UA', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                }) : "немає"}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>

      {clientList.length === 0 && (
        <div className="card" style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: '20px'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px', opacity: 0.5 }}>👥</div>
          <h3 style={{ color: '#666', margin: '0 0 10px 0' }}>Поки немає клієнтів</h3>
          <p style={{ color: '#888', margin: 0 }}>Клієнти з'являться після перших записів</p>
        </div>
      )}

      {modal}
      {priceEditModal}
    </div>
  );
}
if (effectiveMode === "clientHistory") {
  const totalVisits = clientHistory.length;
  const completedVisits = clientHistory.filter(h => h.status === 'approved').length;
  const totalSpent = clientHistory
    .filter(h => h.status === 'approved')
    .reduce((sum, h) => sum + (h.price || 0), 0);
  const avgPrice = completedVisits > 0 ? Math.round(totalSpent / completedVisits) : 0;
  
  return (
    <div className="app-container">
      {/* Client Header Card */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '25px',
        marginBottom: '20px',
        color: 'white',
        boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem'
          }}>
            👤
          </div>
          <div>
            <h2 style={{
              margin: '0 0 5px 0',
              fontSize: '1.5rem',
              fontWeight: '600'
            }}>{selectedClient?.client}</h2>
            {selectedClient?.username && (
              <a 
                href={`https://t.me/${selectedClient.username}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'rgba(255,255,255,0.9)',
                  textDecoration: 'none',
                  fontSize: '0.9rem'
                }}
              >
                @{selectedClient.username}
              </a>
            )}
            {!selectedClient?.username && selectedClient?.tg_id && (
              <button
                type="button"
                onClick={() => WebApp.openTelegramLink(`tg://user?id=${selectedClient.tg_id}`)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.6)',
                  borderRadius: '12px',
                  padding: '6px 10px',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                📱 Відкрити профіль
              </button>
            )}
          </div>
        </div>

        {/* Statistics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '15px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '5px' }}>
              Всього візитів
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
              {totalVisits}
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '15px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '5px' }}>
              Підтверджено
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
              {completedVisits}
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '15px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '5px' }}>
              Витрачено всього
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
              {totalSpent} zł
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '15px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '5px' }}>
              Середній чек
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
              {avgPrice} zł
            </div>
          </div>
        </div>

        {/* Add Bonus Points Button for Admin */}
        <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={() => {
              const points = prompt('Скільки балів додати клієнту?');
              if (points && !isNaN(points) && parseInt(points) > 0) {
                fetch(`${API}/api/admin/add-points`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'x-init-data': WebApp.initData
                  },
                  body: JSON.stringify({ tg_id: selectedClient.tg_id, points: parseInt(points) })
                })
                .then(r => r.json())
                .then(data => {
                  if (data.ok) {
                    alert(`✅ Додано ${points} балів! Новий баланс: ${data.newPoints}`);
                  } else {
                    alert('❌ Помилка: ' + (data.error || 'Невідома помилка'));
                  }
                })
                .catch(() => alert('❌ Помилка підключення'));
              }
            }}
            style={{
              background: 'rgba(255,255,255,0.25)',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              color: 'white',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
          >
            🎁 Додати бонусні бали
          </button>
        </div>
      </div>

      {/* Back Button */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <button 
          className="primary-btn"
          onClick={() => setMode("clients")}
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
          ⬅ Назад до клієнтів
        </button>
      </div>

      {/* Appointments Timeline */}
      <h3 style={{
        margin: '0 0 15px 0',
        fontSize: '1.2rem',
        color: '#2c3e50'
      }}>📜 Історія записів</h3>

      <div>
        {clientHistory.map(h => {
          const statusColors = {
            'approved': { bg: '#d4edda', border: '#28a745', text: '#155724', label: '✅ Підтверджено' },
            'pending': { bg: '#fff3cd', border: '#ffc107', text: '#856404', label: '⏳ Очікує' },
            'canceled': { bg: '#f8d7da', border: '#dc3545', text: '#721c24', label: '❌ Скасовано' }
          };
          const statusStyle = statusColors[h.status] || statusColors['pending'];
          
          return (
            <div
              key={h.id}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '15px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: `2px solid ${statusStyle.border}`
              }}
            >
              {/* Status Badge */}
              <div style={{
                display: 'inline-block',
                background: statusStyle.bg,
                color: statusStyle.text,
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '600',
                marginBottom: '12px',
                border: `1px solid ${statusStyle.border}`
              }}>
                {statusStyle.label}
              </div>

              {/* Date & Time */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                marginBottom: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#2c3e50'
                }}>
                  <span>📅</span>
                  <span>{h.date}</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#2c3e50'
                }}>
                  <span>⏰</span>
                  <span>{h.time}</span>
                </div>
                <div style={{
                  marginLeft: 'auto',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  color: '#667eea'
                }}>
                  {h.price} zł
                </div>
              </div>

              {/* Service Details */}
              <div style={{
                background: '#f8f9fa',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.1rem' }}>🎨</span>
                    <span style={{ color: '#666', fontSize: '0.9rem' }}>Дизайн:</span>
                    <span style={{ fontWeight: '600', color: '#2c3e50' }}>{h.design}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.1rem' }}>📏</span>
                    <span style={{ color: '#666', fontSize: '0.9rem' }}>Довжина:</span>
                    <span style={{ fontWeight: '600', color: '#2c3e50' }}>{h.length}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.1rem' }}>💅</span>
                    <span style={{ color: '#666', fontSize: '0.9rem' }}>Тип:</span>
                    <span style={{ fontWeight: '600', color: '#2c3e50' }}>{h.type}</span>
                  </div>
                  {h.service && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.1rem' }}>💼</span>
                      <span style={{ color: '#666', fontSize: '0.9rem' }}>Послуга:</span>
                      <span style={{ fontWeight: '600', color: '#2c3e50' }}>{h.service}</span>
                    </div>
                  )}
                </div>
              </div>

              {h.comment && (
                <div style={{
                  background: '#e3f2fd',
                  borderLeft: '4px solid #2196F3',
                  padding: '10px 12px',
                  borderRadius: '4px',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '0.85rem', color: '#1976d2', fontWeight: '600', marginBottom: '4px' }}>
                    💬 Коментар:
                  </div>
                  <div style={{ color: '#555', lineHeight: '1.4' }}>
                    {h.comment}
                  </div>
                </div>
              )}
              
              {/* Reference Image */}
              {h.reference_image && (() => {
                try {
                  const images = JSON.parse(h.reference_image);
                  if (Array.isArray(images) && images.length > 0) {
                    return (
                      <div style={{
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '10px'
                      }}>
                        <div style={{
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: '#667eea',
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>🖼️</span>
                          <span>Фото-приклад</span>
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                          gap: '10px'
                        }}>
                          {images.map((imgPath, idx) => (
                            <div
                              key={idx}
                              style={{
                                position: 'relative',
                                paddingTop: '100%',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                transition: 'transform 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              onClick={() => setModalImage(`${API}${imgPath}`)}
                            >
                              <img
                                src={`${API}${imgPath}`}
                                alt={`Reference ${idx + 1}`}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                } catch (e) {
                  console.error('Error parsing reference_image:', e);
                }
                return null;
              })()}
              
              {/* Current Hands Images */}
              {h.current_hands_images && (() => {
                try {
                  const images = JSON.parse(h.current_hands_images);
                  if (Array.isArray(images) && images.length > 0) {
                    return (
                      <div style={{
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        padding: '12px'
                      }}>
                        <div style={{
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: '#667eea',
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>✋</span>
                          <span>Поточний стан рук</span>
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                          gap: '10px'
                        }}>
                          {images.map((imgPath, idx) => (
                            <div
                              key={idx}
                              style={{
                                position: 'relative',
                                paddingTop: '100%',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                transition: 'transform 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              onClick={() => setModalImage(`${API}${imgPath}`)}
                            >
                              <img
                                src={`${API}${imgPath}`}
                                alt={`Current hands ${idx + 1}`}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                } catch (e) {
                  console.error('Error parsing current_hands_images:', e);
                }
                return null;
              })()}
            </div>
          );
        })}
      </div>

      {modal}
      {priceEditModal}
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

      {/* Back Button */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
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
                  {/* Послуга та ціна */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '10px',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}>
                    <span style={{ marginRight: '8px' }}>💼</span>
                    <span>{h.service}</span>
                  </div>

                  {/* Оформлення деталей */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '10px',
                    fontSize: '0.95rem'
                  }}>
                    <span style={{ marginRight: '8px' }}>🎨</span>
                    <span>{h.design}, {h.length}, {h.type}</span>
                  </div>

                  {/* Ціна */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '10px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: (label === "today" || label === "tomorrow") ? 'rgba(255,255,255,0.95)' : '#27ae60'
                  }}>
                    <span style={{ marginRight: '8px' }}>💰</span>
                    <span>{h.price} zł</span>
                  </div>

                  {/* Бонус інформація */}
                  {h.bonus_points_spent > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '10px',
                      fontSize: '0.9rem',
                      fontWeight: '500'
                    }}>
                      <span style={{ marginRight: '8px' }}>🎁</span>
                      <span>
                        {h.bonus_reward === 'free_design' && 'Безкоштовний дизайн'}
                        {h.bonus_reward === 'discount_50' && 'Знижка 50%'}
                        {h.bonus_reward === 'free_manicure' && 'Повний манікюр безкоштовно'}
                        {' (-' + h.bonus_points_spent + ' балів)'}
                      </span>
                    </div>
                  )}

                  {/* Коментар */}
                  {h.comment && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      fontSize: '0.9rem',
                      opacity: 0.8,
                      paddingTop: '10px',
                      borderTop: (label === "today" || label === "tomorrow") ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)'
                    }}>
                      <span style={{ marginRight: '8px', marginTop: '2px' }}>💬</span>
                      <span>{h.comment}</span>
                    </div>
                  )}
                </div>
                
                {/* Reference Image */}
                {h.reference_image && (() => {
                  try {
                    const images = JSON.parse(h.reference_image);
                    if (Array.isArray(images) && images.length > 0) {
                      return (
                        <div style={{
                          background: (label === "today" || label === "tomorrow")
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.05)',
                          borderRadius: '12px',
                          padding: '15px',
                          marginBottom: '15px'
                        }}>
                          <div style={{
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            marginBottom: '10px'
                          }}>
                            🖼️ Фото-приклад:
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                            gap: '10px'
                          }}>
                            {images.map((imgPath, idx) => (
                              <img
                                key={idx}
                                src={`${API}${imgPath}`}
                                alt={`Reference ${idx + 1}`}
                                style={{
                                  width: '100%',
                                  maxHeight: '120px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setModalImage(`${API}${imgPath}`)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    }
                  } catch (e) {
                    console.error('Error parsing reference_image:', e);
                  }
                  return null;
                })()}
                
                {/* Current Hands Images */}
                {h.current_hands_images && (() => {
                  try {
                    const images = JSON.parse(h.current_hands_images);
                    if (Array.isArray(images) && images.length > 0) {
                      return (
                        <div style={{
                          background: (label === "today" || label === "tomorrow")
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.05)',
                          borderRadius: '12px',
                          padding: '15px',
                          marginBottom: '15px'
                        }}>
                          <div style={{
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            marginBottom: '10px'
                          }}>
                            ✋ Поточний стан рук:
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                            gap: '10px'
                          }}>
                            {images.map((imgPath, idx) => (
                              <img
                                key={idx}
                                src={`${API}${imgPath}`}
                                alt={`Current hands ${idx + 1}`}
                                style={{
                                  width: '100%',
                                  maxHeight: '120px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setModalImage(`${API}${imgPath}`)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    }
                  } catch (e) {
                    console.error('Error parsing current_hands_images:', e);
                  }
                  return null;
                })()}

                {/* Action Buttons */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  marginTop: '20px'
                }}>
                  {/* Cancel Button */}
                  <button
                    onClick={() => {
                      const shouldCancel = window.confirm('Ви впевнені, що хочете скасувати цей запис?');
                      if (shouldCancel) {
                        fetch(`${API}/api/appointment/cancel`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'x-init-data': WebApp.initData },
                          body: JSON.stringify({ tg_id: tgUser.id })
                        })
                          .then(r => r.json())
                          .then(data => {
                            if (data.ok) {
                              alert('✅ Запис скасовано!');
                              setMyHistory(myHistory.filter(a => a.id !== h.id));
                            } else {
                              alert('❌ Помилка: ' + data.error);
                            }
                          })
                          .catch(err => {
                            console.error('Cancel error:', err);
                            alert('❌ Помилка скасування');
                          });
                      }
                    }}
                    style={{
                      background: (label === "today" || label === "tomorrow") ? 'rgba(255,255,255,0.2)' : 'rgba(231, 76, 60, 0.1)',
                      border: (label === "today" || label === "tomorrow") ? '2px solid rgba(255,255,255,0.4)' : '2px solid #e74c3c',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      color: (label === "today" || label === "tomorrow") ? 'white' : '#e74c3c',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = (label === "today" || label === "tomorrow") ? 'rgba(255,255,255,0.3)' : 'rgba(231, 76, 60, 0.2)';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = (label === "today" || label === "tomorrow") ? 'rgba(255,255,255,0.2)' : 'rgba(231, 76, 60, 0.1)';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    ❌ Скасувати
                  </button>
                  {/* Reschedule Button */}
                  <button
                    onClick={() => {
                      // Завантажимо доступні слоти
                      fetch(`${API}/api/slots`, {
                        headers: { "x-init-data": WebApp.initData }
                      })
                        .then(r => r.json())
                        .then(data => {
                          setSlots(data);
                          setMode("rescheduleAppointment");
                          setSelectedAppointmentId(h.id);
                          setRescheduleOldDate(h.date);
                          setRescheduleOldTime(h.time);
                          setRescheduleSelectedSlotId(null);
                        })
                        .catch(err => {
                          console.error('Error loading slots:', err);
                          alert('❌ Помилка завантаження часів');
                        });
                    }}
                    style={{
                      background: (label === "today" || label === "tomorrow") ? 'rgba(255,255,255,0.2)' : 'rgba(52, 152, 219, 0.1)',
                      border: (label === "today" || label === "tomorrow") ? '2px solid rgba(255,255,255,0.4)' : '2px solid #3498db',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      color: (label === "today" || label === "tomorrow") ? 'white' : '#3498db',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = (label === "today" || label === "tomorrow") ? 'rgba(255,255,255,0.3)' : 'rgba(52, 152, 219, 0.2)';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = (label === "today" || label === "tomorrow") ? 'rgba(255,255,255,0.2)' : 'rgba(52, 152, 219, 0.1)';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    📅 Перенести
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
          💰 ПРАЙС НА ПОСЛУГИ
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

      {/* Back Button */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
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

      {/* Services Grid */}
      <div style={{
        display: 'grid',
        gap: '25px',
        padding: '0 10px'
      }}>
        {priceListServices.length > 0 ? (
          priceListServices.map(service => (
            <div
              key={service.id || service.name}
              className="menu-card"
              style={{
                background: service.bgGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '25px',
                boxShadow: `0 8px 25px ${service.shadowColor || 'rgba(102, 126, 234, 0.3)'}`,
                border: 'none',
                color: 'white'
              }}
            >
              <div style={{
                fontSize: '3rem',
                marginBottom: '15px',
                textAlign: 'center'
              }}>{service.emoji || '💅'}</div>
              <h3 style={{
                margin: '0 0 20px 0',
                fontSize: '1.5rem',
                fontWeight: '600',
                textAlign: 'center'
              }}>{service.title || service.name}</h3>

              {/* Fixed Price Service (Hygienic) */}
              {service.fixedPrice ? (
                <div style={{
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: '12px',
                  padding: '20px',
                  color: '#2c3e50',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: service.accentColor || '#667eea', marginBottom: '10px' }}>
                    {service.fixedPrice} zł
                  </div>
                  <div style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <strong>У вартість входить:</strong>
                    </div>
                    {service.description && (
                      <ul style={{ margin: '10px 0', paddingLeft: '20px', textAlign: 'left', color: '#555' }}>
                        {service.description.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    )}
                    {service.note && (
                      <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic', marginTop: '15px' }}>
                        {service.note}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Length Options */}
                  {service.lengthOptions && service.lengthOptions.length > 0 && (
                    <div style={{
                      background: 'rgba(255,255,255,0.9)',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '15px',
                      color: '#2c3e50'
                    }}>
                      <h4 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', fontWeight: '600' }}>
                        Довжина нігтів
                      </h4>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {service.lengthOptions.map(item => (
                          <div key={item.size} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 15px',
                            background: service.overlayColor || 'rgba(0, 0, 0, 0.05)',
                            borderRadius: '8px'
                          }}>
                            <div>
                              <span style={{ fontWeight: '500' }}>{item.size}</span>
                              {item.length && (
                                <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: '8px' }}>({item.length})</span>
                              )}
                            </div>
                            <span style={{ fontWeight: 'bold', color: service.accentColor || '#667eea' }}>{item.price} zł</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Design Options */}
                  {service.designOptions && service.designOptions.length > 0 && (
                    <div style={{
                      background: 'rgba(255,255,255,0.9)',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '15px',
                      color: '#2c3e50'
                    }}>
                      <h4 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', fontWeight: '600' }}>
                        Дизайн (додатково)
                      </h4>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {service.designOptions.map(item => (
                          <div key={item.value} style={{
                            padding: '10px 15px',
                            background: service.overlayColor || 'rgba(0, 0, 0, 0.05)',
                            borderRadius: '8px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                              <span style={{ fontWeight: '500' }}>{item.value}</span>
                              <span style={{ fontWeight: 'bold', color: service.accentColor || '#667eea' }}>+{item.price} zł</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>{item.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Завантаження ціноутримання...
          </div>
        )}
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

      {/* Back Button */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
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
          <p style={{
            fontSize: '0.95rem',
            lineHeight: '1.5',
            margin: '10px 0 0 0',
            color: 'white',
            opacity: '0.95',
            textAlign: 'center'
          }}>
            За кожного приведеного друга <strong>ви отримаєте 2 бонусних бали 🎁</strong>
          </p>
          <div style={{
            fontSize: '2.5rem',
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
                5 балів
              </div>
              <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '12px', lineHeight: '1.3' }}>
                Безкоштовний дизайн
              </div>
            </div>

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
                Знижка 50%
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.9)',
              padding: '15px',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🔸</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
                14 балів
              </div>
              <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '12px', lineHeight: '1.3' }}>
                Повний манікюр безкоштовно
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '20px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '10px' }}>
              💡 Активуйте винагороду при бронюванні
            </div>
            <p style={{ margin: '0', fontSize: '0.9rem', opacity: 0.9 }}>
              Оберіть винагороду на останньому кроці (крок 4) під час оформлення запису
            </p>
          </div>
        </div>
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
          onClick={() => setMode("booking")}
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

  // Optimistically remove from UI for instant feedback
  setSlotsAdmin(prev => prev.filter(slot => slot.id !== id));

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

if (mode === "rescheduleAppointment") {
  return (
    <div className="app-container">
      {/* Modern Header */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '30px 20px',
        marginBottom: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(52, 152, 219, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <h2 style={{
          fontSize: '2.5rem',
          margin: '0 0 10px 0',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 1,
          position: 'relative'
        }}>
          📅 Перенести запис
        </h2>
        <p style={{
          fontSize: '1rem',
          margin: '0',
          opacity: 0.9,
          fontWeight: '300',
          zIndex: 1,
          position: 'relative'
        }}>
          Старий час: {rescheduleOldDate} — {rescheduleOldTime}
        </p>
      </div>

      {/* Back Button */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <button
          className="primary-btn"
          onClick={() => {
            setMode("myAppointments");
            setSelectedAppointmentId(null);
            setRescheduleSelectedSlotId(null);
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
          ← Назад до записів
        </button>
      </div>

      {/* Available Slots */}
      <div style={{ padding: '0 10px' }}>
        <h3 style={{ color: '#333', fontSize: '1.3rem', fontWeight: '600', marginBottom: '20px' }}>
          💫 Вільні часи для запису:
        </h3>

        {slots.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            borderRadius: '20px',
            boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
            marginBottom: '30px'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.6 }}>⏳</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '1.2rem', fontWeight: '600' }}>
              Вільних часів немає
            </h3>
            <p style={{ margin: '0', color: '#888', fontSize: '0.95rem' }}>
              Спробуйте пізніше 😊
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            {slots.map(slot => (
              <div
                key={slot.id}
                onClick={() => setRescheduleSelectedSlotId(slot.id)}
                style={{
                  background: rescheduleSelectedSlotId === slot.id
                    ? 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'
                    : 'linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%)',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  border: rescheduleSelectedSlotId === slot.id ? '3px solid #fff' : '2px solid transparent',
                  transition: 'all 0.3s ease',
                  boxShadow: rescheduleSelectedSlotId === slot.id
                    ? '0 8px 25px rgba(52, 152, 219, 0.4)'
                    : '0 4px 15px rgba(0,0,0,0.1)',
                  color: rescheduleSelectedSlotId === slot.id ? 'white' : '#333'
                }}
                onMouseEnter={(e) => {
                  if (rescheduleSelectedSlotId !== slot.id) {
                    e.target.style.transform = 'translateY(-5px)';
                    e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (rescheduleSelectedSlotId !== slot.id) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                  }
                }}
              >
                <div style={{ fontSize: '1.4rem', marginBottom: '10px', fontWeight: '600' }}>
                  📅 {slot.date}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '12px' }}>
                  ⏰ {slot.time}
                </div>
                {rescheduleSelectedSlotId === slot.id && (
                  <div style={{
                    display: 'inline-block',
                    background: 'rgba(255,255,255,0.2)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginTop: '10px'
                  }}>
                    ✅ Вибрано
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Confirm Button */}
        {rescheduleSelectedSlotId && (
          <div style={{
            textAlign: 'center',
            marginBottom: '30px'
          }}>
            <button
              onClick={() => {
                const selectedSlot = slots.find(s => s.id === rescheduleSelectedSlotId);
                if (!selectedSlot) {
                  alert('❌ Помилка: слот не знайдено');
                  return;
                }

                fetch(`${API}/api/appointment/reschedule`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-init-data': WebApp.initData
                  },
                  body: JSON.stringify({
                    tg_id: tgUser.id,
                    appointment_id: selectedAppointmentId,
                    new_date: selectedSlot.date,
                    new_time: selectedSlot.time
                  })
                })
                  .then(r => r.json())
                  .then(data => {
                    if (data.ok) {
                      alert('✅ Запис успішно перенесено!');
                      setMode("myAppointments");
                      setSelectedAppointmentId(null);
                      setRescheduleSelectedSlotId(null);
                      // Reload appointments
                      fetch(`${API}/api/my-appointments`, {
                        headers: { "x-init-data": WebApp.initData }
                      })
                        .then(r => r.json())
                        .then(data => setMyHistory(data))
                        .catch(err => console.error('Error reloading:', err));
                    } else {
                      alert('❌ Помилка: ' + (data.error || 'невідома помилка'));
                    }
                  })
                  .catch(err => {
                    console.error('Reschedule error:', err);
                    alert('❌ Помилка перенесення');
                  });
              }}
              style={{
                background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '18px 50px',
                fontSize: '1.1rem',
                fontWeight: '700',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(39, 174, 96, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 10px 30px rgba(39, 174, 96, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 6px 20px rgba(39, 174, 96, 0.3)';
              }}
            >
              ✅ Перенести на цей час
            </button>
          </div>
        )}
      </div>

      {modal}
    </div>
  );
}

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

      {/* Back to client menu */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
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

        {/* Price Management Card */}
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
          }}>Редагування цін</p>
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

        {/* Calendar View Card - REMOVED, moved to appointments history */}
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

      {/* Back Button */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
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

      {/* Back Button */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
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

      {/* View Toggle Buttons */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        padding: '0 10px'
      }}>
        <button
          onClick={() => setMode("slots")}
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          📋 Список
        </button>
        <button
          onClick={() => {
            // Reload slots data before switching to calendar
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
                setCalendarDate(new Date());
                setMode("slotsCalendar");
              })
              .catch(err => {
                console.error('Error loading slots:', err);
                alert('❌ Помилка завантаження слотів');
              });
          }}
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(79, 172, 254, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          📅 Календар
        </button>
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

      {modal}
    </div>
  );
}

if (mode === "slotsCalendar") {
  const formatDateForComparison = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('-') && dateStr.length === 10) {
      const [year, month, day] = dateStr.split('-');
      return `${day}.${month}.${year}`;
    }
    return dateStr.replace(/\//g, '.');
  };

  const selectedDateStr = formatDateForComparison(
    calendarDate.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  );

  const slotsOnSelectedDate = slotsAdmin.filter(slot => {
    const slotDate = formatDateForComparison(slot.date);
    return slotDate === selectedDateStr;
  });

  const datesWithSlots = new Set(
    slotsAdmin.map(slot => formatDateForComparison(slot.date))
  );

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = formatDateForComparison(
        date.toLocaleDateString('uk-UA', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      );
      if (datesWithSlots.has(dateStr)) {
        return 'calendar-date-with-appointments';
      }
    }
    return null;
  };

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
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
      }}>
        <h2 style={{
          fontSize: '2.5rem',
          margin: '0 0 10px 0',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          📅 Календар слотів
        </h2>
        <p style={{
          fontSize: '1rem',
          margin: '0',
          opacity: 0.9,
          fontWeight: '300'
        }}>
          Перегляд доступних годин
        </p>
      </div>

      {/* Back Button */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
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

      {/* View Toggle Buttons */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        padding: '0 10px'
      }}>
        <button
          onClick={() => setMode("slots")}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.9)',
            color: '#667eea',
            border: 'none',
            padding: '12px',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
          }}
        >
          📋 Список
        </button>
        <button
          onClick={() => setMode("slotsCalendar")}
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(79, 172, 254, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          📅 Календар
        </button>
      </div>

      {/* Calendar */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        borderRadius: '16px',
        padding: '30px 20px',
        marginBottom: '30px',
        boxShadow: '0 8px 25px rgba(168, 237, 234, 0.3)',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <Calendar
          onChange={setCalendarDate}
          value={calendarDate}
          tileClassName={tileClassName}
        />
      </div>

      {/* Slots on selected date */}
      <div className="card" style={{
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '30px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
        borderLeft: '5px solid #667eea'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50', fontSize: '1.2rem' }}>
          📍 Слоти на {selectedDateStr}
        </h3>

        {slotsOnSelectedDate.length > 0 ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {slotsOnSelectedDate.map((slot) => (
              <div key={slot.id} style={{
                background: 'white',
                border: slot.is_booked ? '2px solid #e74c3c' : '2px solid #2ecc71',
                borderRadius: '12px',
                padding: '15px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.3s ease'
              }}>
                <div>
                  <strong style={{ fontSize: '1.1rem' }}>{slot.time}</strong>
                  <br />
                  {slot.is_booked ? (
                    <small style={{ color: '#e74c3c', fontWeight: '600' }}>
                      🔴 Зайнято {slot.client_name ? `(${slot.client_name})` : ''}
                    </small>
                  ) : (
                    <small style={{ color: '#2ecc71', fontWeight: '600' }}>
                      🟢 Вільно
                    </small>
                  )}
                </div>
                {!slot.is_booked && (
                  <button
                    onClick={() => deleteSlot(slot.id)}
                    style={{
                      background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(231, 76, 60, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    🗑 Видалити
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#999', margin: '0' }}>Немає слотів на цей день</p>
        )}
      </div>

      {/* Back Button */}
      <div style={{ textAlign: 'center' }}>
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


// Admin Prices Management (full price structure)
if (mode === "prices") {
  const updateServiceField = (serviceId, updater) => {
    setAdminPricesDraft(prev => prev.map(s => s.id === serviceId ? updater(s) : s));
  };

  const updateNestedList = (serviceId, listKey, index, field, value) => {
    updateServiceField(serviceId, (service) => {
      const list = Array.isArray(service[listKey]) ? service[listKey] : [];
      const updated = list.map((item, idx) => idx === index ? { ...item, [field]: field === 'price' ? Number(value) : value } : item);
      return { ...service, [listKey]: updated };
    });
  };

  const addNestedItem = (serviceId, listKey) => {
    updateServiceField(serviceId, (service) => {
      const list = Array.isArray(service[listKey]) ? service[listKey] : [];
      const blank = listKey === 'lengthOptions' ? { size: '', length: '', price: 0 } : { value: '', price: 0, desc: '' };
      return { ...service, [listKey]: [...list, blank] };
    });
  };

  const removeNestedItem = (serviceId, listKey, index) => {
    updateServiceField(serviceId, (service) => {
      const list = Array.isArray(service[listKey]) ? service[listKey] : [];
      return { ...service, [listKey]: list.filter((_, idx) => idx !== index) };
    });
  };

  const saveAllPrices = async () => {
    setIsSavingAdminPrices(true);
    try {
      const response = await fetch(`${API}/api/admin/prices-structure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-init-data': WebApp.initData
        },
        body: JSON.stringify({ priceListServices: adminPricesDraft })
      });
      if (!response.ok) throw new Error('Save failed');
      const data = await response.json();
      if (data.priceListServices) {
        setAdminPricesDraft(data.priceListServices);
        setPriceListServices(data.priceListServices);
      }
      alert('✅ Прайс оновлено');
    } catch (e) {
      alert('❌ Не вдалося зберегти');
    } finally {
      setIsSavingAdminPrices(false);
    }
  };

  return (
    <div className="app-container">
      <div className="card" style={{
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '30px 20px',
        marginBottom: '20px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(79, 172, 254, 0.3)'
      }}>
        <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 700 }}>💰 Редагування прайсу</h2>
        <p style={{ margin: 0, opacity: 0.9 }}>Редагуйте всі ціни та опції</p>
      </div>

      <div className="card" style={{ padding: '16px', borderRadius: '16px' }}>
        {isLoadingAdminPrices ? (
          <div style={{ color: '#666' }}>Завантаження...</div>
        ) : adminPricesDraft.length === 0 ? (
          <div style={{ color: '#999' }}>Прайс порожній</div>
        ) : (
          adminPricesDraft.map(service => (
            <div key={service.id || service.title} style={{
              border: '1px solid #eee',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              boxShadow: '0 6px 18px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    {service.emoji} {service.title || service.name}
                  </div>
                  <div style={{ fontSize: 13, color: '#666' }}>ID: {service.id || '—'}</div>
                </div>
                {service.fixedPrice !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#555' }}>Фіксована ціна</span>
                    <input
                      type="number"
                      min="0"
                      value={service.fixedPrice ?? 0}
                      onChange={(e) => updateServiceField(service.id, (s) => ({ ...s, fixedPrice: Number(e.target.value) }))}
                      style={{ width: 110, padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
                    />
                  </div>
                )}
              </div>

              {service.lengthOptions && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Довжини</div>
                  {service.lengthOptions.length === 0 && (
                    <div style={{ color: '#999', marginBottom: 8 }}>Немає варіантів</div>
                  )}
                  {service.lengthOptions.map((opt, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px 120px 90px auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input
                        value={opt.size}
                        onChange={(e) => updateNestedList(service.id, 'lengthOptions', idx, 'size', e.target.value)}
                        placeholder="Розмір"
                        style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd', width: '100%' }}
                      />
                      <input
                        value={opt.length || ''}
                        onChange={(e) => updateNestedList(service.id, 'lengthOptions', idx, 'length', e.target.value)}
                        placeholder="Довжина (опц.)"
                        style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd', width: '100%', fontSize: '14px' }}
                      />
                      <input
                        type="number"
                        min="0"
                        value={opt.price}
                        onChange={(e) => updateNestedList(service.id, 'lengthOptions', idx, 'price', e.target.value)}
                        placeholder="Ціна"
                        style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd', width: '100%' }}
                      />
                      <button
                        onClick={() => removeNestedItem(service.id, 'lengthOptions', idx)}
                        style={{ border: 'none', background: '#ffe6e6', color: '#d9534f', borderRadius: 8, padding: '10px 12px', cursor: 'pointer' }}
                      >✕</button>
                    </div>
                  ))}
                  <button
                    onClick={() => addNestedItem(service.id, 'lengthOptions')}
                    style={{
                      marginTop: 6,
                      border: '1px dashed #667eea',
                      background: 'transparent',
                      color: '#667eea',
                      borderRadius: 8,
                      padding: '8px 12px',
                      cursor: 'pointer'
                    }}
                  >+ Додати довжину</button>
                </div>
              )}

              {service.designOptions && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Дизайни</div>
                  {service.designOptions.length === 0 && (
                    <div style={{ color: '#999', marginBottom: 8 }}>Немає варіантів</div>
                  )}
                  {service.designOptions.map((opt, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input
                        value={opt.value}
                        onChange={(e) => updateNestedList(service.id, 'designOptions', idx, 'value', e.target.value)}
                        placeholder="Назва"
                        style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
                      />
                      <input
                        value={opt.desc || ''}
                        onChange={(e) => updateNestedList(service.id, 'designOptions', idx, 'desc', e.target.value)}
                        placeholder="Опис"
                        style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
                      />
                      <input
                        type="number"
                        min="0"
                        value={opt.price}
                        onChange={(e) => updateNestedList(service.id, 'designOptions', idx, 'price', e.target.value)}
                        placeholder="Ціна"
                        style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
                      />
                      <button
                        onClick={() => removeNestedItem(service.id, 'designOptions', idx)}
                        style={{ border: 'none', background: '#ffe6e6', color: '#d9534f', borderRadius: 8, padding: '10px 12px', cursor: 'pointer' }}
                      >✕</button>
                    </div>
                  ))}
                  <button
                    onClick={() => addNestedItem(service.id, 'designOptions')}
                    style={{
                      marginTop: 6,
                      border: '1px dashed #667eea',
                      background: 'transparent',
                      color: '#667eea',
                      borderRadius: 8,
                      padding: '8px 12px',
                      cursor: 'pointer'
                    }}
                  >+ Додати дизайн</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <button
          onClick={saveAllPrices}
          disabled={isSavingAdminPrices}
          style={{
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 24px',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'white',
            cursor: isSavingAdminPrices ? 'wait' : 'pointer',
            opacity: isSavingAdminPrices ? 0.7 : 1,
            boxShadow: '0 4px 15px rgba(67, 233, 123, 0.3)'
          }}
        >{isSavingAdminPrices ? 'Збереження...' : 'Зберегти всі зміни'}</button>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button
          className="primary-btn"
          onClick={() => setMode("adminMenu")}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '15px 30px',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'white',
            cursor: 'pointer'
          }}
        >← Назад в адмінку</button>
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

      {/* Back Button */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
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
                .then(r => {
                  if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
                  return r.json();
                })
                .then(() => {
                  alert("✅ Акцію додано!");
                  document.getElementById("newPromoName").value = "";
                  document.getElementById("newPromoDesc").value = "";
                  document.getElementById("newPromoValue").value = "";
                  document.getElementById("newPromoValidFrom").value = "";
                  document.getElementById("newPromoValidUntil").value = "";
                  // Reload promotions
                  return fetch(`${API}/api/admin/promotions`, {
                    headers: { "x-init-data": WebApp.initData }
                  });
                })
                .then(r => r.json())
                .then(setPromotions)
                .catch(err => {
                  console.error('❌ Помилка додавання акції:', err);
                  alert(`❌ Помилка: ${err.message}`);
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
              cursor: 'pointer',
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
                      .then(r => {
                        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
                        return r.json();
                      })
                      .then(() => {
                        alert("✅ Акцію оновлено!");
                        // Reload promotions
                        return fetch(`${API}/api/admin/promotions`, {
                          headers: { "x-init-data": WebApp.initData }
                        });
                      })
                      .then(r => r.json())
                      .then(setPromotions)
                      .catch(err => {
                        console.error('❌ Помилка оновлення акції:', err);
                        alert(`❌ Помилка: ${err.message}`);
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
                      .then(r => {
                        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
                        return r.json();
                      })
                      .then(() => {
                        alert("✅ Акцію видалено!");
                        // Reload promotions
                        return fetch(`${API}/api/admin/promotions`, {
                          headers: { "x-init-data": WebApp.initData }
                        });
                      })
                      .then(r => r.json())
                      .then(setPromotions)
                      .catch(err => {
                        console.error('❌ Помилка видалення акції:', err);
                        alert(`❌ Помилка: ${err.message}`);
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

      {/* Back Button */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
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

      {modal}
    </div>
  );
}

if (mode === "booking") {
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

              {/* Service Options */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 15 }}>
                {/* Dynamic services from priceListServices */}
                {priceListServices.length > 0 ? (
                  priceListServices.map((service) => (
                    <div
                      key={service.id || service.name}
                      onClick={() => {
                        setServiceCategory(service.title || service.name);
                        setServiceSub(service.title || service.name);
                        setSizeCategory("");
                        setDesignCategory("Однотонний");
                        setMattingCategory("Глянцеве");
                        // Set price based on service type
                        if (service.fixedPrice) {
                          setPrice(service.fixedPrice);
                        } else {
                          setPrice(0);
                        }
                      }}
                      style={{
                        padding: 20,
                        borderRadius: 14,
                        border: serviceCategory === (service.title || service.name) ? '2px solid #667eea' : '2px solid #e0e0e0',
                        background: serviceCategory === (service.title || service.name) ? 'rgba(102, 126, 234, 0.1)' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 10 }}>{service.emoji}</div>
                      <div style={{ fontWeight: 'bold', marginBottom: 5, color: '#333', fontSize: 16 }}>
                        {service.title || service.name}
                      </div>
                      <div style={{ color: '#667eea', fontWeight: 'bold', fontSize: 14 }}>
                        {service.fixedPrice 
                          ? `${service.fixedPrice} zł`
                          : service.lengthOptions && service.lengthOptions.length > 0
                          ? `від ${Math.min(...service.lengthOptions.map(o => o.price))} zł`
                          : 'за домовленістю'
                        }
                      </div>
                    </div>
                  ))
                ) : (
                  /* Fallback to hardcoded if no data loaded */
                  <>
                    {/* Укріплення */}
                    <div
                      onClick={() => {
                        setServiceCategory("Укріплення");
                        setServiceSub("Укріплення");
                        setSizeCategory("");
                        setDesignCategory("Однотонний");
                        setMattingCategory("Глянцеве");
                        setPrice(0);
                      }}
                      style={{
                        padding: 20,
                        borderRadius: 14,
                        border: serviceCategory === "Укріплення" ? '2px solid #667eea' : '2px solid #e0e0e0',
                        background: serviceCategory === "Укріплення" ? 'rgba(102, 126, 234, 0.1)' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 10 }}>💪</div>
                      <div style={{ fontWeight: 'bold', marginBottom: 5, color: '#333', fontSize: 16 }}>
                        Укріплення 💅
                      </div>
                      <div style={{ color: '#666', fontSize: 13 }}>
                        від 100 zł
                      </div>
                    </div>

                    {/* Нарощення */}
                    <div
                      onClick={() => {
                        setServiceCategory("Нарощення");
                        setServiceSub("Нарощення");
                        setSizeCategory("");
                        setDesignCategory("Однотонний");
                        setMattingCategory("Глянцеве");
                        setPrice(0);
                      }}
                      style={{
                        padding: 20,
                        borderRadius: 14,
                        border: serviceCategory === "Нарощення" ? '2px solid #667eea' : '2px solid #e0e0e0',
                        background: serviceCategory === "Нарощення" ? 'rgba(102, 126, 234, 0.1)' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 10 }}>✨</div>
                      <div style={{ fontWeight: 'bold', marginBottom: 5, color: '#333', fontSize: 16 }}>
                        Нарощення
                      </div>
                      <div style={{ color: '#666', fontSize: 13 }}>
                        від 130 zł
                      </div>
                    </div>

                    {/* Гігієнічний */}
                    <div
                      onClick={() => {
                        setServiceCategory("Гігієнічний");
                        setServiceSub("Гігієнічний");
                        setSizeCategory("");
                        setDesignCategory("");
                        setMattingCategory("");
                        setPrice(70);
                      }}
                      style={{
                        padding: 20,
                        borderRadius: 14,
                        border: serviceCategory === "Гігієнічний" ? '2px solid #667eea' : '2px solid #e0e0e0',
                        background: serviceCategory === "Гігієнічний" ? 'rgba(102, 126, 234, 0.1)' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 10 }}>💅</div>
                      <div style={{ fontWeight: 'bold', marginBottom: 5, color: '#333', fontSize: 16 }}>
                        Гігієнічний 
                      </div>
                      <div style={{ color: '#667eea', fontWeight: 'bold', fontSize: 14 }}>
                        70 zł
                      </div>
                    </div>
                  </>
                )}
              </div>
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

        {/* Step 3: Size, Design & Details */}
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
              <h2 style={{ color: '#333', marginBottom: 10 }}>Розмір, дизайн та покриття</h2>
              <p style={{ color: '#666' }}>Виберіть деталі для вашого манікюру</p>
            </div>

            <div style={{ display: 'grid', gap: 25 }}>

              {/* ===== УКРІПЛЕННЯ MENU ===== */}
              {serviceCategory.includes("Укріплення") && !serviceCategory.includes("Нарощення") && (
                <>
                  {/* Size Selection - УКРІПЛЕННЯ ONLY */}
                  <div>
                    <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', color: '#555' }}>
                      Довжина нігтів:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                      {priceListServices.length > 0 && priceListServices.find(s => (s.title || s.name) === "Укріплення")?.lengthOptions ? (
                        priceListServices.find(s => (s.title || s.name) === "Укріплення").lengthOptions.map(item => (
                          <button
                            key={item.size}
                            onClick={() => {
                              setSizeCategory(item.size);
                              setPrice(calculatePrice("Укріплення", item.size, designCategory, mattingCategory));
                            }}
                            style={{
                              padding: 15,
                              borderRadius: 12,
                              border: sizeCategory === item.size ? '2px solid #FF6B9D' : '2px solid #e0e0e0',
                              background: sizeCategory === item.size ? 'rgba(255,107,157,0.1)' : 'white',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              textAlign: 'center'
                            }}
                          >
                            <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 3 }}>{item.size}</div>
                            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#667eea' }}>{item.price} zł</div>
                          </button>
                        ))
                      ) : (
                        /* Fallback to hardcoded */
                        [
                          { size: 'Нульова', price: 100 },
                          { size: 'S', price: 110 },
                          { size: 'M', price: 120 },
                          { size: 'L', price: 130 },
                          { size: 'XL', price: 140 },
                          { size: '2XL', price: 150 },
                          { size: '3XL', price: 160 }
                        ].map(item => (
                          <button
                            key={item.size}
                            onClick={() => {
                              setSizeCategory(item.size);
                              setPrice(calculatePrice("Укріплення", item.size, designCategory, mattingCategory));
                            }}
                            style={{
                              padding: 15,
                              borderRadius: 12,
                              border: sizeCategory === item.size ? '2px solid #FF6B9D' : '2px solid #e0e0e0',
                              background: sizeCategory === item.size ? 'rgba(255,107,157,0.1)' : 'white',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              textAlign: 'center'
                            }}
                          >
                            <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 3 }}>{item.size}</div>
                            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#667eea' }}>{item.price} zł</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Design Selection - УКРІПЛЕННЯ */}
                  <div>
                    <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', color: '#555' }}>
                      Дизайн:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                      {priceListServices.length > 0 && priceListServices.find(s => (s.title || s.name) === "Укріплення")?.designOptions ? (
                        priceListServices.find(s => (s.title || s.name) === "Укріплення").designOptions.map(item => {
                          const isSelected = designCategory === item.value;
                          return (
                            <button
                              key={item.value}
                              onClick={() => {
                                setDesignCategory(item.value);
                                setPrice(calculatePrice("Укріплення", sizeCategory, item.value, mattingCategory));
                              }}
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                border: isSelected ? '2px solid #FF6B9D' : '2px solid #e0e0e0',
                                background: isSelected ? 'rgba(255,107,157,0.1)' : 'white',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                textAlign: 'center'
                              }}
                            >
                              <div style={{ fontWeight: 'bold', marginBottom: 3, color: '#333' }}>{item.value}</div>
                              <div style={{ fontSize: 12, color: '#666', marginBottom: 3 }}>{item.desc}</div>
                              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#667eea' }}>+{item.price} zł</div>
                            </button>
                          );
                        })
                      ) : (
                        /* Fallback to hardcoded */
                        [
                          { value: 'Однотонний', price: 0, desc: 'Без декору' },
                          { value: 'Простий', price: 15, desc: 'Крапки, лінії, блискітки' },
                          { value: 'Середній', price: 25, desc: 'Френч, геометрія, наклейки' },
                          { value: 'Складний', price: 35, desc: 'Детальні малюнки, об\'ємні' }
                        ].map(item => {
                          const isSelected = designCategory === item.value;
                          return (
                            <button
                              key={item.value}
                              onClick={() => {
                                setDesignCategory(item.value);
                                setPrice(calculatePrice("Укріплення", sizeCategory, item.value, mattingCategory));
                              }}
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                border: isSelected ? '2px solid #FF6B9D' : '2px solid #e0e0e0',
                                background: isSelected ? 'rgba(255,107,157,0.1)' : 'white',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                textAlign: 'center'
                              }}
                            >
                              <div style={{ fontWeight: 'bold', marginBottom: 3, color: '#333' }}>{item.value}</div>
                              <div style={{ fontSize: 12, color: '#666', marginBottom: 3 }}>{item.desc}</div>
                              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#667eea' }}>+{item.price} zł</div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ===== НАРОЩЕННЯ MENU ===== */}
              {serviceCategory.includes("Нарощення") && !serviceCategory.includes("Укріплення") && (
                <>
                  {/* Size Selection - НАРОЩЕННЯ ONLY */}
                  <div>
                    <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', color: '#555' }}>
                      Довжина нігтів:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                      {priceListServices.length > 0 && priceListServices.find(s => (s.title || s.name) === "Нарощення")?.lengthOptions ? (
                        priceListServices.find(s => (s.title || s.name) === "Нарощення").lengthOptions.map(item => (
                          <button
                            key={item.size}
                            onClick={() => {
                              setSizeCategory(item.size);
                              setPrice(calculatePrice("Нарощення", item.size, designCategory, mattingCategory));
                            }}
                            style={{
                              padding: 15,
                              borderRadius: 12,
                              border: sizeCategory === item.size ? '2px solid #FF6B9D' : '2px solid #e0e0e0',
                              background: sizeCategory === item.size ? 'rgba(255,107,157,0.1)' : 'white',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              textAlign: 'center'
                            }}
                          >
                            <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 3 }}>{item.size}</div>
                            {item.length && <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>{item.length}</div>}
                            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#667eea' }}>{item.price} zł</div>
                          </button>
                        ))
                      ) : (
                        /* Fallback to hardcoded */
                        [
                          { size: 'S', length: '±1cm', price: 130 },
                          { size: 'M', length: '±1.5cm', price: 150 },
                          { size: 'L', length: '±2cm', price: 170 },
                          { size: 'XL', length: '±2.5cm', price: 190 },
                          { size: '2XL', length: '±3cm', price: 210 },
                          { size: '3XL', length: '±3.5cm', price: 230 }
                        ].map(item => (
                          <button
                            key={item.size}
                            onClick={() => {
                              setSizeCategory(item.size);
                              setPrice(calculatePrice("Нарощення", item.size, designCategory, mattingCategory));
                            }}
                            style={{
                              padding: 15,
                              borderRadius: 12,
                              border: sizeCategory === item.size ? '2px solid #FF6B9D' : '2px solid #e0e0e0',
                              background: sizeCategory === item.size ? 'rgba(255,107,157,0.1)' : 'white',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              textAlign: 'center'
                            }}
                          >
                            <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 3 }}>{item.size}</div>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>{item.length}</div>
                            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#667eea' }}>{item.price} zł</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Design Selection - НАРОЩЕННЯ */}
                  <div>
                    <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', color: '#555' }}>
                      Дизайн:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                      {priceListServices.length > 0 && priceListServices.find(s => (s.title || s.name) === "Нарощення")?.designOptions ? (
                        priceListServices.find(s => (s.title || s.name) === "Нарощення").designOptions.map(item => {
                          const isSelected = designCategory === item.value;
                          return (
                            <button
                              key={item.value}
                              onClick={() => {
                                setDesignCategory(item.value);
                                setPrice(calculatePrice("Нарощення", sizeCategory, item.value, mattingCategory));
                              }}
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                border: isSelected ? '2px solid #FF6B9D' : '2px solid #e0e0e0',
                                background: isSelected ? 'rgba(255,107,157,0.1)' : 'white',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                textAlign: 'center'
                              }}
                            >
                              <div style={{ fontWeight: 'bold', marginBottom: 3, color: '#333' }}>{item.value}</div>
                              <div style={{ fontSize: 12, color: '#666', marginBottom: 3 }}>{item.desc}</div>
                              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#667eea' }}>+{item.price} zł</div>
                            </button>
                          );
                        })
                      ) : (
                        /* Fallback to hardcoded */
                        [
                          { value: 'Однотонний', price: 0, desc: 'Без декору' },
                          { value: 'Простий', price: 15, desc: 'Крапки, лінії, блискітки' },
                          { value: 'Середній', price: 25, desc: 'Френч, геометрія, наклейки' },
                          { value: 'Складний', price: 35, desc: 'Детальні малюнки, об\'ємні' }
                        ].map(item => {
                          const isSelected = designCategory === item.value;
                          return (
                            <button
                              key={item.value}
                              onClick={() => {
                                setDesignCategory(item.value);
                                setPrice(calculatePrice("Нарощення", sizeCategory, item.value, mattingCategory));
                              }}
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                border: isSelected ? '2px solid #FF6B9D' : '2px solid #e0e0e0',
                                background: isSelected ? 'rgba(255,107,157,0.1)' : 'white',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                textAlign: 'center'
                              }}
                            >
                              <div style={{ fontWeight: 'bold', marginBottom: 3, color: '#333' }}>{item.value}</div>
                              <div style={{ fontSize: 12, color: '#666', marginBottom: 3 }}>{item.desc}</div>
                              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#667eea' }}>+{item.price} zł</div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Current Hands Photos */}
              <div>
                <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', color: '#555' }}>
                  Фото ваших нігтів (необов'язково):
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
                  <div style={{ fontSize: 24, marginBottom: 10 }}>📷</div>
                  <div style={{ color: '#666' }}>
                    {currentHandsPhotos.length > 0 ? `Вибрано ${currentHandsPhotos.length} фото` : 'Натисніть щоб додати фото'}
                  </div>
                </div>
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
              </div>

              {/* Referral Code */}
              {!hasUsedReferralCode && (
              <div>
                <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', color: '#555' }}>
                  Реферальний код (необов'язково):
                </label>
                <input
                  type="text"
                  placeholder="Введіть реферальний код"
                  value={enteredReferralCode}
                  onChange={(e) => setEnteredReferralCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 12,
                    border: '2px solid #e0e0e0',
                    fontSize: 14
                  }}
                />
              </div>
              )}

              {/* Bonus info only; selection happens on confirmation step */}
              {bonusPoints > 0 && (
                <div style={{
                  background: 'rgba(240, 147, 251, 0.15)',
                  padding: '12px 15px',
                  borderRadius: '12px',
                  color: '#c44569',
                  marginBottom: '15px',
                  border: '1px dashed rgba(244, 114, 182, 0.5)'
                }}>
                  🎁 У вас {bonusPoints} бонусних балів. Оберіть винагороду на кроці підтвердження.
                </div>
              )}

              {/* Comment */}
              <div>
                <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', color: '#555' }}>
                  Побажання та коментарі (необов'язково):
                </label>
                <textarea
                  placeholder="Поділіться своїми побажаннями..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: 12,
                    borderRadius: 12,
                    border: '2px solid #e0e0e0',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* File inputs hidden */}
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
                onClick={() => {
                  const needsSize = serviceCategory.includes('Укріплення') || serviceCategory.includes('Нарощення');
                  if (needsSize && !sizeCategory) {
                    alert('❗ Оберіть довжину перед продовженням');
                    return;
                  }
                  if (needsSize && !designCategory) {
                    alert('❗ Оберіть дизайн перед продовженням');
                    return;
                  }
                  nextStep();
                }}
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

            <div style={{ marginBottom: 30 }}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 20,
                padding: 25,
                color: 'white',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
              }}>
                <div style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  marginBottom: 20,
                  paddingBottom: 15,
                  borderBottom: '2px solid rgba(255,255,255,0.2)'
                }}>
                  📋 Деталі запису
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    padding: 15
                  }}>
                    <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 5 }}>Послуга</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold' }}>{serviceCategory}</div>
                  </div>

                  <div style={{ 
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    padding: 15
                  }}>
                    <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 5 }}>Дата та час</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold' }}>{selectedSlot?.date} о {selectedSlot?.time}</div>
                  </div>

                  {sizeCategory && (
                    <div style={{ 
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: 12,
                      padding: 15
                    }}>
                      <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 5 }}>Розмір</div>
                      <div style={{ fontSize: 18, fontWeight: 'bold' }}>{sizeCategory}</div>
                    </div>
                  )}

                  {designCategory && designCategory !== "Однотонний" && (
                    <div style={{ 
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: 12,
                      padding: 15
                    }}>
                      <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 5 }}>Дизайн</div>
                      <div style={{ fontSize: 18, fontWeight: 'bold' }}>{designCategory}</div>
                    </div>
                  )}

                  {mattingCategory && mattingCategory !== "Глянцеве" && (
                    <div style={{ 
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: 12,
                      padding: 15
                    }}>
                      <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 5 }}>Покриття</div>
                      <div style={{ fontSize: 18, fontWeight: 'bold' }}>{mattingCategory}</div>
                    </div>
                  )}

                    {(() => {
                      let designPrice = 0;
                      if (designCategory && priceListServices.length > 0) {
                        const categoryService = priceListServices.find(svc => 
                          svc.title === serviceCategory || svc.name === serviceCategory
                        );
                        if (categoryService && categoryService.designOptions) {
                          const designOption = categoryService.designOptions.find(opt => opt.value === designCategory);
                          if (designOption) {
                            designPrice = designOption.price || 0;
                          }
                        }
                      }
                      // Fallback to hardcoded if not found
                      if (designPrice === 0) {
                        designPrice = { 'Однотонний': 0, 'Простий': 15, 'Середній': 25, 'Складний': 35 }[designCategory] || 0;
                      }

                      const mattingPrice = mattingCategory === 'Матове' ? 30 : 0;
                      let basePrice = 0;
                      
                      // Try to get price from priceListServices first
                      if (priceListServices.length > 0 && serviceCategory) {
                        const categoryService = priceListServices.find(svc => 
                          svc.title === serviceCategory || svc.name === serviceCategory
                        );
                        
                        if (categoryService) {
                          // For services with lengthOptions (Укріплення, Нарощення)
                          if (categoryService.lengthOptions && sizeCategory) {
                            const sizeOption = categoryService.lengthOptions.find(opt => opt.size === sizeCategory);
                            if (sizeOption) {
                              basePrice = sizeOption.price || 0;
                            }
                          } 
                          // For fixed price services (Гігієнічний)
                          else if (categoryService.fixedPrice) {
                            basePrice = categoryService.fixedPrice;
                          }
                        }
                      }
                      
                      // Try to get price from priceList as fallback
                      if (basePrice === 0 && priceList.length > 0 && serviceCategory) {
                        const categoryData = priceList.find(cat => cat.name === serviceCategory);
                        if (categoryData && Array.isArray(categoryData.services) && categoryData.services.length > 0) {
                          const serviceData = categoryData.services[0];
                          basePrice = serviceData.price || 0;
                        }
                      }
                      
                      // Fallback to hardcoded prices only if no dynamic data available
                      if (basePrice === 0) {
                        if (serviceCategory === 'Укріплення' && sizeCategory) {
                          basePrice = { 'Нульова': 100, S: 110, M: 120, L: 130, XL: 140, '2XL': 150, '3XL': 160 }[sizeCategory] || 0;
                        } else if (serviceCategory === 'Нарощення' && sizeCategory) {
                          basePrice = { 'Нульова': 130, S: 130, M: 150, L: 170, XL: 190, '2XL': 210, '3XL': 230 }[sizeCategory] || 0;
                        } else if (serviceCategory === 'Гігієнічний') {
                          basePrice = 70;
                        } else if (serviceCategory === 'Ремонт') {
                          basePrice = 0;
                        } else {
                          basePrice = Math.max(price - designPrice - mattingPrice, 0);
                        }
                      }
                      const rawPrice = price || (basePrice + designPrice + mattingPrice);

                      const referralDiscountAmount = hasReferralDiscount ? Math.round(rawPrice * 0.2) : 0;
                      
                      // Calculate promotion discount from active promotions
                      let promotionDiscountAmount = 0;
                      if (promotions.length > 0) {
                        const activePromo = promotions[0]; // Take first (highest priority)
                        if (activePromo.discount_type === 'percentage') {
                          promotionDiscountAmount = Math.round(rawPrice * (activePromo.discount_value / 100));
                        } else if (activePromo.discount_type === 'fixed') {
                          promotionDiscountAmount = activePromo.discount_value;
                        }
                      }
                      
                      const bestDiscount = Math.max(referralDiscountAmount, promotionDiscountAmount);
                      
                      let bonusDiscount = 0;
                      let bonusLabel = '';
                      if (bonusPointsToUse === 5) {
                        bonusLabel = 'Безкоштовний дизайн 🎨';
                        bonusDiscount = designPrice;
                      } else if (bonusPointsToUse === 10) {
                        bonusLabel = 'Знижка 50% 💰';
                        bonusDiscount = Math.round(rawPrice * 0.5);
                      } else if (bonusPointsToUse === 14) {
                        bonusLabel = 'Повний манікюр безкоштовно 💅';
                        bonusDiscount = rawPrice;
                      }

                      const appliedLabel = bestDiscount === 0 ? null : (bestDiscount === referralDiscountAmount ? 'Реферальна знижка' : 'Акційна знижка');
                      const effectiveDiscount = bonusPointsToUse > 0 ? bonusDiscount : bestDiscount;
                      const finalAfterDiscount = Math.max(rawPrice - effectiveDiscount, 0);

                      return (
                        <div style={{ 
                          background: 'rgba(255,255,255,0.25)',
                          borderRadius: 12,
                          padding: 20,
                          marginTop: 10
                        }}>
                          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 12 }}>📊 Розбір вартості</div>
                          
                          <div style={{ 
                            fontSize: 13, 
                            opacity: 0.9, 
                            marginBottom: 8,
                            display: 'flex',
                            justifyContent: 'space-between',
                            paddingBottom: 8,
                            borderBottom: '1px solid rgba(255,255,255,0.2)'
                          }}>
                            <span>Базова послуга ({serviceCategory}{sizeCategory ? `, ${sizeCategory}` : ''})</span>
                            <span style={{ fontWeight: 'bold' }}>{basePrice} zł</span>
                          </div>

                          {designCategory && designCategory !== "Однотонний" && (
                            <div style={{ 
                              fontSize: 13, 
                              opacity: 0.9, 
                              marginBottom: 8,
                              display: 'flex',
                              justifyContent: 'space-between'
                            }}>
                              <span>+ Дизайн: {designCategory}</span>
                              <span style={{ fontWeight: 'bold', color: '#FFD700' }}>+{designPrice} zł</span>
                            </div>
                          )}

                          {mattingCategory && mattingCategory !== "Глянцеве" && (
                            <div style={{ 
                              fontSize: 13, 
                              opacity: 0.9, 
                              marginBottom: 12,
                              display: 'flex',
                              justifyContent: 'space-between',
                              paddingBottom: 12,
                              borderBottom: '1px solid rgba(255,255,255,0.2)'
                            }}>
                              <span>+ {mattingCategory} покриття</span>
                              <span style={{ fontWeight: 'bold', color: '#FFD700' }}>+{mattingPrice} zł</span>
                            </div>
                          )}

                          <div style={{ 
                            fontSize: 16, 
                            fontWeight: 'bold',
                            marginBottom: 12,
                            display: 'flex',
                            justifyContent: 'space-between',
                            paddingBottom: 12,
                            borderBottom: '1px solid rgba(255,255,255,0.2)'
                          }}>
                            <span>Загальна вартість:</span>
                            <span>{rawPrice} zł</span>
                          </div>

                          {(bestDiscount > 0 || bonusPointsToUse > 0) && (
                            <div style={{ marginBottom: 12 }}>
                              {bonusPointsToUse > 0 ? (
                                <div>
                                  <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 6, color: '#FFD700' }}>
                                    🎁 Активована винагорода: {bonusLabel}
                                  </div>
                                  {bonusDiscount > 0 && (
                                    <div style={{ 
                                      fontSize: 14, 
                                      marginBottom: 8,
                                      display: 'flex',
                                      justifyContent: 'space-between'
                                    }}>
                                      <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>Результат до винагороди:</span>
                                      <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{rawPrice} zł</span>
                                    </div>
                                  )}
                                  {bonusDiscount > 0 && (
                                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                                      ✅ Віднімаємо: -{bonusDiscount} zł
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 6 }}>Активні знижки (не сумуються)</div>
                                  {promotionDiscountAmount > 0 && (
                                    <div style={{ fontSize: 13, marginBottom: 4, opacity: appliedLabel === 'Акційна знижка' ? 1 : 0.5 }}>
                                      🔥 Акційна знижка: -{promotionDiscountAmount} zł {appliedLabel === 'Акційна знижка' ? '(застосовано)' : ''}
                                    </div>
                                  )}
                                  {referralDiscountAmount > 0 && (
                                    <div style={{ fontSize: 13, marginBottom: 8, opacity: appliedLabel === 'Реферальна знижка' ? 1 : 0.5 }}>
                                      🎁 Реферальна знижка: -{referralDiscountAmount} zł {appliedLabel === 'Реферальна знижка' ? '(застосовано)' : ''}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <div style={{ 
                            fontSize: 24, 
                            fontWeight: 'bold',
                            color: effectiveDiscount > 0 ? '#FFD700' : '#fff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: 12,
                            borderTop: '2px solid rgba(255,255,255,0.3)'
                          }}>
                            <span>Остаточна вартість:</span>
                            <span>{finalAfterDiscount} zł</span>
                          </div>

                          {bonusPoints > 0 && (
                            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '2px solid rgba(255,255,255,0.2)' }}>
                              <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 12, fontWeight: 'bold' }}>
                                🎁 У вас є {bonusPoints} балів
                              </div>
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                gap: '10px'
                              }}>
                                {bonusPoints >= 5 && (
                                  <button
                                    onClick={() => {
                                      setBonusPointsToUse(bonusPointsToUse === 5 ? 0 : 5);
                                      setSelectedBonusReward(bonusPointsToUse === 5 ? null : 'free_design');
                                    }}
                                    style={{
                                      padding: '12px 16px',
                                      borderRadius: '10px',
                                      border: bonusPointsToUse === 5 ? '3px solid #FFD700' : '2px solid rgba(255,255,255,0.3)',
                                      background: bonusPointsToUse === 5 ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.1)',
                                      color: 'white',
                                      cursor: 'pointer',
                                      fontSize: '13px',
                                      fontWeight: '600',
                                      transition: 'all 0.3s'
                                    }}
                                  >
                                    {bonusPointsToUse === 5 ? '✅' : ''} 5 балів
                                  </button>
                                )}
                                {bonusPoints >= 10 && (
                                  <button
                                    onClick={() => {
                                      setBonusPointsToUse(bonusPointsToUse === 10 ? 0 : 10);
                                      setSelectedBonusReward(bonusPointsToUse === 10 ? null : 'discount_50');
                                    }}
                                    style={{
                                      padding: '12px 16px',
                                      borderRadius: '10px',
                                      border: bonusPointsToUse === 10 ? '3px solid #FFD700' : '2px solid rgba(255,255,255,0.3)',
                                      background: bonusPointsToUse === 10 ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.1)',
                                      color: 'white',
                                      cursor: 'pointer',
                                      fontSize: '13px',
                                      fontWeight: '600',
                                      transition: 'all 0.3s'
                                    }}
                                  >
                                    {bonusPointsToUse === 10 ? '✅' : ''} 10 балів
                                  </button>
                                )}
                                {bonusPoints >= 14 && (
                                  <button
                                    onClick={() => {
                                      setBonusPointsToUse(bonusPointsToUse === 14 ? 0 : 14);
                                      setSelectedBonusReward(bonusPointsToUse === 14 ? null : 'free_manicure');
                                    }}
                                    style={{
                                      padding: '12px 16px',
                                      borderRadius: '10px',
                                      border: bonusPointsToUse === 14 ? '3px solid #FFD700' : '2px solid rgba(255,255,255,0.3)',
                                      background: bonusPointsToUse === 14 ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.1)',
                                      color: 'white',
                                      cursor: 'pointer',
                                      fontSize: '13px',
                                      fontWeight: '600',
                                      transition: 'all 0.3s'
                                    }}
                                  >
                                    {bonusPointsToUse === 14 ? '✅' : ''} 14 балів
                                  </button>
                                )}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
                                • 5 балів — безкоштовний дизайн (знімає вартість дизайну)
                                <br />• 10 балів — знижка 50% на манікюр
                                <br />• 14 балів — манікюр безкоштовно
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                </div>
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
                  submitBooking();
                }}
                style={{
                  padding: '12px 24px',
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

if (mode === "admin") {
  // 🔥 Сортування: від найближчого до найновішого
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA - dateB;
  });

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

      {/* Back Button */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
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
                color: '#2c3e50',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
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
              ✔ Підтверджені
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

            <button
              onClick={() => setAdminCalendarView(!adminCalendarView)}
              style={{
                background: adminCalendarView ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: '12px',
                padding: '15px 20px',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: adminCalendarView ? 'white' : '#667eea',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: adminCalendarView 
                  ? '0 6px 20px rgba(102, 126, 234, 0.3)' 
                  : '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = adminCalendarView 
                  ? '0 6px 20px rgba(102, 126, 234, 0.3)' 
                  : '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              📅 Календар
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View or List View */}
      {adminCalendarView ? (
        (() => {
          const formatDateForComparison = (dateStr) => {
            if (!dateStr) return '';
            if (dateStr.includes('-') && dateStr.length === 10) {
              const [year, month, day] = dateStr.split('-');
              return `${day}.${month}.${year}`;
            }
            return dateStr.replace(/\//g, '.');
          };

          const selectedDateStr = formatDateForComparison(
            calendarDate.toLocaleDateString('uk-UA', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
          );

          const appointmentsOnSelectedDate = sortedAppointments.filter(apt => {
            const aptDate = formatDateForComparison(apt.date);
            return aptDate === selectedDateStr;
          });

          const datesWithAppointments = new Set(
            sortedAppointments.map(apt => formatDateForComparison(apt.date))
          );

          const tileClassName = ({ date, view }) => {
            if (view === 'month') {
              const dateStr = formatDateForComparison(
                date.toLocaleDateString('uk-UA', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })
              );
              if (datesWithAppointments.has(dateStr)) {
                return 'calendar-date-with-appointments';
              }
            }
            return null;
          };

          return (
            <div>
              <div className="card" style={{
                background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                borderRadius: '16px',
                padding: '30px 20px',
                marginBottom: '30px',
                boxShadow: '0 8px 25px rgba(168, 237, 234, 0.3)',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <Calendar
                  onChange={setCalendarDate}
                  value={calendarDate}
                  tileClassName={tileClassName}
                  maxDate={new Date(new Date().getTime() + 60 * 24 * 60 * 60 * 1000)}
                />
              </div>

              <div className="card" style={{
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '30px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
                borderLeft: '5px solid #667eea'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50', fontSize: '1.2rem' }}>
                  📍 Записи на {selectedDateStr}
                </h3>

                {appointmentsOnSelectedDate.length > 0 ? (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {appointmentsOnSelectedDate.map((apt) => (
                      <div key={apt.id} style={{
                        background: apt.viewed_by_admin === false ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 'white',
                        border: apt.viewed_by_admin === false ? '2px solid #FF6B00' : '1px solid #e0e0e0',
                        borderRadius: '12px',
                        padding: '15px',
                        transition: 'all 0.3s ease',
                        boxShadow: apt.viewed_by_admin === false ? '0 4px 15px rgba(255, 107, 0, 0.3)' : 'none',
                        position: 'relative'
                      }}>
                        {apt.viewed_by_admin === false && (
                          <div style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '-10px',
                            background: '#FF6B00',
                            color: 'white',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 8px rgba(255, 107, 0, 0.5)',
                            animation: 'pulse 2s infinite'
                          }}>
                            NEW
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <strong>{apt.time}</strong> - {apt.type} ({apt.length})
                            <br />
                            {apt.tg_id ? (
                              <a
                                href={`https://t.me/${apt.username || apt.tg_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: '#0088cc',
                                  textDecoration: 'none',
                                  fontSize: '0.9rem',
                                  fontWeight: '500'
                                }}
                                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                              >
                                👤 {apt.client || apt.client_name || 'Клієнт'} →
                              </a>
                            ) : (
                              <small style={{ color: '#666' }}>
                                {apt.client_name || 'Невідомий клієнт'}
                              </small>
                            )}
                            {apt.reference_image && (
                              <div style={{ marginTop: '10px' }}>
                                <img
                                  src={apt.reference_image}
                                  alt="Reference"
                                  onClick={() => setModalImage(apt.reference_image)}
                                  style={{
                                    width: '60px',
                                    height: '60px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          <div style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            background: apt.status === 'confirmed' ? '#d4edda' : apt.status === 'approved' ? '#cce5ff' : '#fff3cd',
                            color: apt.status === 'confirmed' ? '#155724' : apt.status === 'approved' ? '#004085' : '#856404',
                            whiteSpace: 'nowrap'
                          }}>
                            {apt.status === 'confirmed' ? '✅ Підтверджено' : apt.status === 'approved' ? '✔️ Затверджено' : '⏳ Очікує'}
                          </div>
                        </div>
                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          {apt.status !== 'approved' && (
                            <button
                              onClick={() => changeStatus(apt.id, 'approved')}
                              style={{
                                flex: 1,
                                background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(39, 174, 96, 0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                              }}
                            >
                              ✅ Підтвердити
                            </button>
                          )}
                          {apt.status !== 'canceled' && (
                            <button
                              onClick={() => changeStatus(apt.id, 'canceled')}
                              style={{
                                flex: 1,
                                background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(231, 76, 60, 0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                              }}
                            >
                              ❌ Скасувати
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#999', margin: '0' }}>Немає записів на цей день</p>
                )}
              </div>
            </div>
          );
        })()
      ) : (
        <>
        <div style={{
          display: 'grid',
          gap: '20px',
          padding: '0 10px'
        }}>
        {/* Appointments List View */}
        {sortedAppointments.map(a => (
          <div
            className="menu-card"
            key={a.id}
            style={{
              background: a.viewed_by_admin === false
                ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                : getSlotLabel(a.date) === "today"
                ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                : getSlotLabel(a.date) === "tomorrow"
                ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '16px',
              padding: '25px',
              boxShadow: a.viewed_by_admin === false
                ? '0 8px 25px rgba(255, 165, 0, 0.5)'
                : getSlotLabel(a.date) === "today"
                ? '0 8px 25px rgba(79, 172, 254, 0.3)'
                : getSlotLabel(a.date) === "tomorrow"
                ? '0 8px 25px rgba(67, 233, 123, 0.3)'
                : '0 8px 25px rgba(240, 147, 251, 0.3)',
              border: a.viewed_by_admin === false ? '3px solid #FF6B00' : 'none',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s ease'
            }}
            onClick={(e) => { if (e.target.closest && e.target.closest('button')) return; setSelectedAdminAppointment(a); }}
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

            {/* NEW Badge for unviewed appointments */}
            {a.viewed_by_admin === false && (
              <div style={{
                position: 'absolute',
                top: '50px',
                left: '15px',
                background: '#FF6B00',
                color: 'white',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                boxShadow: '0 2px 8px rgba(255, 107, 0, 0.5)',
                animation: 'pulse 2s infinite'
              }}>
                🆕 НОВИЙ
              </div>
            )}

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
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '15px'
              }}>
                <div style={{
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  color: '#2c3e50',
                  marginBottom: '8px'
                }}>
                  {a.tg_id ? (
                    <a
                      href={`https://t.me/${a.username || a.tg_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#0088cc',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                      onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                    >
                      👤 {a.client} →
                    </a>
                  ) : (
                    <>👤 {a.client}</>
                  )}
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#666',
                  lineHeight: '1.5'
                }}>
                  💅 {a.design}, {a.length}, {a.type}
                </div>
              </div>

              {/* Comment */}
              {a.comment && (
                <div style={{
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: '12px',
                  padding: '15px',
                  marginBottom: '15px'
                }}>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#2c3e50',
                    marginBottom: '5px'
                  }}>
                    💬 Коментар:
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#666',
                    fontStyle: 'italic'
                  }}>
                    {a.comment}
                  </div>
                </div>
              )}

              {/* Reference Image */}
              {a.reference_image && (() => {
                try {
                  const images = JSON.parse(a.reference_image);
                  if (Array.isArray(images) && images.length > 0) {
                    return (
                      <div style={{
                        background: 'rgba(255,255,255,0.9)',
                        borderRadius: '12px',
                        padding: '15px',
                        marginBottom: '15px'
                      }}>
                        <div style={{
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: '#2c3e50',
                          marginBottom: '10px',
                          textAlign: 'center'
                        }}>
                          🖼️ Фото-приклад:
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                          gap: '10px'
                        }}>
                          {images.map((imgPath, idx) => (
                            <img
                              key={idx}
                              src={`${API}${imgPath}`}
                              alt={`Reference ${idx + 1}`}
                              style={{
                                width: '100%',
                                maxHeight: '150px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }}
                              onClick={() => setModalImage(`${API}${imgPath}`)}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'scale(1.05)';
                                e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'scale(1)';
                                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }
                } catch (e) {
                  console.error('Error parsing reference_image:', e);
                }
                return null;
              })()}

              {/* Current Hands Images */}
              {a.current_hands_images && (() => {
                try {
                  const images = JSON.parse(a.current_hands_images);
                  if (Array.isArray(images) && images.length > 0) {
                    return (
                      <div style={{
                        background: 'rgba(255,255,255,0.9)',
                        borderRadius: '12px',
                        padding: '15px',
                        marginBottom: '15px'
                      }}>
                        <div style={{
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: '#2c3e50',
                          marginBottom: '10px',
                          textAlign: 'center'
                        }}>
                          ✋ Поточний стан рук:
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                          gap: '10px'
                        }}>
                          {images.map((imgPath, idx) => (
                            <img
                              key={idx}
                              src={`${API}${imgPath}`}
                              alt={`Current hands ${idx + 1}`}
                              style={{
                                width: '100%',
                                maxHeight: '150px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }}
                              onClick={() => setModalImage(`${API}${imgPath}`)}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'scale(1.05)';
                                e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'scale(1)';
                                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }
                } catch (e) {
                  console.error('Error parsing current_hands_images:', e);
                }
                return null;
              })()}

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                {a.status === "approved" && (
                  <>
                    <button
                      className="btn-cancel"
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
                    <button
                      className="btn-secondary"
                      onClick={() => changeStatus(a.id, "pending")}
                      style={{
                        background: 'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '12px 20px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        color: '#2c3e50',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(243, 156, 18, 0.3)',
                        transition: 'all 0.3s ease',
                        flex: 1
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(243, 156, 18, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(243, 156, 18, 0.3)';
                      }}
                    >
                      ⏳ В очікуванні
                    </button>
                  </>
                )}

                {a.status === "canceled" && (
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
                      ✓ Підтвердити
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => changeStatus(a.id, "pending")}
                      style={{
                        background: 'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '12px 20px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        color: '#2c3e50',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(243, 156, 18, 0.3)',
                        transition: 'all 0.3s ease',
                        flex: 1
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(243, 156, 18, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(243, 156, 18, 0.3)';
                      }}
                    >
                      ⏳ В очікуванні
                    </button>
                  </>
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
                      ✓ Підтвердити
                    </button>

                    <button
                      className="btn-cancel"
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
                      ✕ Скасувати
                    </button>
                  </>
                )}
              </div>

              {/* Edit Price Button - Always visible */}
              <div style={{ marginTop: '10px' }}>
                <button
                  className="btn-edit-price"
                  onClick={() => {
                    setEditPriceAppointmentId(a.id);
                    setEditPriceValue(a.price.toString());
                    setEditPriceOldValue(a.price);
                    setEditPriceModalOpen(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 20px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'white',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)',
                    transition: 'all 0.3s ease',
                    width: '100%',
                    marginBottom: '10px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(52, 152, 219, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(52, 152, 219, 0.3)';
                  }}
                >
                  💰 Змінити ціну ({a.price} zł)
                </button>
              </div>

              {/* Delete Button - Always visible for all appointments */}
              <div style={{ marginTop: '10px' }}>
                <button
                  className="btn-delete"
                  onClick={() => deleteAppointment(a.id)}
                  style={{
                    background: 'linear-gradient(135deg, #8e44ad 0%, #6c3483 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 20px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'white',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(142, 68, 173, 0.3)',
                    transition: 'all 0.3s ease',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(142, 68, 173, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(142, 68, 173, 0.3)';
                  }}
                >
                  🗑 Видалити запис повністю
                </button>
              </div>
            </div>
          </div>
        ))}
        </div>

        {/* Empty State */}
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
        </>
      )}

      {modal}
      {priceEditModal}
    </div>
  );
}

}

export default App;
