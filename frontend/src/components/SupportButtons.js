'use client';

import React from 'react';

export default function SupportButtons() {
  return (
    <>
      <div className="support-buttons-container">
        {/* Zalo Button */}
        <a 
          href="https://zalo.me/0377294114" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="support-btn zalo-btn"
          title="Chat Zalo hỗ trợ"
        >
          <span className="tooltip">Chat Zalo hỗ trợ</span>
          <img 
            src="/images/zalo-icon.png" 
            alt="Zalo" 
            className="zalo-icon-img"
          />
        </a>

        {/* Call Button */}
        <a 
          href="tel:0377294114" 
          className="support-btn call-btn"
          title="Gọi hotline hỗ trợ"
        >
          <span className="tooltip">Gọi hotline hỗ trợ</span>
          <div className="pulse-ring"></div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </a>
      </div>

      <style jsx global>{`
        .support-buttons-container {
          position: fixed;
          bottom: 30px;
          right: 30px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          z-index: 9999;
          font-family: inherit;
        }

        .support-btn {
          position: relative;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff !important;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          cursor: pointer;
          text-decoration: none;
        }

        .support-btn:hover {
          transform: translateY(-4px) scale(1.08);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
        }

        .support-btn svg {
          width: 24px;
          height: 24px;
          z-index: 2;
        }

        .zalo-btn {
          background: transparent;
          border: none;
          overflow: hidden;
        }

        .zalo-icon-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          z-index: 2;
        }

        .call-btn {
          background: linear-gradient(135deg, #10b981 0%, #047857 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Tooltip style */
        .support-btn .tooltip {
          position: absolute;
          right: 72px;
          background: #0f172a;
          color: #fff;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          pointer-events: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transform: translateX(10px);
        }

        .support-btn:hover .tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateX(0);
        }

        /* Call Button Pulse Animation */
        .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-color: #10b981;
          opacity: 0.5;
          animation: supportPulse 2s infinite;
          z-index: 1;
        }

        @keyframes supportPulse {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }

        @media (max-width: 768px) {
          .support-buttons-container {
            bottom: 24px;
            right: 24px;
            gap: 12px;
          }
          .support-btn {
            width: 48px;
            height: 48px;
          }
          .support-btn svg {
            width: 20px;
            height: 20px;
          }
          .support-btn .tooltip {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
