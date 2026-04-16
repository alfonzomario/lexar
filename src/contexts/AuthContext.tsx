import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type UserRole = 'free' | 'basic' | 'pro' | 'admin' | 'super_admin';

interface User {
    id: number;
    name: string;
    email: string;
    tier: UserRole;
    profile_role: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password?: string) => Promise<void>;
    logout: () => Promise<void>;
    isLoading: boolean;
    isPro: boolean;
    isBasic: boolean;
    isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch (e) {
            console.error('Error fetching user session:', e);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password?: string) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok) {
                setUser(data.user);
            } else {
                throw new Error(data.error || 'Credenciales inválidas');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error('Error logging out:', e);
        }
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            isLoading,
            isPro: user?.tier === 'pro' || user?.tier === 'admin' || user?.tier === 'super_admin',
            isBasic: user?.tier === 'basic' || user?.tier === 'pro' || user?.tier === 'admin' || user?.tier === 'super_admin',
            isSuperAdmin: user?.tier === 'super_admin'
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
