import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('token') || localStorage.getItem('jwt'));
    const [loading, setLoading] = useState(true);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        // Check for token on mount
        const checkAuth = async () => {
            const storedToken = localStorage.getItem('token') || localStorage.getItem('jwt');
            const savedUser = localStorage.getItem('user');

            if (storedToken && savedUser) {
                try {
                    // Standardize localStorage key
                    if (!localStorage.getItem('token') && storedToken) {
                        localStorage.setItem('token', storedToken);
                    }
                    setUser(JSON.parse(savedUser));
                    setToken(storedToken);
                } catch (e) {
                    console.error("Failed to parse user data", e);
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    setUser(null);
                    setToken(null);
                }
            } else {
                setUser(null);
                setToken(null);
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            if (!data.user || !data.token) {
                throw new Error("Invalid response from server: Token or user data missing");
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setToken(data.token);
            setUser(data.user);
            return { success: true, role: data.user.role, user: data.user };
        } catch (error) {
            console.error("Login Context Error:", error);
            return { success: false, message: error.message };
        }
    };

    const register = async (name, email, password, role) => {
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            if (!data.user || !data.token) {
                throw new Error("Invalid response from server: Token or user data missing");
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setToken(data.token);
            setUser(data.user);
            return { success: true, role: data.user.role, user: data.user };
        } catch (error) {
            console.error("Register Context Error:", error);
            return { success: false, message: error.message };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        window.location.href = '/';
    };

    const value = {
        user,
        token,
        isAuthenticated: Boolean(user && token),
        login,
        register,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
