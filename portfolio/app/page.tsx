'use client';

import { useEffect, useState } from 'react';
import ProjectCard, { Project } from "../components/ProjectCard";
import { supabase } from "../utils/supabase";
import { User } from '@supabase/supabase-js';
import { Edit3, Save, X } from 'lucide-react';

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Datenladen sicher im useEffect gekapselt
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const loadProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) console.error(error);
      if (data) setProjects(data as Project[]);
      setLoading(false);
    };

    loadProjects();
  }, []);

  const handleProjectUpdate = (updatedProject: Project) => {
    setProjects(prevProjects => 
      prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p)
    );
  };

  const saveChangesToDatabase = async () => {
    setLoading(true);
    let hasError = false;

    for (const project of projects) {
      const { error } = await supabase
        .from('projects')
        .update({
          title: project.title,
          description: project.description,
          date: project.date,
          technologies: project.technologies,
          platforms: project.platforms, // <-- Daran lag es u.a.!
        })
        .eq('id', project.id);

      if (error) {
        console.error("Speicher-Fehler:", error);
        hasError = true;
      }
    }

    setLoading(false);
    
    if (hasError) {
      alert("Es gab einen Fehler beim Speichern! Überprüfe die Konsole.");
    } else {
      setIsEditMode(false);
    }
  };

  // Hilfsfunktion zum Neuladen nach dem Abbrechen
  const reloadData = async () => {
    setLoading(true);
    const { data } = await supabase.from('projects').select('*').order('sort_order', { ascending: true });
    if (data) setProjects(data as Project[]);
    setLoading(false);
  };

  if (loading && projects.length === 0) return <div className="h-screen flex items-center justify-center">Lade Portfolio...</div>;

  return (
    <main className="relative min-h-[calc(100vh-80px)] overflow-hidden flex flex-col items-center p-6 lg:p-12">
      {/* Hintergrund */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#7700ff] rounded-full mix-blend-multiply filter blur-[100px] opacity-40 dark:opacity-20 animate-blob"></div>
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 dark:opacity-20 animate-blob animation-delay-2000"></div>
      
      {/* Admin Floating Action Bar */}
      {user && (
        <div className="fixed bottom-10 z-50 flex items-center gap-3 bg-white/30 dark:bg-black/50 backdrop-blur-xl border border-white/20 p-3 rounded-full shadow-2xl">
          {!isEditMode ? (
            <button 
              onClick={() => setIsEditMode(true)}
              className="flex items-center gap-2 bg-[#7700ff] text-white px-4 py-2 rounded-full font-medium hover:bg-[#5e00cc] transition-all"
            >
              <Edit3 size={18} /> Portfolio bearbeiten
            </button>
          ) : (
            <>
              <button 
                onClick={saveChangesToDatabase}
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full font-medium hover:bg-green-600 transition-all"
              >
                <Save size={18} /> Speichern
              </button>
              <button 
                onClick={() => { setIsEditMode(false); reloadData(); }}
                className="flex items-center gap-2 bg-red-500/20 text-red-500 dark:text-red-400 px-4 py-2 rounded-full font-medium hover:bg-red-500/30 transition-all"
              >
                <X size={18} /> Abbrechen
              </button>
            </>
          )}
        </div>
      )}

      {/* Hero */}
      <div className="relative z-10 w-full max-w-7xl mx-auto mb-16 text-center mt-10">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
          Meine <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7700ff] to-blue-500">Projekte</span>
        </h1>
      </div>

      {/* Grid */}
      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
        {projects.filter(p => isEditMode || !p.is_hidden).map((project) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            isEditMode={isEditMode}
            onUpdate={handleProjectUpdate}
          />
        ))}
      </div>
    </main>
  );
}