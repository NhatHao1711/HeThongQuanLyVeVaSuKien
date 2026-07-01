'use client';
import React, { useState, useEffect } from 'react';

export const showPopup = (message, title = 'Thông báo', type = 'info') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('show-global-popup', { detail: { message, title, type } }));
  }
};

export default function GlobalPopup() {
  const [popups, setPopups] = useState([]);

  useEffect(() => {
    const handleShow = (e) => {
      setPopups(prev => [...prev, { id: Date.now() + Math.random(), ...e.detail }]);
    };
    window.addEventListener('show-global-popup', handleShow);
    return () => window.removeEventListener('show-global-popup', handleShow);
  }, []);

  if (popups.length === 0) return null;

  return (
    <>
      {popups.map((popup) => (
        <div key={popup.id} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "420px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "popupFadeIn 0.2s ease-out" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: popup.type === 'error' ? '#ef4444' : '#0f172a', margin: 0 }}>
                {popup.title}
              </h3>
              <button onClick={() => setPopups(prev => prev.filter(p => p.id !== popup.id))} style={{ border: "none", background: "#f1f5f9", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "1.1rem", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>×</button>
            </div>
            <div style={{ padding: "1.5rem", color: "#475569", fontSize: "0.95rem", lineHeight: "1.6" }}>
              {popup.message}
            </div>
            <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setPopups(prev => prev.filter(p => p.id !== popup.id))} style={{ background: popup.type === 'error' ? '#ef4444' : "#10b981", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 24px", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer" }}>
                OK
              </button>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes popupFadeIn {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}} />
        </div>
      ))}
    </>
  );
}
