import { db } from './src/db/index.js';

// Extender la base de datos con las tablas de normativa
export function initNormativaDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS normas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT,
      numero TEXT,
      anio INTEGER,
      titulo TEXT,
      texto TEXT,
      organismo TEXT,
      fecha_publicacion TEXT,
      estado TEXT DEFAULT 'Vigente',
      fuente_url TEXT
    );

    CREATE TABLE IF NOT EXISTS relaciones_normativas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origen_id INTEGER,
      destino_id INTEGER,
      tipo_relacion TEXT, -- 'modifica', 'reglamenta', 'cita'
      FOREIGN KEY (origen_id) REFERENCES normas(id),
      FOREIGN KEY (destino_id) REFERENCES normas(id)
    );
  `);

  // Seed inicial de un par de leyes importantes
  const count = db.prepare('SELECT COUNT(*) as count FROM normas').get() as { count: number };
  if (count.count === 0) {
    const insert = db.prepare(`
      INSERT INTO normas (tipo, numero, anio, titulo, texto, organismo, fecha_publicacion, fuente_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      'Ley', '27541', 2019, 
      'Ley de Solidaridad Social y Reactivación Productiva',
      'Art. 1.- Declárase la emergencia pública en materia económica, financiera, fiscal, administrativa, previsional, tarifaria, energética, sanitaria y social...',
      'Congreso de la Nación', '2019-12-23', 
      'https://servicios.infoleg.gob.ar/infolegInternet/anexos/330000-334999/333527/norma.htm'
    );

    insert.run(
      'Ley', '24240', 1993, 
      'Ley de Defensa del Consumidor',
      'Art. 1.- Objeto. La presente ley tiene por objeto la defensa del consumidor o usuario...',
      'Congreso de la Nación', '1993-10-15', 
      'https://servicios.infoleg.gob.ar/infolegInternet/anexos/0-4999/638/norma.htm'
    );
  }
}
