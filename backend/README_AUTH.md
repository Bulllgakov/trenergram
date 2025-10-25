# Authentication & Security

## Telegram WebApp Authentication

### Overview
The API uses Telegram WebApp `initData` validation to authenticate users from Mini Apps. This ensures that requests actually come from Telegram and the user is authenticated.

### How it works

1. **Frontend (Mini App)** sends `Telegram.WebApp.initData` in `X-Telegram-Init-Data` header
2. **Backend** validates the signature using bot token and HMAC-SHA256
3. **If valid**, extracts user ID and loads user from database

### Usage in endpoints

#### New (Secure) Method - Recommended
```python
from core.security import get_current_user_from_telegram

@router.get("/my-profile")
def get_my_profile(current_user: User = Depends(get_current_user_from_telegram)):
    return current_user
```

#### Old Method - Deprecated (for backward compatibility)
```python
from core.security import get_current_user

@router.get("/user")
def get_user_info(telegram_id: str = Query(...), db: Session = Depends(get_db)):
    current_user = get_current_user(telegram_id, db)
    return current_user
```

### Frontend Integration

In your Mini App JavaScript, send init_data in headers:

```javascript
const initData = Telegram.WebApp.initData;

fetch('/api/v1/my-profile', {
    headers: {
        'X-Telegram-Init-Data': initData
    }
})
```

### Dependencies Available

- `get_current_user_from_telegram()` - Get authenticated user
- `get_current_trainer()` - Ensure user is a trainer
- `get_current_client()` - Ensure user is a client

---

## JWT Authentication for Admin Panel

### Overview
Admin panel uses JWT (JSON Web Tokens) for authentication. This is separate from Telegram WebApp auth.

### Login Flow

1. Admin logs in with email/password at `/admin/login`
2. Server validates credentials and returns JWT token
3. Frontend stores token (localStorage/cookie)
4. All subsequent requests include token in `Authorization: Bearer <token>` header

### Token Structure

```json
{
  "telegram_id": "123456789",
  "email": "admin@trenergram.ru",
  "role": "super_admin",
  "club_id": 1,
  "exp": 1234567890
}
```

### Usage in endpoints

```python
from core.jwt import get_current_admin, require_super_admin, require_club_admin

# Any authenticated admin
@router.get("/admin/dashboard")
def get_dashboard(admin: TokenData = Depends(get_current_admin)):
    return {"user": admin.email, "role": admin.role}

# Super admin only
@router.get("/admin/users")
def get_all_users(admin: TokenData = Depends(require_super_admin)):
    return get_users_from_db()

# Club admin or super admin
@router.get("/admin/club/trainers")
def get_club_trainers(admin: TokenData = Depends(require_club_admin)):
    club_id = admin.club_id  # Will be set for club admins
    return get_trainers(club_id)
```

### Creating Tokens

```python
from core.jwt import create_access_token

token = create_access_token({
    "telegram_id": user.telegram_id,
    "email": user.email,
    "role": user.role.value,
    "club_id": user.club_id
})

return {"access_token": token, "token_type": "bearer"}
```

### Frontend Integration

```javascript
const token = localStorage.getItem('access_token');

fetch('/api/v1/admin/dashboard', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
```

### User Roles

- `super_admin` - Full access to everything
- `club_owner` - Full access to their club + manage admins
- `club_admin` - Access to their club data
- `trainer` - Access to their own data (uses Telegram auth)
- `client` - Access to their own data (uses Telegram auth)

---

## Environment Variables

Required in `.env`:

```env
# Security
SECRET_KEY=your-secret-key-change-in-production-use-openssl-rand-hex-32
BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Super Admin
SUPER_ADMIN_EMAIL=admin@trenergram.ru
SUPER_ADMIN_PASSWORD=changeme
```

Generate SECRET_KEY:
```bash
openssl rand -hex 32
```

---

## Security Best Practices

1. **Always use HTTPS in production**
2. **Rotate SECRET_KEY regularly**
3. **Store tokens securely** (httpOnly cookies preferred over localStorage)
4. **Validate roles** on both frontend and backend
5. **Use short token expiration** for sensitive operations
6. **Log all admin actions** for audit trail

---

## Testing Authentication

### Test Telegram Auth (requires real init_data)
```bash
curl -X GET http://localhost:8000/api/v1/my-profile \
  -H "X-Telegram-Init-Data: query_id=AAH...&user=%7B%22id%22%3A123456789..."
```

### Test JWT Auth
```bash
# Login
curl -X POST http://localhost:8000/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@trenergram.ru", "password": "changeme"}'

# Use token
curl -X GET http://localhost:8000/api/v1/admin/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Migrating Existing Endpoints

To migrate existing endpoints to use secure authentication:

1. Replace `telegram_id: str = Query(...)` with `current_user: User = Depends(get_current_user_from_telegram)`
2. Update frontend to send `X-Telegram-Init-Data` header
3. Test thoroughly in staging

Example:

**Before:**
```python
@router.get("/bookings")
def get_bookings(telegram_id: str = Query(...), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(telegram_id=telegram_id).first()
    return get_user_bookings(user.id)
```

**After:**
```python
@router.get("/bookings")
def get_bookings(current_user: User = Depends(get_current_user_from_telegram)):
    return get_user_bookings(current_user.id)
```
