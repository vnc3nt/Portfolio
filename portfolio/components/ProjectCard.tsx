'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Github, Monitor, Smartphone, X, ImagePlus, Loader2, Trash2, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { supabase } from '../utils/supabase';
import PlatformBadge from './PlatformBadge';
import { GitHubContributor } from '../utils/github';
import { AndroidIcon, AppleIcon, WindowsIcon } from './CustomIcons';

export interface Project {
  id: string;
  title: string;
  description: string;
  images: string[];
  date: string;
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string; // Legacy, can be mapped to platforms.web
  // We change platforms from boolean to string (URL)
  platforms: { apple: string; android: string; web: string; windows?: string };
  is_hidden?: boolean;
  is_private?: boolean;
  sort_order: number;
  collaborators?: GitHubContributor[];
}

interface ProjectCardProps {
  project: Project;
  isEditMode?: boolean;
  onUpdate?: (updatedProject: Project) => void;
  onDelete?: (projectId: string) => void;
}

export default function ProjectCard({ project, isEditMode = false, onUpdate, onDelete }: ProjectCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [editedProject, setEditedProject] = useState<Project>(project);
  const [newTech, setNewTech] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Sync local state if prop changes (e.g. after save)
    setEditedProject(project);
  }, [project]);

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % (project.images?.length || 1));
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + (project.images?.length || 1)) % (project.images?.length || 1));
  };

  useEffect(() => {
    if (!isHovered && (project.images?.length || 0) > 1 && !isEditMode) {
      const timer = setInterval(() => {
        nextImage();
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [isHovered, project.images, isEditMode]);

  const handleChange = <K extends keyof Project>(field: K, value: Project[K]) => {
    const updated = { ...editedProject, [field]: value };
    setEditedProject(updated);
    if (onUpdate) onUpdate(updated);
  };

  /* --- Bild-Logik --- */
  const removeImage = (imgToRemove: string) => {
    const updatedImages = (editedProject.images || []).filter(img => img !== imgToRemove);
    handleChange('images', updatedImages);
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${project.id}/${fileName}`; 

      const { error: uploadError } = await supabase.storage
        .from('portfolio-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio-images')
        .getPublicUrl(filePath);

      handleChange('images', [...(editedProject.images || []), publicUrl]);
    } catch (error) {
      alert('Fehler beim Bild-Upload: ' + error);
    } finally {
      setUploading(false);
    }
  };
  /* ----------------- */

  const removeTech = (techToRemove: string) => {
    const updatedTech = editedProject.technologies.filter(t => t !== techToRemove);
    handleChange('technologies', updatedTech);
  };

  const addTech = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTech.trim() !== '') {
      handleChange('technologies', [...editedProject.technologies, newTech.trim()]);
      setNewTech('');
    }
  };

  const stopPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <motion.div
      // Subtle Highlight: Ändern der Hintergrundfarbe beim Hovern - via Tailwind classes für bessere Darkmode-Kontrolle
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white/10 dark:bg-white/5 p-4 shadow-lg backdrop-blur-md transition-all 
        hover:bg-white/20 dark:hover:bg-white/10
        ${isEditMode ? 'border-[#7700ff] ring-2 ring-[#7700ff]/50 cursor-grab active:cursor-grabbing' : 'border-white/20 dark:border-white/10 ring-1 ring-white/20 cursor-default'} h-full`}
    >
      {/* Delete Button (Edit Mode Only) */}
      {isEditMode && onDelete && (
        <button 
          onClick={() => confirm('Projekt wirklich löschen?') && onDelete(project.id)}
          onMouseDown={stopPropagation}
          onTouchStart={stopPropagation}
          className="absolute top-2 right-2 z-20 bg-red-500/80 backdrop-blur-sm p-1.5 rounded-full text-white hover:bg-red-600 shadow-md"
        >
          <Trash2 size={16} />
        </button>
      )}

      {/* --- Image Section --- */}
      {isEditMode ? (
        <div 
          className="w-full bg-black/10 dark:bg-black/40 rounded-xl p-3 mb-4 border border-white/10" 
          onMouseDown={stopPropagation}
          onTouchStart={stopPropagation}
        >
          <span className="text-xs text-gray-500 dark:text-gray-400 mb-2 block font-medium">Bilder</span>
          <Reorder.Group 
            axis="x" 
            values={editedProject.images || []} 
            onReorder={(newOrder) => handleChange('images', newOrder)}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-400"
          >
            {(editedProject.images || []).map((img) => (
              <Reorder.Item 
                key={img} 
                value={img} 
                className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border border-white/20"
              >
                <img src={img} className="object-cover w-full h-full pointer-events-none" alt="preview" />
                <button 
                  onClick={() => removeImage(img)} 
                  className="absolute top-0.5 right-0.5 bg-red-500 rounded-full p-0.5 text-white"
                >
                  <X size={10} />
                </button>
              </Reorder.Item>
            ))}
            
            <label className="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-[#7700ff]/50 flex items-center justify-center cursor-pointer hover:bg-[#7700ff]/10 hover:border-[#7700ff] transition-colors">
              {uploading ? <Loader2 size={16} className="animate-spin text-[#7700ff]" /> : <ImagePlus size={16} className="text-[#7700ff]" />}
              <input type="file" accept="image/*" className="hidden" onChange={uploadImage} disabled={uploading} />
            </label>
          </Reorder.Group>
        </div>
      ) : (
        <div 
          className="group relative h-48 w-full overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-900/50 shadow-inner hover:shadow-md transition-shadow"
          onMouseDown={stopPropagation}
          onTouchStart={stopPropagation}
        >
           <AnimatePresence mode="wait">
            <motion.img
              key={currentImageIndex}
              src={editedProject.images?.[currentImageIndex] || 'https://via.placeholder.com/400x300?text=No+Image'}
              alt={editedProject.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute h-full w-full object-cover"
            />
          </AnimatePresence>
          
          {/* Navigation Arrows (Only if multiple images) */}
          {(editedProject.images?.length || 0) > 1 && (
            <>
              <button 
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              >
                <ChevronRight size={16} />
              </button>
              
              {/* Dots Indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {editedProject.images.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* --- Content --- */}
      <div className="mt-4 flex flex-1 flex-col">
        {/* Title & Date */}
        <div className="flex items-start justify-between mb-2">
          <div className="w-full">
            {isEditMode ? (
              <div className="space-y-2">
                 <input 
                  type="text" 
                  value={editedProject.title} 
                  onChange={(e) => handleChange('title', e.target.value)}
                  onMouseDown={stopPropagation}
                  onTouchStart={stopPropagation}
                  className="w-full bg-transparent text-lg font-bold border-b border-[#7700ff]/50 focus:outline-none"
                  placeholder="Titel"
                />
                 <input 
                  type="text" 
                  value={editedProject.date} 
                  onChange={(e) => handleChange('date', e.target.value)}
                  onMouseDown={stopPropagation}
                  onTouchStart={stopPropagation}
                  className="w-full bg-transparent text-xs text-gray-500 border-b border-gray-500/50 focus:outline-none"
                  placeholder="2024"
                />
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold tracking-tight">{editedProject.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{editedProject.date}</p>
              </>
            )}
          </div>
          
          {/* GitHub Icon Link (Show only if public or in edit mode) */}
          {(editedProject.githubUrl || isEditMode) && (
            <div className="ml-2">
               {isEditMode ? (
                  <input 
                    type="text" 
                    value={editedProject.githubUrl || ''}
                    onChange={(e) => handleChange('githubUrl', e.target.value)}
                    onMouseDown={stopPropagation}
                    onTouchStart={stopPropagation}
                    placeholder="GitHub URL"
                    className="w-24 text-[10px] bg-black/10 rounded p-1"
                  />
               ) : (
                  editedProject.githubUrl && !editedProject.is_private && (
                    <a 
                      href={editedProject.githubUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-gray-400 hover:text-white transition-colors"
                      onMouseDown={stopPropagation}
                      onTouchStart={stopPropagation}
                    >
                      <Github size={20} />
                    </a>
                  )
               )}
            </div>
          )}
        </div>

        {/* Description */}
        {isEditMode ? (
          <textarea
            value={editedProject.description}
            onChange={(e) => handleChange('description', e.target.value)}
            onMouseDown={stopPropagation}
            onTouchStart={stopPropagation}
            className="w-full bg-black/5 dark:bg-black/20 text-sm p-2 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-[#7700ff]"
            rows={3}
            placeholder="Beschreibung..."
          />
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300 w-full whitespace-pre-wrap leading-relaxed">
            {editedProject.description}
          </p>
        )}

        {/* Technologies (Chips) */}
        <div className="mt-4">
           {isEditMode ? (
             <div className="flex flex-wrap gap-2" onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
               {editedProject.technologies.map(t => (
                 <span key={t} className="px-2 py-1 bg-[#7700ff]/10 border border-[#7700ff]/30 rounded-md text-[10px] text-[#7700ff] flex items-center gap-1">
                   {t} 
                   <X size={10} className="cursor-pointer" onClick={() => removeTech(t)} />
                 </span>
               ))}
               <input 
                 value={newTech}
                 onChange={(e) => setNewTech(e.target.value)}
                 onKeyDown={addTech}
                 placeholder="+ Tech"
                 className="bg-transparent text-xs border-b border-gray-500 w-16 focus:border-[#7700ff] outline-none"
               />
             </div>
           ) : (
             <div className="flex flex-wrap gap-2">
               {editedProject.technologies.slice(0, 4).map(tech => (
                 <span key={tech} className="text-[10px] font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300">
                   {tech}
                 </span>
               ))}
               {editedProject.technologies.length > 4 && (
                 <span className="text-[10px] px-2 py-1 text-gray-400">+{editedProject.technologies.length - 4}</span>
               )}
             </div>
           )}
        </div>

        {/* Collaborators: First one on top (highest Z-index) */}
        {(editedProject.collaborators?.length || 0) > 0 && !isEditMode && (
          <div className="mt-4 flex -space-x-2 overflow-hidden py-1 pl-1" onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
             {editedProject.collaborators?.map((c, index) => (
               <a 
                 key={c.login} 
                 href={c.html_url} 
                 target="_blank" 
                 title={c.login} 
                 className="relative inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#111] hover:z-50 transition-all hover:scale-110"
                 style={{ zIndex: (editedProject.collaborators?.length || 0) - index }}
               >
                 <img className="h-full w-full rounded-full object-cover" src={c.avatar_url} alt={c.login} />
               </a>
             ))}
          </div>
        )}

        {/* Platform Badges */}
        {isEditMode ? (
          <div className="mt-auto pt-5 gap-2 grid grid-cols-1" onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
             <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-2 rounded text-xs">
                <Globe size={16} className="text-gray-600 dark:text-gray-300 shrink-0" />
                <input 
                  placeholder="Web URL" 
                  value={editedProject.platforms.web || ''} 
                  onChange={e => handleChange('platforms', {...editedProject.platforms, web: e.target.value})} 
                  className="bg-transparent border-b border-transparent focus:border-[#7700ff] outline-none w-full placeholder-gray-400"
                />
             </div>
             <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-2 rounded text-xs">
                <AppleIcon size={16} className="text-black dark:text-white shrink-0" />
                <input 
                  placeholder="App Store URL" 
                  value={editedProject.platforms.apple || ''} 
                  onChange={e => handleChange('platforms', {...editedProject.platforms, apple: e.target.value})} 
                  className="bg-transparent border-b border-transparent focus:border-[#7700ff] outline-none w-full placeholder-gray-400"
                />
             </div>
             <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-2 rounded text-xs">
                <AndroidIcon size={16} className="text-[#3DDC84] shrink-0" />
                <input 
                  placeholder="Play Store URL" 
                  value={editedProject.platforms.android || ''} 
                  onChange={e => handleChange('platforms', {...editedProject.platforms, android: e.target.value})} 
                  className="bg-transparent border-b border-transparent focus:border-[#7700ff] outline-none w-full placeholder-gray-400"
                />
             </div>
             <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-2 rounded text-xs">
                <WindowsIcon size={16} className="text-[#0078D7] shrink-0" />
                <input 
                  placeholder="Windows Store URL" 
                  value={editedProject.platforms.windows || ''} 
                  onChange={e => handleChange('platforms', {...editedProject.platforms, windows: e.target.value})} 
                  className="bg-transparent border-b border-transparent focus:border-[#7700ff] outline-none w-full placeholder-gray-400"
                />
             </div>
          </div>
        ) : (
          <div className="mt-auto pt-5 flex flex-wrap gap-2" onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
            <PlatformBadge 
              icon={Globe} 
              label="Web" 
              url={editedProject.platforms.web} 
              colorClass="bg-gray-700 dark:bg-white/20" 
              isEditMode={isEditMode}
            />
            <PlatformBadge 
              icon={AppleIcon} 
              label="App Store" 
              url={editedProject.platforms.apple} 
              colorClass="bg-black dark:bg-black/40" 
              isEditMode={isEditMode}
            />
            <PlatformBadge 
              icon={AndroidIcon} 
              label="Play Store" 
              url={editedProject.platforms.android} 
              colorClass="bg-[#3DDC84] text-black" 
              isEditMode={isEditMode}
            />
            <PlatformBadge 
              icon={WindowsIcon} 
              label="Windows Store" 
              url={editedProject.platforms.windows} 
              colorClass="bg-[#0078D7]" 
              isEditMode={isEditMode}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}