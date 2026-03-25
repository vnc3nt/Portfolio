'use client';

import { useState, useEffect } from 'react';
import { X, Github, CloudDownload, Loader2, Lock } from 'lucide-react';
import { Project } from './ProjectCard';
import { supabase } from '../utils/supabase';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (project: Omit<Project, 'id'>) => void;
  githubUsername?: string; // Optional, falls wir den Usernamen kennen
}

export default function AddProjectModal({ isOpen, onClose, onAdd, githubUsername = "vnc3nt" }: AddProjectModalProps) {
  const [mode, setMode] = useState<'manual' | 'import'>('import');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [importing, setImporting] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  useEffect(() => {
    if (isOpen && mode === 'import') {
      fetchRepos();
    }
  }, [isOpen, mode]);

  const fetchRepos = async () => {
    setLoadingRepos(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch(`/api/github/repos?username=${githubUsername}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch repos');
      const data = await res.json();
      setRepos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleImport = async (repoName: string, owner: string) => {
    setImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/github/details?owner=${owner}&repo=${repoName}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch repo details');
      const details = await res.json();

      if (details) {
        onAdd({
          title: details.name,
          description: details.description || '',
          date: new Date(details.updated_at).getFullYear().toString(),
          technologies: details.topics || [],
          // Wenn das Repo privat ist, KEINE URL speichern (undefined)
          githubUrl: details.private ? undefined : details.html_url,
          liveUrl: details.homepage || '',
          images: [], // Images müssen manuell hinzugefügt werden
          collaborators: details.contributors || [],
          platforms: { apple: '', android: '', web: details.homepage || '', windows: '' },
          is_hidden: false,
          is_private: details.private,
          sort_order: 0
        });
        onClose();
      }
    } catch (error) {
      console.error(error);
      alert("Fehler beim Importieren: " + error);
    } finally {
      setImporting(false);
    }
  };


  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      title,
      description,
      date: new Date().getFullYear().toString(),
      technologies: [],
      images: [],
      platforms: { apple: '', android: '', web: '', windows: '' },
      is_hidden: false,
      is_private: false,
      sort_order: 0
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-gray-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <h2 className="text-lg font-bold text-white">Neues Projekt</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button 
            onClick={() => setMode('import')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'import' ? 'bg-[#7700ff]/20 text-[#7700ff]' : 'text-gray-400 hover:text-white'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Github size={16} /> Import from GitHub
            </div>
          </button>
          <button 
            onClick={() => setMode('manual')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-[#7700ff]/20 text-[#7700ff]' : 'text-gray-400 hover:text-white'}`}
          >
            Manuell erstellen
          </button>
        </div>

        {/* Content */}
        <div className="p-6 h-[400px] overflow-y-auto custom-scrollbar">
          {mode === 'import' ? (
            <div className="space-y-3">
              {loadingRepos ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#7700ff]" /></div>
              ) : (
                repos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => handleImport(repo.name, repo.owner.login)}
                    disabled={importing}
                    className="w-full text-left group p-3 rounded-xl border border-white/10 hover:border-[#7700ff]/50 hover:bg-white/5 transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white group-hover:text-[#7700ff]">{repo.name}</span>
                        {repo.private && <Lock size={12} className="text-gray-500" />}
                      </div>
                      {importing ? <Loader2 size={14} className="animate-spin" /> : <CloudDownload size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-1">{repo.description || "Keine Beschreibung"}</p>
                  </button>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Titel</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white focus:border-[#7700ff] focus:outline-none"
                  placeholder="Projekt Name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Beschreibung</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white focus:border-[#7700ff] focus:outline-none h-24 resize-none"
                  placeholder="Kurze Beschreibung..."
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-[#7700ff] hover:bg-[#6600cc] text-white py-2 rounded-lg font-medium transition-colors"
              >
                Projekt erstellen
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
