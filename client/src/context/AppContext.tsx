/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api.js";
import { toast } from "react-hot-toast";

interface UserType {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: "user" | "admin" | "owner";
}

interface AppContextType {
    user: UserType | null;
    token: string | null;
    loading: boolean;
    isAuthenticated: boolean;
    isAuthModalOpen: boolean;
    setAuthModalOpen: (open: boolean) => void;
    login: (email: string, password: string) => Promise<boolean>;
    register: (name: string, email: string, password: string, phone?: string, role?: string) => Promise<boolean>;
    logout: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

interface Props {
    children: React.ReactNode;
}

export const AppContextProvider = ({ children }: Props) => {
    const [user, setUser] = useState<UserType | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
    const [loading, setLoading] = useState<boolean>(true);
    const [isAuthModalOpen, setAuthModalOpen] = useState<boolean>(false);

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const response = await api.post("/api/auth/login", { email, password });
            setToken(response.data.token);
            setUser(response.data);
            localStorage.setItem("token", response.data.token);
            toast.success(`Welcome back, ${response.data.name}!`);
            return true;
        } catch (error: any) {
            const errMsg = error.response?.data?.message || "Invalid credentials. Please try again.";
            toast.error(errMsg);
            return false;
        }
    };

    const register = async (name: string, email: string, password: string, phone?: string, role?: string): Promise<boolean> => {
        try {
            const response = await api.post("/api/auth/register", { name, email, password, phone, role });
            setToken(response.data.token);
            setUser(response.data);
            localStorage.setItem("token", response.data.token);
            toast.success("Account registered successfully!");
            return true;
        } catch (error: any) {
            const errMsg = error.response?.data?.message || "Registration failed. Please try again.";
            toast.error(errMsg);
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        toast.success("Signed out successfully");
        setTimeout(() => {
            window.location.href = "/";
        }, 500);
    };

    useEffect(() => {
        const loadUser = async () => {
            if (token) {
                try {
                    const response = await api.get("/api/auth/me");
                    setUser(response.data);
                } catch (error) {
                    console.error("Token validation failed, signing out:", error);
                    localStorage.removeItem("token");
                    setToken(null);
                    setUser(null);
                }
            }
            setLoading(false);
        };
        loadUser();
    }, [token]);

    const value: AppContextType = {
        user,
        token,
        loading,
        isAuthenticated: !!user,
        isAuthModalOpen,
        setAuthModalOpen,
        login,
        register,
        logout,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppContext must be used within AppContextProvider");
    }
    return context;
};
