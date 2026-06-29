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
console.log(getDatesBetween("2026-06-29T10:00:00", "2026-06-30T10:00:00"));
console.log(getDatesBetween("2026-06-29T04:06:00", "2026-07-02T10:00:00"));
