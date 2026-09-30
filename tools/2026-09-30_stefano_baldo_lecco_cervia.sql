-- ============================================================
-- 2026-09-30 — Stefano Baldo: registrazioni Lecco + Cervia
-- Atleta: Stefano Baldo (tessera 85122/A252252, team mtt)
-- profiles.id = d5aa242b-1299-431b-918a-df40bd5dd611
--
-- Gare da inserire (NON presenti nei suoi user_plans):
--   4012-1  05-07-2026  25° Triathlon Sprint Lecco City (Lecco)      Sprint
--   3905-1  26-09-2026  Campionati Italiani Triathlon Sprint       Sprint Age Group
--   3905-4  27-09-2026  Campionati Italiani Triathlon Sprint       Coppa Crono Maschile
--
-- Idempotente: nessun duplicato se eseguito più volte.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Anagrafica: valorizza first_name / last_name (erano NULL)
-- ------------------------------------------------------------
UPDATE profiles
   SET first_name = 'Stefano',
       last_name  = 'Baldo'
 WHERE id = 'd5aa242b-1299-431b-918a-df40bd5dd611'
   AND (first_name IS NULL OR last_name IS NULL);


-- ------------------------------------------------------------
-- 2) Le 3 registrazioni in user_plans (priority C, cost 0)
-- ------------------------------------------------------------
INSERT INTO user_plans (id, user_id, race_id, priority, cost, note, created_at, team_id)
SELECT gen_random_uuid(),
       'd5aa242b-1299-431b-918a-df40bd5dd611',
       r.race_id,
       'C',
       0,
       '',
       now(),
       'mtt'
  FROM (VALUES ('4012-1'), ('3905-1'), ('3905-4')) AS r(race_id)
 WHERE NOT EXISTS (
        SELECT 1
          FROM user_plans p
         WHERE p.user_id = 'd5aa242b-1299-431b-918a-df40bd5dd611'
           AND p.race_id = r.race_id
           AND p.deleted_at IS NULL
       );


-- ------------------------------------------------------------
-- 3) Verifica (deve restituire 5 righe: le 2 vecchie + le 3 nuove)
-- ------------------------------------------------------------
SELECT p.race_id,
       p.priority,
       p.cost,
       r.date,
       r.title,
       r.distance,
       r.location
  FROM user_plans p
  LEFT JOIN races r ON r.id = p.race_id
 WHERE p.user_id = 'd5aa242b-1299-431b-918a-df40bd5dd611'
   AND p.deleted_at IS NULL
 ORDER BY r.date;


-- ------------------------------------------------------------
-- 4) Verifica anagrafica
-- ------------------------------------------------------------
SELECT first_name, last_name, full_name, license_number
  FROM profiles
 WHERE id = 'd5aa242b-1299-431b-918a-df40bd5dd611';
