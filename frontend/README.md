# Literature Review Manager - Frontend

React + TypeScript + Vite frontend for Literature Review Manager.

## Tech Stack

- **React 18.2** - UI library
- **TypeScript 5.3** - Type safety
- **Vite 5.1** - Build tool and dev server
- **Material-UI 5.15** - Component library
- **React Router 6.22** - Client-side routing
- **React Query 5.20** - Server state management
- **Zustand 4.5** - Client state management
- **D3.js 7.8** - Citation network visualization
- **Axios 1.6** - HTTP client
- **react-hook-form 7.50** - Form validation
- **react-hot-toast 2.4** - Toast notifications

## Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:3000`

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

The `.env` file is already created with:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_NAME=Literature Review Manager
```

Update `VITE_API_BASE_URL` if your backend runs on a different port.

### 3. Start Development Server

```bash
npm run dev
```

The app will run on `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

### 5. Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable components
│   │   ├── layout/          # Layout components (MainLayout)
│   │   └── ProtectedRoute.tsx
│   ├── contexts/            # React contexts (AuthContext)
│   ├── pages/               # Page components
│   │   ├── auth/            # Login, Register
│   │   ├── dashboard/       # Dashboard
│   │   ├── papers/          # Paper management
│   │   ├── library/         # Personal library
│   │   ├── citations/       # Citation network visualization
│   │   └── profile/         # User profile
│   ├── services/            # API service layer
│   │   ├── api.ts           # Axios instance with interceptors
│   │   ├── auth.service.ts
│   │   ├── paper.service.ts
│   │   ├── tag.service.ts
│   │   ├── note.service.ts
│   │   ├── library.service.ts
│   │   ├── citation.service.ts
│   │   ├── pdf.service.ts
│   │   └── summary.service.ts
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx              # Root component with routing
│   ├── main.tsx             # Application entry point
│   └── vite-env.d.ts        # Vite environment types
├── public/                  # Static assets
├── index.html               # HTML entry point
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
└── .env                     # Environment variables
```

## Features Implemented

### Authentication
- ✅ Login page with form validation
- ✅ Registration with email/password
- ✅ JWT token management (localStorage)
- ✅ Protected routes with auto-redirect
- ✅ Auth context for global state

### Dashboard
- ✅ Statistics cards (papers, library items, reading status)
- ✅ Overview of user activity

### Paper Management
- ✅ Search papers with pagination
- ✅ View paper details (title, authors, abstract, DOI, URL)
- ✅ Tag display
- ✅ Navigation to citation network

### Library
- ✅ Personal library view
- ✅ Reading status badges (To Read, Reading, Completed)
- ✅ Rating display
- ✅ Notes preview

### Citation Network
- ✅ D3.js force-directed graph visualization
- ✅ Interactive node dragging
- ✅ Current paper highlighted (red node)
- ✅ Related papers (blue nodes)
- ✅ 2-level depth citation network

### Profile
- ✅ User information display
- ✅ Email, name, affiliation
- ✅ Account creation date

## API Integration

All API calls are handled through service files in `src/services/`:

- **Axios Interceptors**: Automatically attach JWT token to requests
- **Error Handling**: 401 responses trigger auto-logout
- **Type Safety**: All API responses typed with TypeScript

## Development Notes

### Path Aliases

TypeScript path aliases are configured in `tsconfig.json` and `vite.config.ts`:

- `@/` → `src/`
- `@components/` → `src/components/`
- `@pages/` → `src/pages/`
- `@services/` → `src/services/`
- `@types/` → `src/types/`
- `@contexts/` → `src/contexts/`

### Backend Proxy

Vite dev server proxies `/api` requests to `http://localhost:3000` to avoid CORS issues during development.

### React Query

- Automatic caching and refetching
- `staleTime: 5 minutes`
- No refetch on window focus

## Next Steps (Future Enhancements)

- [ ] Add Paper Form (Create/Edit)
- [ ] PDF upload and viewing
- [ ] AI summary generation UI
- [ ] Note management (CRUD)
- [ ] Tag management
- [ ] Advanced search filters
- [ ] Export library data
- [ ] Dark mode toggle
- [ ] Internationalization (i18n)

## Troubleshooting

### Port Already in Use

If port 5173 is occupied:

```bash
npm run dev -- --port 5174
```

### Backend Connection Issues

Ensure backend is running on `http://localhost:3000` and check `.env` file.

### TypeScript Errors

Run:

```bash
npm run build
```

To check for compilation errors.

## License

MIT
