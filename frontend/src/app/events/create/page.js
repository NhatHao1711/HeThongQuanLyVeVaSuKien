'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { apiRequest, isLoggedIn, getUser } from '@/lib/api';
import { icons } from '@/components/Icons';
import { useTranslation } from '@/context/TranslationContext';

export default function CreateEventPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: '',
    categoryId: '',
    description: '',
    location: '',
    startTime: '',
    endTime: ''
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/events/create');
    } else {
      loadCategories();
    }
  }, []);

  const loadCategories = async () => {
    try {
      const res = await apiRequest('/categories');
      if (res.success) {
        setCategories(res.data || []);
        if (res.data && res.data.length > 0) {
          setForm(prev => ({ ...prev, categoryId: res.data[0].id }));
        }
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError(t('create_event.image_size_err'));
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const clearImageSelection = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const uploadEventImage = async (eventId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:8080/api/events/${eventId}/upload-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    return await res.json();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      setError(t('create_event.err_end_time'));
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest('/events/create', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          location: form.location,
          startTime: form.startTime,
          endTime: form.endTime,
          categoryId: Number(form.categoryId)
        })
      });

      if (res.success) {
        const newEvent = res.data;
        
        // Upload image if selected
        if (selectedImage && newEvent?.id) {
          const imgRes = await uploadEventImage(newEvent.id, selectedImage);
          if (!imgRes.success) {
            setError(t('create_event.err_upload_fail') + imgRes.message);
            setLoading(false);
            return;
          }
        }

        setSuccess(t('create_event.success_msg'));
        setForm({
          title: '',
          categoryId: categories[0]?.id || '',
          description: '',
          location: '',
          startTime: '',
          endTime: ''
        });
        clearImageSelection();
        
        // Scroll to top to see success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Redirect after 3s
        setTimeout(() => {
          router.push('/events');
        }, 3000);
      } else {
        setError(res.message || t('create_event.err_generic'));
      }
    } catch (err) {
      setError(t('create_event.err_connect'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', padding: '100px 1rem 4rem', background: '#0f172a', position: 'relative', overflow: 'hidden' }}>
        {/* Visual Background Orbs */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(0, 180, 110, 0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0 }}></div>

        <div style={{ maxWidth: '680px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Breadcrumb / Back Link */}
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.9rem', textDecoration: 'none', marginBottom: '1.5rem', transition: 'color 0.2s' }} 
            onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
            ← {t('create_event.back_home')}
          </Link>

          {/* Premium Form Card */}
          <div className="glass-dark animate-in" style={{ padding: '2.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', color: '#fff' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(0,180,110,0.15)', color: 'var(--primary-light)', fontSize: '1.5rem', marginBottom: '1rem', border: '1px solid rgba(0,180,110,0.3)' }}>
                📣
              </div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#fff' }}>{t('create_event.title')}</h1>
              <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: 0 }}>{t('create_event.subtitle')}</p>
            </div>

            {/* Alert Messages */}
            {error && (
              <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '12px 16px', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '12px 16px', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                <span>✅</span>
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Event Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>{t('create_event.name_label')} <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  required
                  placeholder={t('create_event.name_placeholder')}
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none', transition: 'all 0.2s', fontSize: '0.95rem' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 180, 110, 0.2)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>{t('create_event.category_label')} <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  required
                  value={form.categoryId}
                  onChange={e => setForm(prev => ({ ...prev, categoryId: e.target.value }))}
                  style={{ width: '100%', padding: '12px 16px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none', transition: 'all 0.2s', fontSize: '0.95rem', cursor: 'pointer' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 180, 110, 0.2)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>{t('create_event.location_label')} <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  required
                  placeholder={t('create_event.location_placeholder')}
                  value={form.location}
                  onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none', transition: 'all 0.2s', fontSize: '0.95rem' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 180, 110, 0.2)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Start & End Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>{t('create_event.start_label')} <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="datetime-local"
                    required
                    value={form.startTime}
                    onChange={e => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none', transition: 'all 0.2s', fontSize: '0.95rem', colorScheme: 'dark' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 180, 110, 0.2)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>{t('create_event.end_label')} <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="datetime-local"
                    required
                    value={form.endTime}
                    onChange={e => setForm(prev => ({ ...prev, endTime: e.target.value }))}
                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none', transition: 'all 0.2s', fontSize: '0.95rem', colorScheme: 'dark' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 180, 110, 0.2)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>{t('create_event.desc_label')} <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea
                  required
                  rows={4}
                  placeholder={t('create_event.desc_placeholder')}
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none', transition: 'all 0.2s', fontSize: '0.95rem', resize: 'vertical' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 180, 110, 0.2)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Image Upload Area */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>{t('create_event.image_label')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}>
                    📸 {t('create_event.image_btn')}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
                  </label>
                  
                  {imagePreview && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={imagePreview} alt="Preview" style={{ width: '80px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '2px solid rgba(255,255,255,0.2)' }} />
                      <button type="button" onClick={clearImageSelection} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        ✕ {t('create_event.image_delete')}
                      </button>
                    </div>
                  )}
                  {!imagePreview && (
                    <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{t('create_event.image_hint')}</span>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ flex: 1, padding: '14px 28px', background: 'linear-gradient(135deg, #00B46E, #10b981)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0, 180, 110, 0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onMouseEnter={e => { if(!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                >
                  {loading ? (
                    <>
                      <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></span>
                      {t('create_event.submitting_btn')}
                    </>
                  ) : (
                    t('create_event.submit_btn')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  style={{ padding: '14px 24px', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
