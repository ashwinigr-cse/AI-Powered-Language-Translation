import {
  Globe2,
  History,
  Home,
  Info,
  Languages,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import type {NavSection, ThemeMode} from '../types';
import {ThemeToggle} from './ThemeToggle';

interface NavbarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: (open: boolean) => void;
}

const NAV_ITEMS: {id: NavSection; label: string; icon: typeof Home}[] = [
  {id: 'home', label: 'Home', icon: Home},
  {id: 'translator', label: 'Translator', icon: Languages},
  {id: 'history', label: 'Translation History', icon: History},
  {id: 'languages', label: 'Supported Languages', icon: Globe2},
  {id: 'about', label: 'About Project', icon: Info},
  {id: 'settings', label: 'Settings', icon: Settings},
];

const SECTION_TITLES: Record<NavSection, string> = {
  home: 'Overview',
  translator: 'Text & Speech Translator',
  history: 'Translation History',
  languages: 'Supported Languages',
  about: 'About Project',
  settings: 'Preferences & Provider Settings',
};

export function Navbar({
  activeSection,
  onSelectSection,
  theme,
  onToggleTheme,
  mobileMenuOpen,
  onToggleMobileMenu,
}: NavbarProps) {
  const handleNavigate = (section: NavSection) => {
    onSelectSection(section);
    onToggleMobileMenu(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-4">
      <div>
        <button
          type="button"
          onClick={() => handleNavigate('home')}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Languages className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap dark:text-white">
            LinguaAI
          </span>
        </button>

        <nav aria-label="Primary navigation" className="mt-6 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <p className="font-medium text-slate-700 dark:text-slate-300">
          LinguaAI – Intelligent Language Translator
        </p>
        <p className="mt-1">FastAPI · LibreTranslate · Web Speech</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => onToggleMobileMenu(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-end px-4 pt-3">
              <button
                type="button"
                onClick={() => onToggleMobileMenu(false)}
                aria-label="Close navigation menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Top Workspace Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onToggleMobileMenu(true)}
            aria-label="Open navigation menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display text-base font-bold text-slate-900 whitespace-nowrap dark:text-white">
            LinguaAI
          </span>
        </div>

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </header>

      {/* Desktop Top Bar inside Main Column is rendered by layout wrapper using SECTION_TITLES */}
      <span className="sr-only">{SECTION_TITLES[activeSection]}</span>
    </>
  );
}

export {SECTION_TITLES};
