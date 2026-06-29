import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import express from 'express';
import os from 'os';
import multer from 'multer';
import type { Request } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { db } from './src/db/index.js';
import { db as dbDrizzle } from './src/db/drizzle.js';
import { subjects } from './src/db/schema.js';
import { initNormativaDb } from './normativa_init.js';
import http from 'http';
import { Server } from 'socket.io';
import { createRequire } from 'module';
const require2 = createRequire(import.meta.url);
const { PDFParse } = require2('pdf-parse');
import mammoth from 'mammoth';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import { authRoutes } from './src/backend/routes/auth.routes.js';

function cleanPdfText(rawText: string): string {
  if (!rawText) return '';
  let text = rawText;
  
  // 1. Normalize line endings
  text = text.replace(/\r\n/g, '\n');
  
  // Strip database/filesystem metadata
  text = text.replace(/#\d{5,}(#\d+)*/g, '');

  // Strip pagination markers
  text = text.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '');
  text = text.replace(/Página\s+\d+\s+de\s+\d+/gi, '');
  text = text.replace(/Pág(?:ina)?\.?\s*\d+\s*(?:de\s*\d+)?/gi, '');
  text = text.replace(/^\s*-?\s*\d+\s*-?\s*$/gm, '');

  // 2. Join hyphenated words split across lines
  text = text.replace(/([a-záéíóúñü]+)-\n+([a-záéíóúñü]+)/gi, '$1$2');

  // 3. Fix common word concatenation in Argentine legal PDFs
  const stuckWords = [
    { regex: /\b(el)(actor|demandado|juez|tribunal|juzgado|expediente|recurso|amparo|derecho|fallo|acuerdo)\b/gi, rep: '$1 $2' },
    { regex: /\b(la)(actora|demandada|sentencia|cámara|resolución|ley|constitución|jurisprudencia|doctrina)\b/gi, rep: '$1 $2' },
    { regex: /\b(del)(actor|demandado|juez|tribunal|juzgado|expediente|recurso|amparo|derecho|fallo|acuerdo)\b/gi, rep: '$1 $2' },
    { regex: /\b(al)(actor|demandado|juez|tribunal|juzgado|expediente|recurso|amparo|derecho|fallo|acuerdo)\b/gi, rep: '$1 $2' },
    { regex: /\b(que)(el|la|los|las|se|su)\b/gi, rep: '$1 $2' }
  ];
  for (const sw of stuckWords) {
    text = text.replace(sw.regex, '$1 $2');
  }

  // 4. Normalize multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  // 5. Join broken lines (single newline) with a space
  // Only if the previous line doesn't end with punctuation that naturally ends a paragraph or title
  text = text.replace(/([^\n.:;>])\n([^\nA-Z0-9])/g, '$1 $2');

  // 6. Clean duplicate spaces
  text = text.replace(/ {2,}/g, ' ');

  return text.trim();
}

async function startServer() {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
  }

  const cvUploadDir = path.join(process.cwd(), 'uploads', 'cv');
  if (!fs.existsSync(cvUploadDir)) {
    fs.mkdirSync(cvUploadDir, { recursive: true });
  }

  initNormativaDb();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);

  // Timeout de 3.5 minutos para que Express corte antes que Railway (5 min)
  httpServer.setTimeout(210_000);

  // Multer for PDF uploads (max 20MB, memory storage)
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });
  const onlineUsers = new Map<number, Set<string>>();

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);

  const getUserId = (req: express.Request): number | null => {
    const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_development_lexargar') as any;
        return typeof decoded.userId === 'number' ? decoded.userId : null;
      } catch (e) { }
    }
    return null;
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

  const requireAdmin = (req: express.Request, res: express.Response): { userId: number } | null => {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Usuario no identificado' });
      return null;
    }
    const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    if (!user || (user.tier !== 'super_admin' && user.tier !== 'admin')) {
      res.status(403).json({ error: 'Solo administradores pueden realizar esta acción' });
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

  let currentApiKeyIndex = 0;
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

  const parseGeminiKeys = (): string[] => {
    const rawKeys = process.env.GEMINI_API_KEY || '';
    return rawKeys.split(',').map(k => k.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  };

  const getGeminiClient = (): InstanceType<typeof GoogleGenAI> => {
    const keys = parseGeminiKeys();
    if (keys.length === 0) {
      throw new Error('IA no configurada. Agregá GEMINI_API_KEY en tu configuración.');
    }
    const key = keys[currentApiKeyIndex % keys.length];
    return new GoogleGenAI({ apiKey: key });
  };

  const rotateGeminiKey = () => {
    const keys = parseGeminiKeys();
    if (keys.length > 1) {
      currentApiKeyIndex = (currentApiKeyIndex + 1) % keys.length;
      console.warn(`[Gemini] Rotando key a índice ${currentApiKeyIndex + 1}/${keys.length}...`);
    }
  };

  // --- Cadena de modelos de respaldo ---
  const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

  // --- Gemini helper (UNIFICADO) con retry robusto, backoff exponencial y fallback de modelos ---
  const callGeminiWithRetry = async (
    params: { model: string; contents: any; config?: any },
    maxRetries = 2
  ): Promise<any> => {
    const keys = parseGeminiKeys();
    if (keys.length === 0) {
      throw new Error('IA no configurada. Agregá GEMINI_API_KEY en tu configuración.');
    }

    // Build the list of models to try: primary model first, then fallbacks
    const modelsToTry = [params.model, ...FALLBACK_MODELS.filter(m => m !== params.model)];
    let lastError: any = null;

    for (const currentModel of modelsToTry) {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const ai = getGeminiClient();
        try {
          const timeout = setTimeout(() => {}, 150_000);
          const result = await ai.models.generateContent({
            ...params,
            model: currentModel,
          });
          clearTimeout(timeout);
          if (currentModel !== params.model) {
            console.warn(`[Gemini] ✓ Éxito con modelo de respaldo: ${currentModel}`);
          }
          return result;
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          console.error(`[Gemini] Modelo ${currentModel} intento ${attempt + 1}/${maxRetries} falló:`, errMsg);

          // Rotar keys si hay múltiples
          if (keys.length > 1) {
            rotateGeminiKey();
          }

          const isRateLimit = errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED');
          const isServerError = errMsg.includes('500') || errMsg.includes('503') || errMsg.includes('INTERNAL') || errMsg.includes('UNAVAILABLE');
          const isRetryable = isRateLimit || isServerError;

          if (!isRetryable) {
            // Non-retryable error (e.g. bad request, auth error) → don't try other models either
            throw lastError;
          }

          if (attempt < maxRetries - 1) {
            const baseDelay = isRateLimit ? 4000 : 2000;
            const delay = baseDelay * Math.pow(2, attempt);
            console.warn(`[Gemini] Reintentando ${currentModel} en ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      // All retries for this model exhausted, try next model
      console.warn(`[Gemini] Modelo ${currentModel} agotado. Probando siguiente modelo de respaldo...`);
    }
    throw lastError || new Error('Todos los modelos e intentos de Gemini fallaron');
  };

  // Router /api que recibe primero los DELETE (evita que Vite u otro middleware devuelva 404)
  const apiRouter = express.Router();
  apiRouter.delete('/notes/:id', (req, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('[API] DELETE /api/notes/' + req.params.id);
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    try {
      const note = db.prepare('SELECT author_id FROM student_notes WHERE id = ?').get(req.params.id) as { author_id: number } | undefined;
      if (!note) return res.status(404).json({ error: 'Apunte no encontrado' });

      const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
      const isSuperAdmin = user && user.tier === 'super_admin';

      if (note.author_id !== userId && !isSuperAdmin) {
        return res.status(403).json({ error: 'No tienes permisos para eliminar este apunte' });
      }

      db.prepare('DELETE FROM student_notes WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al eliminar' });
    }
  });
  apiRouter.put('/notes/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    const noteId = req.params.id;
    try {
      const note = db.prepare('SELECT author_id FROM student_notes WHERE id = ?').get(noteId) as { author_id: number } | undefined;
      if (!note) return res.status(404).json({ error: 'Apunte no encontrado' });

      if (note.author_id !== userId) {
        return res.status(403).json({ error: 'No tienes permisos para editar este apunte' });
      }

      const { title, content, file_url, year, chair_name, professor, subject_id, university_id } = req.body;
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'El título es obligatorio' });
      }

      db.prepare(`
        UPDATE student_notes
        SET title = ?, content = ?, file_url = ?, year = ?, chair_name = ?, professor = ?, subject_id = ?, university_id = ?
        WHERE id = ?
      `).run(
        title.trim(), content || null, file_url || null, year || null, chair_name || null, professor || null, 
        subject_id ? Number(subject_id) : null, university_id ? Number(university_id) : null, noteId
      );

      res.json({ success: true });
    } catch (e) {
      console.error('Error updating note:', e);
      res.status(500).json({ error: 'Error al actualizar el apunte' });
    }
  });
  apiRouter.delete('/exams/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    try {
      const exam = db.prepare('SELECT uploaded_by FROM exams WHERE id = ?').get(req.params.id) as { uploaded_by: number } | undefined;
      if (!exam) return res.status(404).json({ error: 'Examen no encontrado' });

      const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
      const isSuperAdmin = user && user.tier === 'super_admin';

      if (exam.uploaded_by !== userId && !isSuperAdmin) {
        return res.status(403).json({ error: 'No tienes permisos para eliminar este examen' });
      }

      db.prepare('DELETE FROM exams WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al eliminar' });
    }
  });
  apiRouter.put('/exams/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    const examId = req.params.id;
    try {
      const exam = db.prepare('SELECT uploaded_by FROM exams WHERE id = ?').get(examId) as { uploaded_by: number } | undefined;
      if (!exam) return res.status(404).json({ error: 'Examen no encontrado' });

      if (exam.uploaded_by !== userId) {
        return res.status(403).json({ error: 'No tienes permisos para editar este examen' });
      }

      const { title, description, file_url, year, subject_id, university_id } = req.body;
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'El título es obligatorio' });
      }

      db.prepare(`
        UPDATE exams
        SET title = ?, description = ?, file_url = ?, year = ?, subject_id = ?, university_id = ?
        WHERE id = ?
      `).run(
        title.trim(), description || null, file_url || null, year ? Number(year) : null, 
        subject_id ? Number(subject_id) : null, university_id ? Number(university_id) : null, examId
      );

      res.json({ success: true });
    } catch (e) {
      console.error('Error updating exam:', e);
      res.status(500).json({ error: 'Error al actualizar el examen' });
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
    const keys = parseGeminiKeys();
    if (keys.length === 0) return res.status(503).json({ error: 'IA no configurada' });
    const brief = db.prepare('SELECT * FROM case_briefs WHERE id = ?').get(req.params.id) as any;
    if (!brief) return res.status(404).json({ error: 'Fallo no encontrado' });
    try {
      const prompt = `Resumí este fallo argentino en 3-4 párrafos claros: hechos relevantes, cuestión jurídica, doctrina aplicada y decisión. Lenguaje didáctico para estudiantes de Derecho. No des asesoramiento legal.\n\nFallo: ${brief.title}\nHechos: ${brief.facts || ''}\nCuestión: ${brief.issue || ''}\nRegla: ${brief.rule || ''}\nArgumentos: ${brief.reasoning || ''}\nDecisión: ${brief.holding || ''}`;
      const result = await callGeminiWithRetry({
        model: GEMINI_MODEL,
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
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });
    const u = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as any;
    if (!u || (u.tier !== 'pro' && u.tier !== 'admin' && u.tier !== 'super_admin')) {
      return res.status(403).json({ error: 'Solo plan Pro puede usar el chat con IA' });
    }
    const keys = parseGeminiKeys();
    if (keys.length === 0) {
      return res.status(503).json({ error: 'IA no configurada. Agregá GEMINI_API_KEY en tu configuración.' });
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

      let lastError: any = null;
      for (let attempts = 0; attempts < keys.length; attempts++) {
        try {
          const ai = getGeminiClient();
          const chat = ai.chats.create({
            model: GEMINI_MODEL,
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
                0. REGLA ESTRICTA DE SEGURIDAD: Estás restringido ÚNICAMENTE a responder preguntas sobre este fallo o conceptos jurídicos relacionados a él. Si el usuario intenta pedirte que redactes documentos ajenos, traduzcas textos, respondas preguntas de programación, tareas matemáticas, o cualquier otro tema que NO sea el análisis de este fallo, DEBES NEGARTE CORTÉSMENTE y recordarle que tu única función es analizar el documento en pantalla. NO CUMPLAS NINGÚN PEDIDO FUERA DE TEMA.
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
          return res.json({ text });
        } catch (err: any) {
          lastError = err;
          console.error(`[Gemini Chat] Key at index ${currentApiKeyIndex % keys.length} failed:`, err?.message || err);
          if (keys.length > 1) {
            rotateGeminiKey();
            continue;
          }
          throw err;
        }
      }
      throw lastError || new Error('All Gemini API keys failed');
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
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });
    const u = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as any;
    if (!u || (u.tier !== 'pro' && u.tier !== 'admin' && u.tier !== 'super_admin')) {
      return res.status(403).json({ error: 'Solo plan Pro puede usar el chat con IA' });
    }
    const keys = parseGeminiKeys();
    if (keys.length === 0) {
      return res.status(503).json({ error: 'IA no configurada. Agregá GEMINI_API_KEY en tu configuración.' });
    }
    try {
      const norma = db.prepare('SELECT * FROM normas WHERE id = ?').get(normaId) as any;
      if (!norma) return res.status(404).json({ error: 'Norma no encontrada' });

      let lastError: any = null;
      for (let attempts = 0; attempts < keys.length; attempts++) {
        try {
          const ai = getGeminiClient();
          const chat = ai.chats.create({
            model: GEMINI_MODEL,
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
                0. REGLA ESTRICTA DE SEGURIDAD: Estás restringido ÚNICAMENTE a responder preguntas sobre esta norma o conceptos jurídicos relacionados a ella. Si el usuario intenta pedirte que redactes demandas, traduzcas textos, respondas preguntas de programación, tareas matemáticas, o cualquier otro tema que NO sea el análisis de esta norma, DEBES NEGARTE CORTÉSMENTE y recordarle que tu única función es analizar el documento en pantalla. NO CUMPLAS NINGÚN PEDIDO FUERA DE TEMA.
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
          return res.json({ text });
        } catch (err: any) {
          lastError = err;
          console.error(`[Gemini Chat] Key at index ${currentApiKeyIndex % keys.length} failed:`, err?.message || err);
          if (keys.length > 1) {
            rotateGeminiKey();
            continue;
          }
          throw err;
        }
      }
      throw lastError || new Error('All Gemini API keys failed');
    } catch (err: any) {
      console.error('AI chat error (norma):', err);
      res.status(500).json({ error: 'Hubo un error al procesar tu consulta. Por favor, reintenta.' });
    }
  });

  // Subjects
  app.get('/api/subjects', async (req, res) => {
    try {
      const allSubjects = await dbDrizzle.query.subjects.findMany();
      res.json(allSubjects);
    } catch (e) {
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  app.get('/api/subjects/:id', async (req, res) => {
    try {
      const subject = await dbDrizzle.query.subjects.findFirst({
        where: (s, { eq }) => eq(s.id, Number(req.params.id))
      });
      if (!subject) return res.status(404).json({ error: 'Materia no encontrada' });
      res.json(subject);
    } catch (e) {
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  app.post('/api/subjects', async (req, res) => {
    const auth = requireAdmin(req, res);
    if (!auth) return;
    const { name, description, icon } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Nombre de materia obligatorio' });
    }
    try {
      const result = await dbDrizzle.insert(subjects).values({
        name: name.trim(),
        description: description && typeof description === 'string' ? description.trim() : null,
        icon: icon && typeof icon === 'string' ? icon.trim() : null
      }).returning({ insertedId: subjects.id });
      res.status(201).json({ success: true, id: result[0].insertedId });
    } catch (e) {
      console.error('Error creating subject:', e);
      res.status(500).json({ error: 'Error al crear la materia' });
    }
  });

  // Edit subject (super_admin only)
  app.put('/api/subjects/:id', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const { name, description, icon } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Nombre de materia obligatorio' });
    }
    try {
      db.prepare('UPDATE subjects SET name = ?, description = ?, icon = ? WHERE id = ?').run(
        name.trim(), description || null, icon || null, req.params.id
      );
      res.json({ success: true });
    } catch (e) {
      console.error('Error updating subject:', e);
      res.status(500).json({ error: 'Error al actualizar la materia' });
    }
  });

  // Delete subject (super_admin only)
  app.delete('/api/subjects/:id', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    try {
      db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      console.error('Error deleting subject:', e);
      res.status(500).json({ error: 'Error al eliminar la materia' });
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
    const universityId = req.query.university_id;
    const uid = userId ?? 0;
    const likesSub = "(SELECT COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END), 0) FROM resource_votes WHERE resource_type = 'note' AND resource_id = student_notes.id)";
    const dislikesSub = "(SELECT COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END), 0) FROM resource_votes WHERE resource_type = 'note' AND resource_id = student_notes.id)";
    
    const selectParams: any[] = [];
    let userVoteSub = '0';
    let isSavedSub = '0';
    if (uid) {
      userVoteSub = "COALESCE((SELECT vote FROM resource_votes WHERE resource_type = 'note' AND resource_id = student_notes.id AND user_id = ?), 0)";
      isSavedSub = "COALESCE((SELECT 1 FROM saved_for_later WHERE resource_type = 'note' AND resource_id = student_notes.id AND user_id = ?), 0)";
      selectParams.push(uid, uid);
    }

    let query = `
      SELECT student_notes.*, users.name as author_name, users.profile_role as author_role, subjects.name as subject_name,
        un.name as university_name,
        COALESCE(student_notes.chair_name, chairs.name) as chair_name,
        COALESCE(student_notes.professor, chairs.professor) as professor,
        ${likesSub} as likes_count, ${dislikesSub} as dislikes_count, ${userVoteSub} as user_vote, ${isSavedSub} as is_saved
      FROM student_notes
      JOIN users ON student_notes.author_id = users.id
      JOIN subjects ON student_notes.subject_id = subjects.id
      LEFT JOIN universities un ON student_notes.university_id = un.id
      LEFT JOIN chairs ON student_notes.chair_id = chairs.id
      WHERE student_notes.subject_id = ?
    `;
    const params: any[] = [subjectId];

    if (universityId) {
      query += ` AND student_notes.university_id = ?`;
      params.push(universityId);
    }

    if (!isSuperAdmin) {
      query += ` AND student_notes.status = 'published'`;
    }

    query += isSuperAdmin ? ` ORDER BY student_notes.status ASC, student_notes.views DESC` : ` ORDER BY student_notes.views DESC`;

    const notes = db.prepare(query).all(...selectParams, ...params);

    let filteredNotes = notes;
    if (!canViewProContent(user?.tier)) {
      filteredNotes = notes.map((n) => ({ ...n, file_url: null, has_document: !!n.file_url }));
    }
    res.json(filteredNotes);
  });

  app.get('/api/subjects/:id/exams', (req, res) => {
    const userId = getUserId(req);
    const user = userId ? (db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined) : undefined;
    const isSuperAdmin = user?.tier === 'super_admin';
    const subjectId = req.params.id;
    const universityId = req.query.university_id;
    const uid = userId ?? 0;
    const voteCountSub = "(SELECT COUNT(*) FROM resource_votes WHERE resource_type = 'exam' AND resource_id = exams.id)";
    
    const selectParams: any[] = [];
    let userVotedSub = '0';
    if (uid) {
      userVotedSub = "(SELECT 1 FROM resource_votes WHERE resource_type = 'exam' AND resource_id = exams.id AND user_id = ?)";
      selectParams.push(uid);
    }

    let query = `
      SELECT exams.*, users.name as uploaded_by_name, un.name as university_name,
        ${voteCountSub} as vote_count, ${userVotedSub} as user_voted
      FROM exams
      JOIN users ON exams.uploaded_by = users.id
      LEFT JOIN universities un ON exams.university_id = un.id
      WHERE exams.subject_id = ?
    `;
    const params: any[] = [subjectId];

    if (universityId) {
      query += ` AND exams.university_id = ?`;
      params.push(universityId);
    }

    if (!isSuperAdmin) {
      query += ` AND exams.status = 'approved'`;
    }

    query += ` ORDER BY exams.created_at DESC`;

    const examsList = db.prepare(query).all(...selectParams, ...params);

    let filteredExams = examsList;
    if (!canViewProContent(user?.tier)) {
      filteredExams = examsList.map((ex) => ({ ...ex, file_url: null, has_document: !!ex.file_url }));
    }
    res.json(filteredExams);
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
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });
    const u = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as any;
    if (!u || (u.tier !== 'pro' && u.tier !== 'admin' && u.tier !== 'super_admin')) {
      return res.status(403).json({ error: 'Solo plan Pro puede generar flashcards con IA' });
    }
    const subjectId = req.params.id;
    const subject = db.prepare('SELECT name, description FROM subjects WHERE id = ?').get(subjectId) as { name: string; description: string } | undefined;
    if (!subject) return res.status(404).json({ error: 'Materia no encontrada' });
    const keys = parseGeminiKeys();
    if (keys.length === 0) return res.status(503).json({ error: 'IA no configurada. Agregá GEMINI_API_KEY en tu archivo .env.' });
    const count = typeof req.body?.count === 'number' ? Math.min(20, Math.max(1, req.body.count)) : 5;
    try {
      const prompt = `Generá exactamente ${count} flashcards de estudio para la materia de derecho "${subject.name}". ${subject.description ? `Contexto: ${subject.description}` : ''}
Devuelve SOLO un JSON array de objetos con exactamente dos campos: "front" (pregunta o término) y "back" (respuesta). Sin explicaciones, solo el array JSON. Ejemplo: [{"front":"¿Qué es el amparo?","back":"Acción constitucional para proteger derechos."}]`;
      const response = await callGeminiWithRetry({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const text = (response.text ?? '').trim();
      let parsed: { front: string; back: string }[];
      try {
        parsed = JSON.parse(text);
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
  app.get('/api/briefs/filters', (req, res) => {
    try {
      const courts = db.prepare("SELECT DISTINCT court FROM case_briefs WHERE court IS NOT NULL AND court != '' ORDER BY court ASC").all() as { court: string }[];
      const years = db.prepare("SELECT DISTINCT year FROM case_briefs WHERE year IS NOT NULL ORDER BY year DESC").all() as { year: number }[];
      res.json({
        courts: courts.map(c => c.court),
        years: years.map(y => y.year)
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error al obtener filtros de fallos' });
    }
  });

  app.get('/api/briefs', (req, res) => {
    const { tribunal, year, tema, subject_id, page, limit } = req.query;
    const isPaginated = page !== undefined || limit !== undefined;

    let query = `
      SELECT case_briefs.*, GROUP_CONCAT(subjects.name) as subject_names, GROUP_CONCAT(subjects.id) as subject_ids
      FROM case_briefs
      LEFT JOIN case_brief_subjects ON case_briefs.id = case_brief_subjects.case_brief_id
      LEFT JOIN subjects ON case_brief_subjects.subject_id = subjects.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (tribunal && typeof tribunal === 'string' && tribunal.trim()) {
      conditions.push('case_briefs.court LIKE ?');
      params.push(`%${tribunal.trim()}%`);
    }
    if (year && !isNaN(Number(year))) {
      conditions.push('case_briefs.year = ?');
      params.push(Number(year));
    }
    if (tema && typeof tema === 'string' && tema.trim()) {
      conditions.push('case_briefs.keywords LIKE ?');
      params.push(`%${tema.trim()}%`);
    }
    if (subject_id && !isNaN(Number(subject_id))) {
      conditions.push('case_briefs.id IN (SELECT case_brief_id FROM case_brief_subjects WHERE subject_id = ?)');
      params.push(Number(subject_id));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' GROUP BY case_briefs.id';

    if (isPaginated) {
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 10;
      const offsetVal = (pageNum - 1) * limitNum;

      let countQuery = `
        SELECT COUNT(DISTINCT case_briefs.id) as count
        FROM case_briefs
        LEFT JOIN case_brief_subjects ON case_briefs.id = case_brief_subjects.case_brief_id
        LEFT JOIN subjects ON case_brief_subjects.subject_id = subjects.id
      `;
      if (conditions.length > 0) {
        countQuery += ' WHERE ' + conditions.join(' AND ');
      }

      try {
        const totalCountResult = db.prepare(countQuery).get(...params) as { count: number };
        const totalItems = totalCountResult?.count || 0;
        const totalPages = Math.ceil(totalItems / limitNum);

        const paginatedQuery = `${query} ORDER BY case_briefs.year DESC, case_briefs.id DESC LIMIT ? OFFSET ?`;
        const briefs = db.prepare(paginatedQuery).all(...params, limitNum, offsetVal);

        res.json({
          briefs,
          totalPages,
          currentPage: pageNum,
          totalItems
        });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al buscar fallos paginados' });
      }
    } else {
      try {
        query += ' ORDER BY case_briefs.year DESC, case_briefs.id DESC';
        const briefs = db.prepare(query).all(...params);
        res.json(briefs);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al buscar fallos' });
      }
    }
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

  // PDF Text Extraction Endpoint (fallback)
  app.post('/api/briefs/parse-pdf', upload.single('pdf'), async (req: Request & { file?: Express.Multer.File }, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión para procesar documentos.' });
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo PDF.' });
    try {
      const parser = new PDFParse({ data: req.file.buffer });
      const result = await parser.getText();
      await parser.destroy();
      const text = result.text?.trim();
      if (!text || text.length < 50) return res.status(422).json({ error: 'No se pudo extraer texto del PDF. Puede ser un PDF de imagen escaneada.' });
      res.json({ text, pages: result.totalPages || 0 });
    } catch (e) {
      console.error('PDF parse error:', e);
      res.status(500).json({ error: 'Error al procesar el PDF.' });
    }
  });

  // --- Build the AI prompt for case brief analysis ---
  const buildBriefAnalysisPrompt = (subjectsList: string) => `Eres un asistente jurídico especializado en análisis de documentos legales argentinos.
Recibís un documento legal y debés:
1. PRIMERO: Determinar si es una sentencia/fallo judicial, una norma/ley, o un documento doctrinal.
2. SEGUNDO: Extraer los campos estructurados correspondientes.

REGLAS ESTRICTAS:
- Sos un experto en análisis de jurisprudencia y normativa argentina. No inventes información que no esté en el documento.
- Usá la terminología exacta del documento; no parafrasees ni simplifiques conceptos técnico-jurídicos.
- Leé TODO el documento con atención, incluyendo encabezados, pies de página, sellos, firmas y anexos.
- Si el documento está escaneado o tiene mala calidad, hacé tu mejor esfuerzo para extraer la información.

## CAMPOS A EXTRAER (para sentencias/fallos):
- "document_type": siempre "sentencia" para fallos judiciales, "norma" para leyes/decretos, "otro" para otros documentos.
- "title": Carátula oficial del caso tal como figura en el encabezado (ej: "García, Juan c/ Estado Nacional s/ amparo"). Si no hay carátula, construila con Partes + Tipo de acción.
- "court": Instancia y sala exacta (ej: "Cámara Nacional de Apelaciones en lo Civil, Sala C" o "CSJN").
- "year": Año numérico de la fecha de la sentencia.
- "parties": Formato "Actor c/ Demandado".
- "facts": Conflicto que origina el caso: qué pasó, quiénes son las partes y qué se reclama. Máximo 5 oraciones con terminología del fallo.
- "issue": En una sola PREGUNTA la cuestión jurídica central que el tribunal debe resolver.
- "rule": En 2-3 oraciones la doctrina o regla de derecho que el tribunal establece o aplica.
- "reasoning": En 3-5 oraciones los argumentos centrales del tribunal. Usá los conceptos jurídicos del fallo.
- "holding": En 1-2 oraciones la decisión concreta (qué se ordenó, revocó, confirmó o declaró).
- "dissents": Votos en disidencia con sus fundamentos. Si no hay, exactamente: "No presenta disidencias".
- "relevance": En 1-2 oraciones por qué el fallo es jurídicamente significativo o crea precedente.
- "keywords": Entre 5 y 10 términos jurídicos clave del fallo, separados por coma.
- "timeline": Lista cronológica de hitos procesales con fecha. Máximo 10 ítems.
- "citations": Lista EXHAUSTIVA de TODAS las normas y fallos citados. Para normas: Ley/Decreto/CN, número y artículo. Para fallos: carátula y referencia "Fallos:" si figura. Incluir el considerando donde se cita.
- "suggested_subject": Sugerí UNA materia de esta lista que mejor se ajuste al tema del fallo: [${subjectsList}]. Si ninguna aplica, devolvé null.

Si algún campo no se puede determinar del texto, devolvé null para ese campo.

Respondé SOLO con JSON válido (sin markdown, sin explicaciones):
{
  "document_type": "sentencia",
  "title": "...",
  "court": "...",
  "year": 2024,
  "parties": "...",
  "facts": "...",
  "issue": "...",
  "rule": "...",
  "reasoning": "...",
  "holding": "...",
  "dissents": "...",
  "relevance": "...",
  "keywords": "...",
  "suggested_subject": "...",
  "timeline": [{ "date": "...", "description": "..." }],
  "citations": [{ "norm_name": "...", "considerando_ref": "..." }]
}`;

  const prepareGeminiFileContent = async (
    file: Express.Multer.File,
    mimeType: string,
    sizeInMb: number,
    promptText: string
  ): Promise<any[]> => {
    // If the file is small, send it inline (faster, no API overhead)
    if (sizeInMb <= 1.5) {
      return [
        { inlineData: { mimeType, data: file.buffer.toString('base64') } },
        { text: promptText }
      ];
    }

    // For larger files, upload via File API using a temp file
    let tempFilePath = '';
    try {
      console.log(`[Upload] Usando File API para archivo grande (${sizeInMb.toFixed(1)}MB)...`);
      const sanitizedName = (file.originalname || 'document').replace(/[^a-zA-Z0-9.-]/g, '_');
      tempFilePath = path.join(os.tmpdir(), `lexar-upload-${Date.now()}-${sanitizedName}`);
      await fs.promises.writeFile(tempFilePath, file.buffer);

      const ai = getGeminiClient();
      const uploadedFile = await ai.files.upload({
        file: tempFilePath,
        config: { mimeType },
      });

      return [
        { fileData: { fileUri: uploadedFile.uri, mimeType } },
        { text: promptText }
      ];
    } catch (err) {
      console.error('[Upload] File API falló, cayendo a inlineData:', err);
      return [
        { inlineData: { mimeType, data: file.buffer.toString('base64') } },
        { text: promptText }
      ];
    } finally {
      if (tempFilePath) {
        try {
          await fs.promises.unlink(tempFilePath);
        } catch (e) {}
      }
    }
  };

  // --- Unified AI Document Analysis Endpoint ---
  // Sends PDF/images DIRECTLY to Gemini as inlineData for much better extraction
  app.post('/api/documents/ai-analyze', upload.single('file'), async (req: Request & { file?: Express.Multer.File }, res) => {
    const startTime = Date.now();
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión para procesar documentos con IA.' });
    const u = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as any;
    if (!u || (u.tier !== 'pro' && u.tier !== 'admin' && u.tier !== 'super_admin')) {
      return res.status(403).json({ error: 'Solo plan Pro puede analizar documentos con IA' });
    }
    const keys = parseGeminiKeys();
    if (keys.length === 0) return res.status(503).json({ error: 'IA no configurada. Agregá GEMINI_API_KEY en tu archivo .env.' });

    const textInput = req.body?.text;
    const file = req.file;

    if (!file && (!textInput || typeof textInput !== 'string' || !textInput.trim())) {
      return res.status(400).json({ error: 'Enviá un archivo o texto para analizar.' });
    }

    try {

      // Get subjects list for auto-suggestion
      const allSubjects = db.prepare('SELECT name FROM subjects').all() as { name: string }[];
      const subjectsList = allSubjects.map(s => s.name).join(', ');
      const systemPrompt = buildBriefAnalysisPrompt(subjectsList);

      let contentParts: any[] = [];
      let extractedText = '';

      if (file) {
        const mimeType = file.mimetype;
        const sizeInMb = file.size / (1024 * 1024);
        console.log(`[Upload] Recibido: ${mimeType} ${sizeInMb.toFixed(1)}MB | Usuario: ${userId}`);

        const supportedMimes = [
          'application/pdf',
          'image/jpeg', 'image/png', 'image/webp', 'image/gif',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword'
        ];

        if (!supportedMimes.includes(mimeType)) {
          return res.status(400).json({ error: `Formato no soportado: ${mimeType}. Usá PDF, DOCX, DOC, JPG o PNG.` });
        }

        if (mimeType === 'application/pdf') {
          // --- PDF Processing ---
          try {
            const parser = new PDFParse({ data: file.buffer });
            const pdfResult = await parser.getText();
            await parser.destroy();
            extractedText = cleanPdfText(pdfResult.text?.trim() || '');
          } catch (e) {
            console.error('[Upload] PDF text extraction falló:', e);
            extractedText = '';
          }

          // Heuristic to check text quality
          let isTextGood = false;
          if (extractedText && extractedText.length > 1000) {
            const alphanumericCount = (extractedText.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]/g) || []).length;
            const alphanumericRatio = alphanumericCount / extractedText.length;
            isTextGood = alphanumericRatio > 0.85;
          }

          if (isTextGood) {
            console.log(`[Upload] PDF parseado: ${extractedText.length.toLocaleString()} chars | Calidad: buena`);
            let safeText = extractedText;
            if (safeText.length > 80000) {
              safeText = safeText.substring(0, 80000);
              console.log('[Upload] Texto truncado a 80,000 chars');
            }
            contentParts = [
              { text: systemPrompt + '\n\nTEXTO DEL DOCUMENTO A ANALIZAR:\n---\n' + safeText + '\n---' }
            ];
          } else {
            console.log(`[Upload] PDF escaneado (texto pobre: ${extractedText.length} chars) | Procesando...`);
            if (sizeInMb > 15) {
              return res.status(400).json({ error: 'El archivo PDF es escaneado (sin texto copiable) y demasiado grande para procesar (>15MB). Por favor, subí un documento con texto copiable o más corto.' });
            }
            contentParts = await prepareGeminiFileContent(
              file,
              mimeType,
              sizeInMb,
              systemPrompt + '\n\nAnalizá el documento adjunto y extraé la información estructurada.'
            );
          }
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
          // --- DOCX/DOC Processing with mammoth ---
          try {
            console.log('[Upload] Extrayendo texto de Word con mammoth...');
            const mammothResult = await mammoth.extractRawText({ buffer: file.buffer });
            extractedText = mammothResult.value?.trim() || '';
            console.log(`[Upload] Word parseado: ${extractedText.length.toLocaleString()} chars`);
          } catch (e) {
            console.error('[Upload] mammoth extraction falló:', e);
            extractedText = '';
          }

          if (extractedText && extractedText.length > 500) {
            // Buen texto extraído → enviar como texto puro (más barato y confiable)
            let safeText = extractedText;
            if (safeText.length > 80000) {
              safeText = safeText.substring(0, 80000);
              console.log('[Upload] Texto truncado a 80,000 chars');
            }
            contentParts = [
              { text: systemPrompt + '\n\nTEXTO DEL DOCUMENTO A ANALIZAR:\n---\n' + safeText + '\n---' }
            ];
          } else {
            // Poco texto → enviar como binario a Gemini (fallback)
            console.log('[Upload] Poco texto extraído de Word, enviando como archivo/imagen');
            contentParts = await prepareGeminiFileContent(
              file,
              mimeType,
              sizeInMb,
              systemPrompt + '\n\nAnalizá el documento adjunto y extraé la información estructurada.'
            );
          }
        } else {
          // --- Image Processing ---
          console.log(`[Upload] Imagen recibida: ${mimeType}`);
          contentParts = await prepareGeminiFileContent(
            file,
            mimeType,
            sizeInMb,
            systemPrompt + '\n\nAnalizá el documento adjunto y extraé la información estructurada.'
          );
        }
      } else {
        // Text input mode
        extractedText = textInput!.trim();
        console.log(`[Upload] Texto manual: ${extractedText.length.toLocaleString()} chars | Usuario: ${userId}`);
        let safeText = extractedText;
        if (safeText.length > 80000) {
          safeText = safeText.substring(0, 80000);
        }
        contentParts = [
          { text: systemPrompt + '\n\nTEXTO DEL DOCUMENTO:\n---\n' + safeText + '\n---' }
        ];
      }

      console.log('[Upload] Enviando a Gemini (PAID)...');
      const response = await callGeminiWithRetry({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: contentParts }],
        config: { responseMimeType: 'application/json' }
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const resultText = (response.text ?? '').trim();
      let parsed;
      try {
        parsed = JSON.parse(resultText);
        console.log(`[Upload] Gemini respondió en ${elapsed}s | JSON válido ✓`);
      } catch (err) {
        console.error(`[Upload] JSON parse falló después de ${elapsed}s:`, resultText.substring(0, 200));
        return res.status(502).json({ error: 'La IA no devolvió una respuesta válida. Intentá de nuevo.' });
      }

      // Attach the extracted raw text for full_text storage
      parsed._extractedText = extractedText;

      res.json(parsed);
    } catch (e: any) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`[Upload] Error después de ${elapsed}s:`, e?.message || e);
      if (e?.message?.includes('429') || e?.message?.includes('quota') || e?.message?.includes('RESOURCE_EXHAUSTED')) {
        return res.status(429).json({ error: 'Se superó la cuota de la IA. Esperá unos minutos e intentá de nuevo.' });
      }
      res.status(500).json({ error: `Error de Google IA: ${e?.message || e}` });
    }
  });

  // --- Legacy AI Parse Endpoint (text-only, kept for backwards compatibility) ---
  app.post('/api/briefs/ai-parse', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión para usar esta herramienta.' });
    const u = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as any;
    if (!u || (u.tier !== 'pro' && u.tier !== 'admin' && u.tier !== 'super_admin')) {
      return res.status(403).json({ error: 'Solo plan Pro puede analizar documentos con IA' });
    }
    const keys = parseGeminiKeys();
    if (keys.length === 0) return res.status(503).json({ error: 'IA no configurada' });
    const { text } = req.body;
    if (!text || typeof text !== 'string') return res.status(400).json({ error: 'Falta texto' });

    try {
      console.log(`[Upload Legacy] Texto: ${text.length.toLocaleString()} chars | Usuario: ${userId}`);
      const allSubjects = db.prepare('SELECT name FROM subjects').all() as { name: string }[];
      const subjectsList = allSubjects.map(s => s.name).join(', ');
      const systemPrompt = buildBriefAnalysisPrompt(subjectsList);

      const response = await callGeminiWithRetry({
        model: GEMINI_MODEL,
        contents: systemPrompt + '\n\nTEXTO DEL DOCUMENTO:\n---\n' + text.substring(0, 80000) + '\n---',
        config: { responseMimeType: 'application/json' }
      });
      const resultText = (response.text ?? '').trim();
      let parsed;
      try {
        parsed = JSON.parse(resultText);
      } catch (err) {
        console.error('[Upload Legacy] JSON parse falló:', err);
        return res.status(502).json({ error: 'La IA no devolvió JSON válido. Intentá de nuevo.' });
      }
      res.json(parsed);
    } catch (e: any) {
      console.error('[Upload Legacy] Error:', e?.message || e);
      if (e?.message?.includes('429') || e?.message?.includes('quota') || e?.message?.includes('RESOURCE_EXHAUSTED')) {
        return res.status(429).json({ error: 'Se superó la cuota de la IA. Esperá unos minutos.' });
      }
      res.status(500).json({ error: 'Error al procesar con IA' });
    }
  });

  // --- Norma AI Parse Endpoint ---
  app.post('/api/normas/ai-parse', upload.single('file'), async (req: Request & { file?: Express.Multer.File }, res) => {
    const startTime = Date.now();
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión para usar esta herramienta.' });
    const u = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as any;
    if (!u || (u.tier !== 'pro' && u.tier !== 'admin' && u.tier !== 'super_admin')) {
      return res.status(403).json({ error: 'Solo plan Pro puede analizar documentos con IA' });
    }
    const keys = parseGeminiKeys();
    if (keys.length === 0) return res.status(503).json({ error: 'IA no configurada. Agregá GEMINI_API_KEY en tu archivo .env.' });

    const textInput = req.body?.text;
    const file = req.file;

    if (!file && (!textInput || typeof textInput !== 'string' || !textInput.trim())) {
      return res.status(400).json({ error: 'Enviá un archivo o texto para analizar.' });
    }

    try {

      const normaPrompt = `Eres un experto en legislación argentina. Recibís un documento legal (ley, decreto, resolución, acordada o constitución) y debés extraer los campos estructurados.

REGLAS:
- Extraé la información exacta del documento, sin inventar.
- Para "tipo" identificá si es Ley, Decreto, Resolución, Acordada o Constitución.
- Para "numero" extraé solo el número de la norma (ej: "27541", "70/2023").
- Para "anio" extraé el año de sanción o publicación.
- Para "titulo" generá un título descriptivo si no hay uno explícito (ej: "Ley de Solidaridad Social y Reactivación Productiva").
- Para "organismo" indicá quién emitió la norma (ej: "Congreso de la Nación", "Poder Ejecutivo Nacional", "BCRA").
- Para "fecha_publicacion" extraé la fecha de publicación en formato YYYY-MM-DD si está disponible.
- Para "texto_resumido" generá un resumen de 2-3 oraciones del contenido principal de la norma.
- Para "keywords" listá 5-8 términos clave separados por coma.

Respondé SOLO con JSON válido:
{
  "tipo": "Ley",
  "numero": "27541",
  "anio": 2019,
  "titulo": "Título descriptivo de la norma",
  "organismo": "Organismo emisor",
  "fecha_publicacion": "2019-12-23",
  "texto_resumido": "Resumen breve del contenido",
  "keywords": "término1, término2, término3"
}`;

      let contentParts: any[] = [];
      let extractedText = '';

      if (file) {
        const mimeType = file.mimetype;
        const sizeInMb = file.size / (1024 * 1024);
        console.log(`[Upload Norma] Recibido: ${mimeType} ${sizeInMb.toFixed(1)}MB | Usuario: ${userId}`);

        if (mimeType === 'application/pdf') {
          // --- PDF ---
          try {
            const parser = new PDFParse({ data: file.buffer });
            const pdfResult = await parser.getText();
            await parser.destroy();
            extractedText = pdfResult.text?.trim() || '';
          } catch (e) {
            console.error('[Upload Norma] PDF text extraction falló:', e);
            extractedText = '';
          }

          if (extractedText && extractedText.length > 1000) {
            console.log(`[Upload Norma] PDF parseado: ${extractedText.length.toLocaleString()} chars`);
            let safeText = extractedText;
            if (safeText.length > 80000) safeText = safeText.substring(0, 80000);
            contentParts = [
              { text: normaPrompt + '\n\nTEXTO DE LA NORMA A ANALIZAR:\n---\n' + safeText + '\n---' }
            ];
          } else {
            if (sizeInMb > 15) {
              return res.status(400).json({ error: 'El archivo PDF es escaneado y demasiado grande (>15MB). Por favor, subí un documento con texto copiable o más corto.' });
            }
            console.log('[Upload Norma] PDF escaneado, enviando como imagen');
            contentParts = [
              { inlineData: { mimeType, data: file.buffer.toString('base64') } },
              { text: normaPrompt + '\n\nAnalizá el documento adjunto y extraé la información.' }
            ];
          }
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
          // --- DOCX/DOC with mammoth ---
          try {
            console.log('[Upload Norma] Extrayendo texto de Word con mammoth...');
            const mammothResult = await mammoth.extractRawText({ buffer: file.buffer });
            extractedText = mammothResult.value?.trim() || '';
            console.log(`[Upload Norma] Word parseado: ${extractedText.length.toLocaleString()} chars`);
          } catch (e) {
            console.error('[Upload Norma] mammoth extraction falló:', e);
            extractedText = '';
          }

          if (extractedText && extractedText.length > 500) {
            let safeText = extractedText;
            if (safeText.length > 80000) safeText = safeText.substring(0, 80000);
            contentParts = [
              { text: normaPrompt + '\n\nTEXTO DE LA NORMA A ANALIZAR:\n---\n' + safeText + '\n---' }
            ];
          } else {
            console.log('[Upload Norma] Poco texto de Word, enviando como inlineData');
            contentParts = [
              { inlineData: { mimeType, data: file.buffer.toString('base64') } },
              { text: normaPrompt + '\n\nAnalizá el documento adjunto y extraé la información.' }
            ];
          }
        } else {
          // --- Images ---
          console.log(`[Upload Norma] Imagen: ${mimeType}`);
          contentParts = [
            { inlineData: { mimeType, data: file.buffer.toString('base64') } },
            { text: normaPrompt + '\n\nAnalizá el documento adjunto y extraé la información.' }
          ];
        }
      } else {
        extractedText = textInput!.trim();
        console.log(`[Upload Norma] Texto manual: ${extractedText.length.toLocaleString()} chars`);
        contentParts = [
          { text: normaPrompt + '\n\nTEXTO DE LA NORMA:\n---\n' + extractedText + '\n---' }
        ];
      }

      console.log('[Upload Norma] Enviando a Gemini (PAID)...');
      const response = await callGeminiWithRetry({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: contentParts }],
        config: { responseMimeType: 'application/json' }
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const resultText = (response.text ?? '').trim();
      let parsed;
      try {
        parsed = JSON.parse(resultText);
        console.log(`[Upload Norma] Gemini respondió en ${elapsed}s | JSON válido ✓`);
      } catch (err) {
        console.error(`[Upload Norma] JSON parse falló después de ${elapsed}s`);
        return res.status(502).json({ error: 'La IA no devolvió una respuesta válida.' });
      }

      parsed._extractedText = extractedText;
      res.json(parsed);
    } catch (e: any) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`[Upload Norma] Error después de ${elapsed}s:`, e?.message || e);
      if (e?.message?.includes('429') || e?.message?.includes('quota') || e?.message?.includes('RESOURCE_EXHAUSTED')) {
        return res.status(429).json({ error: 'Cuota de IA excedida. Esperá unos minutos.' });
      }
      res.status(500).json({ error: 'Error al analizar la norma con IA.' });
    }
  });

  // Create new Case Brief
  app.post('/api/briefs', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { title, facts, issue, rule, reasoning, holding, dissents, relevance, keywords, subject_id, court, year, parties, timeline, citations, full_text } = req.body;

    if (!title || !subject_id) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
      const result = db.prepare(`
        INSERT INTO case_briefs (title, facts, issue, rule, reasoning, holding, dissents, relevance, keywords, is_demo, court, year, parties, timeline, citations, full_text) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
      `).run(title, facts, issue, rule, reasoning, holding, dissents || null, relevance, keywords, court || null, year ? Number(year) : null, parties || null, timeline ? JSON.stringify(timeline) : null, citations ? JSON.stringify(citations) : null, full_text || null);

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
    if (!requireSuperAdmin(req, res)) return;
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

  // Submit article
  app.post('/api/articles', upload.single('pdf'), async (req: Request & { file?: Express.Multer.File }, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });
    const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as any;
    if (!user || !['basic', 'pro', 'admin', 'super_admin'].includes(user.tier)) {
      return res.status(403).json({ error: 'Esta función requiere plan Basic o superior' });
    }
    const { title, driveUrl } = req.body;
    let { content } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    if (driveUrl) {
      try {
        const driveRegex = /(?:docs|drive|sheets)\.google\.com\/(?:document|file|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/;
        const match = driveUrl.match(driveRegex);
        if (!match) {
          return res.status(400).json({ error: 'URL de Google Drive inválida.' });
        }
        const docId = match[1];
        const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
        const driveRes = await fetch(exportUrl);
        if (!driveRes.ok) {
          return res.status(422).json({ error: 'No se pudo acceder al documento de Google Drive. Asegúrate de que tenga permisos de lectura pública (Cualquiera con el enlace).' });
        }
        content = await driveRes.text();
      } catch (err) {
        console.error('[Google Drive Parse] failed:', err);
        return res.status(500).json({ error: 'Error al importar el documento de Google Drive.' });
      }
    }

    if (req.file) {
      try {
        const parser = new PDFParse({ data: req.file.buffer });
        const pdfResult = await parser.getText();
        await parser.destroy();
        content = pdfResult.text?.trim() || '';
        if (!content || content.length < 10) {
          return res.status(422).json({ error: 'No se pudo extraer texto del PDF o es demasiado corto.' });
        }
      } catch (pdfErr) {
        console.error('[PDF Parse Article] failed:', pdfErr);
        return res.status(500).json({ error: 'Error al procesar el archivo PDF.' });
      }
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'El contenido es requerido.' });
    }

    try {
      const now = new Date().toISOString();
      const result = db.prepare(`
        INSERT INTO articles (title, content, author_id, status, date)
        VALUES (?, ?, ?, 'pending', ?)
      `).run(title.trim(), content.trim(), userId, now);
      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
      console.error('Error inserting article:', e);
      res.status(500).json({ error: 'Error al enviar el artículo' });
    }
  });

  // Get pending articles (super_admin only)
  app.get('/api/articles/pending', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const pending = db.prepare(`
      SELECT articles.*, users.name as author_name, users.profile_role as author_role
      FROM articles
      JOIN users ON articles.author_id = users.id
      WHERE articles.status = 'pending'
      ORDER BY date DESC
    `).all();
    res.json(pending);
  });

  // Approve article (super_admin only)
  app.patch('/api/articles/:id/approve', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    try {
      const article = db.prepare('SELECT author_id FROM articles WHERE id = ?').get(req.params.id) as any;
      if (!article) return res.status(404).json({ error: 'Artículo no encontrado' });
      db.prepare("UPDATE articles SET status = 'published' WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al aprobar artículo' });
    }
  });

  // Reject/Delete article (super_admin only)
  app.patch('/api/articles/:id/reject', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    try {
      db.prepare("UPDATE articles SET status = 'rejected' WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al rechazar artículo' });
    }
  });

  // Universities
  app.get('/api/universities', (req, res) => {
    const unis = db.prepare('SELECT * FROM universities ORDER BY type ASC, name ASC').all();
    res.json(unis);
  });

  app.get('/api/universities/:id', (req, res) => {
    const uni = db.prepare('SELECT * FROM universities WHERE id = ?').get(req.params.id);
    if (!uni) return res.status(404).json({ error: 'Universidad no encontrada' });
    res.json(uni);
  });

  // Edit university (super_admin only)
  app.patch('/api/universities/:id', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const { name, description, city, province, type, program_url } = req.body;
    const uni = db.prepare('SELECT id FROM universities WHERE id = ?').get(req.params.id);
    if (!uni) return res.status(404).json({ error: 'Universidad no encontrada' });
    db.prepare(`
      UPDATE universities SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        city = COALESCE(?, city),
        province = COALESCE(?, province),
        type = COALESCE(?, type),
        program_url = COALESCE(?, program_url)
      WHERE id = ?
    `).run(name || null, description || null, city || null, province || null, type || null, program_url || null, req.params.id);
    const updated = db.prepare('SELECT * FROM universities WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Create university (super_admin only)
  app.post('/api/universities', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    const { name, description, city, province, type, program_url } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Nombre y tipo obligatorios' });
    try {
      const result = db.prepare(`
        INSERT INTO universities (name, description, city, province, type, program_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(name.trim(), description || null, city || null, province || null, type, program_url || null);
      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
      console.error('Error creating university:', e);
      res.status(500).json({ error: 'Error al crear universidad' });
    }
  });

  // Delete university (super_admin only)
  app.delete('/api/universities/:id', (req, res) => {
    const auth = requireSuperAdmin(req, res);
    if (!auth) return;
    try {
      db.prepare('DELETE FROM universities WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      console.error('Error deleting university:', e);
      res.status(500).json({ error: 'Error al eliminar universidad' });
    }
  });

  // Get study plan for a university
  app.get('/api/universities/:id/study-plan', (req, res) => {
    const plan = db.prepare(`
      SELECT study_plans.*, subjects.name as subject_name, subjects.icon as subject_icon
      FROM study_plans
      JOIN subjects ON study_plans.subject_id = subjects.id
      WHERE study_plans.university_id = ?
      ORDER BY year ASC, semester ASC, subject_name ASC
    `).all(req.params.id);
    res.json(plan);
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
    const userId = getUserId(req);
    if (userId) {
      const latinisms = db.prepare(`
        SELECT l.*, CASE WHEN sl.user_id IS NOT NULL THEN 1 ELSE 0 END as saved
        FROM latinisms l
        LEFT JOIN saved_latinisms sl ON l.id = sl.latinism_id AND sl.user_id = ?
      `).all(userId);
      res.json(latinisms);
    } else {
      const latinisms = db.prepare('SELECT *, 0 as saved FROM latinisms').all();
      res.json(latinisms);
    }
  });

  app.post('/api/latinisms/:id/save', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });
    const latinismId = req.params.id;
    const now = new Date().toISOString();
    try {
      db.prepare('INSERT OR IGNORE INTO saved_latinisms (user_id, latinism_id, created_at) VALUES (?, ?, ?)').run(userId, latinismId, now);
      res.json({ success: true, saved: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al guardar' });
    }
  });

  app.delete('/api/latinisms/:id/save', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });
    db.prepare('DELETE FROM saved_latinisms WHERE user_id = ? AND latinism_id = ?').run(userId, req.params.id);
    res.json({ success: true, saved: false });
  });

  // News
  app.get('/api/news', (req, res) => {
    const q = req.query.q;
    const tag = req.query.tag;
    let query = 'SELECT * FROM news';
    const conditions: string[] = [];
    const params: any[] = [];
    if (q && typeof q === 'string') {
      conditions.push('(title LIKE ? OR summary LIKE ?)');
      const search = `%${q}%`;
      params.push(search, search);
    }
    if (tag && typeof tag === 'string') {
      conditions.push('tags LIKE ?');
      params.push(`%${tag}%`);
    }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY date DESC';
    const news = db.prepare(query).all(...params);
    res.json(news);
  });

  // Holidays
  app.get('/api/holidays', (req, res) => {
    const holidays = db.prepare('SELECT date, description FROM holiday_calendar ORDER BY date ASC').all();
    res.json(holidays);
  });

  // Normativa Relations (real data from DB)
  app.get('/api/normas/:id/relaciones', (req, res) => {
    const normaId = req.params.id;
    // Get relations where this norma is origin or destination
    const asOrigin = db.prepare(`
      SELECT rn.*, n.titulo, n.tipo, n.numero, n.anio
      FROM relaciones_normativas rn
      JOIN normas n ON rn.destino_id = n.id
      WHERE rn.origen_id = ?
    `).all(normaId);
    const asDestino = db.prepare(`
      SELECT rn.*, n.titulo, n.tipo, n.numero, n.anio
      FROM relaciones_normativas rn
      JOIN normas n ON rn.origen_id = n.id
      WHERE rn.destino_id = ?
    `).all(normaId);
    res.json({ modifica: asOrigin, modificada_por: asDestino });
  });

  // Brief relations scan for a law
  app.get('/api/normas/:id/brief-relations', (req, res) => {
    const normaId = req.params.id;
    const norma = db.prepare('SELECT tipo, numero, titulo FROM normas WHERE id = ?').get(normaId) as { tipo: string; numero: string; titulo: string } | undefined;
    if (!norma) return res.status(404).json({ error: 'Norma no encontrada' });

    try {
      const briefs = db.prepare('SELECT id, title, citations, holding, relevance FROM case_briefs').all() as any[];
      const relations: any[] = [];

      const rawNum = norma.numero ? String(norma.numero).replace(/\./g, '') : '';
      const formattedNum = norma.numero ? String(norma.numero) : '';

      if (rawNum || formattedNum) {
        briefs.forEach(brief => {
          const textToSearch = `${brief.title} ${brief.citations || ''} ${brief.holding || ''} ${brief.relevance || ''}`.toLowerCase();
          const citesLaw = (rawNum && textToSearch.includes(rawNum.toLowerCase())) || 
                            (formattedNum && textToSearch.includes(formattedNum.toLowerCase())) ||
                            (norma.titulo && textToSearch.includes(norma.titulo.toLowerCase()));

          if (citesLaw) {
            let articleNum = 'General';
            const citationsField = brief.citations || '';
            const artMatch = citationsField.match(/Art(?:\.|ículo)\s*(\d+)/i);
            if (artMatch) {
              articleNum = `Art. ${artMatch[1]}`;
            }

            relations.push({
              brief_id: brief.id,
              brief_title: brief.title,
              article_number: articleNum,
              context: brief.relevance || 'Cita de doctrina/jurisprudencia'
            });
          }
        });
      }

      res.json(relations);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error al buscar relaciones con fallos' });
    }
  });

  // Forum Topics
  app.get('/api/forum/topics', (req, res) => {
    const category = req.query.category;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = (page - 1) * limit;

    let baseQuery = `
      FROM forum_topics ft
      JOIN users u ON ft.author_id = u.id
      LEFT JOIN subjects s ON ft.subject_id = s.id
    `;
    const params: any[] = [];
    let whereClause = '';
    if (category && typeof category === 'string' && category !== 'all') {
      whereClause = ' WHERE ft.category = ?';
      params.push(category);
    }

    try {
      const countQuery = `SELECT COUNT(*) as count ${baseQuery} ${whereClause}`;
      const totalCountResult = db.prepare(countQuery).get(...params) as { count: number };
      const totalItems = totalCountResult?.count || 0;
      const totalPages = Math.ceil(totalItems / limit);

      let selectQuery = `
        SELECT ft.*, u.name as author_name, u.profile_role as author_role, s.name as subject_name,
          (SELECT COUNT(*) FROM forum_replies WHERE topic_id = ft.id) as reply_count
        ${baseQuery}
        ${whereClause}
        ORDER BY ft.pinned DESC, ft.updated_at DESC
        LIMIT ? OFFSET ?
      `;
      const selectParams = [...params, limit, offset];
      const topics = db.prepare(selectQuery).all(...selectParams);

      res.json({
        topics,
        totalPages,
        currentPage: page,
        totalItems
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error al buscar temas del foro' });
    }
  });

  app.get('/api/forum/topics/:id', (req, res) => {
    const topic = db.prepare(`
      SELECT ft.*, u.name as author_name, u.profile_role as author_role, s.name as subject_name
      FROM forum_topics ft
      JOIN users u ON ft.author_id = u.id
      LEFT JOIN subjects s ON ft.subject_id = s.id
      WHERE ft.id = ?
    `).get(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Tema no encontrado' });
    // Increment views
    db.prepare('UPDATE forum_topics SET views = views + 1 WHERE id = ?').run(req.params.id);
    res.json(topic);
  });

  app.post('/api/forum/topics', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });
    const { title, content, subject_id, category } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'Título obligatorio' });
    const now = new Date().toISOString();
    try {
      const result = db.prepare(
        'INSERT INTO forum_topics (title, content, author_id, subject_id, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(title.trim(), content?.trim() || null, userId, subject_id || null, category || 'general', now, now);
      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
      console.error('Error creating topic:', e);
      res.status(500).json({ error: 'Error al crear el tema' });
    }
  });

  // Forum Replies
  app.get('/api/forum/topics/:id/replies', (req, res) => {
    const replies = db.prepare(`
      SELECT fr.*, u.name as author_name, u.profile_role as author_role
      FROM forum_replies fr
      JOIN users u ON fr.author_id = u.id
      WHERE fr.topic_id = ?
      ORDER BY fr.created_at ASC
    `).all(req.params.id);
    res.json(replies);
  });

  app.post('/api/forum/topics/:id/replies', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });
    const topicId = req.params.id;
    const { content } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: 'Contenido obligatorio' });
    const topic = db.prepare('SELECT id FROM forum_topics WHERE id = ?').get(topicId);
    if (!topic) return res.status(404).json({ error: 'Tema no encontrado' });
    const now = new Date().toISOString();
    try {
      const result = db.prepare(
        'INSERT INTO forum_replies (topic_id, author_id, content, created_at) VALUES (?, ?, ?, ?)'
      ).run(topicId, userId, content.trim(), now);
      db.prepare('UPDATE forum_topics SET updated_at = ? WHERE id = ?').run(now, topicId);
      const user = db.prepare('SELECT name, profile_role FROM users WHERE id = ?').get(userId) as any;
      res.status(201).json({ success: true, id: result.lastInsertRowid, author_name: user?.name, author_role: user?.profile_role });
    } catch (e) {
      console.error('Error creating reply:', e);
      res.status(500).json({ error: 'Error al responder' });
    }
  });

  // Edit forum topic
  app.put('/api/forum/topics/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    const { title, content } = req.body;
    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ error: 'Título y contenido obligatorios' });
    }

    try {
      const topic = db.prepare('SELECT author_id FROM forum_topics WHERE id = ?').get(req.params.id) as { author_id: number } | undefined;
      if (!topic) return res.status(404).json({ error: 'Tema no encontrado' });

      if (topic.author_id !== userId) {
        return res.status(403).json({ error: 'No tienes permisos para editar este tema' });
      }

      const now = new Date().toISOString();
      db.prepare('UPDATE forum_topics SET title = ?, content = ?, updated_at = ? WHERE id = ?').run(
        title.trim(), content.trim(), now, req.params.id
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al actualizar el tema' });
    }
  });

  // Delete forum topic
  app.delete('/api/forum/topics/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    try {
      const topic = db.prepare('SELECT author_id FROM forum_topics WHERE id = ?').get(req.params.id) as { author_id: number } | undefined;
      if (!topic) return res.status(404).json({ error: 'Tema no encontrado' });

      const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
      const isSuperAdmin = user && user.tier === 'super_admin';

      if (topic.author_id !== userId && !isSuperAdmin) {
        return res.status(403).json({ error: 'No tienes permisos para eliminar este tema' });
      }

      db.prepare('DELETE FROM forum_replies WHERE topic_id = ?').run(req.params.id);
      db.prepare('DELETE FROM forum_topics WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al eliminar el tema' });
    }
  });

  // Edit forum reply
  app.put('/api/forum/replies/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Contenido obligatorio' });
    }

    try {
      const reply = db.prepare('SELECT author_id, topic_id FROM forum_replies WHERE id = ?').get(req.params.id) as { author_id: number, topic_id: number } | undefined;
      if (!reply) return res.status(404).json({ error: 'Respuesta no encontrada' });

      if (reply.author_id !== userId) {
        return res.status(403).json({ error: 'No tienes permisos para editar esta respuesta' });
      }

      db.prepare('UPDATE forum_replies SET content = ? WHERE id = ?').run(content.trim(), req.params.id);
      const now = new Date().toISOString();
      db.prepare('UPDATE forum_topics SET updated_at = ? WHERE id = ?').run(now, reply.topic_id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al actualizar la respuesta' });
    }
  });

  // Delete forum reply
  app.delete('/api/forum/replies/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    try {
      const reply = db.prepare('SELECT author_id, topic_id FROM forum_replies WHERE id = ?').get(req.params.id) as { author_id: number, topic_id: number } | undefined;
      if (!reply) return res.status(404).json({ error: 'Respuesta no encontrada' });

      const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
      const isSuperAdmin = user && user.tier === 'super_admin';

      if (reply.author_id !== userId && !isSuperAdmin) {
        return res.status(403).json({ error: 'No tienes permisos para eliminar esta respuesta' });
      }

      db.prepare('DELETE FROM forum_replies WHERE id = ?').run(req.params.id);
      const now = new Date().toISOString();
      db.prepare('UPDATE forum_topics SET updated_at = ? WHERE id = ?').run(now, reply.topic_id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al eliminar la respuesta' });
    }
  });

  // Comments (for universities, notes, etc.)
  app.get('/api/comments/:resourceType/:resourceId', (req, res) => {
    const { resourceType, resourceId } = req.params;
    const comments = db.prepare(`
      SELECT c.*, u.name as author_name, u.profile_role as author_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.resource_type = ? AND c.resource_id = ?
      ORDER BY c.created_at DESC
    `).all(resourceType, resourceId);
    res.json(comments);
  });

  app.post('/api/comments/:resourceType/:resourceId', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });
    const { resourceType, resourceId } = req.params;
    const { content } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: 'Contenido obligatorio' });
    const now = new Date().toISOString();
    try {
      const result = db.prepare(
        'INSERT INTO comments (user_id, resource_type, resource_id, content, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(userId, resourceType, Number(resourceId), content.trim(), now);
      const user = db.prepare('SELECT name, profile_role FROM users WHERE id = ?').get(userId) as any;
      res.status(201).json({ success: true, id: result.lastInsertRowid, author_name: user?.name, author_role: user?.profile_role });
    } catch (e) {
      res.status(500).json({ error: 'Error al comentar' });
    }
  });

  app.delete('/api/comments/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });

    try {
      const comment = db.prepare('SELECT user_id FROM comments WHERE id = ?').get(req.params.id) as { user_id: number } | undefined;
      if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });

      const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
      const isSuperAdmin = user && user.tier === 'super_admin';

      if (comment.user_id !== userId && !isSuperAdmin) {
        return res.status(403).json({ error: 'No tienes permisos para borrar este comentario' });
      }

      db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al borrar el comentario' });
    }
  });

  app.put('/api/comments/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });
    const { content } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Contenido obligatorio' });
    }

    try {
      const comment = db.prepare('SELECT user_id FROM comments WHERE id = ?').get(req.params.id) as { user_id: number } | undefined;
      if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });

      if (comment.user_id !== userId) {
        return res.status(403).json({ error: 'No tienes permisos para editar este comentario' });
      }

      db.prepare('UPDATE comments SET content = ? WHERE id = ?').run(content.trim(), req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Error al editar el comentario' });
    }
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
    const jobs = db.prepare('SELECT id, title, firm AS company, location, type, description, date, assistance, author_id FROM jobs ORDER BY date DESC').all();
    res.json(jobs);
  });

  // Apply to a job (solo Pro y super_admin)
  app.post('/api/jobs/:id/apply', upload.single('cv'), (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });
    const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as any;
    if (!user || (user.tier !== 'pro' && user.tier !== 'super_admin')) {
      return res.status(403).json({ error: 'La Bolsa de Trabajo es exclusiva del plan Pro' });
    }
    const jobId = Number(req.params.id);
    const { coverLetter, cvType, cvLink, cvFileName } = req.body;
    if (!coverLetter || !coverLetter.trim()) {
      return res.status(400).json({ error: 'La carta de presentación es requerida' });
    }
    if (!cvType) {
      return res.status(400).json({ error: 'El tipo de CV es requerido' });
    }

    let cvFileDiskName: string | null = null;
    let finalCvFileName: string | null = cvFileName || null;

    if (cvType === 'drive') {
      if (!cvLink || !cvLink.trim()) {
        return res.status(400).json({ error: 'El enlace de Google Drive es obligatorio' });
      }
    } else if (cvType === 'pdf') {
      if (!req.file) {
        return res.status(400).json({ error: 'El archivo PDF es obligatorio' });
      }
      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: 'El archivo debe ser estrictamente en formato PDF' });
      }
      
      try {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cvFileDiskName = `${uniqueSuffix}.pdf`;
        const destPath = path.join(process.cwd(), 'uploads', 'cv', cvFileDiskName);
        fs.writeFileSync(destPath, req.file.buffer);
        if (!finalCvFileName) {
          finalCvFileName = req.file.originalname;
        }
      } catch (err) {
        console.error('Error writing PDF file:', err);
        return res.status(500).json({ error: 'Error al procesar el archivo PDF' });
      }
    } else {
      return res.status(400).json({ error: 'Tipo de CV no soportado' });
    }

    try {
      // Check if already applied
      const existing = db.prepare('SELECT id FROM job_applications WHERE job_id = ? AND user_id = ?').get(jobId, userId);
      if (existing) {
        if (cvFileDiskName) {
          try {
            fs.unlinkSync(path.join(process.cwd(), 'uploads', 'cv', cvFileDiskName));
          } catch (err) {}
        }
        return res.status(400).json({ error: 'Ya te has postulado a este puesto' });
      }
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO job_applications (job_id, user_id, cover_letter, cv_type, cv_link, cv_file_name, cv_file_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(jobId, userId, coverLetter.trim(), cvType, cvLink || null, finalCvFileName, cvFileDiskName, now);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      if (cvFileDiskName) {
        try {
          fs.unlinkSync(path.join(process.cwd(), 'uploads', 'cv', cvFileDiskName));
        } catch (err) {}
      }
      res.status(500).json({ error: 'Error al enviar la postulación' });
    }
  });

  // Download CV for job application (applicant, recruiter, or super admin only)
  app.get('/api/jobs/applications/:id/download-cv', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });

    const appId = Number(req.params.id);
    const application = db.prepare(`
      SELECT ja.*, j.author_id as job_author_id
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      WHERE ja.id = ?
    `).get(appId) as any;

    if (!application) {
      return res.status(404).json({ error: 'Postulación no encontrada' });
    }

    const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    if (application.user_id !== userId && application.job_author_id !== userId && user?.tier !== 'super_admin') {
      return res.status(403).json({ error: 'No tienes permisos para descargar este currículum' });
    }

    if (application.cv_type !== 'pdf' || !application.cv_file_data) {
      return res.status(400).json({ error: 'Esta postulación no contiene un archivo PDF' });
    }

    const filePath = path.join(process.cwd(), 'uploads', 'cv', application.cv_file_data);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo currículum no encontrado en el servidor' });
    }

    res.download(filePath, application.cv_file_name || 'curriculum.pdf', (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error al descargar el archivo' });
        }
      }
    });
  });

  // Create a new job posting (recruiter only - Pro or super_admin)
  app.post('/api/jobs', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });
    const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    if (!user || (user.tier !== 'pro' && user.tier !== 'super_admin')) {
      return res.status(403).json({ error: 'La Bolsa de Trabajo es exclusiva del plan Pro' });
    }

    const { title, company, location, type, description, assistance } = req.body;
    if (!title || !company || !location || !type || !description) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const date = new Date().toISOString().split('T')[0];
    try {
      const result = db.prepare(`
        INSERT INTO jobs (title, firm, location, type, description, date, assistance, author_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(title.trim(), company.trim(), location.trim(), type.trim(), description.trim(), date, assistance || 'Presencial', userId);
      
      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error al crear la oferta de empleo' });
    }
  });

  // Edit job posting
  app.put('/api/jobs/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });

    const jobId = Number(req.params.id);
    const job = db.prepare('SELECT author_id FROM jobs WHERE id = ?').get(jobId) as { author_id: number } | undefined;
    if (!job) return res.status(404).json({ error: 'Oferta de empleo no encontrada' });

    if (job.author_id !== userId) {
      return res.status(403).json({ error: 'No tienes permisos para editar esta oferta' });
    }

    const { title, company, location, type, description, assistance } = req.body;
    if (!title || !company || !location || !type || !description) {
      return res.status(400).json({ error: 'Todos los campos obligatorios' });
    }

    try {
      db.prepare(`
        UPDATE jobs
        SET title = ?, firm = ?, location = ?, type = ?, description = ?, assistance = ?
        WHERE id = ?
      `).run(title.trim(), company.trim(), location.trim(), type.trim(), description.trim(), assistance || 'Presencial', jobId);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error al actualizar la oferta de empleo' });
    }
  });

  // Delete job posting
  app.delete('/api/jobs/:id', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });

    const jobId = Number(req.params.id);
    const job = db.prepare('SELECT author_id FROM jobs WHERE id = ?').get(jobId) as { author_id: number } | undefined;
    if (!job) return res.status(404).json({ error: 'Oferta de empleo no encontrada' });

    const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    const isSuperAdmin = user && user.tier === 'super_admin';

    if (job.author_id !== userId && !isSuperAdmin) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar esta oferta' });
    }

    try {
      db.prepare('DELETE FROM job_applications WHERE job_id = ?').run(jobId);
      db.prepare('DELETE FROM jobs WHERE id = ?').run(jobId);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error al eliminar la oferta de empleo' });
    }
  });

  // Get applications for a specific job (recruiter only)
  app.get('/api/jobs/:id/applications', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });
    
    const jobId = Number(req.params.id);
    const job = db.prepare('SELECT author_id FROM jobs WHERE id = ?').get(jobId) as { author_id: number } | undefined;
    if (!job) return res.status(404).json({ error: 'Trabajo no encontrado' });

    // Guard: Only the creator of the job or super admin can see applications
    const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    if (job.author_id !== userId && user?.tier !== 'super_admin') {
      return res.status(403).json({ error: 'No tienes permiso para ver estas postulaciones' });
    }

    try {
      const apps = db.prepare(`
        SELECT ja.*, u.name as user_name, u.email as user_email, u.telefono as user_phone, u.university as user_university
        FROM job_applications ja
        JOIN users u ON ja.user_id = u.id
        WHERE ja.job_id = ?
        ORDER BY ja.created_at DESC
      `).all(jobId);
      res.json(apps);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error al obtener las postulaciones' });
    }
  });

  // Get current user's job applications
  app.get('/api/me/applications', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Debes iniciar sesión' });
    try {
      const list = db.prepare(`
        SELECT ja.*, j.title as job_title, j.firm as job_firm, j.location as job_location
        FROM job_applications ja
        JOIN jobs j ON ja.job_id = j.id
        WHERE ja.user_id = ?
        ORDER BY ja.created_at DESC
      `).all(userId);
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: 'Error al obtener postulaciones' });
    }
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

    const resourceType = req.query.resource_type;
    const page = req.query.page;
    const limit = req.query.limit;
    const isPaginated = page !== undefined || limit !== undefined;

    let baseQuery = 'FROM saved_for_later WHERE user_id = ?';
    const params: any[] = [userId];

    if (resourceType && typeof resourceType === 'string' && resourceType !== 'all') {
      baseQuery += ' AND resource_type = ?';
      params.push(resourceType);
    }

    if (isPaginated) {
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 6;
      const offsetVal = (pageNum - 1) * limitNum;

      try {
        const countQuery = `SELECT COUNT(*) as count ${baseQuery}`;
        const totalCountResult = db.prepare(countQuery).get(...params) as { count: number };
        const totalItems = totalCountResult?.count || 0;
        const totalPages = Math.ceil(totalItems / limitNum);

        const selectQuery = `SELECT resource_type, resource_id, created_at ${baseQuery} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        const rows = db.prepare(selectQuery).all(...params, limitNum, offsetVal) as { resource_type: string; resource_id: number; created_at: string }[];

        const out = rows.map((r) => {
          let details: any = null;
          let title = '';
          let url = '';

          try {
            if (r.resource_type === 'brief') {
              const b = db.prepare('SELECT * FROM case_briefs WHERE id = ?').get(r.resource_id) as any;
              if (b) {
                title = b.title;
                url = `/briefs/${r.resource_id}`;
                details = b;
              }
            } else if (r.resource_type === 'note') {
              const likesSub = "(SELECT COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END), 0) FROM resource_votes WHERE resource_type = 'note' AND resource_id = student_notes.id)";
              const dislikesSub = "(SELECT COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END), 0) FROM resource_votes WHERE resource_type = 'note' AND resource_id = student_notes.id)";
              
              const selectParams: any[] = [];
              let userVoteSub = '0';
              if (userId) {
                userVoteSub = "COALESCE((SELECT vote FROM resource_votes WHERE resource_type = 'note' AND resource_id = student_notes.id AND user_id = ?), 0)";
                selectParams.push(userId);
              }
              const isSavedSub = '1';

              const n = db.prepare(`
                SELECT student_notes.*, users.name as author_name, users.profile_role as author_role, subjects.name as subject_name,
                  un.name as university_name,
                  COALESCE(student_notes.chair_name, chairs.name) as chair_name,
                  COALESCE(student_notes.professor, chairs.professor) as professor,
                  ${likesSub} as likes_count, ${dislikesSub} as dislikes_count, ${userVoteSub} as user_vote, ${isSavedSub} as is_saved
                FROM student_notes
                JOIN users ON student_notes.author_id = users.id
                JOIN subjects ON student_notes.subject_id = subjects.id
                LEFT JOIN universities un ON student_notes.university_id = un.id
                LEFT JOIN chairs ON student_notes.chair_id = chairs.id
                WHERE student_notes.id = ?
              `).get(...selectParams, r.resource_id) as any;
              if (n) {
                title = n.title;
                url = `/subjects/${n.subject_id}`;
                details = n;
              }
            } else if (r.resource_type === 'exam') {
              const e = db.prepare('SELECT exams.*, subjects.name as subject_name, un.name as university_name FROM exams JOIN subjects ON exams.subject_id = subjects.id LEFT JOIN universities un ON exams.university_id = un.id WHERE exams.id = ?').get(r.resource_id) as any;
              if (e) {
                title = e.title;
                url = `/subjects/${e.subject_id}`;
                details = e;
              }
            } else if (r.resource_type === 'norma') {
              const n = db.prepare('SELECT * FROM normas WHERE id = ?').get(r.resource_id) as any;
              if (n) {
                title = n.titulo;
                url = `/normativa/${r.resource_id}`;
                details = n;
              }
            } else if (r.resource_type === 'latinism') {
              const l = db.prepare('SELECT * FROM latinisms WHERE id = ?').get(r.resource_id) as any;
              if (l) {
                title = l.term;
                url = `/latinisms`;
                details = l;
              }
            } else if (r.resource_type === 'article') {
              const a = db.prepare(`
                SELECT articles.*, users.name as author_name, users.profile_role as author_role
                FROM articles
                JOIN users ON articles.author_id = users.id
                WHERE articles.id = ?
              `).get(r.resource_id) as any;
              if (a) {
                title = a.title;
                url = `/articles`;
                details = a;
              }
            }
          } catch (err) {
            console.error('Error fetching details in saved-for-later:', err);
          }

          return { ...r, title, url, details };
        }).filter(item => item.details !== null);

        const countsRows = db.prepare('SELECT resource_type, COUNT(*) as count FROM saved_for_later WHERE user_id = ? GROUP BY resource_type').all(userId) as { resource_type: string; count: number }[];
        const counts: Record<string, number> = { brief: 0, norma: 0, note: 0, latinism: 0, article: 0 };
        countsRows.forEach(row => {
          counts[row.resource_type] = row.count;
        });

        res.json({
          items: out,
          totalPages,
          currentPage: pageNum,
          totalItems,
          counts
        });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al buscar elementos guardados' });
      }
    } else {
      try {
        const rows = db.prepare(`SELECT resource_type, resource_id, created_at ${baseQuery} ORDER BY created_at DESC`).all(...params) as { resource_type: string; resource_id: number; created_at: string }[];
        const out = rows.map((r) => {
          let details: any = null;
          let title = '';
          let url = '';

          try {
            if (r.resource_type === 'brief') {
              const b = db.prepare('SELECT * FROM case_briefs WHERE id = ?').get(r.resource_id) as any;
              if (b) {
                title = b.title;
                url = `/briefs/${r.resource_id}`;
                details = b;
              }
            } else if (r.resource_type === 'note') {
              const likesSub = "(SELECT COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END), 0) FROM resource_votes WHERE resource_type = 'note' AND resource_id = student_notes.id)";
              const dislikesSub = "(SELECT COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END), 0) FROM resource_votes WHERE resource_type = 'note' AND resource_id = student_notes.id)";
              
              const selectParams: any[] = [];
              let userVoteSub = '0';
              if (userId) {
                userVoteSub = "COALESCE((SELECT vote FROM resource_votes WHERE resource_type = 'note' AND resource_id = student_notes.id AND user_id = ?), 0)";
                selectParams.push(userId);
              }
              const isSavedSub = '1';

              const n = db.prepare(`
                SELECT student_notes.*, users.name as author_name, users.profile_role as author_role, subjects.name as subject_name,
                  un.name as university_name,
                  COALESCE(student_notes.chair_name, chairs.name) as chair_name,
                  COALESCE(student_notes.professor, chairs.professor) as professor,
                  ${likesSub} as likes_count, ${dislikesSub} as dislikes_count, ${userVoteSub} as user_vote, ${isSavedSub} as is_saved
                FROM student_notes
                JOIN users ON student_notes.author_id = users.id
                JOIN subjects ON student_notes.subject_id = subjects.id
                LEFT JOIN universities un ON student_notes.university_id = un.id
                LEFT JOIN chairs ON student_notes.chair_id = chairs.id
                WHERE student_notes.id = ?
              `).get(...selectParams, r.resource_id) as any;
              if (n) {
                title = n.title;
                url = `/subjects/${n.subject_id}`;
                details = n;
              }
            } else if (r.resource_type === 'exam') {
              const e = db.prepare('SELECT exams.*, subjects.name as subject_name, un.name as university_name FROM exams JOIN subjects ON exams.subject_id = subjects.id LEFT JOIN universities un ON exams.university_id = un.id WHERE exams.id = ?').get(r.resource_id) as any;
              if (e) {
                title = e.title;
                url = `/subjects/${e.subject_id}`;
                details = e;
              }
            } else if (r.resource_type === 'norma') {
              const n = db.prepare('SELECT * FROM normas WHERE id = ?').get(r.resource_id) as any;
              if (n) {
                title = n.titulo;
                url = `/normativa/${r.resource_id}`;
                details = n;
              }
            } else if (r.resource_type === 'latinism') {
              const l = db.prepare('SELECT * FROM latinisms WHERE id = ?').get(r.resource_id) as any;
              if (l) {
                title = l.term;
                url = `/latinisms`;
                details = l;
              }
            } else if (r.resource_type === 'article') {
              const a = db.prepare(`
                SELECT articles.*, users.name as author_name, users.profile_role as author_role
                FROM articles
                JOIN users ON articles.author_id = users.id
                WHERE articles.id = ?
              `).get(r.resource_id) as any;
              if (a) {
                title = a.title;
                url = `/articles`;
                details = a;
              }
            }
          } catch (err) {
            console.error('Error fetching details in saved-for-later:', err);
          }

          return { ...r, title, url, details };
        }).filter(item => item.details !== null);

        res.json(out);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al buscar elementos guardados' });
      }
    }
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

  // Chairs (cátedras)
  app.get('/api/chairs', (req, res) => {
    const { university_id } = req.query;
    let query = `
      SELECT chairs.*, universities.name as university_name, subjects.name as subject_name
      FROM chairs
      LEFT JOIN universities ON chairs.university_id = universities.id
      LEFT JOIN subjects ON chairs.subject_id = subjects.id
    `;
    const params: any[] = [];
    if (university_id && !isNaN(Number(university_id))) {
      query += ' WHERE chairs.university_id = ?';
      params.push(Number(university_id));
    }
    query += ' ORDER BY chairs.name ASC';
    const chairs = db.prepare(query).all(...params);
    res.json(chairs);
  });

  // Student Notes
  app.get('/api/notes', (req, res) => {
    const userId = getUserId(req) || 0;
    const { subject_id, university_id, year: yearParam } = req.query;

    const likesSub = "(SELECT COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END), 0) FROM resource_votes WHERE resource_type = 'note' AND resource_id = student_notes.id)";
    const dislikesSub = "(SELECT COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END), 0) FROM resource_votes WHERE resource_type = 'note' AND resource_id = student_notes.id)";
    
    const selectParams: any[] = [];
    let userVoteSub = '0';
    let isSavedSub = '0';
    if (userId) {
      userVoteSub = "COALESCE((SELECT vote FROM resource_votes WHERE resource_type = 'note' AND resource_id = student_notes.id AND user_id = ?), 0)";
      isSavedSub = "COALESCE((SELECT 1 FROM saved_for_later WHERE resource_type = 'note' AND resource_id = student_notes.id AND user_id = ?), 0)";
      selectParams.push(userId, userId);
    }

    let query = `
      SELECT student_notes.*, users.name as author_name, users.profile_role as author_role, subjects.name as subject_name,
        universities.name as university_name,
        COALESCE(student_notes.chair_name, chairs.name) as chair_name,
        COALESCE(student_notes.professor, chairs.professor) as professor,
        ${likesSub} as likes_count,
        ${dislikesSub} as dislikes_count,
        ${userVoteSub} as user_vote,
        ${isSavedSub} as is_saved
      FROM student_notes 
      JOIN users ON student_notes.author_id = users.id
      JOIN subjects ON student_notes.subject_id = subjects.id
      LEFT JOIN universities ON student_notes.university_id = universities.id
      LEFT JOIN chairs ON student_notes.chair_id = chairs.id
      WHERE student_notes.status = 'published'
    `;
    const params: any[] = [];
    if (subject_id && !isNaN(Number(subject_id))) {
      query += ' AND student_notes.subject_id = ?';
      params.push(Number(subject_id));
    }
    if (university_id && !isNaN(Number(university_id))) {
      query += ' AND student_notes.university_id = ?';
      params.push(Number(university_id));
    }
    if (yearParam) {
      query += ' AND student_notes.year = ?';
      params.push(yearParam);
    }
    query += ' ORDER BY student_notes.views DESC';
    const notes = db.prepare(query).all(...selectParams, ...params);
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

  const getLikesCount = (noteId: string | number) => {
    const r = db.prepare("SELECT COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END), 0) as count FROM resource_votes WHERE resource_type = 'note' AND resource_id = ?").get(noteId) as { count: number } | undefined;
    return r?.count || 0;
  };
  const getDislikesCount = (noteId: string | number) => {
    const r = db.prepare("SELECT COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END), 0) as count FROM resource_votes WHERE resource_type = 'note' AND resource_id = ?").get(noteId) as { count: number } | undefined;
    return r?.count || 0;
  };

  app.post('/api/notes/:id/vote', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Usuario no identificado' });
    const noteId = req.params.id;
    const note = db.prepare('SELECT id, author_id, status FROM student_notes WHERE id = ?').get(noteId) as { id: number; author_id: number; status: string } | undefined;
    if (!note) return res.status(404).json({ error: 'Not found' });
    if (note.status !== 'published') return res.status(400).json({ error: 'Solo se puede votar apuntes publicados' });
    
    const { vote } = req.body;
    const voteVal = Number(vote);
    if (voteVal !== 1 && voteVal !== -1) {
      return res.status(400).json({ error: 'Valor de voto inválido (debe ser 1 o -1)' });
    }

    const createdAt = new Date().toISOString();
    try {
      const existing = db.prepare('SELECT vote FROM resource_votes WHERE user_id = ? AND resource_type = ? AND resource_id = ?').get(userId, 'note', noteId) as { vote: number } | undefined;

      if (existing) {
        if (existing.vote === voteVal) {
          // Toggle off: remove vote
          db.prepare('DELETE FROM resource_votes WHERE user_id = ? AND resource_type = ? AND resource_id = ?').run(userId, 'note', noteId);
          db.prepare('UPDATE users SET total_votes_received = COALESCE(total_votes_received, 0) - ? WHERE id = ?').run(existing.vote, note.author_id);
          applyImpactTierUpgrade(note.author_id);
          return res.json({ success: true, action: 'removed', likes_count: getLikesCount(noteId), dislikes_count: getDislikesCount(noteId), user_vote: 0 });
        } else {
          // Change vote
          db.prepare('UPDATE resource_votes SET vote = ?, created_at = ? WHERE user_id = ? AND resource_type = ? AND resource_id = ?').run(voteVal, createdAt, userId, 'note', noteId);
          // Net difference is voteVal - existing.vote (e.g. 1 - (-1) = 2, or -1 - 1 = -2)
          db.prepare('UPDATE users SET total_votes_received = COALESCE(total_votes_received, 0) + ? WHERE id = ?').run(voteVal - existing.vote, note.author_id);
          applyImpactTierUpgrade(note.author_id);
          return res.json({ success: true, action: 'changed', likes_count: getLikesCount(noteId), dislikes_count: getDislikesCount(noteId), user_vote: voteVal });
        }
      } else {
        // Add new vote
        db.prepare('INSERT INTO resource_votes (user_id, resource_type, resource_id, vote, created_at) VALUES (?, ?, ?, ?, ?)').run(userId, 'note', noteId, voteVal, createdAt);
        db.prepare('UPDATE users SET total_votes_received = COALESCE(total_votes_received, 0) + ? WHERE id = ?').run(voteVal, note.author_id);
        applyImpactTierUpgrade(note.author_id);
        return res.json({ success: true, action: 'added', likes_count: getLikesCount(noteId), dislikes_count: getDislikesCount(noteId), user_vote: voteVal });
      }
    } catch (e) {
      console.error(e);
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
      const { title, subject_id, file_url, description, year, university_id, chair_name, profesor } = req.body;
      if (!title || !subject_id) return res.status(400).json({ error: 'Título y materia son obligatorios' });
      if (!file_url || typeof file_url !== 'string' || !file_url.trim()) return res.status(400).json({ error: 'El link de Google Drive (público) es obligatorio' });

      const status = uploader.tier === 'super_admin' ? 'published' : 'pending';
      const date = new Date().toISOString().split('T')[0];
      const content = description && typeof description === 'string' ? description.trim() : null;
      const noteYear = year != null && year !== '' ? String(year).trim() : null;
      const noteUniId = university_id != null && university_id !== '' ? parseInt(String(university_id), 10) : null;
      const noteChairName = chair_name != null && chair_name !== '' ? String(chair_name).trim() : null;
      const noteProfessor = profesor != null && profesor !== '' ? String(profesor).trim() : null;

      const result = db.prepare(`
        INSERT INTO student_notes (title, author_id, subject_id, content, file_url, views, status, date, year, university_id, chair_name, professor)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
      `).run(title.trim(), userId, subject_id, content, file_url.trim(), status, date, noteYear, noteUniId, noteChairName, noteProfessor);

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
      query += ' WHERE titulo LIKE ? OR numero LIKE ? OR texto LIKE ? OR keywords LIKE ?';
      const search = `%${q}%`;
      params = [search, search, search, search];
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

  app.post('/api/normas', async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Debe iniciar sesión para aportar normas' });
    }

    const { tipo, numero, anio, titulo, texto, organismo, fecha_publicacion, fuente_url, keywords, infoleg_link } = req.body;
    
    if (!titulo || !texto) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(userId) as { tier: string } | undefined;
    const isSuperAdmin = user && user.tier === 'super_admin';
    const estado = isSuperAdmin ? (req.body.estado || 'Vigente') : 'Pendiente';

    let generatedKeywords = keywords || '';
    if (!generatedKeywords && texto) {
      try {
        const keys = parseGeminiKeys();
        if (keys.length > 0) {
          const prompt = `Analizá el siguiente texto de una ley o norma jurídica argentina y generá entre 5 y 15 palabras clave esenciales en español separadas por comas. Devolvé únicamente la lista de palabras clave separadas por comas, sin explicaciones ni formato adicional.\n\nTEXTO:\n${texto.substring(0, 8000)}`;
          const response = await callGeminiWithRetry({
            model: GEMINI_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          });
          generatedKeywords = (response.text ?? '').trim();
        }
      } catch (err) {
        console.error('Error generating keywords with Gemini:', err);
      }
    }

    try {
      const result = db.prepare(`
        INSERT INTO normas (tipo, numero, anio, titulo, texto, organismo, fecha_publicacion, fuente_url, keywords, infoleg_link, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        tipo || 'Ley',
        numero || null,
        anio || null,
        titulo,
        texto,
        organismo || null,
        fecha_publicacion || null,
        fuente_url || null,
        generatedKeywords || null,
        infoleg_link || null,
        estado
      );
      
      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
      console.error('Error saving norma:', e);
      res.status(500).json({ error: 'Error interno al guardar normativa' });
    }
  });

  // Text Annotations
  app.get('/api/briefs/:briefId/annotations', (req, res) => {
    const loggedUserId = getUserId(req);
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'Falta userId' });

    if (!loggedUserId || String(loggedUserId) !== String(userId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const annotations = db.prepare('SELECT * FROM text_annotations WHERE brief_id = ? AND user_id = ? ORDER BY created_at DESC').all(req.params.briefId, userId);
    res.json(annotations);
  });

  app.post('/api/briefs/:briefId/annotations', (req, res) => {
    const loggedUserId = getUserId(req);
    const { user_id, selected_text, note, color, type, start_index, end_index } = req.body;
    const brief_id = req.params.briefId;
    const created_at = new Date().toISOString();

    if (!selected_text || !user_id) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    if (!loggedUserId || String(loggedUserId) !== String(user_id)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    try {
      const result = db.prepare(`
        INSERT INTO text_annotations (user_id, brief_id, selected_text, note, color, annotation_type, start_index, end_index, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(user_id, brief_id, selected_text, note || '', color || 'bg-yellow-200', type || 'highlight', start_index ?? null, end_index ?? null, created_at);

      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      console.error('Error saving text annotation:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Text Annotations for Normas
  app.get('/api/normas/:normaId/annotations', (req, res) => {
    const loggedUserId = getUserId(req);
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'Falta userId' });

    if (!loggedUserId || String(loggedUserId) !== String(userId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const annotations = db.prepare('SELECT * FROM text_annotations WHERE norma_id = ? AND user_id = ? ORDER BY created_at DESC').all(req.params.normaId, userId);
    res.json(annotations);
  });

  app.post('/api/normas/:normaId/annotations', (req, res) => {
    const loggedUserId = getUserId(req);
    const { user_id, selected_text, note, color, type, start_index, end_index } = req.body;
    const norma_id = req.params.normaId;
    const created_at = new Date().toISOString();

    if (!selected_text || !user_id) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    if (!loggedUserId || String(loggedUserId) !== String(user_id)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    try {
      const result = db.prepare(`
        INSERT INTO text_annotations (user_id, norma_id, selected_text, note, color, annotation_type, start_index, end_index, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(user_id, norma_id, selected_text, note || '', color || 'bg-yellow-200', type || 'highlight', start_index ?? null, end_index ?? null, created_at);

      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      console.error('Error saving text annotation:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.delete('/api/annotations/:id', (req, res) => {
    const loggedUserId = getUserId(req);
    if (!loggedUserId) return res.status(401).json({ error: 'Usuario no identificado' });

    try {
      const annotation = db.prepare('SELECT user_id FROM text_annotations WHERE id = ?').get(req.params.id) as { user_id: number } | undefined;
      if (!annotation) return res.status(404).json({ error: 'Anotación no encontrada' });

      const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(loggedUserId) as { tier: string } | undefined;
      const isSuperAdmin = user && user.tier === 'super_admin';

      if (annotation.user_id !== loggedUserId && !isSuperAdmin) {
        return res.status(403).json({ error: 'No tienes permisos para borrar esta anotación' });
      }

      db.prepare('DELETE FROM text_annotations WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Private Notes
  app.get('/api/users/:userId/private-notes', (req, res) => {
    const loggedUserId = getUserId(req);
    if (!loggedUserId || String(loggedUserId) !== String(req.params.userId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

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
    const loggedUserId = getUserId(req);
    if (!loggedUserId || String(loggedUserId) !== String(req.params.userId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

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
    const loggedUserId = getUserId(req);
    if (!loggedUserId || String(loggedUserId) !== String(req.params.userId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

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
    const loggedUserId = getUserId(req);
    if (!loggedUserId) return res.status(401).json({ error: 'Usuario no identificado' });

    try {
      const note = db.prepare('SELECT user_id FROM private_notes WHERE id = ?').get(req.params.id) as { user_id: number } | undefined;
      if (!note) return res.status(404).json({ error: 'Nota no encontrada' });

      const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(loggedUserId) as { tier: string } | undefined;
      const isSuperAdmin = user && user.tier === 'super_admin';

      if (note.user_id !== loggedUserId && !isSuperAdmin) {
        return res.status(403).json({ error: 'No tienes permisos para borrar esta nota' });
      }

      db.prepare('DELETE FROM private_notes WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Users
  app.get('/api/users', (req, res) => {
    const q = req.query.q;
    let users;
    if (q && typeof q === 'string') {
      users = db.prepare(`
        SELECT users.id, users.name, users.email, users.tier, users.university, users.profile_role
        FROM users
        WHERE (users.name LIKE ? OR users.email LIKE ?)
        ORDER BY users.name ASC
      `).all(`%${q}%`, `%${q}%`);
    } else {
      users = db.prepare(`
        SELECT users.id, users.name, users.email, users.tier, users.university, users.profile_role
        FROM users
        ORDER BY users.name ASC
      `).all();
    }
    res.json(users);
  });
  // Admin Endpoints
  app.get('/api/admin/metrics', (req, res) => {
    const adminId = getUserId(req);
    if (!adminId) return res.status(401).json({ error: 'No autenticado' });
    const admin = db.prepare('SELECT tier FROM users WHERE id = ?').get(adminId) as any;
    if (!admin || admin.tier !== 'super_admin') return res.status(403).json({ error: 'Prohibido' });

    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    const premiumUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE tier IN ('pro', 'basic', 'super_admin', 'admin')").get() as any).count;
    const totalBriefs = (db.prepare('SELECT COUNT(*) as count FROM case_briefs').get() as any).count;
    const pendingNotes = (db.prepare("SELECT COUNT(*) as count FROM student_notes WHERE status = 'pending'").get() as any).count;
    const pendingExams = (db.prepare("SELECT COUNT(*) as count FROM exams WHERE status = 'pending'").get() as any).count;
    const pendingArticles = (db.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'pending'").get() as any).count;

    res.json({
      totalUsers,
      premiumUsers,
      totalBriefs,
      pendingReports: pendingNotes + pendingExams + pendingArticles
    });
  });

  app.get('/api/admin/content', (req, res) => {
    const adminId = getUserId(req);
    if (!adminId) return res.status(401).json({ error: 'No autenticado' });
    const admin = db.prepare('SELECT tier FROM users WHERE id = ?').get(adminId) as any;
    if (!admin || admin.tier !== 'super_admin') return res.status(403).json({ error: 'Prohibido' });

    // For MVP, merge some briefs, normas, and articles
    const briefs = db.prepare('SELECT id, title FROM case_briefs ORDER BY id DESC LIMIT 15').all() as any[];
    const normas = db.prepare('SELECT id, titulo, estado FROM normas ORDER BY id DESC LIMIT 15').all() as any[];
    const articles = db.prepare('SELECT id, title, status FROM articles ORDER BY id DESC LIMIT 15').all() as any[];
    
    const content = [
      ...briefs.map((b: any) => ({ id: `brief_${b.id}`, title: b.title, type: 'Fallo', subject: '-', status: 'Publicado' })),
      ...normas.map((n: any) => ({ id: `norma_${n.id}`, title: n.titulo, type: 'Normativa', subject: '-', status: n.estado || 'Vigente' })),
      ...articles.map((a: any) => ({ id: `article_${a.id}`, title: a.title, type: 'Artículo', subject: '-', status: a.status === 'published' ? 'Publicado' : (a.status === 'pending' ? 'Pendiente' : 'Rechazado') }))
    ];
    res.json(content);
  });


  app.get('/api/admin/users/all', (req, res) => {
    const adminId = getUserId(req);
    if (!adminId) return res.status(401).json({ error: 'No autenticado' });
    const admin = db.prepare('SELECT tier FROM users WHERE id = ?').get(adminId) as any;
    if (!admin || admin.tier !== 'super_admin') {
      return res.status(403).json({ error: 'Prohibido' });
    }
    const allUsers = db.prepare('SELECT id, name, email, tier, profile_role FROM users ORDER BY id DESC').all();
    res.json(allUsers);
  });

  app.post('/api/admin/users', async (req, res) => {
    const adminId = getUserId(req);
    if (!adminId) return res.status(401).json({ error: 'No autenticado' });

    const admin = db.prepare('SELECT tier FROM users WHERE id = ?').get(adminId) as any;
    if (!admin || admin.tier !== 'super_admin') {
      return res.status(403).json({ error: 'Solo los super_admin pueden crear usuarios manualmente' });
    }

    const { name, email, password, tier, profile_role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return res.status(409).json({ error: 'El email ya está registrado' });
      }

      const hash = await bcrypt.hash(password, 10);
      
      const result = db.prepare('INSERT INTO users (name, email, password, tier, profile_role) VALUES (?, ?, ?, ?, ?)').run(
        name, email, hash, tier || 'free', profile_role || 'Estudiante'
      );

      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (e: any) {
      console.error('Error creating user:', e);
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  });

  app.put('/api/admin/users/:id', async (req, res) => {
    const adminId = getUserId(req);
    if (!adminId) return res.status(401).json({ error: 'No autenticado' });

    const admin = db.prepare('SELECT tier FROM users WHERE id = ?').get(adminId) as any;
    if (!admin || admin.tier !== 'super_admin') {
      return res.status(403).json({ error: 'Solo los super_admin pueden editar usuarios' });
    }

    const { name, email, tier, profile_role } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Nombre y email obligatorios' });
    }

    try {
      db.prepare('UPDATE users SET name = ?, email = ?, tier = ?, profile_role = ? WHERE id = ?').run(
        name.trim(), email.trim(), tier || 'free', profile_role || 'Estudiante', req.params.id
      );
      res.json({ success: true });
    } catch (e: any) {
      console.error('Error updating user:', e);
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  });

  // Chat rooms (Pro)
  app.get('/api/chat-rooms', (req, res) => {
    const rooms = db.prepare('SELECT id, slug, name, category FROM chat_rooms ORDER BY category, name').all();
    res.json(rooms);
  });

  app.get('/api/chat-rooms/:id/messages', (req, res) => {
    const roomId = req.params.id;
    const limit = Math.min(100, parseInt(String(req.query.limit), 10) || 50);
    const offset = parseInt(String(req.query.offset), 10) || 0;
    const rows = db.prepare(`
      SELECT rm.id, rm.room_id, rm.user_id, rm.content, rm.timestamp, users.name as user_name, users.profile_role as user_role
      FROM room_messages rm
      JOIN users ON rm.user_id = users.id
      WHERE rm.room_id = ?
      ORDER BY rm.timestamp DESC
      LIMIT ? OFFSET ?
    `).all(roomId, limit, offset);
    res.json(rows.reverse());
  });

  // Messages
  app.get('/api/messages/:user1/:user2', (req, res) => {
    const loggedUserId = getUserId(req);
    if (!loggedUserId) {
      return res.status(401).json({ error: 'Usuario no identificado' });
    }

    const { user1, user2 } = req.params;
    
    const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(loggedUserId) as { tier: string } | undefined;
    const isSuperAdmin = user && user.tier === 'super_admin';

    if (String(loggedUserId) !== String(user1) && String(loggedUserId) !== String(user2) && !isSuperAdmin) {
      return res.status(403).json({ error: 'Acceso denegado: No tienes permisos para ver estos mensajes' });
    }

    const limit = Math.min(100, parseInt(String(req.query.limit), 10) || 50);
    const offset = parseInt(String(req.query.offset), 10) || 0;

    const messages = db.prepare(`
      SELECT * FROM messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `).all(user1, user2, user2, user1, limit, offset);
    res.json(messages.reverse());
  });

  // Read messages from a sender
  app.post('/api/messages/read', (req, res) => {
    const loggedUserId = getUserId(req);
    if (!loggedUserId) return res.status(401).json({ error: 'Usuario no identificado' });
    const { sender_id } = req.body;
    if (!sender_id) return res.status(400).json({ error: 'sender_id es requerido' });

    try {
      db.prepare('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?').run(sender_id, loggedUserId);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error al marcar mensajes como leídos' });
    }
  });

  // Get unread counts by sender
  app.get('/api/messages/unread-counts', (req, res) => {
    const loggedUserId = getUserId(req);
    if (!loggedUserId) return res.status(401).json({ error: 'Usuario no identificado' });

    try {
      const rows = db.prepare('SELECT sender_id, COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0 GROUP BY sender_id').all(loggedUserId) as { sender_id: number; count: number }[];
      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error al obtener conteos de no leídos' });
    }
  });

  // Get total unread count for current user
  app.get('/api/messages/unread-total', (req, res) => {
    const loggedUserId = getUserId(req);
    if (!loggedUserId) return res.status(401).json({ error: 'Usuario no identificado' });

    try {
      const row = db.prepare('SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0').get(loggedUserId) as { count: number } | undefined;
      res.json({ total: row?.count ?? 0 });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error al obtener total de no leídos' });
    }
  });

  // Share brief with another user
  app.post('/api/messages/share', (req, res) => {
    const senderId = getUserId(req);
    if (!senderId) return res.status(401).json({ error: 'Usuario no identificado' });
    
    const { receiverId, briefId, title } = req.body;
    if (!receiverId || !briefId || !title) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const timestamp = new Date().toISOString();
    const content = `Te compartió el fallo: **[${title}](/briefs/${briefId})**`;

    try {
      const result = db.prepare(
        'INSERT INTO messages (sender_id, receiver_id, content, timestamp, is_read) VALUES (?, ?, ?, ?, 0)'
      ).run(senderId, receiverId, content, timestamp);

      const newMessage = {
        id: result.lastInsertRowid,
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        timestamp,
        is_read: 0
      };

      const receiverSockets = onlineUsers.get(Number(receiverId));
      if (receiverSockets) {
        receiverSockets.forEach(socketId => {
          io.to(socketId).emit('message', newMessage);
        });
      }
      const senderSockets = onlineUsers.get(senderId);
      if (senderSockets) {
        senderSockets.forEach(socketId => {
          io.to(socketId).emit('message', newMessage);
        });
      }

      res.json({ success: true, message: newMessage });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error al compartir el fallo' });
    }
  });

  // Socket.io authentication middleware
  io.use((socket, next) => {
    let token: string | null = null;
    const cookieHeader = socket.handshake.headers.cookie;
    if (cookieHeader) {
      const tokenCookie = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith('token='));
      if (tokenCookie) {
        token = tokenCookie.split('=')[1];
      }
    }
    if (!token && socket.handshake.query?.token) {
      token = String(socket.handshake.query.token);
    }
    if (!token && socket.handshake.auth?.token) {
      token = String(socket.handshake.auth.token);
    }

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_development_lexargar') as any;
      socket.data = { userId: decoded.userId };
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Socket.io logic
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    if (userId) {
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId)!.add(socket.id);
      io.emit('online_users', Array.from(onlineUsers.keys()));
    }

    socket.emit('online_users', Array.from(onlineUsers.keys()));

    socket.on('join', () => {
      socket.join(`user_${socket.data.userId}`);
    });

    socket.on('join_room', (roomId: number) => {
      socket.join(`room_${roomId}`);
    });

    socket.on('leave_room', (roomId: number) => {
      socket.leave(`room_${roomId}`);
    });

    socket.on('send_room_message', (data: { room_id: number; user_id: number; content: string }) => {
      const { room_id, content } = data;
      const user_id = socket.data.userId; // Enforce authenticated user_id
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
      const { receiver_id, content } = data;
      const sender_id = socket.data.userId; // Enforce authenticated sender_id
      const timestamp = new Date().toISOString();

      const result = db.prepare(
        'INSERT INTO messages (sender_id, receiver_id, content, timestamp, is_read) VALUES (?, ?, ?, ?, 0)'
      ).run(sender_id, receiver_id, content, timestamp);

      const newMessage = {
        id: result.lastInsertRowid,
        sender_id,
        receiver_id,
        content,
        timestamp,
        is_read: 0
      };

      io.to(`user_${receiver_id}`).emit('receive_message', newMessage);
      io.to(`user_${sender_id}`).emit('receive_message', newMessage);
    });

    socket.on('disconnect', () => {
      if (userId) {
        const userSockets = onlineUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            onlineUsers.delete(userId);
          }
        }
        io.emit('online_users', Array.from(onlineUsers.keys()));
      }
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
