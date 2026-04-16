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
      court TEXT,
      year INTEGER,
      parties TEXT,
      facts TEXT,
      issue TEXT,
      rule TEXT,
      reasoning TEXT,
      holding TEXT,
      relevance TEXT,
      keywords TEXT,
      timeline TEXT,
      citations TEXT,
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
      description TEXT,
      city TEXT,
      province TEXT,
      type TEXT DEFAULT 'Pública',
      program_url TEXT
    );

    CREATE TABLE IF NOT EXISTS study_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id INTEGER,
      subject_id INTEGER,
      year INTEGER,
      semester INTEGER,
      category TEXT,
      FOREIGN KEY (university_id) REFERENCES universities(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
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
      link TEXT,
      poster_url TEXT
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

    CREATE TABLE IF NOT EXISTS forum_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      author_id INTEGER NOT NULL,
      subject_id INTEGER,
      category TEXT DEFAULT 'general',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      views INTEGER DEFAULT 0,
      pinned INTEGER DEFAULT 0,
      FOREIGN KEY (author_id) REFERENCES users(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS forum_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (topic_id) REFERENCES forum_topics(id),
      FOREIGN KEY (author_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS saved_latinisms (
      user_id INTEGER NOT NULL,
      latinism_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, latinism_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (latinism_id) REFERENCES latinisms(id)
    );
  `);

  // Migration: add password to users
  try {
    db.prepare('SELECT password FROM users LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE users ADD COLUMN password TEXT');
    console.log('Added users.password column.');
  }

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

  // Migration: add new fields for case_briefs (court, year, parties, timeline, citations)
  try {
    db.prepare('SELECT court FROM case_briefs LIMIT 1').get();
  } catch {
    db.exec("ALTER TABLE case_briefs ADD COLUMN court TEXT");
    db.exec("ALTER TABLE case_briefs ADD COLUMN year INTEGER");
    db.exec("ALTER TABLE case_briefs ADD COLUMN parties TEXT");
    db.exec("ALTER TABLE case_briefs ADD COLUMN timeline TEXT");
    db.exec("ALTER TABLE case_briefs ADD COLUMN citations TEXT");
    console.log('Added court, year, parties, timeline, citations columns to case_briefs.');
  }

  // Migration: add full_text to case_briefs for the complete ruling text
  try {
    db.prepare('SELECT full_text FROM case_briefs LIMIT 1').get();
  } catch {
    db.exec("ALTER TABLE case_briefs ADD COLUMN full_text TEXT");
    console.log('Added case_briefs.full_text column.');
  }

  // Migration: add tags to news
  try {
    db.prepare('SELECT tags FROM news LIMIT 1').get();
  } catch {
    db.exec("ALTER TABLE news ADD COLUMN tags TEXT");
    console.log('Added news.tags column.');
  }

  // Migration: add poster_url to legal_movies
  try {
    db.prepare('SELECT poster_url FROM legal_movies LIMIT 1').get();
  } catch {
    db.exec("ALTER TABLE legal_movies ADD COLUMN poster_url TEXT");
    console.log('Added legal_movies.poster_url column.');
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
  const s3 = insertSubject.run('Teoría General del Derecho', 'Principios fundamentales y filosofía del derecho.', 'BookOpen');
  const s4 = insertSubject.run('Derecho Penal I', 'Teoría del delito y principios del derecho penal.', 'Scale');
  const s5 = insertSubject.run('Instituciones de Derecho Civil', 'Parte general: persona, bienes y hechos jurídicos.', 'BookOpen');
  const s6 = insertSubject.run('Teoría General del Proceso', 'Principios procesales y organización judicial.', 'Scale');
  const s7 = insertSubject.run('Derechos Humanos', 'Sistemas de protección nacional e internacional.', 'BookOpen');
  const s8 = insertSubject.run('Derecho Administrativo', 'Régimen jurídico de la administración pública.', 'Scale');
  const s9 = insertSubject.run('Derecho de Contratos', 'Teoría general y contratos en particular.', 'Scale');
  const s10 = insertSubject.run('Derecho de Familia y Sucesiones', 'Relaciones jurídicas familiares y transmisión hereditaria.', 'Scale');
  const s11 = insertSubject.run('Derecho del Trabajo y la Seguridad Social', 'Relaciones laborales individuales y colectivas.', 'Scale');
  const s12 = insertSubject.run('Sociedades Civiles y Comerciales', 'Régimen de personas jurídicas societarias.', 'Scale');



  // Case Briefs
  const insertBrief = db.prepare('INSERT INTO case_briefs (title, court, year, parties, facts, issue, rule, reasoning, holding, relevance, keywords, timeline, citations) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const b1 = insertBrief.run(
    'Siri, Ángel s/ recurso de hábeas corpus (1957)',
    'Corte Suprema de Justicia de la Nación',
    1957,
    'Siri, Ángel vs Policía de la Provincia de Buenos Aires',
    'Ángel Siri, director del diario "Mercedes", vio clausurado su periódico por orden de una autoridad policial sin justificación legal. Interpuso hábeas corpus.',
    '¿Procede el hábeas corpus para proteger derechos constitucionales distintos de la libertad física (en este caso, libertad de imprenta y trabajo)?',
    'Creación pretoriana de la acción de amparo para proteger derechos fundamentales no amparados por el hábeas corpus.',
    'La Corte sostuvo que las garantías constitucionales existen y protegen a los individuos por el solo hecho de estar consagradas en la Constitución. Los jueces deben arbitrar los medios para protegerlas, incluso si no hay una ley reglamentaria específica.',
    'Se revoca la sentencia apelada y se hace lugar a la acción, ordenando el cese de la restricción.',
    'Fallo fundacional del amparo en Argentina, marcando la operatividad de los derechos constitucionales.',
    'Amparo, Operatividad, Libertad de Imprenta',
    JSON.stringify([
      { date: '1956', description: 'Clausura del diario "Mercedes".' },
      { date: '1956', description: 'Interposición del recurso por Ángel Siri.' },
      { date: '1956', description: 'Rechazo del recurso en instancias previas.' },
      { date: '1957', description: 'Fallo de la CSJN revocando sentencia.' }
    ]),
    JSON.stringify([
      { norm_name: 'Constitución Nacional (Art. 14)', considerando_ref: 'Considerando 5' }
    ])
  );
  const b2 = insertBrief.run(
    'Kot, Samuel s/ recurso de hábeas corpus (1958)',
    'Corte Suprema de Justicia de la Nación',
    1958,
    'Kot, Samuel vs Trabajadores en huelga',
    'Samuel Kot sufrió la ocupación de su fábrica por parte de trabajadores en huelga. Interpuso acción de amparo.',
    '¿Procede el amparo contra actos de particulares (no solo del Estado)?',
    'El amparo procede también contra actos de particulares que restrinjan derechos constitucionales.',
    'La Corte amplió la doctrina de Siri, estableciendo que la Constitución protege al individuo tanto frente al Estado como frente a otros particulares que ejerzan poder o fuerza de manera ilegítima.',
    'Se hace lugar al amparo y se ordena la desocupación de la fábrica.',
    'Extensión del amparo contra actos de particulares.',
    'Amparo contra particulares, Propiedad, Huelga',
    JSON.stringify([
      { date: '1958', description: 'Ocupación de la fábrica textil de Samuel Kot.' },
      { date: '1958', description: 'Interposición del amparo contra los ocupantes.' },
      { date: '1958', description: 'Rechazo inicial por tratarse de particulares.' },
      { date: '1958', description: 'Fallo de la CSJN admitiendo el amparo.' }
    ]),
    JSON.stringify([
      { norm_name: 'Constitución Nacional (Art. 14 y 17)', considerando_ref: 'Considerando 2 y 3' },
      { norm_name: 'Caso Siri (Fallos: 239:459)', considerando_ref: 'Considerando 4' }
    ])
  );

  const insertBriefSubject = db.prepare('INSERT INTO case_brief_subjects (case_brief_id, subject_id) VALUES (?, ?)');
  insertBriefSubject.run(b1.lastInsertRowid, s1.lastInsertRowid);
  insertBriefSubject.run(b2.lastInsertRowid, s1.lastInsertRowid);

  // Latinisms
  const insertLatinism = db.prepare('INSERT INTO latinisms (term, translation, meaning, example) VALUES (?, ?, ?, ?)');
  insertLatinism.run('Erga omnes', 'Respecto de todos', 'Que tiene efectos frente a todos, no solo entre las partes.', 'Los derechos reales tienen efectos erga omnes.');
  insertLatinism.run('In dubio pro reo', 'En la duda, a favor del reo', 'Principio penal que establece que en caso de duda, se debe fallar a favor del acusado.', 'Ante la falta de pruebas concluyentes, se aplicó el principio in dubio pro reo.');
  insertLatinism.run('Pacta sunt servanda', 'Los pactos deben cumplirse', 'Principio fundamental del derecho de los contratos.', 'Las partes están obligadas por el principio pacta sunt servanda.');

  // News (with tags)
  const insertNews = db.prepare('INSERT INTO news (title, summary, source, link, date, tags) VALUES (?, ?, ?, ?, ?, ?)');
  insertNews.run('Nueva acordada de la CSJN sobre notificaciones electrónicas', 'La Corte Suprema actualizó el reglamento para el uso del sistema de notificaciones electrónicas.', 'CSJN', 'https://www.csjn.gov.ar', '2026-02-25', 'Procesal,Notificaciones,CSJN');
  insertNews.run('Reforma al Código Procesal Civil y Comercial', 'Se debate en el Congreso un proyecto para agilizar los procesos civiles.', 'Boletín Oficial', 'https://www.boletinoficial.gob.ar', '2026-02-20', 'Procesal,Reforma,Legislación');

  // Bibliographies
  const insertBiblio = db.prepare('INSERT INTO bibliographies (subject_id, title, author, type, link) VALUES (?, ?, ?, ?, ?)');
  insertBiblio.run(s1.lastInsertRowid, 'Tratado de Derecho Constitucional', 'Bidart Campos, Germán', 'Libro', 'https://example.com/buy');
  insertBiblio.run(s2.lastInsertRowid, 'Tratado de las Obligaciones', 'Alterini, Atilio', 'Libro', 'https://example.com/buy');

  // Jobs
  const insertJob = db.prepare('INSERT INTO jobs (title, firm, location, type, description, date) VALUES (?, ?, ?, ?, ?, ?)');
  insertJob.run('Paralegal / Procurador', 'Estudio Marval O\'Farrell Mairal', 'CABA', 'Part-time', 'Búsqueda de estudiante avanzado para procuración en fuero comercial.', '2026-02-26');
  insertJob.run('Abogado Junior Corporativo', 'Pérez Alati, Grondona, Benites', 'CABA', 'Full-time', 'Se busca abogado recién recibido para el área de M&A.', '2026-02-24');

  // Universities & Chairs — All Argentine universities with law schools
  const insertUni = db.prepare('INSERT INTO universities (name, description, city, province, type, program_url) VALUES (?, ?, ?, ?, ?, ?)');

  // === UNIVERSIDADES PÚBLICAS ===
  const uni1 = insertUni.run('Universidad de Buenos Aires (UBA)', 'Facultad de Derecho', 'CABA', 'CABA', 'Pública', 'http://www.derecho.uba.ar/academica/plan-de-estudios.php');
  insertUni.run('Universidad Nacional de Córdoba (UNC)', 'Facultad de Derecho y Ciencias Sociales', 'Córdoba', 'Córdoba', 'Pública', 'https://www.derecho.unc.edu.ar/plan-de-estudios/');
  insertUni.run('Universidad Nacional de La Plata (UNLP)', 'Facultad de Ciencias Jurídicas y Sociales', 'La Plata', 'Buenos Aires', 'Pública', 'https://www.jursoc.unlp.edu.ar/plan-de-estudios');
  insertUni.run('Universidad Nacional de Rosario (UNR)', 'Facultad de Derecho', 'Rosario', 'Santa Fe', 'Pública', 'https://www.fder.unr.edu.ar/plan-de-estudios/');
  insertUni.run('Universidad Nacional del Litoral (UNL)', 'Facultad de Ciencias Jurídicas y Sociales', 'Santa Fe', 'Santa Fe', 'Pública', 'https://www.fcjs.unl.edu.ar/');
  insertUni.run('Universidad Nacional de Tucumán (UNT)', 'Facultad de Derecho y Ciencias Sociales', 'San Miguel de Tucumán', 'Tucumán', 'Pública', 'https://www.derecho.unt.edu.ar/');
  insertUni.run('Universidad Nacional de Cuyo (UNCuyo)', 'Facultad de Derecho', 'Mendoza', 'Mendoza', 'Pública', 'https://fder.uncuyo.edu.ar/');
  insertUni.run('Universidad Nacional del Nordeste (UNNE)', 'Facultad de Derecho y Ciencias Sociales y Políticas', 'Corrientes', 'Corrientes', 'Pública', 'https://derecho.unne.edu.ar/');
  insertUni.run('Universidad Nacional de Mar del Plata (UNMDP)', 'Facultad de Derecho', 'Mar del Plata', 'Buenos Aires', 'Pública', 'https://www.mdp.edu.ar/derecho/');
  insertUni.run('Universidad Nacional del Sur (UNS)', 'Departamento de Derecho', 'Bahía Blanca', 'Buenos Aires', 'Pública', 'https://www.uns.edu.ar/');
  insertUni.run('Universidad Nacional de Santiago del Estero (UNSE)', 'Facultad de Humanidades, Cs. Sociales y de la Salud - Abogacía', 'Santiago del Estero', 'Santiago del Estero', 'Pública', 'https://fhu.unse.edu.ar/');
  insertUni.run('Universidad Nacional de San Juan (UNSJ)', 'Facultad de Ciencias Sociales - Abogacía', 'San Juan', 'San Juan', 'Pública', 'http://www.facso.unsj.edu.ar/');
  insertUni.run('Universidad Nacional del Centro (UNICEN)', 'Facultad de Derecho', 'Azul', 'Buenos Aires', 'Pública', 'https://www.der.unicen.edu.ar/');
  insertUni.run('Universidad Nacional de La Pampa (UNLPam)', 'Facultad de Ciencias Económicas y Jurídicas', 'Santa Rosa', 'La Pampa', 'Pública', 'https://www.unlpam.edu.ar/');
  insertUni.run('Universidad Nacional de Lomas de Zamora (UNLZ)', 'Facultad de Derecho', 'Lomas de Zamora', 'Buenos Aires', 'Pública', 'https://www.derecho.unlz.edu.ar/');
  insertUni.run('Universidad Nacional del Noroeste (UNNOBA)', 'Escuela de Ciencias Jurídicas y Sociales', 'Junín', 'Buenos Aires', 'Pública', 'https://www.unnoba.edu.ar/');
  insertUni.run('Universidad Nacional de La Matanza (UNLaM)', 'Departamento de Derecho y Ciencia Política', 'San Justo', 'Buenos Aires', 'Pública', 'https://derecho.unlam.edu.ar/');
  insertUni.run('Universidad Nacional de Catamarca (UNCa)', 'Facultad de Derecho', 'San Fernando del Valle de Catamarca', 'Catamarca', 'Pública', 'https://www.unca.edu.ar/');
  insertUni.run('Universidad Nacional de Entre Ríos (UNER)', 'Facultad de Ciencias de la Gestión - Abogacía', 'Paraná', 'Entre Ríos', 'Pública', 'https://fcg.uner.edu.ar/');
  insertUni.run('Universidad Nacional del Comahue (UNCo)', 'Facultad de Derecho y Ciencias Sociales', 'General Roca', 'Río Negro', 'Pública', 'https://fadecs.uncoma.edu.ar/');
  insertUni.run('Universidad Nacional de la Patagonia SJB (UNPSJB)', 'Facultad de Ciencias Jurídicas', 'Comodoro Rivadavia', 'Chubut', 'Pública', 'https://www.unp.edu.ar/');
  insertUni.run('Universidad Nacional de la Patagonia Austral (UNPA)', 'Unidad Académica de Ciencias Sociales - Abogacía', 'Río Gallegos', 'Santa Cruz', 'Pública', 'https://www.unpa.edu.ar/');
  insertUni.run('Universidad Nacional de Salta (UNSa)', 'Escuela de Derecho - Facultad de Humanidades', 'Salta', 'Salta', 'Pública', 'https://hum.unsa.edu.ar/');
  insertUni.run('Universidad Nacional de San Luis (UNSL)', 'Facultad de Ciencias Jurídicas - Abogacía', 'San Luis', 'San Luis', 'Pública', 'http://www.unsl.edu.ar/');
  insertUni.run('Universidad Nacional de Jujuy (UNJu)', 'Facultad de Humanidades y Cs. Sociales - Abogacía', 'San Salvador de Jujuy', 'Jujuy', 'Pública', 'http://www.fhycs.unju.edu.ar/');
  insertUni.run('Universidad Nacional de Misiones (UNaM)', 'Facultad de Derecho, Ciencias Sociales y Políticas', 'Posadas', 'Misiones', 'Pública', null);
  insertUni.run('Universidad Nacional de Formosa (UNaF)', 'Facultad de Humanidades - Abogacía', 'Formosa', 'Formosa', 'Pública', null);
  insertUni.run('Universidad Nacional de La Rioja (UNLaR)', 'Departamento de Ciencias Sociales, Jurídicas y Económicas', 'La Rioja', 'La Rioja', 'Pública', null);
  insertUni.run('Universidad Nacional de Avellaneda (UNDAV)', 'Departamento de Gobierno y Justicia - Abogacía', 'Avellaneda', 'Buenos Aires', 'Pública', 'https://undav.edu.ar/');
  insertUni.run('Universidad Nacional de José C. Paz (UNPAZ)', 'Departamento de Ciencias Jurídicas y Sociales', 'José C. Paz', 'Buenos Aires', 'Pública', 'https://www.unpaz.edu.ar/');
  insertUni.run('Universidad Nacional del Chaco Austral (UNCAUS)', 'Facultad de Ciencias Jurídicas y Políticas', 'Presidencia Roque Sáenz Peña', 'Chaco', 'Pública', null);
  insertUni.run('Universidad Nacional de Moreno (UNM)', 'Departamento de Humanidades y Ciencias Sociales - Abogacía', 'Moreno', 'Buenos Aires', 'Pública', 'https://www.unm.edu.ar/');
  insertUni.run('Universidad Nacional Arturo Jauretche (UNAJ)', 'Instituto de Ciencias Sociales y Administración - Abogacía', 'Florencio Varela', 'Buenos Aires', 'Pública', 'https://www.unaj.edu.ar/');
  insertUni.run('Universidad Nacional de Tierra del Fuego (UNTDF)', 'Instituto de Ciencias Sociales - Abogacía', 'Ushuaia', 'Tierra del Fuego', 'Pública', 'https://www.untdf.edu.ar/');
  insertUni.run('Universidad Nacional de Hurlingham (UNAHUR)', 'Instituto de Justicia y Derecho', 'Villa Tesei', 'Buenos Aires', 'Pública', 'https://unahur.edu.ar/');
  insertUni.run('Universidad Nacional de Río Negro (UNRN)', 'Escuela de Derecho', 'Viedma', 'Río Negro', 'Pública', 'https://www.unrn.edu.ar/');

  // === UNIVERSIDADES PRIVADAS ===
  insertUni.run('Universidad Católica Argentina (UCA)', 'Facultad de Derecho', 'CABA', 'CABA', 'Privada', 'https://uca.edu.ar/es/facultad-de-derecho');
  insertUni.run('Universidad Austral (UA)', 'Facultad de Derecho', 'Pilar', 'Buenos Aires', 'Privada', 'https://www.austral.edu.ar/derecho/');
  insertUni.run('Universidad Torcuato Di Tella (UTDT)', 'Escuela de Derecho', 'CABA', 'CABA', 'Privada', 'https://www.utdt.edu/listado_contenidos.php?id_item_menu=25164');
  insertUni.run('Universidad de San Andrés (UdeSA)', 'Departamento de Derecho', 'Victoria', 'Buenos Aires', 'Privada', 'https://udesa.edu.ar/departamento-de-derecho');
  insertUni.run('Universidad de Palermo (UP)', 'Facultad de Derecho', 'CABA', 'CABA', 'Privada', 'https://www.palermo.edu/derecho/');
  insertUni.run('Universidad del Salvador (USAL)', 'Facultad de Ciencias Jurídicas', 'CABA', 'CABA', 'Privada', 'https://fcj.usal.edu.ar/');
  insertUni.run('Universidad de Belgrano (UB)', 'Facultad de Derecho y Ciencias Sociales', 'CABA', 'CABA', 'Privada', 'https://www.ub.edu.ar/facultad-de-derecho-y-ciencias-sociales');
  insertUni.run('Universidad Argentina de la Empresa (UADE)', 'Facultad de Ciencias Jurídicas y Sociales', 'CABA', 'CABA', 'Privada', 'https://www.uade.edu.ar/');
  insertUni.run('Universidad Argentina John F. Kennedy (UK)', 'Facultad de Derecho', 'CABA', 'CABA', 'Privada', 'https://www.kennedy.edu.ar/');
  insertUni.run('Universidad de Morón (UM)', 'Facultad de Derecho, Ciencias Políticas y Sociales', 'Morón', 'Buenos Aires', 'Privada', 'https://www.unimoron.edu.ar/');
  insertUni.run('Universidad del Norte Santo Tomás de Aquino (UNSTA)', 'Facultad de Derecho y Ciencias Políticas', 'San Miguel de Tucumán', 'Tucumán', 'Privada', 'https://www.unsta.edu.ar/');
  insertUni.run('Universidad Católica de Córdoba (UCC)', 'Facultad de Derecho y Ciencias Sociales', 'Córdoba', 'Córdoba', 'Privada', 'https://www.ucc.edu.ar/facultades/derecho/');
  insertUni.run('Universidad Católica de La Plata (UCALP)', 'Facultad de Derecho y Ciencias Políticas', 'La Plata', 'Buenos Aires', 'Privada', 'https://www.ucalp.edu.ar/');
  insertUni.run('Universidad Católica de Santa Fe (UCSF)', 'Facultad de Derecho y Ciencia Política', 'Santa Fe', 'Santa Fe', 'Privada', 'https://www.ucsf.edu.ar/');
  insertUni.run('Universidad Católica de Santiago del Estero (UCSE)', 'Departamento de Ciencias Jurídicas y Sociales', 'Santiago del Estero', 'Santiago del Estero', 'Privada', 'https://www.ucse.edu.ar/');
  insertUni.run('Universidad Católica de Cuyo (UCCuyo)', 'Facultad de Derecho y Ciencias Sociales', 'San Juan', 'San Juan', 'Privada', 'https://www.uccuyo.edu.ar/');
  insertUni.run('Universidad Católica de Salta (UCASAL)', 'Facultad de Ciencias Jurídicas', 'Salta', 'Salta', 'Privada', 'https://www.ucasal.edu.ar/');
  insertUni.run('Universidad de Ciencias Empresariales y Sociales (UCES)', 'Facultad de Ciencias Jurídicas y Políticas', 'CABA', 'CABA', 'Privada', 'https://www.uces.edu.ar/');
  insertUni.run('Universidad Abierta Interamericana (UAI)', 'Facultad de Derecho y Ciencias Políticas', 'CABA', 'CABA', 'Privada', 'https://uai.edu.ar/');
  insertUni.run('Universidad del Museo Social Argentino (UMSA)', 'Facultad de Ciencias Jurídicas y Sociales', 'CABA', 'CABA', 'Privada', 'https://www.umsa.edu.ar/');
  insertUni.run('Universidad de Flores (UFLO)', 'Facultad de Derecho', 'CABA', 'CABA', 'Privada', 'https://www.uflo.edu.ar/');
  insertUni.run('Universidad Empresarial Siglo 21 (UES21)', 'Abogacía', 'Córdoba', 'Córdoba', 'Privada', 'https://www.21.edu.ar/');
  insertUni.run('Universidad FASTA', 'Facultad de Ciencias Jurídicas y Sociales', 'Mar del Plata', 'Buenos Aires', 'Privada', 'https://www.ufasta.edu.ar/');
  insertUni.run('Universidad Blas Pascal (UBP)', 'Facultad de Derecho y Ciencias Sociales', 'Córdoba', 'Córdoba', 'Privada', 'https://www.ubp.edu.ar/');
  insertUni.run('Universidad de Mendoza (UMendoza)', 'Facultad de Ciencias Jurídicas y Sociales', 'Mendoza', 'Mendoza', 'Privada', 'https://www.um.edu.ar/');
  insertUni.run('Universidad Champagnat (UCH)', 'Facultad de Derecho', 'Mendoza', 'Mendoza', 'Privada', 'https://www.uch.edu.ar/');
  insertUni.run('Universidad del Aconcagua (UDA)', 'Facultad de Ciencias Jurídicas y Sociales', 'Mendoza', 'Mendoza', 'Privada', 'https://www.uda.edu.ar/');
  insertUni.run('Universidad Adventista del Plata (UAP)', 'Facultad de Ciencias Jurídicas y Políticas', 'Libertador San Martín', 'Entre Ríos', 'Privada', 'https://www.uap.edu.ar/');
  insertUni.run('Universidad Nacional de San Antonio de Areco (UNSADA)', 'Centro Universitario', 'San Antonio de Areco', 'Buenos Aires', 'Pública', null);

  // Study Plans (Seeding UBA as base)
  const insertStudyPlan = db.prepare('INSERT INTO study_plans (university_id, subject_id, year, semester, category) VALUES (?, ?, ?, ?, ?)');
  // UBA 
  const ubaId = uni1.lastInsertRowid;
  // Year 1
  insertStudyPlan.run(ubaId, s3.lastInsertRowid, 1, 1, 'CPC'); // Teoría General del Derecho
  insertStudyPlan.run(ubaId, s5.lastInsertRowid, 1, 1, 'CPC'); // Instituciones de Derecho Civil
  insertStudyPlan.run(ubaId, s1.lastInsertRowid, 1, 2, 'CPC'); // Derecho Constitucional
  insertStudyPlan.run(ubaId, s7.lastInsertRowid, 1, 2, 'CPC'); // Derechos Humanos
  // Year 2
  insertStudyPlan.run(ubaId, s6.lastInsertRowid, 2, 1, 'CPC'); // Teoría General del Proceso
  insertStudyPlan.run(ubaId, s4.lastInsertRowid, 2, 1, 'CPC'); // Derecho Penal I
  insertStudyPlan.run(ubaId, s2.lastInsertRowid, 2, 2, 'CPC'); // Obligaciones
  insertStudyPlan.run(ubaId, s9.lastInsertRowid, 2, 2, 'CPC'); // Contratos
  // Year 3
  insertStudyPlan.run(ubaId, s10.lastInsertRowid, 3, 1, 'CPC'); // Familia y Sucesiones
  insertStudyPlan.run(ubaId, s12.lastInsertRowid, 3, 1, 'CPC'); // Sociedades
  insertStudyPlan.run(ubaId, s8.lastInsertRowid, 3, 2, 'CPC'); // Administrativo
  insertStudyPlan.run(ubaId, s11.lastInsertRowid, 3, 2, 'CPC'); // Trabajo y Seguridad Social

  // Chairs by University
  const insertChair = db.prepare('INSERT INTO chairs (university_id, subject_id, name, professor) VALUES (?, ?, ?, ?)');
  insertChair.run(ubaId, s1.lastInsertRowid, 'Cátedra A', 'Dr. Sola');
  insertChair.run(ubaId, s1.lastInsertRowid, 'Cátedra B', 'Dra. Gelli');
  insertChair.run(ubaId, s1.lastInsertRowid, 'Cátedra Sabsay', 'Daniel Sabsay');

  // Student Notes
  const insertNote = db.prepare('INSERT INTO student_notes (title, author_id, subject_id, university_id, chair_id, content, views, status, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertNote.run('Resumen Completo - Obligaciones (Cátedra Pizarro)', u2.lastInsertRowid, s2.lastInsertRowid, null, null, 'Este es un resumen exhaustivo de toda la materia...', 1250, 'published', '2026-01-15');
  insertNote.run('Cuadro Sinóptico - Control de Constitucionalidad', u2.lastInsertRowid, s1.lastInsertRowid, uni1.lastInsertRowid, ubaId, 'Esquema de las vías de control...', 250, 'published', '2026-02-10');

  // Procedural Acts
  const insertAct = db.prepare('INSERT INTO procedural_acts (jurisdiction, fuero, name, days, type, normative_base) VALUES (?, ?, ?, ?, ?, ?)');
  insertAct.run('Nacion', 'Civil', 'Contestar demanda (Ordinario)', 15, 'hábiles', 'Art. 338 CPCCN');
  insertAct.run('Nacion', 'Civil', 'Apelar sentencia definitiva', 5, 'hábiles', 'Art. 244 CPCCN');
  insertAct.run('Nacion', 'Laboral', 'Contestar demanda', 10, 'hábiles', 'Art. 68 LO');

  // Legal Movies (with poster_url)
  const insertMovie = db.prepare('INSERT INTO legal_movies (title, year, country, synopsis, legal_themes, link, poster_url) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertMovie.run('12 Angry Men', 1957, 'USA', 'Un jurado debe decidir la culpabilidad o inocencia de un joven acusado de asesinato.', 'Duda razonable, Jurado, Presunción de inocencia', 'https://imdb.com/title/tt0050083', 'https://m.media-amazon.com/images/M/MV5BYjE4NTllZGUtMmMyOS00NTJhLWE0MjctOWRhMDE2NTc4NjExXkEyXkFqcGc@._V1_.jpg');
  insertMovie.run('Argentina, 1985', 2022, 'Argentina', 'El equipo de fiscales liderado por Julio Strassera y Luis Moreno Ocampo en el Juicio a las Juntas.', 'Derechos Humanos, Justicia Transicional, Juicio a las Juntas', 'https://imdb.com/title/tt15118192', 'https://m.media-amazon.com/images/M/MV5BNDQ0MmRjNjktNzU1OS00MzZhLWIzYmEtZGFlMWIyMmYzMGFkXkEyXkFqcGc@._V1_.jpg');

  // Seed holidays (Argentine official holidays 2026)
  const holidayCount = db.prepare('SELECT COUNT(*) as count FROM holiday_calendar').get() as { count: number };
  if (holidayCount.count === 0) {
    const insertHoliday = db.prepare('INSERT INTO holiday_calendar (date, description) VALUES (?, ?)');
    const holidays2026 = [
      ['2026-01-01', 'Año Nuevo'],
      ['2026-02-16', 'Carnaval'],
      ['2026-02-17', 'Carnaval'],
      ['2026-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia'],
      ['2026-04-02', 'Día del Veterano y de los Caídos en la Guerra de Malvinas'],
      ['2026-04-03', 'Viernes Santo'],
      ['2026-05-01', 'Día del Trabajador'],
      ['2026-05-25', 'Día de la Revolución de Mayo'],
      ['2026-06-15', 'Paso a la Inmortalidad del Gral. Martín Miguel de Güemes'],
      ['2026-06-20', 'Paso a la Inmortalidad del Gral. Manuel Belgrano'],
      ['2026-07-09', 'Día de la Independencia'],
      ['2026-08-17', 'Paso a la Inmortalidad del Gral. José de San Martín'],
      ['2026-10-12', 'Día del Respeto a la Diversidad Cultural'],
      ['2026-11-20', 'Día de la Soberanía Nacional'],
      ['2026-12-08', 'Inmaculada Concepción de María'],
      ['2026-12-25', 'Navidad'],
    ];
    holidays2026.forEach(([date, description]) => insertHoliday.run(date, description));
    console.log('Seeded holiday calendar.');
  }

  // Seed forum topics
  const forumCount = db.prepare('SELECT COUNT(*) as count FROM forum_topics').get() as { count: number };
  if (forumCount.count === 0) {
    const now = new Date().toISOString();
    const insertTopic = db.prepare('INSERT INTO forum_topics (title, content, author_id, subject_id, category, created_at, updated_at, views) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insertReply = db.prepare('INSERT INTO forum_replies (topic_id, author_id, content, created_at) VALUES (?, ?, ?, ?)');
    const t1 = insertTopic.run('Duda sobre el fallo Siri y su aplicación actual', 'Estoy estudiando el fallo Siri y me surge una duda: ¿sigue siendo relevante hoy con el art. 43 CN? ¿La acción de amparo legislada supera la creación pretoriana?', u1.lastInsertRowid, s1.lastInsertRowid, 'Derecho Constitucional', now, now, 24);
    insertReply.run(t1.lastInsertRowid, u2.lastInsertRowid, 'El fallo Siri sigue siendo fundamental como precedente histórico. El art. 43 CN recepta la creación pretoriana pero no la agota. La CSJN sigue citándolo en amparos contra actos estatales.', now);
    insertReply.run(t1.lastInsertRowid, u1.lastInsertRowid, 'Gracias María, ¿y qué pasa con Kot? ¿Se complementan?', now);

    const t2 = insertTopic.run('¿Alguien tiene apuntes de Obligaciones cátedra Pizarro?', 'Busco resúmenes o apuntes de Obligaciones, cátedra Pizarro (UBA). Si alguien tiene, agradezco.', u1.lastInsertRowid, s2.lastInsertRowid, 'Derecho Civil', now, now, 15);
    insertReply.run(t2.lastInsertRowid, u2.lastInsertRowid, 'Fijate en la sección de apuntes, hay un resumen completo subido. También podés buscar en la materia Obligaciones.', now);

    insertTopic.run('Debate: Reforma al Código Procesal Civil', 'Se está debatiendo en el Congreso una reforma importante. ¿Qué opinan sobre la oralidad efectiva en procesos civiles? ¿Es viable en Argentina?', u2.lastInsertRowid, s6.lastInsertRowid, 'Actualidad', now, now, 45);
    console.log('Seeded forum topics.');
  }

  console.log('Database seeded with demo data including new tables.');
}

initDb();

export { db };
