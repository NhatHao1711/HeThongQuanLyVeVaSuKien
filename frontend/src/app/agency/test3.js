const parseDateSafe = (dateVal) => {
  if (!dateVal) return null;
  if (Array.isArray(dateVal)) {
    const [y, m, d, h = 0, min = 0, s = 0] = dateVal;
    return new Date(y, m - 1, d, h, min, s);
  }
  return new Date(dateVal);
};

const getDatesBetween = (startStr, endStr) => {
  const dates = [];
  if (!startStr || !endStr) return dates;
  let current = parseDateSafe(startStr);
  const end = parseDateSafe(endStr);
  
  if (!current || isNaN(current) || !end || isNaN(end)) return dates;
  
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

// Simulate arrays
console.log(getDatesBetween([2026, 6, 29, 17, 28, 0], [2026, 7, 10, 17, 26, 0]));
// Simulate strings
console.log(getDatesBetween("2026-06-29T17:28:00", "2026-07-10T17:26:00"));
