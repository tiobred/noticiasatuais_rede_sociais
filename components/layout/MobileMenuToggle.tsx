'use client';

import { Menu } from 'lucide-react';
import { useSidebar } from './SidebarContext';

export function MobileMenuToggle() {
    const { toggleSidebar } = useSidebar();

    return (
        <button
            onClick={toggleSidebar}
            className="md:hidden w-9 h-9 rounded-lg glass glass-hover flex items-center justify-center text-white/70 hover:text-white shrink-0"
        >
            <Menu className="w-5 h-5" />
        </button>
    );
}
