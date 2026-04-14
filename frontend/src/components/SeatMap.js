"use client";

import React, { useState, useEffect } from "react";
import "./SeatMap.css";
import { apiRequest } from "@/lib/api";

export default function SeatMap({ ticketTypeId, onSeatsSelected }) {
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // This helps UI handle optimistic lock/unlock transitions
  const [processingSeats, setProcessingSeats] = useState([]);

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
    // Cannot interact with booked or seats currently processing or locked by others
    if (seat.status === "BOOKED" || processingSeats.includes(seat.id)) return;
    
    // If it's locked and we haven't selected it, it's locked by someone else
    if (seat.status === "LOCKED" && !selectedSeats.includes(seat.id)) {
        alert("Ghế này đang được người khác giữ. Vui lòng chọn ghế khác.");
        return;
    }

    const isSelected = selectedSeats.includes(seat.id);
    setProcessingSeats([...processingSeats, seat.id]);

    try {
      const endpoint = isSelected ? "/seats/unlock" : "/seats/lock";
      
      const res = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({ seatIds: [seat.id] })
      });
      
      if (!res.success) {
        alert(res.message || "Có lỗi xảy ra khi thao tác ghế");
        setProcessingSeats(prev => prev.filter(id => id !== seat.id));
        return;
      }

      // Update local state
      let newSelected;
      if (isSelected) {
        newSelected = selectedSeats.filter(id => id !== seat.id);
      } else {
        newSelected = [...selectedSeats, seat.id];
      }
      setSelectedSeats(newSelected);
      // Pass both IDs and seat info (names) to parent
      const selectedSeatObjects = seats.filter(s => newSelected.includes(s.id));
      onSeatsSelected(newSelected, selectedSeatObjects);
      
    } catch (error) {
      console.error("Error toggling seat:", error);
      alert("Lỗi kết nối khi chọn ghế");
    } finally {
      setProcessingSeats(prev => prev.filter(id => id !== seat.id));
    }
  };

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
    <div className="seatmap-container">
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
                  gridTemplateColumns: `repeat(${maxSeatsPerRow}, 40px)`,
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

      <div className="seatmap-legend">
        <div className="legend-item"><div className="seatmap-seat available"></div> Trống</div>
        <div className="legend-item"><div className="seatmap-seat selected"></div> Đang chọn</div>
        <div className="legend-item"><div className="seatmap-seat locked"></div> Đang được giữ</div>
        <div className="legend-item"><div className="seatmap-seat booked"></div> Đã bán</div>
      </div>
      
      {selectedSeats.length > 0 && (
         <div className="seatmap-summary">
            Đã chọn: {seats.filter(s => selectedSeats.includes(s.id)).map(s => s.name).join(", ")}
         </div>
      )}
    </div>
  );
}
