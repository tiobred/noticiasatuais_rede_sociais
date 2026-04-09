'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
    isOpen: boolean;
    isCollapsed: boolean;
    toggleSidebar: () => void;
    closeSidebar: () => void;
    toggleCollapse: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleSidebar = () => setIsOpen(prev => !prev);
    const closeSidebar = () => setIsOpen(false);
    const toggleCollapse = () => setIsCollapsed(prev => !prev);

    return (
        <SidebarContext.Provider value={{ isOpen, isCollapsed, toggleSidebar, closeSidebar, toggleCollapse }}>
            <div data-collapsed={isCollapsed} className="group/sidebar-provider contents">
                {children}
            </div>
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) throw new Error('useSidebar must be used within a SidebarProvider');
    return context;
}
