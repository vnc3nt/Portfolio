'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import Cropper, { type Area } from 'react-easy-crop';
import { Github, X, ImagePlus, Loader2, Trash2, History, ChevronLeft, ChevronRight, Globe, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../utils/supabase';
import PlatformBadge from './PlatformBadge';
import { GitHubContributor } from '../utils/github';
import { AndroidIcon, AppleIcon, WindowsIcon } from './CustomIcons';
import { LanguageSwitch, useLanguage, type Language } from './LanguageProvider';
import { localizedText } from '../utils/portfolioLogic';

export interface Project {
  id: string;
  title: string;
  title_en?: string;
  description: string;
  description_en?: string;
  images: string[];
  date: string;
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string; // Legacy, can be mapped to platforms.web
  // We change platforms from boolean to string (URL)
  platforms: { apple: string; android: string; web: string; windows?: string };
  is_hidden?: boolean;
  is_private?: boolean;
  is_deleted?: boolean;
  sort_order: number;
  collaborators?: GitHubContributor[];
  created_at?: string;
}

interface ProjectCardProps {
  project: Project;
  isEditMode?: boolean;
  onUpdate?: (updatedProject: Project) => void;
  onDelete?: (projectId: string) => void;
}

export default function ProjectCard({ project, isEditMode = false, onUpdate, onDelete }: ProjectCardProps) {
  const fallbackImage = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22 viewBox=%220 0 400 300%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%25%22 y1=%220%25%22 x2=%22100%25%22 y2=%22100%25%22%3E%3Cstop offset=%220%25%22 stop-color=%22%2318273a%22/%3E%3Cstop offset=%22100%25%22 stop-color=%22%23261448%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%22400%22 height=%22300%22 fill=%22url(%23g)%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23cbd5e1%22 font-family=%22system-ui%22 font-size=%2220%22%3EKein Bild%3C/text%3E%3C/svg%3E';
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageOrientations, setImageOrientations] = useState<Record<string, 'portrait' | 'landscape'>>({});
  const [isHovered, setIsHovered] = useState(false);
  const [editedProject, setEditedProject] = useState<Project>(project);
  const [newTech, setNewTech] = useState('');
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState<'landscape' | 'portrait'>('landscape');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropSaving, setIsCropSaving] = useState(false);
  
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyVersions, setHistoryVersions] = useState<Project[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [isTechExpanded, setIsTechExpanded] = useState(false);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);
  const { language } = useLanguage();
  const [titleLanguage, setTitleLanguage] = useState<Language>(language);
  const [descriptionLanguage, setDescriptionLanguage] = useState<Language>(language);

  const visibleTitle = localizedText(language, editedProject.title, editedProject.title_en);
  const visibleDescription = localizedText(language, editedProject.description, editedProject.description_en);

  const fetchHistory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('title', project.title)
      .order('created_at', { ascending: false });
    
    if (data) {
      setHistoryVersions(data as Project[]);
    }
    setHistoryLoading(false);
  };

  const handleRestoreVersion = async (oldVersion: Project) => {
    if (!confirm('Diese alte Version als neue aktuelle Version wiederherstellen?')) return;
    
    const payload = {
      title: oldVersion.title,
      title_en: oldVersion.title_en,
      description: oldVersion.description,
      description_en: oldVersion.description_en,
      date: oldVersion.date,
      technologies: oldVersion.technologies,
      platforms: oldVersion.platforms,
      images: oldVersion.images,
      githubUrl: oldVersion.githubUrl,
      collaborators: oldVersion.collaborators,
      sort_order: project.sort_order, // keep current sorting
      is_hidden: oldVersion.is_hidden,
      is_private: oldVersion.is_private,
      is_deleted: false
    };

    const { data, error } = await supabase.from('projects').insert([payload]).select().single();
    if (!error && data && onUpdate) {
      onUpdate(data as Project);
      setIsHistoryModalOpen(false);
      setPreviewProject(null);
    } else if (error) {
      alert("Fehler beim Wiederherstellen: " + error.message);
    }
  };

  useEffect(() => {
    // Sync local state if prop changes (e.g. after save)
    setEditedProject(project);
  }, [project]);

  useEffect(() => {
    setIsTechExpanded(false);
  }, [project.id, isEditMode]);

  const nextImage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % (project.images?.length || 1));
  }, [project.images]);

  const prevImage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + (project.images?.length || 1)) % (project.images?.length || 1));
  }, [project.images]);

  useEffect(() => {
    if (!isHovered && !isImageLightboxOpen && (project.images?.length || 0) > 1 && !isEditMode) {
      const timer = setInterval(() => {
        nextImage();
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [isHovered, isImageLightboxOpen, project.images, isEditMode, nextImage]);

  useEffect(() => {
    if (!isImageLightboxOpen) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsImageLightboxOpen(false);
      } else if (event.key === 'ArrowLeft') {
        prevImage();
      } else if (event.key === 'ArrowRight') {
        nextImage();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isImageLightboxOpen, nextImage, prevImage]);

  useEffect(() => {
    const closeOtherLightboxes = () => setIsImageLightboxOpen(false);
    window.addEventListener('portfolio:close-image-lightboxes', closeOtherLightboxes);
    return () => window.removeEventListener('portfolio:close-image-lightboxes', closeOtherLightboxes);
  }, []);

  const openImageLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new Event('portfolio:close-image-lightboxes'));
    setIsImageLightboxOpen(true);
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>, imageUrl: string) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    const orientation = naturalHeight > naturalWidth ? 'portrait' : 'landscape';
    setImageOrientations((previous) => (
      previous[imageUrl] === orientation ? previous : { ...previous, [imageUrl]: orientation }
    ));
  };

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

  const selectImageForCrop = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setCropSource(objectUrl);
    setCropMode('landscape');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const closeCropper = () => {
    if (cropSource) URL.revokeObjectURL(cropSource);
    setCropSource(null);
    setCroppedAreaPixels(null);
  };

  const uploadCroppedImage = async () => {
    if (!cropSource || !croppedAreaPixels) return;

    try {
      setIsCropSaving(true);
      const image = new Image();
      image.src = cropSource;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Das Bild konnte nicht gelesen werden.'));
      });

      const canvas = document.createElement('canvas');
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas ist nicht verfügbar.');

      context.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      const croppedBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Das zugeschnittene Bild konnte nicht erstellt werden.'));
        }, 'image/jpeg', 0.92);
      });

      const fileName = `${Math.random().toString(36).substring(2)}.jpg`;
      const filePath = `${project.id}/${fileName}`; 

      const { error: uploadError } = await supabase.storage
        .from('portfolio-images')
        .upload(filePath, croppedBlob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio-images')
        .getPublicUrl(filePath);

      handleChange('images', [...(editedProject.images || []), publicUrl]);
      closeCropper();
    } catch (error) {
      alert('Fehler beim Bild-Upload: ' + error);
    } finally {
      setIsCropSaving(false);
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
        ${isEditMode ? 'border-[#7700ff] ring-2 ring-[#7700ff]/50 cursor-grab active:cursor-grabbing' : 'border-white/20 dark:border-white/10 ring-1 ring-white/20 cursor-default'}
        ${isEditMode && editedProject.is_hidden ? 'opacity-45 grayscale' : ''} h-full`}
    >
      {/* Edit Mode Buttons */}
      {isEditMode && (
        <div className="absolute top-2 right-2 z-20 flex gap-2">
          {/* History Button */}
          <button 
            onClick={fetchHistory}
            onMouseDown={stopPropagation}
            onTouchStart={stopPropagation}
            className="bg-blue-500/80 backdrop-blur-sm p-1.5 rounded-full text-white hover:bg-blue-600 shadow-md"
            title="Versionsverlauf"
          >
            <History size={16} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleChange('is_hidden', !editedProject.is_hidden);
            }}
            onMouseDown={stopPropagation}
            onTouchStart={stopPropagation}
            className={`backdrop-blur-sm p-1.5 rounded-full text-white shadow-md transition-colors ${editedProject.is_hidden ? 'bg-amber-500/90 hover:bg-amber-600' : 'bg-slate-500/80 hover:bg-slate-600'}`}
            title={editedProject.is_hidden ? 'Card einblenden' : 'Card ausblenden'}
          >
            {editedProject.is_hidden ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          {/* Delete Button */}
          {onDelete && (
            <button 
              onClick={() => confirm('Projekt in den Papierkorb verschieben?') && onDelete(project.id)}
              onMouseDown={stopPropagation}
              onTouchStart={stopPropagation}
              className="bg-red-500/80 backdrop-blur-sm p-1.5 rounded-full text-white hover:bg-red-600 shadow-md"
              title="Projekt löschen"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
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
              {isCropSaving ? <Loader2 size={16} className="animate-spin text-[#7700ff]" /> : <ImagePlus size={16} className="text-[#7700ff]" />}
                <input type="file" accept="image/*" className="hidden" onChange={selectImageForCrop} disabled={isCropSaving} />
            </label>
          </Reorder.Group>
        </div>
      ) : (
        <div 
            className="group relative aspect-video w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-zinc-900 shadow-inner hover:shadow-md transition-shadow cursor-zoom-in"
          onClick={openImageLightbox}
          onMouseDown={stopPropagation}
          onTouchStart={stopPropagation}
        >
           <AnimatePresence mode="wait">
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <img
                src={editedProject.images?.[currentImageIndex] || fallbackImage}
                alt={editedProject.title}
                onLoad={(event) => handleImageLoad(event, editedProject.images?.[currentImageIndex] || fallbackImage)}
                className={imageOrientations[editedProject.images?.[currentImageIndex] || fallbackImage] === 'portrait' ? 'hidden' : 'absolute inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] object-contain rounded-lg shadow-lg ring-1 ring-black/10 dark:ring-white/10'}
              />
              {imageOrientations[editedProject.images?.[currentImageIndex] || fallbackImage] === 'portrait' && (
                <div className="absolute left-1/2 top-1/2 h-44 w-24 -translate-x-1/2 -translate-y-1/2 rounded-[1.35rem] border-2 border-black bg-black p-0.5 shadow-[0_4px_18px_5px_rgba(0,0,0,0.28)] dark:shadow-[0_4px_18px_5px_rgba(161,161,170,0.3)]">
                  <div className="relative h-full w-full overflow-hidden rounded-[1.1rem] bg-black">
                    <div className="absolute left-1/2 top-1 z-10 h-3.5 w-10 -translate-x-1/2 rounded-full bg-black shadow-sm" />
                    <img
                      src={editedProject.images?.[currentImageIndex] || fallbackImage}
                      alt={editedProject.title}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              )}
            </motion.div>
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
                 <div className="flex justify-end">
                   <LanguageSwitch value={titleLanguage} onChange={setTitleLanguage} />
                 </div>
                 <input 
                  type="text" 
                  value={titleLanguage === 'en' ? (editedProject.title_en || '') : editedProject.title}
                  onChange={(e) => handleChange(titleLanguage === 'en' ? 'title_en' : 'title', e.target.value)}
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
                <h3 className="text-xl font-bold tracking-tight">{visibleTitle}</h3>
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
          <div className="space-y-2">
            <div className="flex justify-end">
              <LanguageSwitch value={descriptionLanguage} onChange={setDescriptionLanguage} />
            </div>
            <textarea
              value={descriptionLanguage === 'en' ? (editedProject.description_en || '') : editedProject.description}
              onChange={(e) => handleChange(descriptionLanguage === 'en' ? 'description_en' : 'description', e.target.value)}
              onMouseDown={stopPropagation}
              onTouchStart={stopPropagation}
              className="w-full bg-black/5 dark:bg-black/20 text-sm p-2 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-[#7700ff]"
              rows={3}
              placeholder="Beschreibung..."
            />
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300 w-full whitespace-pre-wrap leading-relaxed">
            {visibleDescription}
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
               {(isTechExpanded ? editedProject.technologies : editedProject.technologies.slice(0, 4)).map(tech => (
                 <span key={tech} className="text-[10px] font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300">
                   {tech}
                 </span>
               ))}
               {editedProject.technologies.length > 4 && (
                 <button
                   type="button"
                   onClick={(e) => {
                     e.stopPropagation();
                     setIsTechExpanded((prev) => !prev);
                   }}
                   className="text-[10px] px-2 py-1 text-gray-500 hover:text-[#7700ff] transition-colors"
                 >
                   {isTechExpanded ? 'Weniger anzeigen' : `+${editedProject.technologies.length - 4} weitere`}
                 </button>
               )}
             </div>
           )}
        </div>

        {/* Collaborators: First one on top (highest Z-index) */}
        {(editedProject.collaborators?.length || 0) > 0 && !isEditMode && (
          <div className="mt-auto flex -space-x-2 overflow-hidden pb-1 pl-1 pt-5" onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
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
          <div className="mt-auto grid grid-cols-1 gap-2 pt-5" onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
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
          <div className={`${(editedProject.collaborators?.length || 0) > 0 ? 'mt-0' : 'mt-auto'} flex flex-wrap gap-2 pt-5`} onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
            <PlatformBadge 
              icon={Globe} 
              label="Web" 
              url={editedProject.platforms.web} 
              colorClass="bg-gray-500 dark:bg-white/20" 
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
              colorClass="bg-[#26C96C] text-black" 
              isEditMode={isEditMode}
            />
            <PlatformBadge 
              icon={WindowsIcon} 
              label="Windows Store" 
              url={editedProject.platforms.windows} 
              colorClass="bg-[#0279D9]" 
              isEditMode={isEditMode}
            />
          </div>
        )}
      </div>

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onMouseDown={stopPropagation}
          onTouchStart={stopPropagation}
        >
          <div className="bg-white dark:bg-black/90 border border-white/20 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History size={24} className="text-[#7700ff]" />
                Versionsverlauf: {project.title}
              </h2>
              <button 
                onClick={() => {
                  setIsHistoryModalOpen(false);
                  setPreviewProject(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {previewProject && (
                <div className="mb-8 border-b border-gray-200 pb-8 dark:border-white/10">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold">Vorschau</h3>
                    <button
                      onClick={() => setPreviewProject(null)}
                      className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      Schließen
                    </button>
                  </div>
                  <div className="pointer-events-none origin-top opacity-80">
                    <ProjectCard project={previewProject} isEditMode={false} />
                  </div>
                </div>
              )}

              {historyLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#7700ff]" size={32} /></div>
              ) : (
                <div className="space-y-4">
                  {historyVersions.map((v, i) => {
                    const isLatest = i === 0;
                    // Supabase auto-adds created_at typically, if it exists
                    const dateStr = v.created_at ? new Date(v.created_at).toLocaleString('de-DE') : 'Unbekanntes Datum';
                    
                    return (
                      <div key={v.id} className={`p-4 rounded-xl border ${isLatest ? 'border-[#7700ff] bg-[#7700ff]/5' : 'border-gray-200 dark:border-white/10 bg-black/5'} flex justify-between items-center`}>
                        <div>
                          <p className="font-semibold">{dateStr} {isLatest && <span className="ml-2 text-xs bg-[#7700ff] text-white px-2 py-0.5 rounded-full">Aktuell</span>}</p>
                          <p className="text-sm text-gray-500 line-clamp-1">{v.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setPreviewProject(previewProject?.id === v.id ? null : v)}
                            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-lg transition-colors"
                          >
                            {previewProject?.id === v.id ? 'Vorschau schließen' : 'Vorschau'}
                          </button>
                          {!isLatest && (
                            <button 
                              onClick={() => handleRestoreVersion(v)}
                              className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                            >
                              Wiederherstellen
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Image Cropper */}
      {cropSource && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-slate-950 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div>
                <h2 className="font-semibold">Bildformat wählen</h2>
                <p className="mt-1 text-xs text-slate-400">Ziehe das Bild und passe den Zoom an.</p>
              </div>
              <button type="button" onClick={closeCropper} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white" title="Schließen">
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2 border-b border-white/10 p-4">
              <button
                type="button"
                aria-pressed={cropMode === 'landscape'}
                onClick={() => {
                  setCropMode('landscape');
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                }}
                className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${cropMode === 'landscape' ? 'border-[#7700ff] bg-[#7700ff]/15 text-white' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'}`}
              >
                <span className="block font-medium">Querformat</span>
                <span className="text-xs opacity-70">16:9, füllt den Vorschauerahmen</span>
              </button>
              <button
                type="button"
                aria-pressed={cropMode === 'portrait'}
                onClick={() => {
                  setCropMode('portrait');
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                }}
                className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${cropMode === 'portrait' ? 'border-[#7700ff] bg-[#7700ff]/15 text-white' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'}`}
              >
                <span className="block font-medium">Smartphone</span>
                <span className="text-xs opacity-70">9:19.5, für den iPhone-Rahmen</span>
              </button>
            </div>

            <div className="relative h-[min(62vh,520px)] w-full bg-black">
              <Cropper
                image={cropSource}
                crop={crop}
                zoom={zoom}
                aspect={cropMode === 'landscape' ? 16 / 9 : 9 / 19.5}
                onCropChange={setCrop}
                onCropComplete={(_, area) => setCroppedAreaPixels(area)}
                onZoomChange={setZoom}
                showGrid
              />
            </div>

            <div className="flex items-center gap-3 border-t border-white/10 p-4">
              <span className="text-xs text-slate-400">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="min-w-0 flex-1 accent-[#7700ff]"
                aria-label="Bildzoom"
              />
              <button type="button" onClick={closeCropper} className="rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/10">
                Abbrechen
              </button>
              <button
                type="button"
                onClick={uploadCroppedImage}
                disabled={isCropSaving || !croppedAreaPixels}
                className="flex items-center gap-2 rounded-lg bg-[#7700ff] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6500dc] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCropSaving && <Loader2 size={15} className="animate-spin" />}
                {isCropSaving ? 'Speichern...' : 'Bild zuschneiden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {isImageLightboxOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-white/95 p-4 backdrop-blur-md dark:bg-black/90"
          onClick={() => setIsImageLightboxOpen(false)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsImageLightboxOpen(false);
            }}
            className="absolute right-5 top-5 z-[120] rounded-full border border-black/10 bg-white/70 p-2 text-slate-700 hover:bg-white dark:border-white/20 dark:bg-black/60 dark:text-white dark:hover:bg-black/80"
            title="Schließen"
          >
            <X size={22} />
          </button>

          <div
            className="relative flex h-[90vh] max-h-[calc(100vh-2rem)] w-full max-w-7xl items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {imageOrientations[editedProject.images?.[currentImageIndex] || fallbackImage] === 'portrait' ? (
              <div
                className="relative z-10 h-[56.7%] max-h-[56.7%] max-w-[calc(100vw-3rem)] w-auto aspect-[9/19.5] border-2 border-black bg-black p-0.5 shadow-[0_4px_18px_5px_rgba(0,0,0,0.28)] dark:shadow-[0_4px_18px_5px_rgba(161,161,170,0.3)]"
                style={{ borderRadius: '22.5% / 10.4%' }}
              >
                <div className="relative h-full w-full overflow-hidden bg-black" style={{ borderRadius: '18.5% / 8.5%' }}>
                  <div className="absolute left-1/2 top-1 z-10 h-3.5 w-10 -translate-x-1/2 rounded-full bg-black shadow-sm" />
                  <img
                    src={editedProject.images?.[currentImageIndex] || fallbackImage}
                    alt={editedProject.title}
                    onLoad={(event) => handleImageLoad(event, editedProject.images?.[currentImageIndex] || fallbackImage)}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            ) : (
              <img
                src={editedProject.images?.[currentImageIndex] || fallbackImage}
                alt={editedProject.title}
                onLoad={(event) => handleImageLoad(event, editedProject.images?.[currentImageIndex] || fallbackImage)}
                className="relative z-10 max-h-[90%] max-w-full object-contain rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/20"
              />
            )}

            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/10" />

            {(editedProject.images?.length || 0) > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-black/10 bg-white/75 p-3 text-slate-700 hover:bg-white md:left-5 dark:border-white/20 dark:bg-black/50 dark:text-white dark:hover:bg-black/70"
                  title="Vorheriges Bild"
                >
                  <ChevronLeft size={24} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-black/10 bg-white/75 p-3 text-slate-700 hover:bg-white md:right-5 dark:border-white/20 dark:bg-black/50 dark:text-white dark:hover:bg-black/70"
                  title="Nächstes Bild"
                >
                  <ChevronRight size={24} />
                </button>

                <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-black/10 bg-white/75 px-3 py-1 text-xs text-slate-700 dark:border-white/15 dark:bg-black/45 dark:text-white">
                  {currentImageIndex + 1} / {editedProject.images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}