import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'lexar.sqlite');
const dbDir = path.dirname(dbPath);
if (dbDir !== __dirname && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(dbPath);

// Initialize DB schema
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      tier TEXT DEFAULT 'free', -- 'free', 'basic', 'pro'
      total_views INTEGER DEFAULT 0,
      profile_role TEXT DEFAULT 'Estudiante' -- 'Estudiante', 'Profesor', 'Abogado', 'Magistrado', 'Doctor'
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS case_briefs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      facts TEXT,
      issue TEXT,
      rule TEXT,
      reasoning TEXT,
      holding TEXT,
      relevance TEXT,
      keywords TEXT,
      is_demo BOOLEAN DEFAULT 1,
      subject_id INTEGER -- Legacy column, kept for backward compatibility during migration
    );

    CREATE TABLE IF NOT EXISTS case_brief_subjects (
      case_brief_id INTEGER,
      subject_id INTEGER,
      PRIMARY KEY (case_brief_id, subject_id),
      FOREIGN KEY (case_brief_id) REFERENCES case_briefs(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS outlines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER,
      title TEXT NOT NULL,
      content TEXT,
      is_demo BOOLEAN DEFAULT 1,
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER,
      title TEXT NOT NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER,
      question TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option TEXT NOT NULL,
      explanation TEXT,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      file_url TEXT,
      uploaded_by INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      approved_by INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS latinisms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term TEXT NOT NULL,
      translation TEXT NOT NULL,
      meaning TEXT,
      example TEXT
    );

    CREATE TABLE IF NOT EXISTS bibliographies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      type TEXT,
      link TEXT,
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT,
      source TEXT,
      link TEXT,
      date TEXT
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      firm TEXT NOT NULL,
      location TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS universities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS chairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id INTEGER,
      subject_id INTEGER,
      name TEXT NOT NULL,
      professor TEXT,
      FOREIGN KEY (university_id) REFERENCES universities(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS student_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author_id INTEGER,
      subject_id INTEGER,
      university_id INTEGER,
      chair_id INTEGER,
      content TEXT,
      views INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published', -- 'pending', 'published', 'rejected'
      date TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      FOREIGN KEY (university_id) REFERENCES universities(id),
      FOREIGN KEY (chair_id) REFERENCES chairs(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER,
      receiver_id INTEGER,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS chat_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS room_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS procedural_acts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jurisdiction TEXT NOT NULL,
      fuero TEXT NOT NULL,
      name TEXT NOT NULL,
      days INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'hábiles', 'corridos'
      normative_base TEXT
    );

    CREATE TABLE IF NOT EXISTS holiday_calendar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id INTEGER,
      status TEXT DEFAULT 'pending', -- 'pending', 'published', 'rejected'
      date TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS legal_movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      year INTEGER,
      country TEXT,
      synopsis TEXT,
      legal_themes TEXT,
      link TEXT
    );

    CREATE TABLE IF NOT EXISTS private_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      page_title TEXT NOT NULL,
      content TEXT NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS text_annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      brief_id INTEGER NOT NULL,
      selected_text TEXT NOT NULL,
      note TEXT,
      color TEXT DEFAULT 'bg-yellow-200',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (brief_id) REFERENCES case_briefs(id)
    );
  `);

  // Migration: add source to flashcards if missing
  try {
    db.prepare('SELECT source FROM flashcards LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE flashcards ADD COLUMN source TEXT DEFAULT \'manual\'');
    console.log('Added flashcards.source column.');
  }

  // Migration: add file_url to student_notes (link to Drive/public file)
  try {
    db.prepare('SELECT file_url FROM student_notes LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE student_notes ADD COLUMN file_url TEXT');
    console.log('Added student_notes.file_url column.');
  }

  // Migration: add year to student_notes
  try {
    db.prepare('SELECT year FROM student_notes LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE student_notes ADD COLUMN year INTEGER');
    console.log('Added student_notes.year column.');
  }

  // Migration: add views to exams
  try {
    db.prepare('SELECT views FROM exams LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE exams ADD COLUMN views INTEGER DEFAULT 0');
    console.log('Added exams.views column.');
  }

  // Migration: add year and university_id to exams
  try {
    db.prepare('SELECT year FROM exams LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE exams ADD COLUMN year INTEGER');
    console.log('Added exams.year column.');
  }
  try {
    db.prepare('SELECT university_id FROM exams LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE exams ADD COLUMN university_id INTEGER REFERENCES universities(id)');
    console.log('Added exams.university_id column.');
  }

  // Migration: add total_votes_received to users (para impacto: vistas + votaciones)
  try {
    db.prepare('SELECT total_votes_received FROM users LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE users ADD COLUMN total_votes_received INTEGER DEFAULT 0');
    console.log('Added users.total_votes_received column.');
  }

  // Migration: cuota de vistas de documentos por plan (Basic: X/mes, Free: 0, Pro: ilimitado)
  try {
    db.prepare('SELECT doc_views_used FROM users LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE users ADD COLUMN doc_views_used INTEGER DEFAULT 0');
    console.log('Added users.doc_views_used column.');
  }
  try {
    db.prepare('SELECT doc_views_period FROM users LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE users ADD COLUMN doc_views_period TEXT');
    console.log('Added users.doc_views_period column.');
  }

  // Tabla votaciones: un usuario un voto por recurso (apunte o examen)
  db.exec(`
    CREATE TABLE IF NOT EXISTS resource_votes (
      user_id INTEGER NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, resource_type, resource_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Tabla vistas: una vista por usuario por recurso (evita bots/entrar y salir)
  db.exec(`
    CREATE TABLE IF NOT EXISTS resource_views (
      user_id INTEGER NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, resource_type, resource_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Para leer después (Basic+): favoritos por usuario
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_for_later (
      user_id INTEGER NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, resource_type, resource_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Notas privadas sobre recursos (Basic+): una nota por usuario por recurso (apuntes/exámenes); fallos usan text_annotations
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_resource_notes (
      user_id INTEGER NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, resource_type, resource_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Migration: Move subject_id from case_briefs to case_brief_subjects
  const briefsWithSubject = db.prepare('SELECT id, subject_id FROM case_briefs WHERE subject_id IS NOT NULL').all() as any[];
  if (briefsWithSubject.length > 0) {
    const insertRelation = db.prepare('INSERT OR IGNORE INTO case_brief_subjects (case_brief_id, subject_id) VALUES (?, ?)');
    const clearLegacy = db.prepare('UPDATE case_briefs SET subject_id = NULL WHERE id = ?');

    db.transaction(() => {
      for (const brief of briefsWithSubject) {
        insertRelation.run(brief.id, brief.subject_id);
        clearLegacy.run(brief.id);
      }
    })();
    console.log('Migrated case_briefs subjects to many-to-many relationship.');
  }

  // Seed data if empty
  const subjectCount = db.prepare('SELECT COUNT(*) as count FROM subjects').get() as { count: number };
  if (subjectCount.count === 0) {
    seedDb();
  }

  // Ensure at least one super_admin exists (migration for existing DBs)
  const superAdminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE tier = 'super_admin'").get() as { count: number };
  if (superAdminCount.count === 0) {
    db.prepare("INSERT INTO users (name, email, tier, total_views, profile_role) VALUES ('Super Admin', 'admin@lexar.ar', 'super_admin', 0, 'Administrador')").run();
    console.log('Created default super_admin user (admin@lexar.ar).');
  }

  // Seed chat rooms if empty
  const roomCount = db.prepare('SELECT COUNT(*) as count FROM chat_rooms').get() as { count: number };
  if (roomCount.count === 0) {
    const insertRoom = db.prepare('INSERT INTO chat_rooms (slug, name, category) VALUES (?, ?, ?)');
    const materias = [
      'Derecho Constitucional',
      'Derecho Penal',
      'Derecho Civil',
      'Derecho Comercial y Empresarial',
      'Derecho Administrativo y Público',
      'Derecho Laboral',
      'Apuntes, resúmenes y material de estudio',
      'Práctica profesional, pasantías y estudios jurídicos',
      'Debate jurídico y actualidad',
      'Comunidad estudiantil',
    ];
    const universidades = [
      'Universidad de Buenos Aires (UBA) – Facultad de Derecho',
      'Universidad Nacional de La Plata (UNLP) – Facultad de Ciencias Jurídicas y Sociales',
      'Universidad Nacional de Córdoba (UNC) – Facultad de Derecho',
      'Universidad Nacional de Rosario (UNR) – Facultad de Derecho',
      'Universidad Nacional del Litoral (UNL) – Facultad de Ciencias Jurídicas y Sociales',
      'Universidad Nacional de Cuyo (UNCuyo) – Facultad de Derecho',
      'Universidad Nacional de Tucumán (UNT) – Facultad de Derecho',
      'Universidad Austral – Facultad de Derecho',
      'Universidad Católica Argentina (UCA) – Facultad de Derecho',
      'Universidad Torcuato Di Tella (UTDT) – Escuela de Derecho',
    ];
    materias.forEach((name, i) => insertRoom.run(`materia-${i + 1}`, name, 'materia'));
    universidades.forEach((name, i) => insertRoom.run(`universidad-${i + 1}`, name, 'universidad'));
    console.log('Seeded chat rooms.');
  }
}

function seedDb() {
  // Users (tier: free | basic | pro | admin | super_admin)
  const insertUser = db.prepare('INSERT INTO users (name, email, tier, total_views, profile_role) VALUES (?, ?, ?, ?, ?)');
  const u1 = insertUser.run('Juan Pérez', 'juan@uba.ar', 'free', 0, 'Estudiante');
  const u2 = insertUser.run('María Gómez', 'maria@uca.ar', 'pro', 1500, 'Abogado');
  insertUser.run('Super Admin', 'admin@lexar.ar', 'super_admin', 0, 'Administrador');

  // Subjects
  const insertSubject = db.prepare('INSERT INTO subjects (name, description, icon) VALUES (?, ?, ?)');
  const s1 = insertSubject.run('Derecho Constitucional', 'Estudio de la Constitución Nacional y derechos fundamentales.', 'BookOpen');
  const s2 = insertSubject.run('Derecho Civil (Obligaciones)', 'Teoría general de las obligaciones y responsabilidad civil.', 'Scale');

  // Case Briefs
  const insertBrief = db.prepare('INSERT INTO case_briefs (title, facts, issue, rule, reasoning, holding, relevance, keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const b1 = insertBrief.run(
    'Siri, Ángel s/ recurso de hábeas corpus (1957)',
    'Ángel Siri, director del diario "Mercedes", vio clausurado su periódico por orden de una autoridad policial sin justificación legal. Interpuso hábeas corpus.',
    '¿Procede el hábeas corpus para proteger derechos constitucionales distintos de la libertad física (en este caso, libertad de imprenta y trabajo)?',
    'Creación pretoriana de la acción de amparo para proteger derechos fundamentales no amparados por el hábeas corpus.',
    'La Corte sostuvo que las garantías constitucionales existen y protegen a los individuos por el solo hecho de estar consagradas en la Constitución. Los jueces deben arbitrar los medios para protegerlas, incluso si no hay una ley reglamentaria específica.',
    'Se revoca la sentencia apelada y se hace lugar a la acción, ordenando el cese de la restricción.',
    'Fallo fundacional del amparo en Argentina, marcando la operatividad de los derechos constitucionales.',
    'Amparo, Operatividad, Libertad de Imprenta'
  );
  const b2 = insertBrief.run(
    'Kot, Samuel s/ recurso de hábeas corpus (1958)',
    'Samuel Kot sufrió la ocupación de su fábrica por parte de trabajadores en huelga. Interpuso acción de amparo.',
    '¿Procede el amparo contra actos de particulares (no solo del Estado)?',
    'El amparo procede también contra actos de particulares que restrinjan derechos constitucionales.',
    'La Corte amplió la doctrina de Siri, estableciendo que la Constitución protege al individuo tanto frente al Estado como frente a otros particulares que ejerzan poder o fuerza de manera ilegítima.',
    'Se hace lugar al amparo y se ordena la desocupación de la fábrica.',
    'Extensión del amparo contra actos de particulares.',
    'Amparo contra particulares, Propiedad, Huelga'
  );

  const insertBriefSubject = db.prepare('INSERT INTO case_brief_subjects (case_brief_id, subject_id) VALUES (?, ?)');
  insertBriefSubject.run(b1.lastInsertRowid, s1.lastInsertRowid);
  insertBriefSubject.run(b2.lastInsertRowid, s1.lastInsertRowid);

  // Latinisms
  const insertLatinism = db.prepare('INSERT INTO latinisms (term, translation, meaning, example) VALUES (?, ?, ?, ?)');
  insertLatinism.run('Erga omnes', 'Respecto de todos', 'Que tiene efectos frente a todos, no solo entre las partes.', 'Los derechos reales tienen efectos erga omnes.');
  insertLatinism.run('In dubio pro reo', 'En la duda, a favor del reo', 'Principio penal que establece que en caso de duda, se debe fallar a favor del acusado.', 'Ante la falta de pruebas concluyentes, se aplicó el principio in dubio pro reo.');
  insertLatinism.run('Pacta sunt servanda', 'Los pactos deben cumplirse', 'Principio fundamental del derecho de los contratos.', 'Las partes están obligadas por el principio pacta sunt servanda.');

  // News
  const insertNews = db.prepare('INSERT INTO news (title, summary, source, link, date) VALUES (?, ?, ?, ?, ?)');
  insertNews.run('Nueva acordada de la CSJN sobre notificaciones electrónicas', 'La Corte Suprema actualizó el reglamento para el uso del sistema de notificaciones electrónicas.', 'CSJN', 'https://www.csjn.gov.ar', '2026-02-25');
  insertNews.run('Reforma al Código Procesal Civil y Comercial', 'Se debate en el Congreso un proyecto para agilizar los procesos civiles.', 'Boletín Oficial', 'https://www.boletinoficial.gob.ar', '2026-02-20');

  // Bibliographies
  const insertBiblio = db.prepare('INSERT INTO bibliographies (subject_id, title, author, type, link) VALUES (?, ?, ?, ?, ?)');
  insertBiblio.run(s1.lastInsertRowid, 'Tratado de Derecho Constitucional', 'Bidart Campos, Germán', 'Libro', 'https://example.com/buy');
  insertBiblio.run(s2.lastInsertRowid, 'Tratado de las Obligaciones', 'Alterini, Atilio', 'Libro', 'https://example.com/buy');

  // Jobs
  const insertJob = db.prepare('INSERT INTO jobs (title, firm, location, type, description, date) VALUES (?, ?, ?, ?, ?, ?)');
  insertJob.run('Paralegal / Procurador', 'Estudio Marval O\'Farrell Mairal', 'CABA', 'Part-time', 'Búsqueda de estudiante avanzado para procuración en fuero comercial.', '2026-02-26');
  insertJob.run('Abogado Junior Corporativo', 'Pérez Alati, Grondona, Benites', 'CABA', 'Full-time', 'Se busca abogado recién recibido para el área de M&A.', '2026-02-24');

  // Universities & Chairs
  const insertUni = db.prepare('INSERT INTO universities (name, description) VALUES (?, ?)');
  const uni1 = insertUni.run('Universidad de Buenos Aires (UBA)', 'Facultad de Derecho UBA');

  const insertChair = db.prepare('INSERT INTO chairs (university_id, subject_id, name, professor) VALUES (?, ?, ?, ?)');
  const c1 = insertChair.run(uni1.lastInsertRowid, s1.lastInsertRowid, 'Cátedra Sabsay', 'Daniel Sabsay');

  // Student Notes
  const insertNote = db.prepare('INSERT INTO student_notes (title, author_id, subject_id, university_id, chair_id, content, views, status, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertNote.run('Resumen Completo - Obligaciones (Cátedra Pizarro)', u2.lastInsertRowid, s2.lastInsertRowid, null, null, 'Este es un resumen exhaustivo de toda la materia...', 1250, 'published', '2026-01-15');
  insertNote.run('Cuadro Sinóptico - Control de Constitucionalidad', u2.lastInsertRowid, s1.lastInsertRowid, uni1.lastInsertRowid, c1.lastInsertRowid, 'Esquema de las vías de control...', 250, 'published', '2026-02-10');

  // Procedural Acts
  const insertAct = db.prepare('INSERT INTO procedural_acts (jurisdiction, fuero, name, days, type, normative_base) VALUES (?, ?, ?, ?, ?, ?)');
  insertAct.run('Nacion', 'Civil', 'Contestar demanda (Ordinario)', 15, 'hábiles', 'Art. 338 CPCCN');
  insertAct.run('Nacion', 'Civil', 'Apelar sentencia definitiva', 5, 'hábiles', 'Art. 244 CPCCN');
  insertAct.run('Nacion', 'Laboral', 'Contestar demanda', 10, 'hábiles', 'Art. 68 LO');

  // Legal Movies
  const insertMovie = db.prepare('INSERT INTO legal_movies (title, year, country, synopsis, legal_themes, link) VALUES (?, ?, ?, ?, ?, ?)');
  insertMovie.run('12 Angry Men', 1957, 'USA', 'Un jurado debe decidir la culpabilidad o inocencia de un joven acusado de asesinato.', 'Duda razonable, Jurado, Presunción de inocencia', 'https://imdb.com/title/tt0050083');
  insertMovie.run('Argentina, 1985', 2022, 'Argentina', 'El equipo de fiscales liderado por Julio Strassera y Luis Moreno Ocampo en el Juicio a las Juntas.', 'Derechos Humanos, Justicia Transicional, Juicio a las Juntas', 'https://imdb.com/title/tt15118192');

  console.log('Database seeded with demo data including new tables.');
}

initDb();

export { db };
