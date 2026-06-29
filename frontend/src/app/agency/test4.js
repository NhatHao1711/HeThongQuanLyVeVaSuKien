const ticketTypes = [
  { eventDate: '2026-06-29' },
  { eventDate: '2026-06-30' },
  { eventDate: '2026-06-29' }
];
const uniqueDates = [...new Set(ticketTypes.map(t => t.eventDate).filter(Boolean))].sort();
console.log("uniqueDates:", uniqueDates);
