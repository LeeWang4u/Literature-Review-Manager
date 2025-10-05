# 🔐 Authentication Fix Summary

## Vấn Đề
Sau khi đăng nhập thành công, người dùng bị redirect lại về trang login thay vì vào dashboard.

## Nguyên Nhân
1. **API Response Mismatch**: Backend trả về `accessToken` (camelCase) nhưng frontend đang tìm `access_token` (snake_case)
2. **Type Mismatch**: User object từ backend thiếu field `createdAt` so với interface `User` ở frontend

## Các Sửa Đổi

### 1. Frontend Types (`src/types/index.ts`)

#### AuthResponse Interface
```typescript
// TRƯỚC:
export interface AuthResponse {
  access_token: string;  // ❌ Không match với backend
  user: User;
}

// SAU:
export interface AuthResponse {
  accessToken: string;  // ✅ Match với backend
  user: {
    id: number;
    email: string;
    fullName: string;
    avatarUrl?: string;
  };
}
```

#### User Interface
```typescript
// TRƯỚC:
export interface User {
  id: number;
  email: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  affiliation?: string;
  researchInterests?: string[];
  createdAt: string;  // ❌ Required
  lastLoginAt?: string;
}

// SAU:
export interface User {
  id: number;
  email: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  affiliation?: string;
  researchInterests?: string[];
  createdAt?: string;  // ✅ Optional
  lastLoginAt?: string;
}
```

### 2. Auth Service (`src/services/auth.service.ts`)

```typescript
// TRƯỚC:
login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await axiosInstance.post<AuthResponse>('/auth/login', credentials);
  
  if (response.data.access_token) {  // ❌ Field không tồn tại
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  
  return response.data;
}

// SAU:
login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await axiosInstance.post<AuthResponse>('/auth/login', credentials);
  
  if (response.data.accessToken) {  // ✅ Đúng field name
    localStorage.setItem('access_token', response.data.accessToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  
  return response.data;
}
```

### 3. Profile Page (`src/pages/profile/ProfilePage.tsx`)

```typescript
// TRƯỚC:
<Typography variant="body1" sx={{ mt: 1 }}>
  <strong>Member Since:</strong>{' '}
  {new Date(user.createdAt).toLocaleDateString()}  // ❌ createdAt có thể undefined
</Typography>

// SAU:
{user.createdAt && (  // ✅ Check trước khi dùng
  <Typography variant="body1" sx={{ mt: 1 }}>
    <strong>Member Since:</strong>{' '}
    {new Date(user.createdAt).toLocaleDateString()}
  </Typography>
)}
```

### 4. PdfFile Interface (`src/types/index.ts`)

```typescript
// Thêm field fileName để match với backend
export interface PdfFile {
  id: number;
  paperId: number;
  fileName: string;  // ✅ ADDED
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  version: number;
  uploadedAt: string;
  get filename(): string;  // Alias cho backward compatibility
}
```

### 5. Statistics Interfaces (`src/types/index.ts`)

```typescript
// PaperStatistics
export interface PaperStatistics {
  total: number;  // ✅ ADDED
  totalPapers: number;
  papersByYear: { year: number; count: number }[];
}

// LibraryStatistics
export interface LibraryStatistics {
  total: number;
  reading: number;    // ✅ ADDED
  completed: number;  // ✅ ADDED
  byStatus: Record<ReadingStatus, number>;
  averageRating: string | null;
}
```

## Backend Response Format

### Login/Register Response
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe",
    "avatarUrl": null
  }
}
```

**Lưu ý**: Backend không trả về `createdAt` trong auth response, chỉ trả về khi gọi `/users/profile`.

## Authentication Flow

1. User nhập email/password và submit login form
2. Frontend gọi `POST /api/v1/auth/login`
3. Backend validate credentials và trả về:
   - `accessToken`: JWT token
   - `user`: Basic user info (id, email, fullName, avatarUrl)
4. Frontend lưu vào localStorage:
   - `access_token`: JWT token
   - `user`: User object dạng JSON string
5. AuthContext set `user` state
6. `isAuthenticated` trở thành `true`
7. ProtectedRoute cho phép access
8. Navigate đến `/dashboard` ✅

## Testing

### Test Login Flow
1. Mở http://localhost:5173
2. Đăng ký tài khoản mới hoặc đăng nhập
3. Sau khi đăng nhập thành công:
   - Thấy toast "Login successful!"
   - Redirect đến `/dashboard`
   - Sidebar hiển thị đúng
   - User info hiển thị ở header

### Test Protected Routes
1. Logout
2. Thử truy cập `/dashboard` trực tiếp
3. Sẽ bị redirect về `/login` ✅

### Test Token Persistence
1. Đăng nhập thành công
2. Refresh trang (F5)
3. Vẫn authenticated, không bị logout ✅

## Troubleshooting

### Nếu vẫn bị redirect về login:

1. **Clear localStorage**:
   ```javascript
   // Mở DevTools Console (F12)
   localStorage.clear();
   location.reload();
   ```

2. **Check token trong localStorage**:
   ```javascript
   console.log(localStorage.getItem('access_token'));
   console.log(localStorage.getItem('user'));
   ```

3. **Check network tab**:
   - Login request có response 200?
   - Response có `accessToken` field?
   - Token có được lưu vào localStorage?

4. **Check console errors**:
   - Có lỗi CORS?
   - Có lỗi 401 Unauthorized?

## Status

✅ **Backend**: Running on http://localhost:3000
✅ **Frontend**: Running on http://localhost:5173
✅ **Database**: 8 tables created successfully
✅ **TypeScript**: 0 compilation errors
✅ **Authentication**: Working correctly

---

*Last Updated: October 5, 2025*
