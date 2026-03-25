'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Github, Apple, Monitor, Smartphone, X, ImagePlus, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase'; // <-- Neu: Wird für den Upload gebraucht

export interface Project {
  id: string;
  title: string;
  description: string;
  images: string[];
  date: string;
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string;
  platforms: { apple: boolean; android: boolean; web: boolean };
  is_hidden?: boolean;
}

interface ProjectCardProps {
  project: Project;
  isEditMode?: boolean;
  onUpdate?: (updatedProject: Project) => void;
}

export default function ProjectCard({ project, isEditMode = false, onUpdate }: ProjectCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [editedProject, setEditedProject] = useState<Project>(project);
  const [newTech, setNewTech] = useState('');
  const [uploading, setUploading] = useState(false); // Zeigt einen Ladekreis beim Upload

  useEffect(() => {
    if (!isHovered && project.images?.length > 1 && !isEditMode) {
      const timer = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % project.images.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [isHovered, project.images, isEditMode]);

  // DER FIX: Generische Typisierung statt 'any'. TypeScript weiß jetzt, dass 'value' zum 'field' passen muss!
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
      const filePath = `${project.id}/${fileName}`; // Speichert das Bild in einem Ordner mit der Projekt-ID

      // 1. Lade das Bild in Supabase hoch
      const { error: uploadError } = await supabase.storage
        .from('portfolio-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Hole die öffentliche URL des Bildes
      const { data: { publicUrl } } = supabase.storage
        .from('portfolio-images')
        .getPublicUrl(filePath);

      // 3. Füge die URL in dein Projekt-Array ein
      handleChange('images', [...(editedProject.images || []), publicUrl]);
    } catch (error) {
      alert('Fehler beim Bild-Upload. Siehe Konsole.');
      console.error(error);
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

  const togglePlatform = (platform: keyof Project['platforms']) => {
    if (!isEditMode) return;
    handleChange('platforms', {
      ...editedProject.platforms,
      [platform]: !editedProject.platforms[platform]
    });
  };

  return (
    <motion.div
      whileHover={!isEditMode ? { scale: 1.02, y: -5 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white/10 p-4 shadow-lg backdrop-blur-md dark:bg-white/5 transition-all ${
        isEditMode ? 'border-[#7700ff] ring-2 ring-[#7700ff]/50' : 'border-white/20 dark:border-white/10'
      } w-full max-w-sm`}
    >
      {/* Im Edit-Modus: Bild-Galerie mit Drag & Drop + Upload */}
      {isEditMode ? (
        <div className="w-full bg-black/10 dark:bg-black/40 rounded-xl p-3 mb-4 border border-white/10">
          <span className="text-xs text-gray-500 dark:text-gray-400 mb-2 block font-medium">Bilder (Drag & Drop zum Sortieren)</span>
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
                className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border border-white/20 hover:ring-2 hover:ring-[#7700ff]"
              >
                <img src={img} className="object-cover w-full h-full pointer-events-none" alt="preview" />
                <button 
                  onClick={() => removeImage(img)} 
                  className="absolute top-1 right-1 bg-red-500/80 backdrop-blur-sm rounded-full p-0.5 text-white hover:bg-red-500"
                >
                  <X size={12} />
                </button>
              </Reorder.Item>
            ))}
            
            {/* Upload Button */}
            <label className="shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-[#7700ff]/50 flex items-center justify-center cursor-pointer hover:bg-[#7700ff]/10 hover:border-[#7700ff] transition-colors">
              {uploading ? <Loader2 size={20} className="animate-spin text-[#7700ff]" /> : <ImagePlus size={20} className="text-[#7700ff]" />}
              <input type="file" accept="image/*" className="hidden" onChange={uploadImage} disabled={uploading} />
            </label>
          </Reorder.Group>
        </div>
      ) : (
        /* Normales Bild-Karussell */
        <div className="relative h-48 w-full overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-900/50">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImageIndex}
              src={editedProject.images?.[currentImageIndex] || 'https://via.placeholder.com/400x300?text=Kein+Bild'}
              alt={`${editedProject.title} Preview`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute h-full w-full object-cover"
            />
          </AnimatePresence>
        </div>
      )}

      {/* --- Restliche Kachel (Texte, Chips, Badges) --- */}
      <div className="mt-4 flex flex-1 flex-col">
        <div className="flex items-start justify-between">
          <div className="w-full mr-4">
            {isEditMode ? (
              <>
                <input 
                  type="text" 
                  value={editedProject.title} 
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="w-full bg-transparent text-xl font-bold text-gray-900 dark:text-white border-b border-[#7700ff]/50 focus:outline-none focus:border-[#7700ff] mb-1"
                />
                <input 
                  type="text" 
                  value={editedProject.date} 
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="w-full bg-transparent text-xs text-gray-500 dark:text-gray-400 border-b border-gray-500/50 focus:outline-none focus:border-[#7700ff]"
                />
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold">{editedProject.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{editedProject.date}</p>
              </>
            )}
          </div>
        </div>

        {isEditMode ? (
          <textarea
            value={editedProject.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="mt-2 w-full flex-1 resize-none bg-black/5 dark:bg-black/20 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#7700ff] rounded-md p-1"
            rows={4}
          />
        ) : (
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{editedProject.description}</p>
        )}

        {/* Drag & Drop Tech-Chips */}
        <div className="mt-3">
          <Reorder.Group 
            axis="x" 
            values={editedProject.technologies || []} 
            onReorder={(newOrder) => handleChange('technologies', newOrder)}
            className="flex flex-wrap gap-2 items-center"
          >
            {(editedProject.technologies || []).map((tech) => (
              <Reorder.Item 
                key={tech} 
                value={tech}
                drag={isEditMode}
                className={`flex items-center gap-1 rounded-full border border-[#7700ff]/30 bg-[#7700ff]/10 px-2 py-1 text-xs text-[#7700ff] dark:text-[#a955ff] ${isEditMode ? 'cursor-grab active:cursor-grabbing hover:bg-[#7700ff]/20' : ''}`}
              >
                {tech}
                {isEditMode && (
                  <X size={12} className="cursor-pointer hover:text-red-500 ml-1" onClick={() => removeTech(tech)} />
                )}
              </Reorder.Item>
            ))}
            {isEditMode && (
               <input 
                 type="text" 
                 value={newTech}
                 onChange={(e) => setNewTech(e.target.value)}
                 onKeyDown={addTech}
                 placeholder="+ Tech (Enter)"
                 className="bg-transparent text-xs border-b border-gray-500/50 w-24 focus:outline-none focus:border-[#7700ff] py-1"
               />
            )}
          </Reorder.Group>
        </div>

        {/* Plattform Badges */}
        <div className="mt-auto pt-4 flex gap-2">
          <div 
            onClick={() => togglePlatform('apple')}
            className={`group flex h-8 items-center overflow-hidden rounded-full transition-all duration-300 ease-out 
              ${editedProject.platforms?.apple ? 'bg-blue-500 text-white' : 'bg-blue-500/30 text-white grayscale'} 
              ${isEditMode ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 w-8' : editedProject.platforms?.apple ? 'w-8 hover:w-28 cursor-pointer' : 'w-8 cursor-not-allowed'}
            `}
          >
            <div className="flex w-8 shrink-0 items-center justify-center"><Apple size={16} /></div>
            {!isEditMode && <span className="whitespace-nowrap pr-3 text-xs font-medium opacity-0 transition-opacity duration-300 group-hover:opacity-100">App Store</span>}
          </div>

          <div 
            onClick={() => togglePlatform('web')}
            className={`group flex h-8 items-center overflow-hidden rounded-full transition-all duration-300 ease-out 
              ${editedProject.platforms?.web ? 'bg-gray-200 dark:bg-white text-black' : 'bg-gray-200/30 dark:bg-white/30 text-black/50 grayscale'} 
              ${isEditMode ? 'cursor-pointer hover:ring-2 hover:ring-white w-8' : editedProject.platforms?.web ? 'w-8 hover:w-20 cursor-pointer' : 'w-8 cursor-not-allowed'}
            `}
          >
            <div className="flex w-8 shrink-0 items-center justify-center"><Monitor size={16} /></div>
            {!isEditMode && <span className="whitespace-nowrap pr-3 text-xs font-medium opacity-0 transition-opacity duration-300 group-hover:opacity-100">Web</span>}
          </div>

          <div 
            onClick={() => togglePlatform('android')}
            className={`group flex h-8 items-center overflow-hidden rounded-full transition-all duration-300 ease-out 
              ${editedProject.platforms?.android ? 'bg-green-500 text-white' : 'bg-green-500/30 text-white grayscale'} 
              ${isEditMode ? 'cursor-pointer hover:ring-2 hover:ring-green-400 w-8' : editedProject.platforms?.android ? 'w-8 hover:w-28 cursor-pointer' : 'w-8 cursor-not-allowed'}
            `}
          >
            <div className="flex w-8 shrink-0 items-center justify-center"><Smartphone size={16} /></div>
            {!isEditMode && <span className="whitespace-nowrap pr-3 text-xs font-medium opacity-0 transition-opacity duration-300 group-hover:opacity-100">Play Store</span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}