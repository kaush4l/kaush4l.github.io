import { Sidebar } from '../components/layout/Sidebar';
import { MainContent } from '../components/layout/MainContent';
import { useLocation } from 'wouter';

export function ResumeView() {
  const [location] = useLocation();
  const section = location.split('/')[1] || 'contact';

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <MainContent section={section} />
      </main>
    </div>
  );
}
