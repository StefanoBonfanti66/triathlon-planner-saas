-- Contatti email atleti MTT (fonte: CSV soci, per chi non ha account Supabase)
CREATE TABLE IF NOT EXISTS team_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text NOT NULL DEFAULT 'mtt',
  email text NOT NULL,
  full_name text,
  fitri_number text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (team_id, email)
);

ALTER TABLE team_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_contacts readable"
  ON team_contacts FOR SELECT
  USING (true);

INSERT INTO team_contacts (team_id, email, full_name, fitri_number) VALUES
('mtt', 'achille.albini18@gmail.com', 'Albini Achille', '43981/A211013'),
('mtt', 'massimortc21@gmail.com', 'Arosio Massimo', '61352'),
('mtt', 'lucabacci@yahoo.it', 'Bacci Luca', '68660/A200271'),
('mtt', 'mireste73@gmail.com', 'Baldo Stefano', '85122/A252252'),
('mtt', 'bonfantistefano4@gmail.com', 'Bonfanti Stefano', '106925/A246799'),
('mtt', 'fabrizio.castiglioni@elis.com', 'Castiglioni Fabrizio', '44132'),
('mtt', 'vlady2080@hotmail.com', 'Ceccanti Carlos Vladimir', '128970'),
('mtt', 'doroth.csd@gmail.com', 'Chassagnard Dorothée', '135628'),
('mtt', 'millydi73@gmail.com', 'Di Iorio Milena', '65228/A200677'),
('mtt', 'silvio.dughera@gmail.com', 'Dughera Silvio', '1443/A361933'),
('mtt', 'alessandrolabate.pt@hotmail.com', 'Labate Alessandro', '108968'),
('mtt', 'p.lacchini@libero.it', 'Lacchini Gianpaolo', '50514/A228982'),
('mtt', 'andreapaolo.lemma@gmail.com', 'Lemma Andrea Paolo', '130506'),
('mtt', 'ambra.m12@gmail.com', 'Mascheri Ambra', '118289'),
('mtt', 'fmiccoli@yahoo.com', 'Miccoli Francesco', '137043'),
('mtt', 'raffy.dado@alice.it', 'Moretti Davide', '119175/A275760'),
('mtt', 'marcoildrugo@hotmail.com', 'Ostinelli Marco', '60554'),
('mtt', 'fabriziopanella@hotmail.com', 'Panella Fabrizio', '133805'),
('mtt', 'maspasnet@gmail.com', 'Pascali Massimiliano', '75269/A275752'),
('mtt', 'p.pelle69@gmail.com', 'Pellegrino Paolo', '65172/A200665'),
('mtt', 'marco.jimbo@gmail.com', 'Quaglia Marco', '111549'),
('mtt', 'mattiarigiroli@gmail.com', 'RIgiroli Mattia', '146243'),
('mtt', 'e.sacchetto85@gmail.com', 'Sacchetto Elena', '83922'),
('mtt', 'livio.santalucia@it.abb.com', 'Santalucia Livio', '61035'),
('mtt', '75misci@gmail.com', 'Savini Michela', '119658/A275751'),
('mtt', 'fabio.soresi@gmail.com', 'Soresi Fabio', 'A274626'),
('mtt', 'fabio_sos@hotmail.it', 'Sostaro Fabio', '96050/A358905'),
('mtt', 'mitriteam@gmail.com', 'Valente Tiziano', '24410'),
('mtt', 'rominabib@yahoo.it', 'Bibbo'' Romina', '120000'),
('mtt', 'scodron@outlook.com', 'Codron Sebastien', 'new')
ON CONFLICT (team_id, email) DO NOTHING;
