import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../../db/drizzle.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middlewares/authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_lexargar';

// --- REGISTER ---
router.post('/register', async (req, res) => {
    const { name, email, password, profile_role } = req.body;
    
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
            profileRole: profile_role || 'Estudiante'
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
            user: { id: userId, name, email, tier: 'free', profile_role: profile_role || 'Estudiante' },
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
        // Fallback for legacy mocked login (only email was provided in the old frontend)
        if (email && !password) {
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
            user: { id: user.id, name: user.name, email: user.email, tier: user.tier, profile_role: user.profileRole },
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
            }
        });
        if (!user) {
            res.status(404).json({ error: 'Usuario no encontrado.' });
            return;
        }
        
        res.json({ user });
    } catch (e) {
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// --- LOGOUT ---
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Sesión cerrada.' });
});

export const authRoutes = router;
