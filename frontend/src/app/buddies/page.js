'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { apiRequest, isLoggedIn, getUser } from '@/lib/api';
import { useTranslation } from '@/context/TranslationContext';

export default function BuddiesPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [buddies, setBuddies] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState(null);
  const [contactBuddy, setContactBuddy] = useState(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      window.location.href = '/login';
      return;
    }
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await apiRequest('/tickets');
      if (res.success) {
        const tickets = res.data || [];
        
        // Extract unique events from user tickets
        const uniqueEventsMap = {};
        tickets.forEach(ticket => {
          if (ticket.eventId && ticket.eventTitle) {
            uniqueEventsMap[ticket.eventId] = {
              id: ticket.eventId,
              title: ticket.eventTitle
            };
          }
        });
        
        const userEvents = Object.values(uniqueEventsMap);
        setEvents(userEvents);
        
        if (userEvents.length > 0) {
          setSelectedEvent(userEvents[0]);
          await loadBuddyData(userEvents[0].id);
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
                <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>{t('nav.home')}</Link>
                <span> / {t('buddies.title')}</span>
              </div>
              <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem' }}>← {t('common.back')}</Link>
            </div>

            <div className="section-header">
              <h2>{t('buddies.title')}</h2>
              <p>{t('buddies.subtitle')}</p>
            </div>

            {/* Event Selector */}
            {events.length > 0 ? (
              <>
                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label className="form-label">{t('buddies.event_label')}</label>
                  <select className="form-input"
                    value={selectedEvent?.id || ''}
                    onChange={(e) => handleEventChange(e.target.value)}>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </div>

                {/* My Buddies */}
                <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('buddies.tab_my_buddies')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2.5rem' }}>
                  {buddies.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                      {t('buddies.no_buddies')}
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
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Sự kiện: {b.eventTitle}</div>
                          </div>
                          <span className={`badge ${b.status === 'ACCEPTED' ? 'badge-free' : b.status === 'PENDING' ? 'badge-upcoming' : 'badge-live'}`}>
                            {b.status === 'ACCEPTED' ? t('buddies.status_accepted') : b.status === 'PENDING' ? t('buddies.status_pending') : b.status}
                          </span>
                          {b.status === 'PENDING' && b.receiverId === user?.userId && (
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <button className="btn btn-primary btn-sm" onClick={() => respondBuddy(b.buddyId, true)}>{t('buddies.accept_btn')}</button>
                              <button className="btn btn-outline btn-sm" onClick={() => respondBuddy(b.buddyId, false)}>{t('buddies.decline_btn')}</button>
                            </div>
                          )}
                          {b.status === 'ACCEPTED' && (
                            <button 
                              className="btn btn-outline btn-sm" 
                              style={{ marginLeft: '10px' }}
                              onClick={() => setContactBuddy(b)}>
                              {t('buddies.view_contact')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Suggestions */}
                <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('buddies.potential_buddies_title').replace('{count}', suggestions.length)}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {suggestions.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                      {t('buddies.no_suggestions')}
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
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t('buddies.system_suggestion')}</div>
                          </div>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => sendBuddyRequest(userId)}
                            disabled={sendingTo === userId}>
                            {sendingTo === userId ? '...' : t('buddies.connect_btn')}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <p>{t('buddies.no_events')} <Link href="/events" style={{ color: 'var(--primary)' }}>{t('tickets.explore_btn')}!</Link></p>
              </div>
            )}
          </div>
        </section>

        {/* Contact Modal */}
        {contactBuddy && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
            <div style={{
              background: '#fff', borderRadius: '12px', padding: '2rem',
              width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {t('buddies.contact_modal_title')}
              </h3>
              
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem', color: '#1e293b' }}>
                  {contactBuddy.senderId === user?.userId ? contactBuddy.receiverName : contactBuddy.senderName}
                </div>
                <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                  Email: {contactBuddy.senderId === user?.userId ? contactBuddy.receiverEmail : contactBuddy.senderEmail}
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                {t('buddies.contact_modal_desc')}
              </p>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.75rem' }}
                onClick={() => setContactBuddy(null)}>
                {t('buddies.close_btn')}
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
