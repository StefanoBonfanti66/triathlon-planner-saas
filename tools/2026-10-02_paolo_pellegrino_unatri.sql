-- ============================================================
-- 2026-10-02 — Paolo Pellegrino: UNATRI kids -> UNATRI
-- Atleta: Paolo Pellegrino (tessera 65172/A200665, team mtt)
-- profiles.id = c756da6a-0712-4734-b00b-48c47cd61608
--
-- Motivo: la registrazione era sulla sotto-gara sbagliata.
--   4139-1  11-10-2026  UNATRI kids  (Paullo, categoria Kids)   <-- ERRATA
--   4139-2  11-10-2026  UNATRI       (Paullo)                   <-- CORRETTA
-- Nota: per l'evento 4139 il DB e il catalogo frontend
-- (app/src/races_full.json) sono ALLINEATI, non c'è disallineamento
-- di progressivi: qui il fix è solo sul dato user_plans.
--
-- Idempotente: nessun duplicato se eseguito più volte.
-- ============================================================


-- ------------------------------------------------------------
-- 1a) Se esiste GIA' un piano attivo su 4139-2, la riga 4139-1
--     viene solo disattivata (soft delete), senza spostarla.
-- ------------------------------------------------------------
UPDATE user_plans p
   SET deleted_at = now()
 WHERE p.user_id = 'c756da6a-0712-4734-b00b-48c47cd61608'
   AND p.race_id = '4139-1'
   AND p.deleted_at IS NULL
   AND EXISTS (
         SELECT 1
           FROM user_plans p2
          WHERE p2.user_id = p.user_id
            AND p2.race_id = '4139-2'
            AND p2.deleted_at IS NULL
       );


-- ------------------------------------------------------------
-- 1b) Sposta il piano residuo da UNATRI kids (4139-1) a UNATRI
--     (4139-2). priority / cost / note / team_id restano quelli
--     della riga originale.
-- ------------------------------------------------------------
UPDATE user_plans
   SET race_id = '4139-2'
 WHERE user_id = 'c756da6a-0712-4734-b00b-48c47cd61608'
   AND race_id = '4139-1'
   AND deleted_at IS NULL;


-- ------------------------------------------------------------
-- 2) Fallback: se non esiste ALCUN piano attivo su 4139-2
--    (es. il piano 4139-1 non è mai stato creato), lo crea.
-- ------------------------------------------------------------
INSERT INTO user_plans (id, user_id, race_id, priority, cost, note, created_at, team_id)
SELECT gen_random_uuid(),
       'c756da6a-0712-4734-b00b-48c47cd61608',
       '4139-2',
       'C',
       0,
       '',
       now(),
       'mtt'
 WHERE NOT EXISTS (
        SELECT 1
          FROM user_plans p
         WHERE p.user_id = 'c756da6a-0712-4734-b00b-48c47cd61608'
           AND p.race_id = '4139-2'
           AND p.deleted_at IS NULL
       );


-- ------------------------------------------------------------
-- 3) Verifica: deve restituire UNA sola riga, 4139-2 / UNATRI
-- ------------------------------------------------------------
SELECT p.race_id,
       p.priority,
       p.cost,
       r.date,
       r.title,
       r.category,
       r.location
  FROM user_plans p
  LEFT JOIN races r ON r.id = p.race_id
 WHERE p.user_id = 'c756da6a-0712-4734-b00b-48c47cd61608'
   AND p.race_id IN ('4139-1', '4139-2')
 ORDER BY p.deleted_at NULLS FIRST, p.race_id;


-- ------------------------------------------------------------
-- 4) Verifica anagrafica
-- ------------------------------------------------------------
SELECT id, first_name, last_name, full_name, license_number, team_id
  FROM profiles
 WHERE id = 'c756da6a-0712-4734-b00b-48c47cd61608';
