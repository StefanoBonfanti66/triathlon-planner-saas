# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 6.3.x   | ✅ |
| 6.2.x   | ✅ Security patches only |
| < 6.2   | ❌ |

## Database Security

### Row Level Security (RLS)
RLS is enabled on all critical tables: `teams`, `profiles`, `user_plans`, `races`, `audit_logs`.

- **Multi-tenancy**: users only see data belonging to their team
- **Anonymous inserts blocked**: direct API inserts into `profiles` require authentication (`auth.role() <> 'anon'`)
- **Race data**: public read-only; write restricted to automated sync pipelines
- **Audit logs**: users can only insert their own logs; team admins can view their team's logs

### Access Control by Role

| Role | Permissions |
|------|-------------|
| Super Admin | Full access to all teams, user promotion, configuration |
| Team Admin | Manage own team's athletes, export, social stats, Telegram setup |
| Viewer | Read-only access to all team data; write operations blocked via RLS + frontend |
| Atleta | Personal race planning, team calendar view |

### Secure Functions

- `check_team_code()` — `SECURITY DEFINER` function validating join codes without exposing the `teams` table
- `send_telegram_msg()` — `SECURITY DEFINER` function accessing secrets in `internal.app_config`; restricted to `service_role`
- `handle_new_user` trigger — enforces NOT NULL on `profiles.team_id` by requiring `raw_user_meta_data->>'team_code'`; runs as `SECURITY DEFINER`

### Secrets Management

| Secret | Storage |
|--------|---------|
| Telegram Bot Token | `internal.app_config` schema (hidden from PostgREST API) |
| Supabase Service Key | GitHub Secrets (CI/CD) |
| Telegram Admin Chat ID | `internal.app_config` schema |
| API keys, tokens | GitHub Secrets + Vercel Environment Variables |

The `internal` schema is revoked from `public` at database level and is never exposed via REST API.

## Edge Functions

- `invite-athlete` (v6) uses `auth.admin.inviteUserByEmail()` with Service Role
- Join code lookup from `teams` table before account creation
- Email field is optional: if absent, athlete is created as registry-only (no auth account)

## Backup & Disaster Recovery

- **Daily JSON backup** to GitHub repository (02:00 UTC via GitHub Actions)
- **Soft delete** on all records (`deleted_at` timestamp, no hard deletes)
- **Team-level export** available via Admin panel (Excel)
- Backup data contains only sport registry info (no passwords, no secrets)

## Code Quality & Automation

- **Dependabot**: weekly npm dependency updates (`.github/dependabot.yml`)
- **CodeQL**: security scanning on every push (`.github/workflows/codeql.yml`)
- **Supabase backup**: daily automated backup workflow
- **Vercel deploy**: auto-deploy on push to `main` (Hobby tier)

## Vulnerability Reporting

To report a security vulnerability:

1. **Open a private issue** on GitHub: https://github.com/StefanoBonfanti66/triathlon-planner-saas/issues
2. **Or email**: bonfantistefano4@gmail.com

You can expect an acknowledgment within 48 hours and an update on the remediation plan within 7 days.
