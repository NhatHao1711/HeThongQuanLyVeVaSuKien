'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { apiRequest, isLoggedIn, getUser } from '@/lib/api';

export default function BuddiesPage() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [buddies, setBuddies] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      window.location.href = '/login';
      return;
    }
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await apiRequest('/events');
      if (res.success) {
        setEvents(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedEvent(res.data[0]);
          await loadBuddyData(res.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadBuddyData = async (eventId) => {
    try {
      const [buddyRes, suggestRes] = await Promise.all([
        apiRequest(`/buddies/event/${eventId}`),
        apiRequest(`/buddies/event/${eventId}/suggestions`),
      ]);
      if (buddyRes.success) setBuddies(buddyRes.data || []);
      if (suggestRes.success) setSuggestions(suggestRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEventChange = async (eventId) => {
    const ev = events.find(e => e.id === Number(eventId));
    setSelectedEvent(ev);
    await loadBuddyData(eventId);
  };

  const sendBuddyRequest = async (receiverId) => {
    if (!selectedEvent) return;
    setSendingTo(receiverId);
    try {
      const res = await apiRequest('/buddies/request', {
        method: 'POST',
        body: JSON.stringify({
          eventId: selectedEvent.id,
          receiverId: receiverId,
        }),
      });
      if (res.success) {
        await loadBuddyData(selectedEvent.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingTo(null);
    }
  };

  const respondBuddy = async (buddyId, accept) => {
    try {
      await apiRequest(`/buddies/${buddyId}/respond?accept=${accept}`, {
        method: 'PUT',
      });
      if (selectedEvent) {
        await loadBuddyData(selectedEvent.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const user = getUser();

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ paddingTop: '80px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <div className="spinner" style={{ width: 40, height: 40 }}></div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '80px', position: 'relative', zIndex: 1 }}>
        <section className="section">
          <div className="container" style={{ maxWidth: '800px' }}>
            {/* Back button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Trang chủ</Link>
                <span> / Tìm bạn đồng hành</span>
              </div>
              <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem' }}>← Quay lại</Link>
            </div>

            <div className="section-header">
              <h2>Tìm bạn đồng hành</h2>
              <p>Tìm bạn đi chung sự kiện</p>
            </div>

            {/* Event Selector */}
            {events.length > 0 ? (
              <>
                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label className="form-label">Chọn sự kiện:</label>
                  <select className="form-input"
                    value={selectedEvent?.id || ''}
                    onChange={(e) => handleEventChange(e.target.value)}>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </div>

                {/* My Buddies */}
                <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>✅ Bạn đã kết nối</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2.5rem' }}>
                  {buddies.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                      Chưa có bạn đồng hành nào cho sự kiện này. Gửi lời mời kết nối nhé!
                    </div>
                  ) : (
                    buddies.map((b) => (
                      <div key={b.buddyId} className="card" style={{ cursor: 'default' }}>
                        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: '50px', height: '50px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 700, fontSize: '1.2rem', flexShrink: 0,
                          }}>
                            {(b.senderId === user?.userId ? b.receiverName : b.senderName)?.[0] || '?'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>
                              {b.senderId === user?.userId ? b.receiverName : b.senderName}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>🎫 {b.eventTitle}</div>
                          </div>
                          <span className={`badge ${b.status === 'ACCEPTED' ? 'badge-free' : b.status === 'PENDING' ? 'badge-upcoming' : 'badge-live'}`}>
                            {b.status === 'ACCEPTED' ? 'Đã kết nối' : b.status === 'PENDING' ? 'Đang chờ' : b.status}
                          </span>
                          {b.status === 'PENDING' && b.receiverId === user?.userId && (
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <button className="btn btn-primary btn-sm" onClick={() => respondBuddy(b.buddyId, true)}>Chấp nhận</button>
                              <button className="btn btn-outline btn-sm" onClick={() => respondBuddy(b.buddyId, false)}>Từ chối</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Suggestions */}
                <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>💡 Gợi ý kết nối</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {suggestions.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                      Chưa có gợi ý kết nối. Hãy mời bạn bè tham gia sự kiện nhé!
                    </div>
                  ) : (
                    suggestions.map((userId) => (
                      <div key={userId} className="card" style={{ cursor: 'default' }}>
                        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: '50px', height: '50px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent), var(--success))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 700, fontSize: '1rem', flexShrink: 0
                          }}>
                            #{userId}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>User #{userId}</div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Gợi ý từ hệ thống</div>
                          </div>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => sendBuddyRequest(userId)}
                            disabled={sendingTo === userId}>
                            {sendingTo === userId ? '...' : '🤝 Kết nối'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <p>Chưa có sự kiện nào. <Link href="/events" style={{ color: 'var(--primary)' }}>Khám phá sự kiện!</Link></p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
