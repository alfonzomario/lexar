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
    login: (email: string) => Promise<void>;
    logout: () => void;
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
        // Check local storage for mocked session on load
        const savedUserId = localStorage.getItem('lexar_mock_user_id');
        if (savedUserId) {
            fetchUserById(parseInt(savedUserId));
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchUserById = async (id: number) => {
        try {
            const res = await fetch('/api/users');
            const users = await res.json();
            const foundUser = users.find((u: User) => u.id === id);
            if (foundUser) {
                setUser(foundUser);
            } else {
                localStorage.removeItem('lexar_mock_user_id');
            }
        } catch (e) {
            console.error('Error fetching user session:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/users');
            const users = await res.json();
            const foundUser = users.find((u: User) => u.email === email);

            if (foundUser) {
                setUser(foundUser);
                localStorage.setItem('lexar_mock_user_id', foundUser.id.toString());
            } else {
                throw new Error('Usuario no encontrado en la DB de prueba');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('lexar_mock_user_id');
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            isLoading,
            isPro: user?.tier === 'pro' || user?.tier === 'admin',
            isBasic: user?.tier === 'basic',
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
