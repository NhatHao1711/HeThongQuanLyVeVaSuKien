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

export default function EventsPage() {
  return (
    <Suspense fallback={<><Navbar /><div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}><div className="spinner"></div></div></>}>
      <EventsContent />
    </Suspense>
  );
}

function EventsContent() {
  const searchParams = useSearchParams();
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
    if (!ticketTypes || ticketTypes.length === 0) return 'Liên hệ';
    const min = Math.min(...ticketTypes.map(t => t.price || 0));
    if (min === 0) return 'Miễn phí';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(min);
  };

  const getCategoryIcon = (category) => {
    if (!category?.name) return '🎪';
    const name = category.name.toLowerCase();
    if (name.includes('nhạc')) return '🎵';
    if (name.includes('sân') || name.includes('nghệ')) return '🎭';
    if (name.includes('thể')) return '⚽';
    if (name.includes('workshop')) return '🎓';
    if (name.includes('tham')) return '🌍';
    if (name.includes('bán')) return '🔄';
    return '🎪';
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
              <div className={styles.filterTitle}>Tìm kiếm</div>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Tên sự kiện..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ marginBottom: 0, fontSize: '0.9rem' }}
                />
              </form>
            </div>

            {/* Tab Filter */}
            <div className={styles.filterSection}>
              <div className={styles.filterTitle}>Phân loại</div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem'
              }}>
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'upcoming', label: 'Sắp diễn ra' },
                  { key: 'hot', label: 'HOT' },
                  { key: 'free', label: 'Miễn phí' },
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
              <div className={styles.filterTitle}>Thời gian</div>
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
                    {filter === 'all' && 'Tất cả'}
                    {filter === 'today' && 'Hôm nay'}
                    {filter === 'week' && 'Tuần này'}
                    {filter === 'month' && 'Tháng này'}
                  </label>
                </div>
              ))}
            </div>

            <div className={styles.filterSection}>
              <div className={styles.filterTitle}>Khoảng giá</div>
              <div className={styles.priceRange}>
                <input
                  type="number"
                  className={styles.priceInput}
                  placeholder="Tối thiểu"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({...priceRange, min: parseInt(e.target.value) || 0})}
                />
                <span>-</span>
                <input
                  type="number"
                  className={styles.priceInput}
                  placeholder="Tối đa"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({...priceRange, max: parseInt(e.target.value) || 10000000})}
                />
              </div>
            </div>

            <div className={styles.filterSection}>
              <div className={styles.filterTitle}>Sắp xếp</div>
              <select 
                className={styles.sortSelect} 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="cheapest">Giá thấp nhất</option>
                <option value="expensive">Giá cao nhất</option>
              </select>
            </div>

            <button onClick={handleClearFilters} className={styles.clearFilters}>
              🔄 Xóa bộ lọc
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
                    ✨ KHÁM PHÁ
                  </div>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Tất cả sự kiện</h1>
                  <p style={{ color: '#94a3b8', fontSize: '1.05rem', maxWidth: '500px' }}>Tìm kiếm và đặt vé các sự kiện hot nhất đang diễn ra tại các trường Đại học.</p>
                </div>
                <Link href="/" className="btn glass" style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50px', padding: '8px 20px', fontSize: '0.9rem' }}>← Quay lại Trang chủ</Link>
              </div>
            </div>

            {/* Results Info */}
            {!loading && (
              <div className={styles.results}>
                <div className={styles.resultInfo}>
                  <span className={styles.resultCount}>
                    Tìm thấy {filteredEvents.length} sự kiện
                  </span>
                  <span className={styles.resultFilters}>
                    {searchQuery && `"${searchQuery}"`}
                    {selectedCategory && ' • Có bộ lọc'}
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
                <p className={styles.loadingText}>Đang tải sự kiện...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📭</div>
                <h3 className={styles.emptyTitle}>Không tìm thấy sự kiện</h3>
                <p className={styles.emptyText}>
                  {searchQuery ? 'Hãy thử tìm kiếm với từ khóa khác' : 'Chưa có sự kiện nào được đăng'}
                </p>
                <button onClick={handleClearFilters} className={styles.emptyBtn}>
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              <div className={styles.eventsGrid}>
                {filteredEvents.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
                    <div className={styles.eventCard}>
                      <div className={styles.eventImage} style={event.imageUrl ? { backgroundImage: `url(http://localhost:8080${event.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                        {!event.imageUrl && getCategoryIcon(event.category)}
                        <div className={styles.eventBadges}>
                          {(() => {
                            const now = new Date();
                            const start = new Date(event.startTime);
                            const end = new Date(event.endTime);
                            const soldOut = event.ticketTypes?.every(t => (t.availableQuantity || 0) <= 0);
                            const isFree = formatPrice(event.ticketTypes) === 'Miễn phí';
                            const badges = [];
                            
                            if (soldOut) badges.push(<span key="sold" className={styles.badge} style={{ background: 'rgba(239, 68, 68, 0.95)', color: '#fff' }}>Hết vé</span>);
                            else if (now < start) badges.push(<span key="soon" className={styles.badge} style={{ background: 'rgba(59, 130, 246, 0.95)', color: '#fff' }}>Sắp diễn ra</span>);
                            else if (now >= start && now <= end) badges.push(<span key="live" className={styles.badge} style={{ background: 'rgba(16, 185, 129, 0.95)', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span> Đang diễn ra</span>);
                            else badges.push(<span key="ended" className={styles.badge} style={{ background: 'rgba(100, 116, 139, 0.95)', color: '#fff' }}>Đã kết thúc</span>);
                            
                            if (isFree && !soldOut) badges.push(<span key="free" className={`${styles.badge} ${styles.free}`}>Miễn phí</span>);
                            return badges;
                          })()}
                        </div>
                      </div>
                      <div className={styles.eventContent}>
                        <div className={styles.eventCategory}>{event.category?.name || 'Khác'}</div>
                        <h3 className={styles.eventTitle}>{event.title}</h3>
                        <p className={styles.eventDescription}>{event.description}</p>
                        <div className={styles.eventMeta}>
                          <div className={styles.eventMetaItem}>
                            📍 {event.location || 'Địa điểm chưa xác định'}
                          </div>
                          <div className={styles.eventMetaItem}>
                            📅 {new Date(event.startTime).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                        <div className={styles.eventFooter}>
                          <span className={styles.eventPrice}>{formatPrice(event.ticketTypes)}</span>
                          <button className={styles.eventBtn}>Đặt vé →</button>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
