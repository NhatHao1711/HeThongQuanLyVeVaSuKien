"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import "./SeatMap.css";
import { apiRequest } from "@/lib/api";

const SeatMap = forwardRef(({ ticketTypeId, onSeatsSelected, initialSelectedSeats = [] }, ref) => {
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState(initialSelectedSeats);
  const selectedSeatsRef = React.useRef(initialSelectedSeats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestQuantity, setSuggestQuantity] = useState(2);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3500);
  };
  
  // This helps UI handle optimistic lock/unlock transitions
  const [processingSeats, setProcessingSeats] = useState([]);
  const processingSeatsRef = React.useRef([]);

  useEffect(() => {
    if (ticketTypeId) {
      fetchSeats();
    }
  }, [ticketTypeId]);

  const fetchSeats = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/seats?ticketTypeId=${ticketTypeId}`);
      if (res.success) {
        setSeats(res.data || []);
      } else {
        setError(res.message || "Failed to load seats");
      }
    } catch (err) {
      setError("An error occurred while fetching seats");
    } finally {
      setLoading(false);
    }
  };

  const toggleSeat = async (seat) => {
    const currentProcessing = processingSeatsRef.current;
    if (seat.status === "BOOKED" || currentProcessing.includes(seat.id)) return;
    
    const currentSelected = selectedSeatsRef.current;
    const isSelected = currentSelected.includes(seat.id);
    
    if (seat.status === "LOCKED" && !isSelected) {
        showToast("Ghế này đang được người khác giữ. Vui lòng chọn ghế khác.", "warning");
        return;
    }

    const newProcessing = [...currentProcessing, seat.id];
    processingSeatsRef.current = newProcessing;
    setProcessingSeats(newProcessing);

    try {
      const endpoint = isSelected ? "/seats/unlock" : "/seats/lock";
      
      const res = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({ seatIds: [seat.id] })
      });
      
      if (!res.success) {
        showToast(res.message || "Có lỗi xảy ra khi thao tác ghế", "error");
        const revertedProcessing = processingSeatsRef.current.filter(id => id !== seat.id);
        processingSeatsRef.current = revertedProcessing;
        setProcessingSeats(revertedProcessing);
        return;
      }

      const latestSelected = selectedSeatsRef.current;
      const actuallySelected = latestSelected.includes(seat.id);
      let newSelected;
      if (actuallySelected) {
        newSelected = latestSelected.filter(id => id !== seat.id);
      } else {
        newSelected = [...latestSelected, seat.id];
      }
      
      selectedSeatsRef.current = newSelected;
      setSelectedSeats(newSelected);
      
      setSeats(prevSeats => prevSeats.map(s => 
        s.id === seat.id 
          ? { ...s, status: actuallySelected ? "AVAILABLE" : "LOCKED" } 
          : s
      ));

      // Use functional state updater for seats if we need to get latest, but seats state might not be fully updated here.
      // We can just find the seat from current seats array
      const selectedSeatObjects = seats
        .filter(s => newSelected.includes(s.id))
        .map(s => s.id === seat.id ? { ...s, status: actuallySelected ? "AVAILABLE" : "LOCKED" } : s);
        
      onSeatsSelected(newSelected, selectedSeatObjects);
      
    } catch (error) {
      console.error("Error toggling seat:", error);
      showToast("Lỗi kết nối khi chọn ghế", "error");
    } finally {
      const remainingProcessing = processingSeatsRef.current.filter(id => id !== seat.id);
      processingSeatsRef.current = remainingProcessing;
      setProcessingSeats(remainingProcessing);
    }
  };

  const handleSuggest = async (qty) => {
    if (qty > 20) {
      showToast("Quý khách vui lòng chọn tối đa 20 ghế cho mỗi lần gợi ý để có trải nghiệm tốt nhất nhé.", "warning");
      return;
    }
    
    setIsSuggesting(true);
    try {
      let url = `/seats/best-available?ticketTypeId=${ticketTypeId}&quantity=${qty}`;
      if (selectedSeats.length > 0) {
        url += `&ignoreLockedSeatIds=${selectedSeats.join(',')}`;
      }
      const res = await apiRequest(url);
      if (res.success && res.data && res.data.length > 0) {
        const bestOption = res.data[0]; // Top 1 option
        const newSeatIds = bestOption.seats.map(s => s.id);
        
        // Unlock currently selected seats
        if (selectedSeats.length > 0) {
          await apiRequest("/seats/unlock", {
            method: "POST",
            body: JSON.stringify({ seatIds: selectedSeats })
          });
        }
        
        // Lock the newly suggested seats
        await apiRequest("/seats/lock", {
          method: "POST",
          body: JSON.stringify({ seatIds: newSeatIds })
        });
        
        // Update local status so they render correctly if unselected later
        setSeats(prevSeats => prevSeats.map(s => {
          if (selectedSeats.includes(s.id)) return { ...s, status: "AVAILABLE" };
          if (newSeatIds.includes(s.id)) return { ...s, status: "LOCKED" };
          return s;
        }));

        setSelectedSeats(newSeatIds);
        
        const selectedSeatObjects = seats.filter(s => newSeatIds.includes(s.id));
        onSeatsSelected(newSeatIds, selectedSeatObjects);
        
      } else {
        showToast(`Không tìm thấy ${qty} ghế trống liền kề phù hợp.`, "warning");
      }
    } catch (err) {
      showToast("Lỗi khi tìm ghế gợi ý", "error");
    } finally {
      setIsSuggesting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    findBestSeats: handleSuggest
  }));

  if (loading) return <div className="seatmap-loading">Đang tải sơ đồ ghế...</div>;
  if (error) return <div className="seatmap-error">{error}</div>;
  if (seats.length === 0) return <div className="seatmap-empty">Loại vé này không hỗ trợ chọn chỗ ngồi hoặc chưa thiết lập sơ đồ.</div>;

  // Group seats by row (assuming name is like A1, A2, B1...)
  const rows = {};
  seats.forEach(seat => {
    const row = seat.name.charAt(0);
    if (!rows[row]) rows[row] = [];
    rows[row].push(seat);
  });

  // Calculate max seats in any row for uniform grid
  const maxSeatsPerRow = Math.max(...Object.values(rows).map(r => r.length));

  return (
    <div className="seatmap-container" style={{ position: 'relative' }}>
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 100,
          background: toast.type === 'error' ? '#ef4444' : toast.type === 'warning' ? '#f59e0b' : '#3b82f6',
          color: 'white', padding: '10px 20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '500',
          animation: 'fadeInDown 0.3s ease-out forwards'
        }}>
          {toast.message}
        </div>
      )}

      <h3 className="seatmap-title">Chọn chỗ ngồi</h3>

      <div className="seatmap-stage">MÀN HÌNH CHÍNH</div>
      
      <div className="seatmap-grid-wrapper">
        <div className="seatmap-grid">
          {Object.keys(rows).sort().map(row => {
            const sortedSeats = rows[row].sort((a, b) => {
              const numA = parseInt(a.name.substring(1));
              const numB = parseInt(b.name.substring(1));
              return numA - numB;
            });
            
            return (
              <div key={row} className="seatmap-row">
                <span className="seatmap-row-label">{row}</span>
                <div className="seatmap-seats" style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${maxSeatsPerRow}, 36px)`,
                  gap: '6px'
                }}>
                  {sortedSeats.map(seat => {
                    const isSelected = selectedSeats.includes(seat.id);
                    const isProcessing = processingSeats.includes(seat.id);
                    
                    let className = "seatmap-seat";
                    if (seat.status === "BOOKED") className += " booked";
                    else if (isSelected) className += " selected";
                    else if (seat.status === "LOCKED") className += " locked";
                    else className += " available";
                    
                    if (isProcessing) className += " processing";

                    return (
                      <button
                        key={seat.id}
                        className={className}
                        onClick={() => toggleSeat(seat)}
                        disabled={seat.status === "BOOKED" || isProcessing}
                        title={`${seat.name} - ${seat.status}`}
                      >
                        {seat.name.substring(1).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
        <div className="seatmap-legend" style={{ margin: 0, width: 'auto', borderTop: 'none', paddingTop: 0, justifyContent: 'flex-start' }}>
          <div className="legend-item"><div className="seatmap-seat available"></div> Trống</div>
          <div className="legend-item"><div className="seatmap-seat selected"></div> Đang chọn</div>
          <div className="legend-item"><div className="seatmap-seat locked"></div> Đang được giữ</div>
          <div className="legend-item"><div className="seatmap-seat booked"></div> Đã bán</div>
        </div>

        {/* Gợi ý ghế nhanh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.1)' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            Gợi ý ghế:
          </span>
          <input 
            type="number" 
            min="1" 
            max="20" 
            value={suggestQuantity}
            onChange={(e) => setSuggestQuantity(Number(e.target.value))}
            style={{ width: '50px', padding: '4px', borderRadius: '6px', border: '1px solid #93c5fd', outline: 'none', fontSize: '0.9rem', textAlign: 'center', fontWeight: 'bold', color: '#1e3a8a' }}
          />
          <button 
            onClick={() => handleSuggest(suggestQuantity)}
            disabled={isSuggesting}
            style={{ padding: '6px 14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', transition: 'background 0.2s', opacity: isSuggesting ? 0.7 : 1 }}
            onMouseOver={e => { if(!isSuggesting) e.currentTarget.style.backgroundColor = '#1d4ed8' }}
            onMouseOut={e => { if(!isSuggesting) e.currentTarget.style.backgroundColor = '#2563eb' }}
          >
            {isSuggesting ? 'Đang tìm...' : 'Tìm ngay'}
          </button>
        </div>
      </div>
      

    </div>
  );
});

SeatMap.displayName = "SeatMap";

export default SeatMap;
