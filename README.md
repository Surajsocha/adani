# Adani DTPS – E-Logbook System

## Project Structure
```
adani/
├── backend/          ← Django REST API
│   ├── core/         ← Django settings, URLs
│   ├── authentication/ ← JWT + 2FA OTP auth
│   ├── users/        ← Custom user model, RBAC
│   ├── ahp_logbook/  ← AHP Dry & Wet logbook
│   ├── .env          ← Configuration
│   └── manage.py
├── frontend/         ← React.js (Vite)
│   ├── src/
│   │   ├── api/      ← Axios with JWT refresh
│   │   ├── store/    ← Redux Toolkit
│   │   ├── pages/    ← Login, Dashboard, AHP forms
│   │   └── components/ ← Layout (Sidebar, Header)
│   └── package.json
├── setup.bat         ← One-click DB setup
└── start_servers.bat ← Start both servers
```

---

## Prerequisites

1. **MySQL Server** must be installed and running
2. **Python 3.x** installed
3. **Node.js** installed

---

## Step 1: Configure MySQL

Open MySQL and run:
```sql
CREATE DATABASE adani_elogbook CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Update `backend/.env` with your MySQL credentials:
```
DB_USER=root
DB_PASSWORD=your_mysql_password
```

---

## Step 2: Configure Email (for OTP)

Update `backend/.env`:
```
EMAIL_HOST_USER=your-gmail@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

> **Gmail App Password**: Go to Gmail → Account → Security → 2-Step Verification → App Passwords → Generate

---

## Step 3: Run Setup (First Time Only)

Double-click `setup.bat` or run manually:
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
python manage.py shell -c "from users.models import Department; [Department.objects.get_or_create(code=c, defaults={'name':n}) for c,n in [('ahp','AHP - Ash Handling Plant'),('operations','Operations'),('electrical','Electrical'),('mechanical','Mechanical'),('ci','Control & Instrumentation')]]"
python manage.py createsuperuser
```

---

## Step 4: Start Servers

Double-click `start_servers.bat` or run manually:

**Terminal 1 – Backend:**
```bash
cd backend
python manage.py runserver
```

**Terminal 2 – Frontend:**
```bash
cd frontend
npm run dev
```

---

## Access URLs

| URL | Description |
|-----|-------------|
| http://localhost:5173 | Main Application |
| http://localhost:8000/admin/ | Django Admin |
| http://localhost:8000/api/ | API Root |

---

## API Endpoints

### Authentication
```
POST /api/auth/login/           → Step 1: credentials
POST /api/auth/verify-otp/      → Step 2: OTP verification
POST /api/auth/resend-otp/      → Resend OTP
POST /api/auth/logout/          → Blacklist token
POST /api/auth/token/refresh/   → Refresh access token
POST /api/auth/password-reset/  → Request reset OTP
POST /api/auth/password-reset/confirm/ → Confirm reset
```

### AHP Logbook
```
GET/POST   /api/logbook/ahp/dry/              → List/Create dry entries
GET/PUT    /api/logbook/ahp/dry/{id}/         → View/Edit
POST       /api/logbook/ahp/dry/{id}/submit/  → Submit for approval
POST       /api/logbook/ahp/dry/{id}/approve/ → Approve
POST       /api/logbook/ahp/dry/{id}/reject/  → Reject
POST       /api/logbook/ahp/dry/{id}/upload_attachment/ → File upload

GET/POST   /api/logbook/ahp/wet/              → Wet system same pattern
```

---

## User Roles

| Role | Permissions |
|------|-------------|
| `superadmin` | Full access, user management |
| `dept_admin` | Department users + entries |
| `supervisor` | View + Approve/Reject |
| `operator` | Create + Submit entries |
| `viewer` | Read-only |

---

## Login Flow (2-Step)

1. Enter **Employee ID** + **Password**
2. If 2FA enabled → OTP emailed to registered address
3. Enter **6-digit OTP** (5-minute validity)
4. JWT tokens issued → access (60 min) + refresh (7 days)

---

## Creating Test Users (via Django Admin)

1. Go to `http://localhost:8000/admin/`
2. Login with superuser
3. Go to Users → Add User
4. Set: Employee ID, Email, Name, Role, Department
5. Set `is_2fa_enabled = False` for testing (no email required)
