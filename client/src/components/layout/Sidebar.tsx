import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ThemeSwitcher } from '../theme/ThemeSwitcher';
import { useCallback } from 'react';

const navItems = [
  { name: 'Contact', path: '/contact' },
  { name: 'Work Experience', path: '/work-experience' },
  { name: 'Education', path: '/education' },
  { name: 'Projects', path: '/projects' },
];

export function Sidebar() {
  const [location, setLocation] = useLocation();
  
  const handleNavigation = useCallback((path: string) => {
    const currentPath = path === '/contact' ? '/' : path;
    setLocation(currentPath);
  }, [setLocation]);

  // Determine active state more reliably
  const isActiveRoute = useCallback((path: string) => {
    return location === path || (location === '/' && path === '/contact');
  }, [location]);

  return (
    <div className="w-64 h-screen border-r border-gray-200 bg-card">
      <div className="flex flex-col h-full">
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            My Resume
          </h1>
          <ThemeSwitcher />
        </div>
        
        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "w-full flex items-center py-2 px-4 rounded-lg text-sm font-medium transition-colors",
                  isActiveRoute(item.path)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground"
                )}
              >
                {item.name}
              </button>
            ))}
          </nav>
        </ScrollArea>
      </div>
    </div>
  );
}