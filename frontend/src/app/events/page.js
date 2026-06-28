'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CategorySidebar from '@/components/CategorySidebar';
import EventCard from '@/components/EventCard';
import { apiRequest } from '@/lib/api';
import styles from './events-list.module.css';
import { useTranslation } from '@/context/TranslationContext';

export default function EventsPage() {
  return (
    <Suspense fallback={<><Navbar /><div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}><div className="spinner"></div></div></>}>
      <EventsContent />
    </Suspense>
  );
}

function EventsContent() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [allEvents, setAllEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || '');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000000 });
  const [dateFilter, setDateFilter] = useState(searchParams.get('date') || 'all');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allEvents, searchQuery, locationFilter, selectedCategory, sortBy, priceRange, dateFilter, activeTab]);

  const loadEvents = async () => {
    try {
      const res = await apiRequest('/events');
      if (res.success) {
        setAllEvents(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allEvents];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q)
      );
    }

    // Location filter from hero search
    if (locationFilter.trim()) {
      const loc = locationFilter.toLowerCase();
      filtered = filtered.filter(e => e.location?.toLowerCase().includes(loc));
    }

    // Tab filter
    const now = new Date();
    if (activeTab === 'upcoming') {
      filtered = filtered.filter(e => new Date(e.startTime) > now);
    } else if (activeTab === 'free') {
      filtered = filtered.filter(e => {
        if (!e.ticketTypes || e.ticketTypes.length === 0) return false;
        return Math.min(...e.ticketTypes.map(t => t.price || 0)) === 0;
      });
    } else if (activeTab === 'hot') {
      filtered = filtered.filter(e => {
        if (!e.ticketTypes || e.ticketTypes.length === 0) return false;
        const totalSold = e.ticketTypes.reduce((s, t) => s + (t.quantity - (t.availableQuantity || t.quantity)), 0);
        return totalSold > 0;
      });
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(e => e.category?.id === selectedCategory);
    }

    // Price filter
    filtered = filtered.filter(e => {
      if (!e.ticketTypes || e.ticketTypes.length === 0) return true;
      const minPrice = Math.min(...e.ticketTypes.map(t => t.price || 0));
      return minPrice >= priceRange.min && minPrice <= priceRange.max;
    });

    // Date filter
    const today = new Date();
    if (dateFilter === 'today') {
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      filtered = filtered.filter(e => {
        const eventDate = new Date(e.startTime);
        return eventDate >= startOfDay && eventDate < endOfDay;
      });
    } else if (dateFilter === 'week') {
      const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(e => {
        const eventDate = new Date(e.startTime);
        return eventDate >= today && eventDate <= weekLater;
      });
    } else if (dateFilter === 'month') {
      const monthLater = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
      filtered = filtered.filter(e => {
        const eventDate = new Date(e.startTime);
        return eventDate >= today && eventDate <= monthLater;
      });
    }

    // Sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        break;
      case 'cheapest':
        filtered.sort((a, b) => {
          const priceA = a.ticketTypes?.[0]?.price || 0;
          const priceB = b.ticketTypes?.[0]?.price || 0;
          return priceA - priceB;
        });
        break;
      case 'expensive':
        filtered.sort((a, b) => {
          const priceA = a.ticketTypes?.[0]?.price || 0;
          const priceB = b.ticketTypes?.[0]?.price || 0;
          return priceB - priceA;
        });
        break;
      default:
        break;
    }

    setFilteredEvents(filtered);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Filters are applied automatically via useEffect
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSortBy('newest');
    setPriceRange({ min: 0, max: 10000000 });
    setDateFilter('all');
  };

  const formatPrice = (ticketTypes) => {
    if (!ticketTypes || ticketTypes.length === 0) return t('common.contact');
    const min = Math.min(...ticketTypes.map(t => t.price || 0));
    if (min === 0) return t('common.free');
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(min);
  };

  const getCategoryIcon = (category) => {
    return '';
  };

  return (
    <>
      <Navbar />
      <div className={styles.container}>

        <div className={styles.layout}>
          {/* Sidebar Filters */}
          <aside className={styles.filters}>
            {/* Search */}
            <div className={styles.filterSection}>
              <div className={styles.filterTitle}>{t('events.search_label')}</div>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder={t('home.search_placeholder_title')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ marginBottom: 0, fontSize: '0.9rem' }}
                />
              </form>
            </div>

            {/* Tab Filter */}
            <div className={styles.filterSection}>
              <div className={styles.filterTitle}>{t('events.filter_title')}</div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem'
              }}>
                {[
                  { key: 'all', label: t('events.category_all') },
                  { key: 'upcoming', label: t('events.category_upcoming') },
                  { key: 'hot', label: t('events.category_hot') },
                  { key: 'free', label: t('events.category_free') },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                    padding: '0.55rem 0.5rem', borderRadius: 10, cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                    background: activeTab === tab.key ? 'var(--primary)' : '#f8fafc',
                    color: activeTab === tab.key ? '#fff' : '#475569',
                    border: activeTab === tab.key ? '1.5px solid var(--primary)' : '1.5px solid #e2e8f0',
                    boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0,180,110,0.25)' : 'none',
                  }}>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterSection}>
              <div className={styles.filterTitle}>{t('events.time_label')}</div>
              {['all', 'today', 'week', 'month'].map(filter => (
                <div key={filter} className={styles.filterItem}>
                  <input
                    type="radio"
                    id={`date-${filter}`}
                    name="dateFilter"
                    value={filter}
                    checked={dateFilter === filter}
                    onChange={() => setDateFilter(filter)}
                  />
                  <label htmlFor={`date-${filter}`}>
                    {filter === 'all' && t('events.time_all')}
                    {filter === 'today' && t('events.time_today')}
                    {filter === 'week' && t('events.time_week')}
                    {filter === 'month' && t('events.time_month')}
                  </label>
                </div>
              ))}
            </div>

            <div className={styles.filterSection}>
              <div className={styles.filterTitle}>{t('events.price_label')}</div>
              <div className={styles.priceRange}>
                <input
                  type="number"
                  className={styles.priceInput}
                  placeholder={t('events.price_min')}
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({...priceRange, min: parseInt(e.target.value) || 0})}
                />
                <span>-</span>
                <input
                  type="number"
                  className={styles.priceInput}
                  placeholder={t('events.price_max')}
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({...priceRange, max: parseInt(e.target.value) || 10000000})}
                />
              </div>
            </div>

            <div className={styles.filterSection}>
              <div className={styles.filterTitle}>{t('events.sort_label')}</div>
              <select 
                className={styles.sortSelect} 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="newest">{t('events.sort_newest')}</option>
                <option value="oldest">{t('events.sort_oldest')}</option>
                <option value="cheapest">{t('events.sort_cheapest')}</option>
                <option value="expensive">{t('events.sort_expensive')}</option>
              </select>
            </div>

            <button onClick={handleClearFilters} className={styles.clearFilters}>
              {t('events.clear_filters')}
            </button>
          </aside>

          {/* Main Content */}
          <div className={styles.contentArea}>
          {/* Header */}
            <div className={styles.header} style={{
              background: 'linear-gradient(to right, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.6) 100%), url(/images/hero-bg.png) center/cover',
              padding: '3rem 2rem',
              borderRadius: '24px',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
            }}>
              <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(0,180,110,0.15) 0%, transparent 70%)', borderRadius: '50%' }}></div>
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(0, 180, 110, 0.2)', color: '#4ade80', borderRadius: '50px', fontWeight: 700, fontSize: '0.85rem', marginBottom: '1rem', border: '1px solid rgba(0,180,110,0.3)' }}>
                    {t('home.hero_badge').toUpperCase()}
                  </div>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>{t('events.list_title')}</h1>
                  <p style={{ color: '#94a3b8', fontSize: '1.05rem', maxWidth: '500px' }}>{t('events.list_subtitle')}</p>
                </div>
                <Link href="/" className="btn glass" style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50px', padding: '8px 20px', fontSize: '0.9rem' }}>← {t('create_event.back_home')}</Link>
              </div>
            </div>

            {/* Results Info */}
            {!loading && (
              <div className={styles.results}>
                <div className={styles.resultInfo}>
                  <span className={styles.resultCount}>
                    {t('events.found_count').replace('{count}', filteredEvents.length)}
                  </span>
                  <span className={styles.resultFilters}>
                    {searchQuery && `"${searchQuery}"`}
                    {selectedCategory && ' • Filtered'}
                  </span>
                </div>
              </div>
            )}

            {/* Content */}
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner}>
                  <div className="spinner"></div>
                </div>
                <p className={styles.loadingText}>{t('common.loading')}</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>Không có kết quả</div>
                <h3 className={styles.emptyTitle}>{t('events.no_events_found')}</h3>
                <p className={styles.emptyText}>
                  {searchQuery ? t('events.try_different_keyword') : t('events.no_events_found')}
                </p>
                <button onClick={handleClearFilters} className={styles.emptyBtn}>
                  {t('events.clear_filters')}
                </button>
              </div>
            ) : (
              <>
                <style dangerouslySetInnerHTML={{ __html: `
                  .cinestar-strict-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 1.5rem;
                  }
                  @media (max-width: 1024px) { .cinestar-strict-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
                  @media (max-width: 768px) { .cinestar-strict-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
                  @media (max-width: 480px) { .cinestar-strict-grid { grid-template-columns: repeat(1, minmax(0, 1fr)); } }
                ` }} />
                <div className="cinestar-strict-grid">
                  {filteredEvents.map((event) => (
                  <div key={event.id}>
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
