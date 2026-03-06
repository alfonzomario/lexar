import 'dotenv/config';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { db } from './src/db/index.js';
import { initNormativaDb } from './normativa_init.js';
import http from 'http';
import { Server } from 'socket.io';

async function startServer() {
  initNormativaDb();
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  app.use(express.json());

  const getUserId = (req: express.Request): number | null => {
    const id = req.headers['x-user-id'];
    if (id === undefined || id === null) return null;
    const n = parseInt(String(id), 10);
    return Number.isFinite(n) ? n : null;
  };
  const requireSuperAdmin = (req: express.Request, res: express.Response): { userId: number } | null => {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Usuario no identificado' });
      return null;
    }
    const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    if (!user || user.tier !== 'super_admin') {
      res.status(403).json({ error: 'Solo super admin puede realizar esta acción' });
      return null;
    }
    return { userId };
  };

  const applyImpactTierUpgrade = (authorId: number) => {
    const user = db.prepare('SELECT id, tier, total_views, total_votes_received FROM users WHERE id = ?').get(authorId) as { id: number; tier: string; total_views: number; total_votes_received: number } | undefined;
    if (!user || user.tier === 'super_admin') return;
    const impact = (user.total_views ?? 0) + 2 * (user.total_votes_received ?? 0);
    if (impact >= 1000 && user.tier !== 'pro') {
      db.prepare("UPDATE users SET tier = 'pro' WHERE id = ?").run(user.id);
    } else if (impact >= 500 && user.tier === 'free') {
      db.prepare("UPDATE users SET tier = 'basic' WHERE id = ?").run(user.id);
    }
  };

  // Router /api que recibe primero los DELETE (evita que Vite u otro middleware devuelva 404)
  const apiRouter = express.Router();
  apiRouter.delete('/notes/:id', (req, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('[API] DELETE /api/notes/' + req.params.id);
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    try {
      db.prepare('DELETE FROM student_notes WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al eliminar' });
    }
  });
  apiRouter.delete('/exams/:id', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    try {
      db.prepare('DELETE FROM exams WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al eliminar' });
    }
  });
  app.use('/api', apiRouter);

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Resumen de fallo con IA (Pro solo)
  app.post('/api/briefs/:id/summarize', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });
    const u = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    if (!u || (u.tier !== 'pro' && u.tier !== 'admin' && u.tier !== 'super_admin')) return res.status(403).json({ error: 'Solo plan Pro puede usar el resumen con IA' });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'IA no configurada' });
    const brief = db.prepare('SELECT * FROM case_briefs WHERE id = ?').get(req.params.id) as any;
    if (!brief) return res.status(404).json({ error: 'Fallo no encontrado' });
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Resumí este fallo argentino en 3-4 párrafos claros: hechos relevantes, cuestión jurídica, doctrina aplicada y decisión. Lenguaje didáctico para estudiantes de Derecho. No des asesoramiento legal.\n\nFallo: ${brief.title}\nHechos: ${brief.facts || ''}\nCuestión: ${brief.issue || ''}\nRegla: ${brief.rule || ''}\nArgumentos: ${brief.reasoning || ''}\nDecisión: ${brief.holding || ''}`;
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const text = result.text ?? '';
      res.json({ summary: text });
    } catch (err: any) {
      console.error('Summarize error:', err);
      res.status(500).json({ error: 'Error al generar el resumen. Reintentá.' });
    }
  });

  // AI Chat (Gemini) - fallos
  app.post('/api/briefs/:id/ai-chat', async (req, res) => {
    const briefId = req.params.id;
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Falta el mensaje' });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'IA no configurada. Obtené una API key gratis en https://aistudio.google.com/apikey y agregala en .env como GEMINI_API_KEY="tu_key". Reiniciá el servidor.' });
    }
    try {
      const brief = db.prepare(`
        SELECT case_briefs.*, GROUP_CONCAT(subjects.name) as subject_names
        FROM case_briefs
        LEFT JOIN case_brief_subjects ON case_briefs.id = case_brief_subjects.case_brief_id
        LEFT JOIN subjects ON case_brief_subjects.subject_id = subjects.id
        WHERE case_briefs.id = ?
        GROUP BY case_briefs.id
      `).get(briefId) as any;
      if (!brief) return res.status(404).json({ error: 'Fallo no encontrado' });

      const ai = new GoogleGenAI({ apiKey });
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: `
            Actúa como un experto en Jurisprudencia Argentina (Abogado Especialista). 
            Tu objetivo es ayudar al usuario a entender el siguiente fallo:
            
            FALLO:
            Autos: ${brief.title}
            Hechos: ${brief.facts}
            Cuestión Jurídica (Issue): ${brief.issue}
            Regla / Doctrina: ${brief.rule}
            Argumentos: ${brief.reasoning}
            Decisión (Holding): ${brief.holding}
            
            REGLAS:
            1. Explica en lenguaje claro pero jurídico.
            2. NO des asesoramiento legal personalizado.
            3. Si el fallo es complejo, desglosa los argumentos de forma didáctica.
            4. Incluye el disclaimer: "Esto no es asesoramiento legal. Soy de uso educativo."
            5. Formateá la respuesta en Markdown para que sea fácil de leer: usá párrafos separados por líneas en blanco, listas cuando convenga, y espaciado claro.
          `,
        },
      });
      const result = await chat.sendMessage({ message });
      const text = result.text ?? '';
      res.json({ text });
    } catch (err: any) {
      console.error('AI chat error (brief):', err);
      res.status(500).json({ error: 'Error de conexión con la IA. Por favor, reintenta.' });
    }
  });

  // AI Chat (Gemini) - normas
  app.post('/api/normas/:id/ai-chat', async (req, res) => {
    const normaId = req.params.id;
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Falta el mensaje' });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'IA no configurada. Obtené una API key gratis en https://aistudio.google.com/apikey y agregala en .env como GEMINI_API_KEY="tu_key". Reiniciá el servidor.' });
    }
    try {
      const norma = db.prepare('SELECT * FROM normas WHERE id = ?').get(normaId) as any;
      if (!norma) return res.status(404).json({ error: 'Norma no encontrada' });

      const ai = new GoogleGenAI({ apiKey });
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: `
            Actúa como un experto en Derecho Argentino. 
            Tu objetivo es ayudar al usuario a entender la siguiente norma:
            
            NORMA:
            Título: ${norma.titulo}
            Tipo: ${norma.tipo} ${norma.numero}/${norma.anio}
            Organismo: ${norma.organismo}
            Texto: ${norma.texto}
            
            REGLAS:
            1. Explica en lenguaje claro pero profesional.
            2. NO des asesoramiento legal personalizado.
            3. Usa CITAS exactas (Art. X) cuando menciones la norma.
            4. Incluye el disclaimer: "Esto no es asesoramiento legal" cuando corresponda.
            5. Formateá la respuesta en Markdown: párrafos separados por líneas en blanco, listas si aplica, espaciado claro para lectura.
          `,
        },
      });
      const result = await chat.sendMessage({ message });
      const text = result.text ?? '';
      res.json({ text });
    } catch (err: any) {
      console.error('AI chat error (norma):', err);
      res.status(500).json({ error: 'Hubo un error al procesar tu consulta. Por favor, reintenta.' });
    }
  });

  // Subjects
  app.get('/api/subjects', (req, res) => {
    const subjects = db.prepare('SELECT * FROM subjects').all();
    res.json(subjects);
  });

  app.get('/api/subjects/:id', (req, res) => {
    const subject = db.prepare('SELECT id, name, description, icon FROM subjects WHERE id = ?').get(req.params.id);
    if (!subject) return res.status(404).json({ error: 'Materia no encontrada' });
    res.json(subject);
  });

  app.post('/api/subjects', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const { name, description, icon } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Nombre de materia obligatorio' });
    }
    try {
      const result = db.prepare('INSERT INTO subjects (name, description, icon) VALUES (?, ?, ?)').run(
        name.trim(),
        description && typeof description === 'string' ? description.trim() : null,
        icon && typeof icon === 'string' ? icon.trim() : null
      );
      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
      console.error('Error creating subject:', e);
      res.status(500).json({ error: 'Error al crear la materia' });
    }
  });

  // Subject-scoped: bibliography, notes, exams, flashcards
  app.get('/api/subjects/:id/bibliography', (req, res) => {
    const list = db.prepare('SELECT * FROM bibliographies WHERE subject_id = ?').all(req.params.id);
    res.json(list);
  });

  const canViewProContent = (tier: string | undefined) => tier === 'pro' || tier === 'admin' || tier === 'super_admin';

  app.get('/api/subjects/:id/notes', (req, res) => {
    const userId = getUserId(req);
    const user = userId ? (db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined) : undefined;
    const isSuperAdmin = user?.tier === 'super_admin';
    const subjectId = req.params.id;
    const uid = userId ?? 0;
    const voteCountSub = "(SELECT COUNT(*) FROM resource_votes WHERE resource_type = 'note' AND resource_id = student_notes.id)";
    const userVotedSub = uid ? `(SELECT 1 FROM resource_votes WHERE resource_type = 'note' AND resource_id = student_notes.id AND user_id = ${uid})` : '0';
    let notes: any[];
    if (isSuperAdmin) {
      notes = db.prepare(`
        SELECT student_notes.*, users.name as author_name, subjects.name as subject_name,
          un.name as university_name, ${voteCountSub} as vote_count, ${userVotedSub} as user_voted
        FROM student_notes
        JOIN users ON student_notes.author_id = users.id
        JOIN subjects ON student_notes.subject_id = subjects.id
        LEFT JOIN universities un ON student_notes.university_id = un.id
        WHERE student_notes.subject_id = ?
        ORDER BY student_notes.status ASC, student_notes.views DESC
      `).all(subjectId);
    } else {
      notes = db.prepare(`
        SELECT student_notes.*, users.name as author_name, subjects.name as subject_name,
          un.name as university_name, ${voteCountSub} as vote_count, ${userVotedSub} as user_voted
        FROM student_notes
        JOIN users ON student_notes.author_id = users.id
        JOIN subjects ON student_notes.subject_id = subjects.id
        LEFT JOIN universities un ON student_notes.university_id = un.id
        WHERE student_notes.subject_id = ? AND student_notes.status = 'published'
        ORDER BY student_notes.views DESC
      `).all(subjectId);
    }
    if (!canViewProContent(user?.tier)) {
      notes = notes.map((n) => ({ ...n, file_url: null, has_document: !!n.file_url }));
    }
    res.json(notes);
  });

  app.get('/api/subjects/:id/exams', (req, res) => {
    const userId = getUserId(req);
    const user = userId ? (db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined) : undefined;
    const isSuperAdmin = user?.tier === 'super_admin';
    const uid = userId ?? 0;
    const voteCountSub = "(SELECT COUNT(*) FROM resource_votes WHERE resource_type = 'exam' AND resource_id = exams.id)";
    const userVotedSub = uid ? `(SELECT 1 FROM resource_votes WHERE resource_type = 'exam' AND resource_id = exams.id AND user_id = ${uid})` : '0';
    let list: any[];
    if (isSuperAdmin) {
      list = db.prepare(`
        SELECT exams.*, u.name as uploaded_by_name, un.name as university_name, ${voteCountSub} as vote_count, ${userVotedSub} as user_voted
        FROM exams
        LEFT JOIN users u ON exams.uploaded_by = u.id
        LEFT JOIN universities un ON exams.university_id = un.id
        WHERE exams.subject_id = ?
        ORDER BY exams.created_at DESC
      `).all(req.params.id);
    } else {
      list = db.prepare(`
        SELECT exams.*, u.name as uploaded_by_name, un.name as university_name, ${voteCountSub} as vote_count, ${userVotedSub} as user_voted
        FROM exams
        LEFT JOIN users u ON exams.uploaded_by = u.id
        LEFT JOIN universities un ON exams.university_id = un.id
        WHERE exams.subject_id = ? AND exams.status = 'approved'
        ORDER BY exams.created_at DESC
      `).all(req.params.id);
    }
    if (!canViewProContent(user?.tier)) {
      list = list.map((ex: any) => ({ ...ex, file_url: null, has_document: !!ex.file_url }));
    }
    res.json(list);
  });

  const DOC_VIEWS_LIMIT_FREE = 1;
  const DOC_VIEWS_LIMIT_BASIC = 10;

  const getDocViewsLimit = (tier: string): number => {
    if (canViewProContent(tier)) return -1;
    if (tier === 'basic') return DOC_VIEWS_LIMIT_BASIC;
    if (tier === 'free') return DOC_VIEWS_LIMIT_FREE;
    return 0;
  };

  app.get('/api/me/document-quota', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No identificado' });
    const u = db.prepare('SELECT tier, doc_views_used, doc_views_period FROM users WHERE id = ?').get(userId) as { tier: string; doc_views_used: number; doc_views_period: string | null } | undefined;
    if (!u) return res.status(401).json({ error: 'Usuario no encontrado' });
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const limit = getDocViewsLimit(u.tier);
    if (limit < 0) return res.json({ used: 0, limit: -1 });
    let used = u.doc_views_used ?? 0;
    if (u.doc_views_period !== period) used = 0;
    return res.json({ used, limit });
  });

  const ensureQuotaAndConsume = (userId: number): { ok: boolean } => {
    const u = db.prepare('SELECT tier, doc_views_used, doc_views_period FROM users WHERE id = ?').get(userId) as { tier: string; doc_views_used: number; doc_views_period: string | null } | undefined;
    if (!u || canViewProContent(u.tier)) return { ok: true };
    const limit = getDocViewsLimit(u.tier);
    if (limit <= 0) return { ok: false };
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let used = u.doc_views_used ?? 0;
    if (u.doc_views_period !== period) { used = 0; db.prepare('UPDATE users SET doc_views_used = 0, doc_views_period = ? WHERE id = ?').run(period, userId); }
    if (used >= limit) return { ok: false };
    db.prepare('UPDATE users SET doc_views_used = doc_views_used + 1, doc_views_period = ? WHERE id = ?').run(period, userId);
    return { ok: true };
  };

  app.get('/api/notes/:id/view-url', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Usuario no identificado' });
    const note = db.prepare('SELECT id, file_url, author_id, status FROM student_notes WHERE id = ?').get(req.params.id) as { id: number; file_url: string | null; author_id: number; status: string } | undefined;
    if (!note || !note.file_url) return res.status(404).json({ error: 'Not found' });
    if (note.status !== 'published') return res.status(404).json({ error: 'El apunte no está publicado' });
    const u = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    if (!u) return res.status(401).json({ error: 'Usuario no encontrado' });
    if (canViewProContent(u.tier)) {
      return res.json({ url: note.file_url });
    }
    if (u.tier !== 'basic' && u.tier !== 'free') return res.status(403).json({ error: 'Iniciá sesión para ver documentos.' });
    const quota = ensureQuotaAndConsume(userId);
    if (!quota.ok) return res.status(403).json({ error: 'Has alcanzado el límite de vistas este mes. Con Basic tenés 10/mes, con Pro ilimitado y podés subir los tuyos.' });
    const now = new Date().toISOString();
    const r = db.prepare('INSERT OR IGNORE INTO resource_views (user_id, resource_type, resource_id, created_at) VALUES (?, ?, ?, ?)').run(userId, 'note', note.id, now);
    if (r.changes === 1) {
      db.prepare('UPDATE student_notes SET views = views + 1 WHERE id = ?').run(note.id);
      db.prepare('UPDATE users SET total_views = COALESCE(total_views, 0) + 1 WHERE id = ?').run(note.author_id);
      applyImpactTierUpgrade(note.author_id);
    }
    res.json({ url: note.file_url });
  });

  app.get('/api/exams/:id/view-url', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Usuario no identificado' });
    const exam = db.prepare('SELECT id, file_url, uploaded_by, status FROM exams WHERE id = ?').get(req.params.id) as { id: number; file_url: string | null; uploaded_by: number; status: string } | undefined;
    if (!exam || !exam.file_url) return res.status(404).json({ error: 'Not found' });
    if (exam.status !== 'approved') return res.status(404).json({ error: 'El examen no está aprobado' });
    const u = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    if (!u) return res.status(401).json({ error: 'Usuario no encontrado' });
    if (canViewProContent(u.tier)) return res.json({ url: exam.file_url });
    if (u.tier !== 'basic' && u.tier !== 'free') return res.status(403).json({ error: 'Iniciá sesión para ver documentos.' });
    const quota = ensureQuotaAndConsume(userId);
    if (!quota.ok) return res.status(403).json({ error: 'Has alcanzado el límite de vistas este mes. Con Basic tenés 10/mes, con Pro ilimitado y podés subir los tuyos.' });
    const now = new Date().toISOString();
    const r = db.prepare('INSERT OR IGNORE INTO resource_views (user_id, resource_type, resource_id, created_at) VALUES (?, ?, ?, ?)').run(userId, 'exam', exam.id, now);
    if (r.changes === 1) {
      db.prepare('UPDATE exams SET views = COALESCE(views, 0) + 1 WHERE id = ?').run(exam.id);
      db.prepare('UPDATE users SET total_views = COALESCE(total_views, 0) + 1 WHERE id = ?').run(exam.uploaded_by);
      applyImpactTierUpgrade(exam.uploaded_by);
    }
    res.json({ url: exam.file_url });
  });

  app.post('/api/subjects/:id/exams', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Usuario no identificado' });
    const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    const isSuperAdmin = user.tier === 'super_admin';
    const { title, description, file_url, year, university_id } = req.body;
    if (!title || typeof title !== 'string') return res.status(400).json({ error: 'Título obligatorio' });
    if (!file_url || typeof file_url !== 'string' || !file_url.trim()) return res.status(400).json({ error: 'El link de Google Drive (público) es obligatorio' });
    const subjectId = req.params.id;
    const subject = db.prepare('SELECT id FROM subjects WHERE id = ?').get(subjectId);
    if (!subject) return res.status(404).json({ error: 'Materia no encontrada' });
    const status = isSuperAdmin ? 'approved' : 'pending';
    const createdAt = new Date().toISOString();
    const examYear = year != null && year !== '' ? parseInt(String(year), 10) : null;
    const examUniId = university_id != null && university_id !== '' ? parseInt(String(university_id), 10) : null;
    try {
      const result = db.prepare(`
        INSERT INTO exams (subject_id, title, description, file_url, uploaded_by, status, approved_by, created_at, year, university_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(subjectId, title.trim(), description && typeof description === 'string' ? description.trim() : null, file_url || null, userId, status, isSuperAdmin ? userId : null, createdAt, examYear, examUniId);
      res.status(201).json({ success: true, id: result.lastInsertRowid, status });
    } catch (e) {
      console.error('Error creating exam:', e);
      res.status(500).json({ error: 'Error al cargar el examen' });
    }
  });

  app.patch('/api/exams/:id/approve', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    try {
      db.prepare("UPDATE exams SET status = 'approved', approved_by = ? WHERE id = ?").run(auth.userId, req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al aprobar' });
    }
  });

  app.patch('/api/exams/:id/reject', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    try {
      db.prepare("UPDATE exams SET status = 'rejected', approved_by = ? WHERE id = ?").run(auth.userId, req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al rechazar' });
    }
  });

  app.get('/api/exams/pending', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const list = db.prepare(`
      SELECT exams.*, u.name as uploaded_by_name, s.name as subject_name, un.name as university_name
      FROM exams
      LEFT JOIN users u ON exams.uploaded_by = u.id
      LEFT JOIN subjects s ON exams.subject_id = s.id
      LEFT JOIN universities un ON exams.university_id = un.id
      WHERE exams.status = 'pending'
      ORDER BY exams.created_at DESC
    `).all();
    res.json(list);
  });

  app.get('/api/subjects/:id/flashcards', (req, res) => {
    const list = db.prepare('SELECT * FROM flashcards WHERE subject_id = ? ORDER BY id').all(req.params.id);
    res.json(list);
  });

  app.post('/api/subjects/:id/flashcards', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const { front, back } = req.body;
    if (!front || !back || typeof front !== 'string' || typeof back !== 'string') {
      return res.status(400).json({ error: 'front y back son obligatorios' });
    }
    const subjectId = req.params.id;
    const subject = db.prepare('SELECT id FROM subjects WHERE id = ?').get(subjectId);
    if (!subject) return res.status(404).json({ error: 'Materia no encontrada' });
    try {
      const result = db.prepare('INSERT INTO flashcards (subject_id, front, back, source) VALUES (?, ?, ?, ?)').run(subjectId, front.trim(), back.trim(), 'manual');
      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
      console.error('Error creating flashcard:', e);
      res.status(500).json({ error: 'Error al crear flashcard' });
    }
  });

  app.post('/api/subjects/:id/flashcards/generate', async (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const subjectId = req.params.id;
    const subject = db.prepare('SELECT name, description FROM subjects WHERE id = ?').get(subjectId) as { name: string; description: string } | undefined;
    if (!subject) return res.status(404).json({ error: 'Materia no encontrada' });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'IA no configurada. Obtené una API key gratis en https://aistudio.google.com/apikey y agregala en el archivo .env como GEMINI_API_KEY="tu_key". Luego reiniciá el servidor.' });
    const count = typeof req.body?.count === 'number' ? Math.min(20, Math.max(1, req.body.count)) : 5;
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Generá exactamente ${count} flashcards de estudio para la materia de derecho "${subject.name}". ${subject.description ? `Contexto: ${subject.description}` : ''}
Devuelve SOLO un JSON array de objetos con exactamente dos campos: "front" (pregunta o término) y "back" (respuesta). Sin explicaciones, solo el array JSON. Ejemplo: [{"front":"¿Qué es el amparo?","back":"Acción constitucional para proteger derechos."}]`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const text = (response.text ?? '').trim();
      let parsed: { front: string; back: string }[];
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch {
        parsed = [];
      }
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return res.status(502).json({ error: 'La IA no devolvió flashcards válidas' });
      }
      const insert = db.prepare('INSERT INTO flashcards (subject_id, front, back, source) VALUES (?, ?, ?, ?)');
      for (const card of parsed.slice(0, count)) {
        const f = card && typeof card.front === 'string' ? card.front.trim() : '';
        const b = card && typeof card.back === 'string' ? card.back.trim() : '';
        if (f && b) insert.run(subjectId, f, b, 'ai_generated');
      }
      res.json({ success: true, generated: parsed.length });
    } catch (e: any) {
      console.error('Flashcards generate error:', e);
      const msg = e?.message || '';
      if (msg.includes('429') || msg.includes('quota') || msg.includes('Quota exceeded')) {
        return res.status(429).json({ error: 'Se superó la cuota gratuita de la IA. Probá de nuevo en unos minutos o revisá tu uso en https://aistudio.google.com' });
      }
      res.status(500).json({ error: msg || 'Error al generar flashcards' });
    }
  });

  app.put('/api/flashcards/:id', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const { front, back } = req.body;
    const id = req.params.id;
    const existing = db.prepare('SELECT id FROM flashcards WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Flashcard no encontrada' });
    if (typeof front === 'string') db.prepare('UPDATE flashcards SET front = ? WHERE id = ?').run(front.trim(), id);
    if (typeof back === 'string') db.prepare('UPDATE flashcards SET back = ? WHERE id = ?').run(back.trim(), id);
    res.json({ success: true });
  });

  app.delete('/api/flashcards/:id', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    db.prepare('DELETE FROM flashcards WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Case Briefs
  app.get('/api/briefs', (req, res) => {
    const briefs = db.prepare(`
      SELECT case_briefs.*, GROUP_CONCAT(subjects.name) as subject_names, GROUP_CONCAT(subjects.id) as subject_ids
      FROM case_briefs
      LEFT JOIN case_brief_subjects ON case_briefs.id = case_brief_subjects.case_brief_id
      LEFT JOIN subjects ON case_brief_subjects.subject_id = subjects.id
      GROUP BY case_briefs.id
    `).all();
    res.json(briefs);
  });

  app.get('/api/briefs/:id', (req, res) => {
    const brief = db.prepare(`
      SELECT case_briefs.*, GROUP_CONCAT(subjects.name) as subject_names, GROUP_CONCAT(subjects.id) as subject_ids
      FROM case_briefs
      LEFT JOIN case_brief_subjects ON case_briefs.id = case_brief_subjects.case_brief_id
      LEFT JOIN subjects ON case_brief_subjects.subject_id = subjects.id
      WHERE case_briefs.id = ?
      GROUP BY case_briefs.id
    `).get(req.params.id);
    if (brief) {
      res.json(brief);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  // AI Parse Mock Endpoint
  app.post('/api/briefs/ai-parse', (req, res) => {
    // Simulate AI delay
    setTimeout(() => {
      res.json({
        title: 'Fallo Extraído Automáticamente',
        facts: 'El actor interpuso demanda solicitando la inconstitucionalidad de la norma. El demandado opuso excepciones alegando falta de legitimación.',
        issue: '¿Corresponde declarar la inconstitucionalidad de la norma cuestionada por afectar el derecho a la propiedad privada?',
        rule: 'Los derechos consagrados en la Constitución no son absolutos, pero su reglamentación mediante leyes no puede alterar su sustancia (Art. 28 CN).',
        reasoning: 'El tribunal consideró que los hechos probados demuestran una afectación directa e irrazonable al núcleo del derecho de propiedad del actor, sin que exista una justificación o interés estatal superior válido en este caso.',
        holding: 'Se hace lugar a la demanda, revocando la sentencia de cámara, y se declara la inconstitucionalidad de la norma para este caso concreto.',
        relevance: 'Sentencia trascendental respecto a los límites del poder de policía del Estado sobre la reglamentación de derechos.',
        keywords: 'Inconstitucionalidad, Propiedad, Razonabilidad'
      });
    }, 2500);
  });

  // Create new Case Brief
  app.post('/api/briefs', (req, res) => {
    const { title, facts, issue, rule, reasoning, holding, relevance, keywords, subject_id } = req.body;

    if (!title || !subject_id) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
      // Start transaction or just sequential inserts. We do sequential for simplicity
      const result = db.prepare(`
        INSERT INTO case_briefs (title, facts, issue, rule, reasoning, holding, relevance, keywords, is_demo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(title, facts, issue, rule, reasoning, holding, relevance, keywords);

      const insertRelation = db.prepare('INSERT INTO case_brief_subjects (case_brief_id, subject_id) VALUES (?, ?)');
      insertRelation.run(result.lastInsertRowid, subject_id);

      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      console.error('Error saving brief:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Delete a Case Brief
  app.delete('/api/briefs/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM case_brief_subjects WHERE case_brief_id = ?').run(req.params.id);
      db.prepare('DELETE FROM text_annotations WHERE brief_id = ?').run(req.params.id);
      db.prepare('DELETE FROM case_briefs WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting brief:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Delete a Case Brief
  app.delete('/api/briefs/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM case_brief_subjects WHERE case_brief_id = ?').run(req.params.id);
      db.prepare('DELETE FROM text_annotations WHERE brief_id = ?').run(req.params.id);
      db.prepare('DELETE FROM case_briefs WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting brief:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Procedural Acts
  app.get('/api/acts', (req, res) => {
    const acts = db.prepare('SELECT * FROM procedural_acts').all();
    res.json(acts);
  });

  // Legal Movies
  app.get('/api/movies', (req, res) => {
    const movies = db.prepare('SELECT * FROM legal_movies').all();
    res.json(movies);
  });

  // Articles
  app.get('/api/articles', (req, res) => {
    const articles = db.prepare(`
      SELECT articles.*, users.name as author_name, users.profile_role as author_role
      FROM articles
      JOIN users ON articles.author_id = users.id
      WHERE articles.status = 'published'
      ORDER BY date DESC
    `).all();
    res.json(articles);
  });

  // Universities
  app.get('/api/universities', (req, res) => {
    const unis = db.prepare('SELECT * FROM universities').all();
    res.json(unis);
  });

  // Chairs by University
  app.get('/api/universities/:id/chairs', (req, res) => {
    const chairs = db.prepare(`
      SELECT chairs.*, subjects.name as subject_name 
      FROM chairs 
      JOIN subjects ON chairs.subject_id = subjects.id 
      WHERE chairs.university_id = ?
    `).all(req.params.id);
    res.json(chairs);
  });

  // Quizzes
  app.get('/api/quizzes', (req, res) => {
    const quizzes = db.prepare('SELECT * FROM quizzes').all();
    res.json(quizzes);
  });

  // Flashcards
  app.get('/api/flashcards', (req, res) => {
    const flashcards = db.prepare('SELECT * FROM flashcards').all();
    res.json(flashcards);
  });

  // Latinisms
  app.get('/api/latinisms', (req, res) => {
    const latinisms = db.prepare('SELECT * FROM latinisms').all();
    res.json(latinisms);
  });

  // News
  app.get('/api/news', (req, res) => {
    const news = db.prepare('SELECT * FROM news ORDER BY date DESC').all();
    res.json(news);
  });

  // Bibliography
  app.get('/api/bibliography', (req, res) => {
    const biblio = db.prepare('SELECT * FROM bibliographies').all();
    res.json(biblio);
  });

  // Jobs (solo Pro y super_admin)
  app.get('/api/jobs', (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Debes iniciar sesión' });
      return;
    }
    const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    if (!user || (user.tier !== 'pro' && user.tier !== 'super_admin')) {
      res.status(403).json({ error: 'La Bolsa de Trabajo es exclusiva del plan Pro' });
      return;
    }
    const jobs = db.prepare('SELECT * FROM jobs ORDER BY date DESC').all();
    res.json(jobs);
  });

  const requireBasicOrAbove = (req: express.Request, res: express.Response): number | null => {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Debes iniciar sesión' });
      return null;
    }
    const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    const allowed = user && ['basic', 'pro', 'admin', 'super_admin'].includes(user.tier);
    if (!allowed) {
      res.status(403).json({ error: 'Esta función es para plan Basic o superior' });
      return null;
    }
    return userId;
  };

  // Para leer después (Basic+): listar con título y URL
  app.get('/api/saved-for-later', (req, res) => {
    const userId = requireBasicOrAbove(req, res);
    if (userId === null) return;
    const rows = db.prepare('SELECT resource_type, resource_id, created_at FROM saved_for_later WHERE user_id = ? ORDER BY created_at DESC').all(userId) as { resource_type: string; resource_id: number; created_at: string }[];
    const out = rows.map((r) => {
      let title = '';
      let url = '';
      if (r.resource_type === 'brief') {
        const b = db.prepare('SELECT title FROM case_briefs WHERE id = ?').get(r.resource_id) as { title: string } | undefined;
        title = b?.title || 'Fallos';
        url = `/briefs/${r.resource_id}`;
      } else if (r.resource_type === 'note') {
        const n = db.prepare('SELECT title, subject_id FROM student_notes WHERE id = ?').get(r.resource_id) as { title: string; subject_id: number } | undefined;
        title = n?.title || 'Apunte';
        url = n ? `/subjects/${n.subject_id}` : '/subjects';
      } else if (r.resource_type === 'exam') {
        const e = db.prepare('SELECT title, subject_id FROM exams WHERE id = ?').get(r.resource_id) as { title: string; subject_id: number } | undefined;
        title = e?.title || 'Examen';
        url = e ? `/subjects/${e.subject_id}` : '/subjects';
      }
      return { ...r, title, url };
    });
    res.json(out);
  });
  app.post('/api/saved-for-later', (req, res) => {
    const userId = requireBasicOrAbove(req, res);
    if (userId === null) return;
    const { resource_type, resource_id } = req.body;
    if (!resource_type || resource_id == null) return res.status(400).json({ error: 'Faltan resource_type o resource_id' });
    const now = new Date().toISOString();
    try {
      db.prepare('INSERT OR IGNORE INTO saved_for_later (user_id, resource_type, resource_id, created_at) VALUES (?, ?, ?, ?)').run(userId, resource_type, Number(resource_id), now);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al guardar' });
    }
  });
  app.delete('/api/saved-for-later', (req, res) => {
    const userId = requireBasicOrAbove(req, res);
    if (userId === null) return;
    const { resource_type, resource_id } = req.query;
    if (!resource_type || resource_id == null) return res.status(400).json({ error: 'Faltan resource_type o resource_id' });
    db.prepare('DELETE FROM saved_for_later WHERE user_id = ? AND resource_type = ? AND resource_id = ?').run(userId, String(resource_type), Number(resource_id));
    res.json({ success: true });
  });
  app.get('/api/saved-for-later/check', (req, res) => {
    const userId = requireBasicOrAbove(req, res);
    if (userId === null) return;
    const { resource_type, resource_id } = req.query;
    if (!resource_type || resource_id == null) return res.status(400).json({ error: 'Faltan parámetros' });
    const row = db.prepare('SELECT 1 FROM saved_for_later WHERE user_id = ? AND resource_type = ? AND resource_id = ?').get(userId, String(resource_type), Number(resource_id));
    res.json({ saved: !!row });
  });

  // Notas privadas sobre recursos (Basic+): get/set por recurso
  app.get('/api/user-notes/:resourceType/:resourceId', (req, res) => {
    const userId = requireBasicOrAbove(req, res);
    if (userId === null) return;
    const { resourceType, resourceId } = req.params;
    const row = db.prepare('SELECT content, created_at FROM user_resource_notes WHERE user_id = ? AND resource_type = ? AND resource_id = ?').get(userId, resourceType, resourceId) as { content: string; created_at: string } | undefined;
    res.json(row || null);
  });
  app.post('/api/user-notes/:resourceType/:resourceId', (req, res) => {
    const userId = requireBasicOrAbove(req, res);
    if (userId === null) return;
    const { resourceType, resourceId } = req.params;
    const { content } = req.body;
    const now = new Date().toISOString();
    db.prepare('INSERT OR REPLACE INTO user_resource_notes (user_id, resource_type, resource_id, content, created_at) VALUES (?, ?, ?, ?, ?)').run(userId, resourceType, Number(resourceId), typeof content === 'string' ? content : '', now);
    res.json({ success: true });
  });

  // Export note for PDF/print (Pro only)
  app.get('/api/notes/:id/export', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });
    const u = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    if (!u || (u.tier !== 'pro' && u.tier !== 'admin' && u.tier !== 'super_admin')) return res.status(403).json({ error: 'Solo plan Pro puede descargar' });
    const row = db.prepare('SELECT title, content FROM student_notes WHERE id = ? AND status = ?').get(req.params.id, 'published') as { title: string; content: string } | undefined;
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ title: row.title, content: row.content || '' });
  });

  // Student Notes
  app.get('/api/notes', (req, res) => {
    const notes = db.prepare(`
      SELECT student_notes.*, users.name as author_name, subjects.name as subject_name 
      FROM student_notes 
      JOIN users ON student_notes.author_id = users.id
      JOIN subjects ON student_notes.subject_id = subjects.id
      WHERE student_notes.status = 'published'
      ORDER BY student_notes.views DESC
    `).all();
    res.json(notes);
  });

  // Vista en apunte: solo usuarios Pro (o super_admin) pueden ver; 1 vista por usuario por recurso.
  app.post('/api/notes/:id/view', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.json({ success: true });
    const u = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    if (!canViewProContent(u?.tier)) return res.json({ success: true }); // no Pro = no contar ni dar acceso
    const noteId = req.params.id;
    const note = db.prepare('SELECT author_id, status FROM student_notes WHERE id = ?').get(noteId) as { author_id: number; status: string } | undefined;
    if (!note) return res.status(404).json({ error: 'Not found' });
    if (note.status !== 'published') return res.status(404).json({ error: 'El apunte no está publicado' });
    const now = new Date().toISOString();
    const r = db.prepare('INSERT OR IGNORE INTO resource_views (user_id, resource_type, resource_id, created_at) VALUES (?, ?, ?, ?)').run(userId, 'note', noteId, now);
    if (r.changes === 0) return res.json({ success: true }); // ya había visto este recurso
    db.prepare('UPDATE student_notes SET views = views + 1 WHERE id = ?').run(noteId);
    db.prepare('UPDATE users SET total_views = COALESCE(total_views, 0) + 1 WHERE id = ?').run(note.author_id);
    applyImpactTierUpgrade(note.author_id);
    res.json({ success: true });
  });

  app.post('/api/exams/:id/view', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.json({ success: true });
    const u = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    if (!canViewProContent(u?.tier)) return res.json({ success: true });
    const examId = req.params.id;
    const exam = db.prepare('SELECT uploaded_by, status FROM exams WHERE id = ?').get(examId) as { uploaded_by: number; status: string } | undefined;
    if (!exam) return res.status(404).json({ error: 'Not found' });
    if (exam.status !== 'approved') return res.status(404).json({ error: 'El examen no está aprobado' });
    const now = new Date().toISOString();
    const r = db.prepare('INSERT OR IGNORE INTO resource_views (user_id, resource_type, resource_id, created_at) VALUES (?, ?, ?, ?)').run(userId, 'exam', examId, now);
    if (r.changes === 0) return res.json({ success: true });
    db.prepare('UPDATE exams SET views = COALESCE(views, 0) + 1 WHERE id = ?').run(examId);
    db.prepare('UPDATE users SET total_views = COALESCE(total_views, 0) + 1 WHERE id = ?').run(exam.uploaded_by);
    applyImpactTierUpgrade(exam.uploaded_by);
    res.json({ success: true });
  });

  app.post('/api/notes/:id/vote', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Usuario no identificado' });
    const noteId = req.params.id;
    const note = db.prepare('SELECT id, author_id, status FROM student_notes WHERE id = ?').get(noteId) as { id: number; author_id: number; status: string } | undefined;
    if (!note) return res.status(404).json({ error: 'Not found' });
    if (note.status !== 'published') return res.status(400).json({ error: 'Solo se puede votar apuntes publicados' });
    const createdAt = new Date().toISOString();
    try {
      const r = db.prepare('INSERT OR IGNORE INTO resource_votes (user_id, resource_type, resource_id, created_at) VALUES (?, ?, ?, ?)').run(userId, 'note', noteId, createdAt);
      if (r.changes === 0) return res.json({ success: true, already_voted: true });
      db.prepare('UPDATE users SET total_votes_received = COALESCE(total_votes_received, 0) + 1 WHERE id = ?').run(note.author_id);
      applyImpactTierUpgrade(note.author_id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al votar' });
    }
  });

  app.post('/api/exams/:id/vote', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Usuario no identificado' });
    const examId = req.params.id;
    const exam = db.prepare('SELECT id, uploaded_by, status FROM exams WHERE id = ?').get(examId) as { id: number; uploaded_by: number; status: string } | undefined;
    if (!exam) return res.status(404).json({ error: 'Not found' });
    if (exam.status !== 'approved') return res.status(400).json({ error: 'Solo se puede votar exámenes aprobados' });
    const createdAt = new Date().toISOString();
    try {
      const r = db.prepare('INSERT OR IGNORE INTO resource_votes (user_id, resource_type, resource_id, created_at) VALUES (?, ?, ?, ?)').run(userId, 'exam', examId, createdAt);
      if (r.changes === 0) return res.json({ success: true, already_voted: true });
      db.prepare('UPDATE users SET total_votes_received = COALESCE(total_votes_received, 0) + 1 WHERE id = ?').run(exam.uploaded_by);
      applyImpactTierUpgrade(exam.uploaded_by);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al votar' });
    }
  });

  // Create a new note: cualquier usuario logueado puede subir; super_admin queda publicado, el resto pendiente de aprobación. Las vistas/votaciones en lo aprobado suman puntos al autor (500→Basic, 1000→Pro).
  app.post('/api/notes', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Usuario no identificado' });
    const uploader = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    if (!uploader) return res.status(401).json({ error: 'Usuario no encontrado' });

    try {
      const { title, subject_id, file_url, description, year, university_id } = req.body;
      if (!title || !subject_id) return res.status(400).json({ error: 'Título y materia son obligatorios' });
      if (!file_url || typeof file_url !== 'string' || !file_url.trim()) return res.status(400).json({ error: 'El link de Google Drive (público) es obligatorio' });

      const status = uploader.tier === 'super_admin' ? 'published' : 'pending';
      const date = new Date().toISOString().split('T')[0];
      const content = description && typeof description === 'string' ? description.trim() : null;
      const noteYear = year != null && year !== '' ? parseInt(String(year), 10) : null;
      const noteUniId = university_id != null && university_id !== '' ? parseInt(String(university_id), 10) : null;

      const result = db.prepare(`
        INSERT INTO student_notes (title, author_id, subject_id, content, file_url, views, status, date, year, university_id)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
      `).run(title.trim(), userId, subject_id, content, file_url.trim(), status, date, noteYear, noteUniId);

      res.status(201).json({ success: true, id: result.lastInsertRowid, status });
    } catch (error) {
      console.error('Error saving note:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.get('/api/notes/pending', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const list = db.prepare(`
      SELECT student_notes.*, users.name as author_name, subjects.name as subject_name, un.name as university_name
      FROM student_notes
      JOIN users ON student_notes.author_id = users.id
      JOIN subjects ON student_notes.subject_id = subjects.id
      LEFT JOIN universities un ON student_notes.university_id = un.id
      WHERE student_notes.status = 'pending'
      ORDER BY student_notes.date DESC
    `).all();
    res.json(list);
  });

  app.patch('/api/notes/:id/approve', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    try {
      db.prepare("UPDATE student_notes SET status = 'published' WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al aprobar' });
    }
  });

  app.patch('/api/notes/:id/reject', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    try {
      db.prepare("UPDATE student_notes SET status = 'rejected' WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al rechazar' });
    }
  });

  // Normativa
  app.get('/api/normas', (req, res) => {
    const q = req.query.q;
    let query = 'SELECT * FROM normas';
    let params = [];
    if (q) {
      query += ' WHERE titulo LIKE ? OR numero LIKE ? OR texto LIKE ?';
      const search = `%${q}%`;
      params = [search, search, search];
    }
    const normas = db.prepare(query).all(...params);
    res.json(normas);
  });

  app.get('/api/normas/:id', (req, res) => {
    const norma = db.prepare('SELECT * FROM normas WHERE id = ?').get(req.params.id);
    if (norma) {
      res.json(norma);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  // Text Annotations
  app.get('/api/briefs/:briefId/annotations', (req, res) => {
    // Ideally we would filter by user_id from session, here we assume it's passed or just mock for demo
    // The frontend should pass ?userId=X, or we return all and filter frontend side. Let's filter by userId query.
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'Falta userId' });

    const annotations = db.prepare('SELECT * FROM text_annotations WHERE brief_id = ? AND user_id = ? ORDER BY created_at DESC').all(req.params.briefId, userId);
    res.json(annotations);
  });

  app.post('/api/briefs/:briefId/annotations', (req, res) => {
    const { user_id, selected_text, note, color } = req.body;
    const brief_id = req.params.briefId;
    const created_at = new Date().toISOString();

    if (!selected_text || !user_id) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
      const result = db.prepare(`
        INSERT INTO text_annotations (user_id, brief_id, selected_text, note, color, created_at) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(user_id, brief_id, selected_text, note || '', color || 'bg-yellow-200', created_at);

      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      console.error('Error saving text annotation:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.delete('/api/annotations/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM text_annotations WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Private Notes
  app.get('/api/users/:userId/private-notes', (req, res) => {
    const { url } = req.query;
    let notes;
    if (url) {
      notes = db.prepare('SELECT * FROM private_notes WHERE user_id = ? AND url = ? ORDER BY date DESC').all(req.params.userId, url);
    } else {
      notes = db.prepare('SELECT * FROM private_notes WHERE user_id = ? ORDER BY date DESC').all(req.params.userId);
    }
    res.json(notes);
  });

  app.get('/api/users/:userId/text-annotations', (req, res) => {
    const annotations = db.prepare(`
      SELECT ta.*, cb.title as brief_title 
      FROM text_annotations ta
      JOIN case_briefs cb ON ta.brief_id = cb.id
      WHERE ta.user_id = ?
      ORDER BY ta.created_at DESC
    `).all(req.params.userId);
    res.json(annotations);
  });

  app.post('/api/users/:userId/private-notes', (req, res) => {
    const { url, page_title, content } = req.body;
    const user_id = req.params.userId;
    const date = new Date().toISOString();

    if (!content || !url) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
      const result = db.prepare(`
        INSERT INTO private_notes (user_id, url, page_title, content, date) 
        VALUES (?, ?, ?, ?, ?)
      `).run(user_id, url, page_title || 'Página sin título', content, date);

      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      console.error('Error saving private note:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.delete('/api/private-notes/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM private_notes WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Users
  app.get('/api/users', (req, res) => {
    const users = db.prepare('SELECT * FROM users').all();
    res.json(users);
  });

  // Chat rooms (Pro)
  app.get('/api/chat-rooms', (req, res) => {
    const rooms = db.prepare('SELECT id, slug, name, category FROM chat_rooms ORDER BY category, name').all();
    res.json(rooms);
  });

  app.get('/api/chat-rooms/:id/messages', (req, res) => {
    const roomId = req.params.id;
    const limit = Math.min(100, parseInt(String(req.query.limit), 10) || 50);
    const rows = db.prepare(`
      SELECT rm.id, rm.room_id, rm.user_id, rm.content, rm.timestamp, users.name as user_name
      FROM room_messages rm
      JOIN users ON rm.user_id = users.id
      WHERE rm.room_id = ?
      ORDER BY rm.timestamp DESC
      LIMIT ?
    `).all(roomId, limit);
    res.json(rows.reverse());
  });

  // Messages
  app.get('/api/messages/:user1/:user2', (req, res) => {
    const { user1, user2 } = req.params;
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (sender_id = ? AND receiver_id = ?) 
         OR (sender_id = ? AND receiver_id = ?)
      ORDER BY timestamp ASC
    `).all(user1, user2, user2, user1);
    res.json(messages);
  });

  // Socket.io logic
  io.on('connection', (socket) => {
    socket.on('join', (userId) => {
      socket.join(`user_${userId}`);
    });

    socket.on('join_room', (roomId: number) => {
      socket.join(`room_${roomId}`);
    });

    socket.on('leave_room', (roomId: number) => {
      socket.leave(`room_${roomId}`);
    });

    socket.on('send_room_message', (data: { room_id: number; user_id: number; content: string }) => {
      const { room_id, user_id, content } = data;
      if (!room_id || !user_id || !content || typeof content !== 'string') return;
      const timestamp = new Date().toISOString();
      const result = db.prepare(
        'INSERT INTO room_messages (room_id, user_id, content, timestamp) VALUES (?, ?, ?, ?)'
      ).run(room_id, user_id, content.trim(), timestamp);
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(user_id) as { name: string } | undefined;
      const newMessage = {
        id: result.lastInsertRowid,
        room_id,
        user_id,
        user_name: user?.name ?? 'Usuario',
        content: content.trim(),
        timestamp,
      };
      io.to(`room_${room_id}`).emit('room_message', newMessage);
    });

    socket.on('send_message', (data) => {
      const { sender_id, receiver_id, content } = data;
      const timestamp = new Date().toISOString();

      const result = db.prepare(
        'INSERT INTO messages (sender_id, receiver_id, content, timestamp) VALUES (?, ?, ?, ?)'
      ).run(sender_id, receiver_id, content, timestamp);

      const newMessage = {
        id: result.lastInsertRowid,
        sender_id,
        receiver_id,
        content,
        timestamp
      };

      io.to(`user_${receiver_id}`).emit('receive_message', newMessage);
      io.to(`user_${sender_id}`).emit('receive_message', newMessage);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => res.sendFile(path.join(process.cwd(), 'dist', 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
