'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';
import { Plus, Eye, EyeOff, Edit, Trash2 } from 'lucide-react';

interface AdminProject {
  id: string;
  title: string;
  date: string;
  is_hidden: boolean;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const router = useRouter();

  const checkUserAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/');
      return;
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .neq('title', 'About-Page-Data-Do-Not-Delete')
      .order('sort_order', { ascending: true });

    if (error) console.error(error);
    if (data) setProjects(data);
    setLoading(false);
  };

  useEffect(() => {
    // Diese Zeile ignoriert die überflüssige React-Warnung
    // eslint-disable-next-line react-hooks/exhaustive-deps
    checkUserAndLoadData();
  }, []);

  const toggleVisibility = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('projects')
      .update({ is_hidden: !currentStatus })
      .eq('id', id);
    
    checkUserAndLoadData();
  };

  if (loading) {
    return <div className="pt-32 text-center text-gray-500">Lade Admin-Bereich...</div>;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 pt-32 pb-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-500">Verwalte hier dein Portfolio.</p>
        </div>
        
        <button className="flex items-center gap-2 rounded-xl bg-[#7700ff] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#5e00cc] shadow-lg shadow-[#7700ff]/30">
          <Plus size={18} />
          Neues Projekt
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5 backdrop-blur-md">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
          <thead className="border-b border-gray-200 bg-gray-50/50 dark:border-white/10 dark:bg-black/20">
            <tr>
              <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Projektname</th>
              <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Datum</th>
              <th className="px-6 py-4 font-medium text-gray-900 dark:text-white">Status</th>
              <th className="px-6 py-4 font-medium text-gray-900 dark:text-white text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
            {projects.map((project) => (
              <tr key={project.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{project.title}</td>
                <td className="px-6 py-4">{project.date}</td>
                <td className="px-6 py-4">
                  {project.is_hidden ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500">
                      <EyeOff size={14} /> Versteckt
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <Eye size={14} /> Öffentlich
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-3">
                  <button 
                    onClick={() => toggleVisibility(project.id, project.is_hidden)}
                    className="text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    {project.is_hidden ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button className="text-gray-400 hover:text-[#7700ff] transition-colors"><Edit size={18} /></button>
                  <button className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}