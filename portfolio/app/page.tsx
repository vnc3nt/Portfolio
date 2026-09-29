'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';
import { 
  DndContext, 
  MouseSensor, 
  TouchSensor, 
  useSensor, 
  useSensors, 
  closestCenter,
  DragOverlay,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import { 
  SortableContext, 
  rectSortingStrategy, 
  arrayMove 
} from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';

import ProjectCard, { Project } from "../components/ProjectCard";
import AddProjectModal from "../components/AddProjectModal";
import { SortableItem } from "../components/SortableItem";
import { supabase } from "../utils/supabase";
import { User } from '@supabase/supabase-js';
import { Edit3, Save, X, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useLanguage } from '../components/LanguageProvider';
import { hasProjectContentChanges } from '../utils/portfolioLogic';

interface RawProjectRow {
  id: string;
  title: string;
  title_en?: string | null;
  description?: string | null;
  description_en?: string | null;
  images?: string[] | null;
  date?: string | null;
  technologies?: string[] | null;
  platforms?: { apple?: string; android?: string; web?: string; windows?: string } | null;
  githubUrl?: string | null;
  collaborators?: Project['collaborators'];
  created_at?: string | null;
  sort_order?: number | null;
  is_hidden?: boolean | string | number | null;
  is_private?: boolean | string | number | null;
  is_deleted?: boolean | string | number | null;
}

export default function Home() {
  const { language } = useLanguage();
  const toBooleanFlag = (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === 't' || normalized === '1';
    }
    return false;
  };

  const [projects, setProjects] = useState<Project[]>([]);
  const [originalProjects, setOriginalProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Mouse position state for background effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const mainRef = useRef<HTMLElement>(null);

  // Smooth springs for blob movement with different characteristics for organic feel
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });
  
  const springX2 = useSpring(mouseX, { stiffness: 30, damping: 25 });
  const springY2 = useSpring(mouseY, { stiffness: 30, damping: 25 });

  useEffect(() => {
    const updateBackgroundPosition = () => {
      const { x, y } = lastMousePosition.current;
      const mainTop = mainRef.current?.getBoundingClientRect().top ?? 0;
      const mainDocumentTop = mainTop + window.scrollY;
      mouseX.set(x - 144);
      mouseY.set(y + window.scrollY - mainDocumentTop - 144);
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastMousePosition.current = { x: e.clientX, y: e.clientY };
      updateBackgroundPosition();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', updateBackgroundPosition, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', updateBackgroundPosition);
    };
  }, [mouseX, mouseY]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    // KeyboardSensor bewusst deaktiviert:
    // Space in Input/Textarea darf nie einen Drag starten.
  );

  const [user, setUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletedProjects, setDeletedProjects] = useState<Project[]>([]);
  const [pendingDeletedProjects, setPendingDeletedProjects] = useState<Project[]>([]);
  const [pendingPermanentDeletes, setPendingPermanentDeletes] = useState<Project[]>([]);
  const [pendingRestoredProjects, setPendingRestoredProjects] = useState<Project[]>([]);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoringProjectId, setRestoringProjectId] = useState<string | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    setPendingDeletedProjects([]); // Reset unsaved deletions on load/cancel
    setPendingPermanentDeletes([]); // Reset unsaved permanent deletions on load/cancel
    setPendingRestoredProjects([]); // Reset unsaved restorations on load/cancel
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false, nullsFirst: false });

    if (error) console.error(error);
    if (data) {
      // Filter out about page
      const filteredData = (data as RawProjectRow[]).filter((p) => p.title !== 'About-Page-Data-Do-Not-Delete');

      // Sort newest first, then keep first row per normalized title.
      const uniqueProjectsMap = new Map<string, RawProjectRow>();
      const getTimestamp = (value: unknown) => {
        if (typeof value !== 'string' || value.length === 0) return 0;
        const t = Date.parse(value);
        return Number.isNaN(t) ? 0 : t;
      };

      const normalizeTitle = (value: unknown) => String(value || '').trim().toLowerCase();

      const newestFirst = [...filteredData].sort((a, b) => {
        const tsDiff = getTimestamp(b.created_at) - getTimestamp(a.created_at);
        if (tsDiff !== 0) return tsDiff;

        const rawCreatedA = typeof a.created_at === 'string' ? a.created_at : '';
        const rawCreatedB = typeof b.created_at === 'string' ? b.created_at : '';
        const rawDiff = rawCreatedB.localeCompare(rawCreatedA);
        if (rawDiff !== 0) return rawDiff;

        const hiddenA = toBooleanFlag(a.is_hidden);
        const hiddenB = toBooleanFlag(b.is_hidden);
        if (hiddenA !== hiddenB) return hiddenB ? 1 : -1;

        return String(b.id).localeCompare(String(a.id));
      });

      const latestHiddenByTitle = new Map<string, boolean>();

      newestFirst.forEach((p) => {
        const key = normalizeTitle(p.title);
        if (!latestHiddenByTitle.has(key)) {
          latestHiddenByTitle.set(key, toBooleanFlag(p.is_hidden));
        }

        if (!uniqueProjectsMap.has(key)) {
          uniqueProjectsMap.set(key, p);
        }
      });

      const uniqueProjects = Array.from(uniqueProjectsMap.values());
      
      // Re-sort by sort_order
      uniqueProjects.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      const safeData = uniqueProjects.map((p) => {
        const key = normalizeTitle(p.title);
        const latestHidden = latestHiddenByTitle.get(key);

        return {
          ...p,
          is_hidden: typeof latestHidden === 'boolean' ? latestHidden : toBooleanFlag(p.is_hidden),
          is_private: toBooleanFlag(p.is_private),
          is_deleted: toBooleanFlag(p.is_deleted),
          platforms: {
            apple: p.platforms?.apple || '',
            android: p.platforms?.android || '',
            web: p.platforms?.web || '',
            windows: p.platforms?.windows || ''
          }
        };
      });
      const typedProjects = safeData as Project[];
      setProjects(typedProjects.filter((project) => !project.is_deleted));
      setDeletedProjects(typedProjects.filter((project) => project.is_deleted));
      setOriginalProjects(JSON.parse(JSON.stringify(typedProjects.filter((project) => !project.is_deleted)))); // Deep copy for change detection
    }
    setLoading(false);
  };

  useEffect(() => {
    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) setIsEditMode(false);
    });

    // Listen for changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setIsEditMode(false);
    });

    queueMicrotask(() => { void loadProjects(); });

    return () => subscription.unsubscribe();
  }, []);

  const handleProjectUpdate = (updatedProject: Project) => {
    setProjects(prevProjects => 
      prevProjects.map(p => p.id === updatedProject.id || p.title === updatedProject.title ? updatedProject : p)
    );
    setPendingRestoredProjects((restoredProjects) => restoredProjects.map((project) => (
      project.id === updatedProject.id ? updatedProject : project
    )));
  };

  const handleDeleteProject = (projectId: string) => {
    const projectToDelete = projects.find((project) => project.id === projectId);
    if (projectToDelete) {
      setPendingDeletedProjects((deleted) => [...deleted, projectToDelete]);
      setDeletedProjects((deleted) => [...deleted, { ...projectToDelete, is_deleted: true }]);
    }
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
  };

  const handleAddProject = async (newProject: Omit<Project, 'id'>) => {
    // Insert immediately to get an ID
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        ...newProject,
        sort_order: projects.length, // Add to end
        created_at: new Date().toISOString(),
        is_hidden: Boolean(newProject.is_hidden),
        is_private: Boolean(newProject.is_private)
      }])
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Fehler beim Erstellen: " + error.message);
      return;
    }

    if (data) {
      const addedProject = data as Project;
      setProjects([...projects, addedProject]);
      setOriginalProjects((currentProjects) => [...currentProjects, JSON.parse(JSON.stringify(addedProject))]);
    }
  };

  const restoreDeletedProject = async (deletedProject: Project) => {
    setRestoringProjectId(deletedProject.id);

    const pendingDeletion = pendingDeletedProjects.some((project) => project.id === deletedProject.id);
    if (pendingDeletion) {
      setPendingDeletedProjects((projectsToRestore) => projectsToRestore.filter((project) => project.id !== deletedProject.id));
      setDeletedProjects((projectsInTrash) => projectsInTrash.filter((project) => project.id !== deletedProject.id));
      setProjects((currentProjects) => [...currentProjects, { ...deletedProject, is_deleted: false }]);
      setRestoringProjectId(null);
      return;
    }

    const { data: versions, error: versionsError } = await supabase
      .from('projects')
      .select('*')
      .eq('title', deletedProject.title)
      .order('created_at', { ascending: false });

    const previousVersion = (versions as Project[] | null)?.find((version) => !toBooleanFlag(version.is_deleted));
    if (versionsError || !previousVersion) {
      alert('Die vorherige Version konnte nicht gefunden werden.');
      setRestoringProjectId(null);
      return;
    }

    const restoredProject = {
      ...previousVersion,
      id: deletedProject.id,
      is_deleted: false,
    };
    setPendingRestoredProjects((restoredProjects) => [...restoredProjects, restoredProject]);
    setDeletedProjects((projectsInTrash) => projectsInTrash.filter((project) => project.id !== deletedProject.id));
    setProjects((currentProjects) => [...currentProjects, restoredProject]);
    setIsRestoreModalOpen(false);
    setRestoringProjectId(null);
  };

  const permanentlyDeleteProject = async (deletedProject: Project) => {
    const confirmed = confirm(
      `"${deletedProject.title}" endgültig löschen? Alle Versionen werden unwiderruflich entfernt.`
    );
    if (!confirmed) return;

    setRestoringProjectId(deletedProject.id);
    setPendingDeletedProjects((pending) => pending.filter((project) => project.id !== deletedProject.id));
    setPendingPermanentDeletes((pending) => [...pending, deletedProject]);
    setDeletedProjects((projectsInTrash) => projectsInTrash.filter((project) => project.id !== deletedProject.id));
    setRestoringProjectId(null);
  };

  const saveChangesToDatabase = async () => {
    setLoading(true);
    let hasError = false;

    // 1. Process deletions
    const permanentDeleteIds = new Set(pendingPermanentDeletes.map((project) => project.id));
    for (const deletedProject of pendingDeletedProjects.filter((project) => !permanentDeleteIds.has(project.id))) {
      const { error } = await supabase
        .from('projects')
        .insert([{
          title: deletedProject.title,
          title_en: deletedProject.title_en,
          description: deletedProject.description,
          description_en: deletedProject.description_en,
          date: deletedProject.date,
          technologies: deletedProject.technologies,
          platforms: deletedProject.platforms,
          images: deletedProject.images,
          githubUrl: deletedProject.githubUrl,
          collaborators: deletedProject.collaborators,
          sort_order: deletedProject.sort_order,
          is_hidden: Boolean(deletedProject.is_hidden),
          is_private: Boolean(deletedProject.is_private),
          is_deleted: true,
          created_at: new Date().toISOString(),
        }]);
      if (error) {
        console.error("Lösch-Fehler für ID " + deletedProject.id, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        hasError = true;
      }
    }

    for (const deletedProject of pendingPermanentDeletes) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('title', deletedProject.title);

      if (error) {
        console.error("Fehler beim endgültigen Löschen für ID " + deletedProject.id, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        hasError = true;
      }
    }

    const deletedIds = new Set(pendingDeletedProjects.map((project) => project.id));
    const permanentlyDeletedIds = new Set(pendingPermanentDeletes.map((project) => project.id));
    for (const restoredProject of pendingRestoredProjects.filter(
      (project) => !deletedIds.has(project.id) && !permanentlyDeletedIds.has(project.id)
    )) {
      const { error } = await supabase.from('projects').update({
        title: restoredProject.title,
        title_en: restoredProject.title_en,
        description: restoredProject.description,
        description_en: restoredProject.description_en,
        date: restoredProject.date,
        technologies: restoredProject.technologies,
        platforms: restoredProject.platforms,
        images: restoredProject.images,
        githubUrl: restoredProject.githubUrl,
        collaborators: restoredProject.collaborators,
        sort_order: restoredProject.sort_order,
        is_hidden: Boolean(restoredProject.is_hidden),
        is_private: Boolean(restoredProject.is_private),
        is_deleted: false,
      }).eq('id', restoredProject.id);

      if (error) {
        console.error("Fehler beim Wiederherstellen für ID " + restoredProject.id, error);
        hasError = true;
      }
    }

    // 2. Save content changes as versions and metadata changes on the current row.
    const updates = projects.map((project, index) => ({
      ...project,
      sort_order: index
    }));
    const restoredIds = new Set(pendingRestoredProjects.map((project) => project.id));

    for (const project of updates) {
      if (restoredIds.has(project.id)) continue;

      // Check if project actually changed compared to original
      const original = originalProjects.find(op => op.id === project.id);
      if (!original) continue;

      const contentChanged = hasProjectContentChanges(project, original);

      const metadataChanged = project.sort_order !== original.sort_order
        || Boolean(project.is_hidden) !== Boolean(original.is_hidden)
        || Boolean(project.is_private) !== Boolean(original.is_private);

      if (!contentChanged && !metadataChanged) continue;

      const payload = {
          title: project.title,
          title_en: project.title_en,
          description: project.description,
          description_en: project.description_en,
          date: project.date,
          technologies: project.technologies,
          platforms: project.platforms,
          images: project.images,
          githubUrl: project.githubUrl,
          collaborators: project.collaborators,
          sort_order: project.sort_order,
          is_hidden: Boolean(project.is_hidden),
          is_private: Boolean(project.is_private),
          is_deleted: Boolean(project.is_deleted)
      };

      const { error } = contentChanged
        ? await supabase
          .from('projects')
          .insert([{
            ...payload,
            created_at: new Date().toISOString(),
          }])
        : await supabase
          .from('projects')
          .update({
            sort_order: project.sort_order,
            is_hidden: Boolean(project.is_hidden),
            is_private: Boolean(project.is_private),
          })
          .eq('id', project.id);

      if (error) {
        console.error("Speicher-Fehler für ID " + project.id, error);
        hasError = true;
      }
    }

    setLoading(false);
    
    if (hasError) {
      alert("Es gab einen Fehler beim Speichern! Überprüfe die Konsole.");
    } else {
      setPendingDeletedProjects([]); // Clear unsaved deletions on success
      setPendingPermanentDeletes([]); // Clear unsaved permanent deletions on success
      setPendingRestoredProjects([]); // Clear unsaved restorations on success
      setIsEditMode(false);
      // Reload projects to update originalProjects and get the new IDs
      loadProjects();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setProjects((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveId(null);
  };

  const filteredProjects = isEditMode ? projects : projects.filter((p) => !toBooleanFlag(p.is_hidden) && !toBooleanFlag(p.is_deleted));

  if (loading && projects.length === 0) return <div className="h-screen flex items-center justify-center">{language === 'de' ? 'Lade Portfolio...' : 'Loading portfolio...'}</div>;

  return (
    <main ref={mainRef} className="relative min-h-[calc(100vh-80px)] overflow-hidden flex flex-col items-center p-6 lg:p-12">
      {/* Dynamic Background */}
      <motion.div 
        style={{ x: springX, y: springY }}
        className="absolute top-0 left-0 pointer-events-none z-0"
      >
        <div className="w-72 h-72 bg-[#7700ff] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-40 dark:opacity-30 animate-blob" />
      </motion.div>

      <motion.div 
        style={{ x: springX2, y: springY2 }}
        className="absolute top-0 left-0 pointer-events-none z-0"
      >
        <div className="w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-40 dark:opacity-30 animate-blob animation-delay-2000" />
      </motion.div>
      
      {/* Admin Floating Action Bar */}
      {user && (
        <div className="fixed bottom-10 z-50 flex items-center gap-3 bg-white/30 dark:bg-black/50 backdrop-blur-xl border border-white/20 p-2 pl-4 pr-2 rounded-full shadow-2xl">
          {!isEditMode ? (
             <button 
               onClick={() => setIsEditMode(true)}
               className="flex items-center gap-2 bg-[#7700ff] text-white px-5 py-2.5 rounded-full font-medium hover:bg-[#5e00cc] transition-all shadow-lg shadow-[#7700ff]/20"
             >
               <Edit3 size={18} /> Bearbeiten
             </button>
          ) : (
            <>
               <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-full font-medium hover:bg-blue-600 transition-all mr-2"
              >
                <Plus size={18} /> Neu
              </button>

              <button
                onClick={() => setIsRestoreModalOpen(true)}
                className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-full font-medium hover:bg-amber-600 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                disabled={deletedProjects.length === 0}
              >
                <Trash2 size={18} /> Papierkorb{deletedProjects.length > 0 && ` (${deletedProjects.length})`}
              </button>

              <div className="h-8 w-px bg-white/20 mx-1" />

              <button 
                onClick={saveChangesToDatabase}
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full font-medium hover:bg-green-600 transition-all"
              >
                <Save size={18} /> Speichern
              </button>
              <button 
                onClick={() => { setIsEditMode(false); loadProjects(); }}
                className="flex items-center justify-center w-10 h-10 bg-red-500/20 text-red-500 dark:text-red-400 rounded-full font-medium hover:bg-red-500/30 transition-all"
                title="Abbrechen"
              >
                <X size={18} />
              </button>
            </>
          )}
        </div>
      )}

      <AddProjectModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddProject} 
        githubUsername={user?.user_metadata?.user_name || "vnc3nt"}
      />

      {isRestoreModalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setIsRestoreModalOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl dark:bg-zinc-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 p-5 dark:border-white/10">
              <div>
                <h2 className="text-lg font-semibold">Papierkorb</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Wähle ein Projekt zur Wiederherstellung oder endgültigen Löschung.</p>
              </div>
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-black/5 dark:hover:bg-white/10"
                title="Schließen"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[50vh] space-y-2 overflow-y-auto p-5">
              {deletedProjects.map((deletedProject) => (
                <button
                  key={deletedProject.id}
                  onClick={() => restoreDeletedProject(deletedProject)}
                  disabled={restoringProjectId !== null}
                  className="flex w-full items-center justify-between rounded-xl border border-black/10 p-3 text-left transition-colors hover:border-amber-500 hover:bg-amber-500/10 disabled:cursor-wait disabled:opacity-60 dark:border-white/10"
                >
                  <span>
                    <span className="block font-medium">{deletedProject.title}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Projekt aus der Historie wiederherstellen</span>
                  </span>
                  <span className="flex items-center gap-2 pl-3">
                    <span
                      className="rounded-full p-2 text-amber-500 hover:bg-amber-500/10"
                      title="Wiederherstellen"
                    >
                      <RotateCcw size={18} className={restoringProjectId === deletedProject.id ? 'animate-spin' : ''} />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        permanentlyDeleteProject(deletedProject);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          permanentlyDeleteProject(deletedProject);
                        }
                      }}
                      className="rounded-full p-2 text-red-500 hover:bg-red-500/10"
                      title="Unwiderruflich löschen"
                    >
                      <Trash2 size={18} />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative z-10 w-full max-w-7xl mx-auto mb-16 text-center mt-10">
        {isEditMode && (
          <p className="text-sm text-[#7700ff] font-medium bg-[#7700ff]/10 inline-block px-3 py-1 rounded-full animate-pulse">
            Edit Mode Active — Drag to Reorder
          </p>
        )}
      </div>

      {/* Projects Grid */}
      <div className="relative z-10 w-full max-w-7xl mx-auto pb-32">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToWindowEdges]}
        >
          <SortableContext 
            items={projects.map(p => p.id)}
            strategy={rectSortingStrategy}
            disabled={!isEditMode}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.map((project) => (
                isEditMode ? (
                  <SortableItem key={project.id} id={project.id} disabled={!isEditMode}>
                    <ProjectCard 
                      project={project}
                      isEditMode={isEditMode}
                      onUpdate={handleProjectUpdate}
                      onDelete={handleDeleteProject}
                    />
                  </SortableItem> 
                ) : (
                  <div key={project.id} className="h-full">
                     <ProjectCard 
                      project={project}
                      isEditMode={false}
                    />
                  </div>
                )
              ))}
            </div>
          </SortableContext>
          
          <DragOverlay>
            {activeId ? (
              <div className="scale-105 shadow-2xl opacity-90 cursor-grabbing bg-transparent h-full"> 
                 <ProjectCard 
                    project={projects.find(p => p.id === activeId)!} 
                    isEditMode={true} 
                  />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </main>
  );
}