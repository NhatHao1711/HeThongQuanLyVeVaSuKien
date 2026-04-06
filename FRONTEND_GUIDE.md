# Frontend Redesign Guide - TicketBox Style

## Design Philosophy

Thiết kế hiện đại, sạch, thẩm mỹ cao - tương tự trang chủ ticketbox.vn

### Color Palette
```
Primary:      #6366f1 (Indigo)
Accent:       #f59e0b (Amber)
Success:      #10b981 (Green)
Error:        #ef4444 (Red)

Background:   #0a0a1a (Near Black)
Card:         #111127 (Dark Blue)
Text:         #f1f5f9 (Off White)
Muted:        #94a3b8 (Gray)
```

### Typography
- Font: Inter (Google Fonts)
- H1: 40px, weight 700
- H2: 32px, weight 700
- H3: 24px, weight 600
- Body: 16px, weight 400
- Small: 14px, weight 500

---

## Page Structure

### 1. Homepage (/)

**Sections (Top to Bottom):**

```
┌─────────────────────────────────────────┐
│          Header/Navbar (Fixed)          │
├─────────────────────────────────────────┤
│          Hero Banner + Search            │
├─────────────────────────────────────────┤
│ Categories Sidebar │  Featured Events    │
│   (7 items)       │    (Grid 4 cols)    │
├─────────────────────────────────────────┤
│        Trending Events (Carousel)        │
├─────────────────────────────────────────┤
│     "For You" Recommendations (Grid)     │
├─────────────────────────────────────────┤
│  This Weekend | This Month (Tabs)        │
├─────────────────────────────────────────┤
│       Featured Destinations (4)          │
├─────────────────────────────────────────┤
│            Footer                        │
└─────────────────────────────────────────┘
```

### 2. Event Grid Card

**Layout:**
- Image (350x200px, rounded)
- Title (2 lines max)
- Price badge (top-left: "Từ XXX đ")
- Date (bottom: "DD/MM/YYYY")
- Hover effect: lift + shadow

### 3. Navigation

**Navbar:**
- Logo + Brand name (left)
- Links: Trang chủ, Sự kiện, Vé của tôi, Tìm bạn, Admin (middle)
- User dropdown + Logout (right)
- Fixed at top, blur background

**Categories Sidebar:**
```
- Nhạc sống
- Sân khấu & Nghệ thuật
- Thể Thao
- Hội thảo & Workshop
- Tham quan & Trải nghiệm
- Khác
- Vé bán lại
```

---

## Component Breakdown

### 1. EventCard (Reusable)
```jsx
<EventCard 
  event={{
    id, title, image, price, date, category, 
    location, organizer
  }}
  onClick={handleEventClick}
/>
```

**Features:**
- Image with overlay on hover
- Price badge positioning
- Date display
- Category tag

### 2. EventGrid (Container)
```jsx
<EventGrid 
  events={events}
  columns={4}
  loading={loading}
/>
```

**Features:**
- Responsive (4/3/2/1 columns)
- Infinite scroll or pagination
- Loading skeleton
- Empty state

### 3. CategorySidebar
```jsx
<CategorySidebar 
  categories={categories}
  selected={activeCategory}
  onChange={setActiveCategory}
/>
```

**Features:**
- Sticky positioning
- Active state styling
- Click to filter

### 4. FeaturedCarousel
```jsx
<FeaturedCarousel 
  events={featuredEvents}
  autoPlay={true}
/>
```

**Features:**
- Auto-scroll every 5s
- Manual navigation arrows
- Dot indicators

### 5. HeroSearch
```jsx
<HeroSearch 
  onSearch={handleSearch}
  onFilter={handleFilter}
/>
```

**Features:**
- Large search input
- Filter by category/location/date
- Quick suggestions

---

## Layout Specs

### Container
- Max-width: 1400px
- Padding: 2rem (responsive: 1rem on mobile)
- Margin: auto

### Grid
- Max 4 columns on desktop
- 3 columns on tablet
- 2 columns on mobile
- Gap: 24px

### Spacing System
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

### Border Radius
- Cards: 12px
- Buttons: 8px
- Images: 12px

---

## States & Animations

### Transitions
- Hover effects: 200ms ease-out
- Loading: skeleton pulse animation
- Page load: fade-in animation

### Hover States
- Cards: scale(1.02) + shadow increase
- Buttons: background color shift
- Links: color change + underline

---

## Performance

### Image Optimization
- Use Next.js Image component
- Lazy loading for below-fold
- WebP format support
- Responsive srcset

### Code Splitting
- Dynamic imports for modals
- Page-level code splitting
- Lazy component loading

### Caching
- Events list: 5 min cache
- User data: 1 min cache
- Categories: 1 hour cache

---

## Responsive Breakpoints

```css
Mobile:    320px - 640px
Tablet:    641px - 1024px
Desktop:   1025px - 1440px
Large:     1441px+
```

---

## Accessibility

- ARIA labels on buttons
- Keyboard navigation support
- Color contrast ratio >= 4.5:1
- Focus indicators visible
- Alt text on all images

---

## Tech Stack Details

- **Framework:** Next.js 14 (React 18)
- **Styling:** CSS Modules + custom CSS
- **State:** React Context/Hooks
- **HTTP:** Axios with interceptors
- **Auth:** JWT in localStorage
- **Forms:** React Hook Form + Zod validation

---

## Getting Started

```bash
cd frontend

# Install dependencies
npm install

# Environment variables
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_API_TIMEOUT=10000
EOF

# Development
npm run dev

# Production build
npm run build
npm start
```

Access at: **http://localhost:3000**

---

## File Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.js              (Homepage)
│   │   ├── events/
│   │   │   └── page.js          (Events listing)
│   │   ├── [id]/
│   │   │   └── page.js          (Event detail)
│   │   ├── layout.js            (Root layout)
│   │   └── globals.css          (Global styles)
│   ├── components/
│   │   ├── Navbar.js
│   │   ├── Footer.js
│   │   ├── EventCard.js
│   │   ├── EventGrid.js
│   │   ├── CategorySidebar.js
│   │   ├── FeaturedCarousel.js
│   │   └── HeroSearch.js
│   └── lib/
│       ├── api.js               (API calls)
│       └── constants.js         (Categories, colors)
└── package.json
```



# Build
npm run build

# Production
npm start
```

---

## SEO Optimization (Next.js 14)

### Meta Tags & Open Graph

```tsx
// app/events/[id]/page.tsx
import { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const event = await fetchEvent(params.id);

  return {
    title: `${event.title} - Ticketbox`,
    description: event.description,
    keywords: ['sự kiện', 'vé', event.title],
    openGraph: {
      title: event.title,
      description: event.description,
      images: [
        {
          url: event.imageUrl,
          width: 1200,
          height: 630,
          alt: event.title,
        },
      ],
      type: 'website',
      url: `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description: event.description,
      images: [event.imageUrl],
    },
  };
}

export default function EventPage({ params }) {
  // Component code
}
```

### JSON-LD Structured Data

```tsx
// utils/structuredData.ts
export function generateEventSchema(event) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: event.startTime,
    endDate: event.endTime,
    location: {
      '@type': 'Place',
      name: event.location,
    },
    offers: {
      '@type': 'Offer',
      price: event.ticketTypes[0]?.price,
      priceCurrency: 'VND',
      availability: 'https://schema.org/InStock',
    },
  };
}

// Usage in page
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
/>
```

---

## Folder Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Homepage
│   ├── globals.css             # Global styles
│   ├── events/
│   │   ├── page.tsx           # Events listing page
│   │   └── [id]/
│   │       └── page.tsx       # Event detail page
│   ├── login/
│   │   └── page.tsx           # Login page
│   ├── register/
│   │   └── page.tsx           # Register page
│   ├── my-tickets/
│   │   └── page.tsx           # User tickets page
│   └── buddies/
│       └── page.tsx           # Buddy management page
├── components/
│   ├── Navbar.tsx             # Navigation bar
│   ├── Footer.tsx             # Footer
│   ├── EventCard.tsx          # Event card component
│   ├── BookingForm.tsx        # Booking form
│   ├── QRViewer.tsx           # QR code viewer
│   └── auth/
│       ├── LoginForm.tsx
│       └── RegisterForm.tsx
├── lib/
│   ├── api.ts                 # API client setup
│   ├── auth.ts                # Authentication utilities
│   ├── constants.ts           # Constants
│   └── utils.ts               # Helper functions
├── context/
│   ├── AuthContext.tsx        # Authentication context
│   └── ThemeContext.tsx       # Theme context
├── hooks/
│   ├── useAuth.ts             # Authentication hook
│   ├── useEvents.ts           # Events hook
│   └── useTickets.ts          # Tickets hook
├── types/
│   ├── api.ts                 # API response types
│   ├── entity.ts              # Entity types
│   └── index.ts               # Index
├── styles/
│   └── ...                    # Component/page styles
├── public/
│   ├── images/
│   └── icons/
├── package.json
├── tsconfig.json
├── next.config.mjs
└── eslint.config.mjs
```

---

## Key Files & Implementation

### 1. API Client (lib/api.ts)

```typescript
import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const apiClient = axios.create({
  baseURL,
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000'),
  withCredentials: true,
});

// Add JWT token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw error;
  }
);

export default apiClient;
```

### 2. Authentication Hook (hooks/useAuth.ts)

```typescript
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api';

interface User {
  userId: number;
  fullName: string;
  email: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      setIsAuthenticated(true);
    }
    
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.post('/api/auth/login', {
      email,
      password,
    });

    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data));
    
    setUser(response.data);
    setIsAuthenticated(true);

    return response.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return { user, isAuthenticated, isLoading, login, logout };
}
```

### 3. Event Listing Component

```typescript
'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';

interface Event {
  id: number;
  title: string;
  description: string;
  startTime: string;
  location: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await apiClient.get('/api/events');
        setEvents(data.data);
      } catch (error) {
        console.error('Failed to fetch events', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
```

### 4. Booking Flow

```typescript
'use client';

import { useState } from 'react';
import apiClient from '@/lib/api';

export function BookingForm({ ticketTypeId, onSuccess }) {
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handleBooking = async () => {
    try {
      setIsLoading(true);

      // Step 1: Book ticket
      const bookingResponse = await apiClient.post('/api/bookings', {
        ticketTypeId,
        quantity,
      });

      const { orderId, transactionRef } = bookingResponse.data;

      // Step 2: Create payment URL
      const paymentResponse = await apiClient.post('/api/payments/create-url', {
        orderId,
      });

      // Step 3: Redirect to VNPay
      window.location.href = paymentResponse.data.paymentUrl;

      onSuccess(bookingResponse.data);
    } catch (error) {
      console.error('Booking failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <input
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(parseInt(e.target.value))}
      />
      <button
        onClick={handleBooking}
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Book Now'}
      </button>
    </div>
  );
}
```

### 5. QR Viewer Component

```typescript
'use client';

import Image from 'next/image';

interface Ticket {
  id: number;
  eventTitle: string;
  ticketTypeName: string;
  qrCode: string; // Base64-encoded PNG
}

export function QRViewer({ ticket }: { ticket: Ticket }) {
  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${ticket.qrCode}`;
    link.download = `ticket-${ticket.id}.png`;
    link.click();
  };

  return (
    <div className="qr-container">
      <h2>{ticket.eventTitle}</h2>
      <p>{ticket.ticketTypeName}</p>
      <Image
        src={`data:image/png;base64,${ticket.qrCode}`}
        alt="QR Code"
        width={300}
        height={300}
        unoptimized
      />
      <button onClick={downloadQR}>Download QR</button>
    </div>
  );
}
```

---

## State Management (Context API)

### AuthContext

```typescript
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
```

---

## Payment Callback Handler

```typescript
// app/payment/result/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PaymentResult() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');

  useEffect(() => {
    const responseCode = searchParams.get('vnp_ResponseCode');
    setStatus(responseCode === '00' ? 'success' : 'failed');
  }, [searchParams]);

  return (
    <div className="payment-result">
      {status === 'success' && (
        <div className="success">
          <h1>Thanh toán thành công! 🎉</h1>
          <p>Vé của bạn đang được xử lý. Kiểm tra email để nhận mã QR.</p>
        </div>
      )}
      {status === 'failed' && (
        <div className="failed">
          <h1>Thanh toán thất bại ❌</h1>
          <p>Vui lòng thử lại.</p>
        </div>
      )}
    </div>
  );
}
```

---

## Performance Optimization

### Image Optimization

```typescript
<Image
  src="/event-banner.jpg"
  alt="Event"
  width={1200}
  height={400}
  priority // For above-the-fold images
  quality={75}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

### Code Splitting

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  { loading: () => <div>Loading...</div> }
);
```

### Caching

```typescript
// Cache data for 1 hour
const data = await fetch(url, {
  next: { revalidate: 3600 }
});
```

---

## Testing

```bash
# Install testing library
npm install --save-dev @testing-library/react @testing-library/jest-dom jest

# Run tests
npm run test

# Coverage
npm run test:coverage
```

---

## Deployment

### Vercel

```bash
# Push to GitHub
git push

# Vercel auto-deploys on push
# Setup environment variables in Vercel dashboard
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

**Frontend Development Ready!** ✅
