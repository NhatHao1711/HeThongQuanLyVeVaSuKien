'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await apiRequest('/events');
      if (res.success) {
        setEvents(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Build calendar grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Adjust so Monday is 0, Sunday is 6
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  // Empty slots before 1st of month
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }
  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }
  // Empty slots after end to complete the grid (optional, but good for styling)
  const remainder = days.length % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      days.push(null);
    }
  }

  const getEventsForDay = (dateObj) => {
    if (!dateObj) return [];
    return events.filter(e => {
      if (!e.startTime) return false;
      const eventDate = new Date(e.startTime);
      return eventDate.getDate() === dateObj.getDate() &&
             eventDate.getMonth() === dateObj.getMonth() &&
             eventDate.getFullYear() === dateObj.getFullYear();
    });
  };

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];
  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '80vh', padding: '100px 2rem 4rem', background: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Lịch Sự Kiện</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Theo dõi tất cả sự kiện trong tháng</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-card)', padding: '0.5rem', borderRadius: 12, border: '1px solid var(--border)' }}>
              <button className="btn btn-outline btn-sm" onClick={prevMonth} style={{ border: 'none' }}>
                &larr;
              </button>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 1rem', width: 140, textAlign: 'center' }}>
                {monthNames[month]} {year}
              </h2>
              <button className="btn btn-outline btn-sm" onClick={nextMonth} style={{ border: 'none' }}>
                &rarr;
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--primary-glow)', borderBottom: '1px solid var(--border)' }}>
              {dayNames.map(d => (
                <div key={d} style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {days.map((dateObj, idx) => {
                const dayEvents = getEventsForDay(dateObj);
                const isToday = dateObj && new Date().toDateString() === dateObj.toDateString();
                
                return (
                  <div key={idx} style={{ 
                    minHeight: 120, padding: '0.5rem', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                    background: dateObj ? (isToday ? 'rgba(0,180,110,0.05)' : 'transparent') : 'var(--bg-primary)',
                    opacity: dateObj ? 1 : 0.5
                  }}>
                    {dateObj && (
                      <>
                        <div style={{ 
                          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isToday ? 'var(--primary)' : 'transparent',
                          color: isToday ? '#fff' : 'var(--text-secondary)',
                          fontWeight: isToday ? 700 : 500,
                          fontSize: '0.9rem', marginBottom: '0.5rem',
                          marginLeft: 'auto'
                        }}>
                          {dateObj.getDate()}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {dayEvents.map(e => (
                            <Link key={e.id} href={`/events/${e.id}`} style={{
                              display: 'block', padding: '0.3rem 0.5rem', background: 'var(--primary-glow)',
                              color: 'var(--primary-dark)', fontSize: '0.75rem', fontWeight: 600, borderRadius: 4,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: 'none'
                            }} title={e.title}>
                              {new Date(e.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} - {e.title}
                            </Link>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
