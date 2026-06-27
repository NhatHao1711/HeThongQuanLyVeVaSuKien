'use client';

export default function CategorySidebar({ selected, onSelect }) {
  const categories = [
    { id: null, name: 'Tất cả' },
    { id: 1, name: 'Âm nhạc' },
    { id: 2, name: 'Sân khấu' },
    { id: 3, name: 'Thể thao' },
    { id: 4, name: 'Hội thảo' },
    { id: 5, name: 'Tham quan' },
    { id: 6, name: 'Khác' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {categories.map(cat => (
        <button
          key={cat.id || 'all'}
          onClick={() => onSelect(cat.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 8,
            border: 'none',
            background: selected === cat.id ? 'rgba(0,180,110,0.08)' : 'transparent',
            color: selected === cat.id ? '#00B46E' : '#4a5568',
            fontWeight: selected === cat.id ? 600 : 400,
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            textAlign: 'left',
          }}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
