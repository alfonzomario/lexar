import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../../db/drizzle.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middlewares/authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_lexargar';

router.post('/register', async (req, res) => {
    const { name, email, password, profile_role, university, law_firm, court_specialty, dni, phone } = req.body;
    
    if (!name || !email || !password) {
        res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
        return;
    }

    try {
        // Check if user exists
        const existing = await db.query.users.findFirst({
            where: (u, { eq }) => eq(u.email, email)
        });
        if (existing) {
             res.status(409).json({ error: 'El email ya está registrado.' });
             return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await db.insert(users).values({
            name,
            email,
            password: hashedPassword,
            tier: 'free',
            profileRole: profile_role || 'Estudiante',
            university: university || null,
            lawFirm: law_firm || null,
            courtSpecialty: court_specialty || null,
            dni: dni || null,
            telefono: phone || null,
        }).returning({ insertedId: users.id });

        const userId = result[0].insertedId;

        const token = jwt.sign({ userId, tier: 'free', email }, JWT_SECRET, { expiresIn: '7d' });

        // Set HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
            message: 'Registro exitoso',
            user: { 
                id: userId, 
                name, 
                email, 
                tier: 'free', 
                profile_role: profile_role || 'Estudiante',
                university: university || null,
                law_firm: law_firm || null,
                court_specialty: court_specialty || null,
                dni: dni || null,
                telefono: phone || null,
            },
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Error interno al registrar usuario.' });
    }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        // Fallback for legacy mocked login (only email was provided in the old frontend) - ONLY FOR DEVELOPMENT
        if (email && !password && process.env.NODE_ENV !== 'production') {
            const user = await db.query.users.findFirst({
                where: (u, { eq }) => eq(u.email, email)
            });
            if (user) {
                const token = jwt.sign({ userId: user.id, tier: user.tier, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
                res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
                res.json({ message: 'Login legacy exitoso', user: { id: user.id, name: user.name, email: user.email, tier: user.tier, profile_role: user.profileRole }, token });
                return;
            }
        }
        res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
        return;
    }

    try {
        const user = await db.query.users.findFirst({
            where: (u, { eq }) => eq(u.email, email)
        });
        
        if (!user) {
            res.status(401).json({ error: 'Credenciales inválidas.' });
            return;
        }

        // if the old seed data has no password, let them log in, and hash it now
        let isValid = false;
        if (!user.password) {
            // For seed data compatibility
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));
            isValid = true;
        } else {
            isValid = await bcrypt.compare(password, user.password);
        }

        if (!isValid) {
            res.status(401).json({ error: 'Credenciales inválidas.' });
            return;
        }

        const token = jwt.sign({ userId: user.id, tier: user.tier, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            message: 'Login exitoso',
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                tier: user.tier, 
                profile_role: user.profileRole,
                university: user.university,
                law_firm: user.lawFirm,
                court_specialty: user.courtSpecialty,
                dni: user.dni,
                telefono: user.telefono
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error interno al iniciar sesión.' });
    }
});

// --- CURRENT USER ---
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'No autenticado.' });
        return;
    }

    try {
        const user = await db.query.users.findFirst({
            where: (u, { eq }) => eq(u.id, req.user!.userId),
            columns: {
                id: true,
                name: true,
                email: true,
                tier: true,
                profileRole: true,
                totalViews: true,
                docViewsUsed: true,
                university: true,
                lawFirm: true,
                courtSpecialty: true,
                dni: true,
                telefono: true,
            }
        });
        if (!user) {
            res.status(404).json({ error: 'Usuario no encontrado.' });
            return;
        }
        
        res.json({ 
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                tier: user.tier,
                profile_role: user.profileRole,
                total_views: user.totalViews,
                doc_views_used: user.docViewsUsed,
                university: user.university,
                law_firm: user.lawFirm,
                court_specialty: user.courtSpecialty,
                dni: user.dni,
                telefono: user.telefono,
            }
        });
    } catch (e) {
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// --- UPDATE PROFILE ---
router.put('/me', authMiddleware, async (req: AuthRequest, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'No autenticado.' });
        return;
    }
    const { profile_role, university, law_firm, court_specialty, tier } = req.body;

    // Support tier upgrades for payment sandbox/simulation
    if (tier !== undefined) {
        if (!['free', 'basic', 'pro', 'admin', 'super_admin'].includes(tier)) {
            res.status(400).json({ error: 'Plan no válido.' });
            return;
        }
        try {
            await db.update(users).set({ tier }).where(eq(users.id, req.user.userId));
            res.json({ success: true });
            return;
        } catch (e) {
            res.status(500).json({ error: 'Error al actualizar el plan.' });
            return;
        }
    }

    if (!profile_role) {
        res.status(400).json({ error: 'El rol de perfil es obligatorio.' });
        return;
    }

    if (['Estudiante', 'Profesor', 'Profesor y Abogado'].includes(profile_role) && (!university || !university.trim())) {
        res.status(400).json({ error: 'La universidad es obligatoria.' });
        return;
    }
    if (profile_role === 'Juez' && (!court_specialty || !court_specialty.trim())) {
        res.status(400).json({ error: 'El fuero es obligatorio para jueces.' });
        return;
    }

    try {
        await db.update(users).set({
            profileRole: profile_role,
            university: ['Estudiante', 'Profesor', 'Profesor y Abogado'].includes(profile_role) ? university.trim() : null,
            lawFirm: ['Abogado', 'Profesor y Abogado'].includes(profile_role) ? (law_firm?.trim() || null) : null,
            courtSpecialty: profile_role === 'Juez' ? court_specialty.trim() : null,
        }).where(eq(users.id, req.user.userId));

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error al actualizar el perfil.' });
    }
});

// --- LOGOUT ---
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Sesión cerrada.' });
});

export const authRoutes = router;
