# Race Planner SaaS - Technical & Operational Documentation
**Version**: 6.3.3
**Architect**: Stefano Bonfanti

## 1. Authentication & Recovery Flow
The authentication system is built on Supabase Auth with custom logic for token preservation.

### Password Recovery (Crucial)
- **Flow**: User clicks "Forgot Password" -> Supabase sends email -> Link points to `https://triathlon-planner-saas.vercel.app/login#access_token=...`
- **Fix (v6.3.3)**: `Auth.tsx` uses a persistent 5-second polling mechanism to detect the recovery token in `window.location.hash` or `window.location.href`.
- **Constraint**: The `Redirect URLs` in Supabase MUST include `/**` (e.g., `http://localhost:5173/**`) to allow parameter passing.

### Onboarding (Join Code)
- Every Team in the `teams` table has a unique `join_code`.
- During registration (`signUp`), the `join_code` is passed in `user_metadata`.
- A database **Trigger** (`handle_new_user`) automatically assigns the user to the correct `team_id` based on the code.

## 2. Multi-Team Architecture
Data isolation is enforced at the database level.

- **RLS (Row Level Security)**: Policies ensure that athletes can only see plans and teammates from their own `team_id`.
- **Hierarchy**:
    - **Athlete**: View dashboard, plan races, view team calendar.
    - **Team Admin**: Manage team athletes, export Excel, invite new members.
    - **Super Admin (Stefano)**: Create/Edit teams, manage logos/colors, view system-wide audit logs.

## 3. Operations & Maintenance

### Syncing FITRI Calendar
- A GitHub Action runs every Monday at 00:00.
- It fetches the latest race JSON and updates `races_full.json`.
- This triggers a redeploy on Vercel automatically.

### Admin Manual Bypass
- Located in `AdminPage.tsx`.
- Allows creating an athlete with a pre-set password.
- Uses a Supabase Edge Function (`invite-athlete`) to bypass standard SMTP limits if necessary.

### Disaster Recovery
1. **GitHub Backups**: Daily snapshot of the DB exported to JSON/CSV in the repo.
2. **Soft Delete**: Profiles and plans are never deleted immediately; `deleted_at` timestamp is used instead.
3. **Excel Export**: All athlete data can be exported in one click for off-site backup.

## 4. Environment Configuration
Required variables in `.env` or Vercel:
- `VITE_SUPABASE_URL`: API endpoint.
- `VITE_SUPABASE_ANON_KEY`: Client-side access key.

---
**Note for Future Stefano**: If the password reset fails again, check if Vercel is rewriting the URL hash before React can read it. The current 500ms polling in `Auth.tsx` is the primary shield against this.
