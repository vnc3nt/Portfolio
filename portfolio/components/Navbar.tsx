'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, LogIn, LogOut, Languages } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { User } from '@supabase/supabase-js'; // <-- 1. Wir importieren den korrekten Supabase-User-Typ

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from './LanguageProvider';

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  
  // 2. Wir nutzen den Typ 'User | null' anstelle von 'any'
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-200 bg-white/30 px-6 py-4 backdrop-blur-md dark:bg-black/30 dark:border-white/10 transition-colors duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        
        {/* Navigation Links */}
        <div className="flex gap-6 text-sm font-medium">
          <Link 
            href="/" 
            className={`border-b-2 pb-1 transition-colors hover:text-[#7700ff] ${pathname === '/' ? 'border-[#7700ff] text-[#7700ff]' : 'border-transparent text-gray-600 dark:text-gray-300'}`}
          >
            Portfolio
          </Link>
          <Link 
            href="/about" 
            className={`border-b-2 pb-1 transition-colors hover:text-[#7700ff] ${pathname === '/about' ? 'border-[#7700ff] text-[#7700ff]' : 'border-transparent text-gray-600 dark:text-gray-300'}`}
          >
            {language === 'de' ? 'Über mich' : 'About'}
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {mounted && (
            user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-500/20 dark:text-red-400"
              >
                <LogOut size={16} />
                Logout
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 rounded-full bg-black/5 px-4 py-2 text-sm font-medium text-gray-800 transition-all hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              >
                <LogIn size={16} />
                Admin Login
              </button>
            )
          )}

          {mounted && (
            <button
              onClick={() => setLanguage(language === 'de' ? 'en' : 'de')}
              className="flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-2 text-xs font-semibold uppercase text-gray-800 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:scale-105 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20"
              aria-label={language === 'de' ? 'Auf Englisch wechseln' : 'Auf Deutsch wechseln'}
              title={language === 'de' ? 'English' : 'Deutsch'}
            >
              <Languages size={16} />
              {language === 'de' ? 'EN' : 'DE'}
            </button>
          )}

          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full bg-white/50 p-2 text-gray-800 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:scale-105 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20"
              aria-label="Toggle Dark Mode"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}