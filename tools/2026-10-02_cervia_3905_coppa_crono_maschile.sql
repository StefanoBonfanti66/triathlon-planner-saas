-- ============================================================
-- 2026-10-02 — Cervia 27/09: Coppa Crono Femminile -> Maschile
--
-- Causa: nella sessione del 30/09 le registrazioni erano state
-- inserite usando i titoli del catalogo frontend DISALLINEATO
-- (app/src/races_full.json aveva 3905-4 = "Mixed Relay"), quindi
-- "Coppa Crono" era stato scritto come 3905-3, che nel DB è la
-- gara FEMMINILE.
--
-- Verifica su FITRI (endpoint pubblico getClassificheAtleta):
-- il 27/09/2026 tutti e 6 gli atleti sotto hanno gareggiato in
--   idGara W11450 = "TRI EVENT Campionati Italiani di Triathlon
--                    Sprint Coppa Crono Maschile"  => race_id 3905-4
-- mentre 3905-3 = "... Coppa Crono Femminile".
--
--   tessera  atleta                        27/09 (idGara W11450)
--   43981    Achille Albini                Coppa Crono Maschile
--   111549   (nome non valorizzato)        Coppa Crono Maschile
--   65172    Paolo Pellegrino              Coppa Crono Maschile
--   106925   Stefano Bonfanti              Coppa Crono Maschile
--   1443     (nome non valorizzato)        Coppa Crono Maschile
--   85122    Stefano Baldo   (gia' OK)    Coppa Crono Maschile
--
-- Il 26/09 (Age Group = 3905-1) i titoli erano gia' corretti:
-- nessuna modifica su 3905-1.
--
-- Idempotente: eseguendolo piu' volte non duplica nulla.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Dedup: per questi atleti tiene la piu' vecchia riga fra
--    3905-3 e 3905-4, soft-delete le altre (doppia riga 3905-3
--    presente per la tessera 1443).
-- ------------------------------------------------------------
WITH t(user_id) AS (
    VALUES
      ('eef45d9c-ca49-4568-8a65-020f2dedbb3b'::uuid),  -- Achille Albini    43981/A211013
      ('33f591a8-9f64-45ad-ae2f-ffe65c134740'::uuid),  -- (nome NULL)       111549
      ('c756da6a-0712-4734-b00b-48c47cd61608'::uuid),  -- Paolo Pellegrino  65172/A200665
      ('4f3e45bc-fe1d-432e-b646-e35fa8b45e10'::uuid),  -- Stefano Bonfanti  106925/A246799
      ('d6ca5f08-ebe4-4efe-8d26-3dcd310ec364'::uuid)   -- (nome NULL)       1443/A361933
),
ranked AS (
    SELECT p.id,
           row_number() OVER (
               PARTITION BY p.user_id
               ORDER BY p.created_at NULLS LAST, p.id
           ) AS rn
      FROM user_plans p
      JOIN t ON t.user_id = p.user_id
     WHERE p.race_id IN ('3905-3', '3905-4')
       AND p.deleted_at IS NULL
)
UPDATE user_plans p
   SET deleted_at = now()
  FROM ranked r
 WHERE p.id = r.id
   AND r.rn > 1;


-- ------------------------------------------------------------
-- 2) Sposta 3905-3 (Coppa Crono Femminile) -> 3905-4
--    (Coppa Crono Maschile), conservando priority/cost/note.
-- ------------------------------------------------------------
WITH t(user_id) AS (
    VALUES
      ('eef45d9c-ca49-4568-8a65-020f2dedbb3b'::uuid),
      ('33f591a8-9f64-45ad-ae2f-ffe65c134740'::uuid),
      ('c756da6a-0712-4734-b00b-48c47cd61608'::uuid),
      ('4f3e45bc-fe1d-432e-b646-e35fa8b45e10'::uuid),
      ('d6ca5f08-ebe4-4efe-8d26-3dcd310ec364'::uuid)
)
UPDATE user_plans p
   SET race_id = '3905-4'
  FROM t
 WHERE p.user_id = t.user_id
   AND p.race_id = '3905-3'
   AND p.deleted_at IS NULL;


-- ------------------------------------------------------------
-- 3) Verifica: per ogni atleta UNA sola riga attiva, 3905-4
--    (title dal DB = "... Coppa Crono Maschile")
-- ------------------------------------------------------------
WITH t(user_id) AS (
    VALUES
      ('eef45d9c-ca49-4568-8a65-020f2dedbb3b'::uuid),
      ('33f591a8-9f64-45ad-ae2f-ffe65c134740'::uuid),
      ('c756da6a-0712-4734-b00b-48c47cd61608'::uuid),
      ('4f3e45bc-fe1d-432e-b646-e35fa8b45e10'::uuid),
      ('d6ca5f08-ebe4-4efe-8d26-3dcd310ec364'::uuid),
      ('d5aa242b-1299-431b-918a-df40bd5dd611'::uuid)   -- Stefano Baldo (controllo)
)
SELECT t.user_id,
       COALESCE(p.first_name || ' ' || p.last_name, p.full_name) AS atleta,
       p.license_number,
       up.race_id,
       up.priority,
       r.date,
       r.title
  FROM t
  JOIN profiles p ON p.id = t.user_id
  JOIN user_plans up ON up.user_id = t.user_id
  LEFT JOIN races r ON r.id = up.race_id
 WHERE up.race_id IN ('3905-1', '3905-2', '3905-3', '3905-4', '3905-5', '3905-6')
   AND up.deleted_at IS NULL
 ORDER BY atleta, r.date;
