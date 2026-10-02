-- ============================================================
-- 2026-10-02 — Rimozione-atleti dalla vera Mixed Relay (Cervia 27/09)
--
-- ATTENZIONE ALLE ETICHETTE:
--   3905-3 = "... Sprint Coppa Crono Femminile"
--   3905-4 = "... Sprint Coppa Crono Maschile"   <-- i nostri 6 atleti
--   3905-5 = "... Sprint Mixed Relay"            <-- la vera Mixed Relay
--   3905-6 = "TRI EVENT Coppa Crono Mixed"
--
-- Nell'app, PRIMA del deploy del catalogo rigenerato, la gara
-- 3905-4 era etichettata "Mixed Relay" (titoli JSON disallineati):
-- se li si cancella si distruggono le registrazioni CORRETTE.
--
-- Verifica FITRI (getClassificheAtleta, endpoint pubblico) del
-- 27/09/2026: Albini, Quaglia, Pellegrino, Bonfanti, Dughera e
-- Baldo risultano tutti in "Coppa Crono Maschile" (idGara W11450).
-- Nessun atleta MTT in Mixed Relay.
--
-- Questo script tocca SOLO 3905-5: nel backup del 30/09 non
-- esiste alcun user_plans su 3905-5, quindi è un no-op se nel
-- frattempo non è stato creato nulla. Soft-delete, mai DELETE.
--
-- Idempotente.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Soft-delete di tutti i piani sulla vera Mixed Relay (3905-5)
-- ------------------------------------------------------------
UPDATE user_plans
   SET deleted_at = now()
 WHERE race_id = '3905-5'
   AND deleted_at IS NULL;


-- ------------------------------------------------------------
-- 2) Verifica: elenco completo dei piani 27/09 per gli atleti MTT
--    (tutte le sotto-gare 3905-*) con nome e titolo dal DB.
--    Attesa: nessuna riga su 3905-5.
-- ------------------------------------------------------------
SELECT COALESCE(pr.first_name || ' ' || pr.last_name, pr.full_name) AS atleta,
       pr.license_number,
       up.race_id,
       up.priority,
       r.date,
       r.title,
       CASE WHEN up.race_id = '3905-5' THEN 'DA CANCELLARE' ELSE 'ok' END AS esito
  FROM user_plans up
  JOIN profiles pr ON pr.id = up.user_id
  LEFT JOIN races r ON r.id = up.race_id
 WHERE up.race_id IN ('3905-1', '3905-2', '3905-3', '3905-4', '3905-5', '3905-6')
   AND up.deleted_at IS NULL
 ORDER BY r.date, atleta;
