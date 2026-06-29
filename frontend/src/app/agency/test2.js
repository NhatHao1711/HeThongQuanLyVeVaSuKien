const getDatesBetween = (startStr, endStr) => {
  const dates = [];
  if (!startStr || !endStr) return dates;
  let current = new Date(startStr);
  const end = new Date(endStr);
  current.setHours(0,0,0,0);
  end.setHours(0,0,0,0);
  
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};
console.log("Test 1:", getDatesBetween("2026-06-29T10:00", "2026-06-30T10:00"));
console.log("Test 2:", getDatesBetween("2026-06-29T10:00:00", "2026-06-30T10:00:00"));
console.log("Test 3:", getDatesBetween("2026-06-29", "2026-06-30"));
