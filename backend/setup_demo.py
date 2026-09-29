import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from users.models import Department, CustomUser

# ── Create departments ────────────────────────────────────
depts = [
    ('ahp', 'AHP - Ash Handling Plant'),
    ('operations', 'Operations'),
    ('electrical', 'Electrical'),
    ('mechanical', 'Mechanical'),
    ('ci', 'Control & Instrumentation'),
]
for code, name in depts:
    d, created = Department.objects.get_or_create(code=code, defaults={'name': name})
    print(f'  Dept [{code}]: {"CREATED" if created else "exists"}')

ahp_dept = Department.objects.get(code='ahp')

# ── SuperAdmin ────────────────────────────────────────────
if not CustomUser.objects.filter(employee_id='ADMIN001').exists():
    u = CustomUser.objects.create_superuser(
        employee_id='ADMIN001',
        email='admin@adani.com',
        password='Admin@123',
        first_name='Super',
        last_name='Admin',
    )
    u.is_2fa_enabled = False
    u.save()
    print('  SuperAdmin CREATED: ADMIN001 / Admin@123')
else:
    print('  SuperAdmin already exists: ADMIN001 / Admin@123')

# ── Supervisor ────────────────────────────────────────────
if not CustomUser.objects.filter(employee_id='SUP001').exists():
    u = CustomUser.objects.create_user(
        employee_id='SUP001',
        email='supervisor@adani.com',
        password='Super@123',
        first_name='Rajesh',
        last_name='Sharma',
        role='supervisor',
    )
    u.is_2fa_enabled = False
    u.departments.add(ahp_dept)
    u.save()
    print('  Supervisor CREATED: SUP001 / Super@123')
else:
    print('  Supervisor already exists: SUP001 / Super@123')

# ── Operator ──────────────────────────────────────────────
if not CustomUser.objects.filter(employee_id='OPR001').exists():
    u = CustomUser.objects.create_user(
        employee_id='OPR001',
        email='operator@adani.com',
        password='Oper@123',
        first_name='Amit',
        last_name='Kumar',
        role='operator',
    )
    u.is_2fa_enabled = False
    u.departments.add(ahp_dept)
    u.save()
    print('  Operator CREATED: OPR001 / Oper@123')
else:
    print('  Operator already exists: OPR001 / Oper@123')

print()
print('=== Demo Setup Complete ===')
print('Login at: http://localhost:5173')
print()
print('Test Accounts (2FA disabled for demo):')
print('  SuperAdmin  -> ADMIN001 / Admin@123')
print('  Supervisor  -> SUP001   / Super@123')
print('  Operator    -> OPR001   / Oper@123')
