'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';
import { 
  DndContext, 
  KeyboardSensor, 
  MouseSensor, 
  TouchSensor, 
  useSensor, 
  useSensors, 
  closestCenter,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  KeyboardCode
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
import { Edit3, Save, X, Plus } from 'lucide-react';

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [originalProjects, setOriginalProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Mouse position state for background effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for blob movement with different characteristics for organic feel
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });
  
  const springX2 = useSpring(mouseX, { stiffness: 30, damping: 25 });
  const springY2 = useSpring(mouseY, { stiffness: 30, damping: 25 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Center the 72x72 (288px) blobs. 
      // Add small offset to X2/Y2 in the spring target via the hook config? 
      // No, let's just use the same target but different springs to create lag.
      // We can offset the SECOND blob slightly so they aren't perfectly stacked at rest?
      // Actually, let's just update the target values. 
      mouseX.set(e.clientX - 144);
      mouseY.set(e.clientY - 144);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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
    // Enter Taste deaktivieren für Drag-Start, damit man in Inputs Enter drücken kann
    useSensor(KeyboardSensor, {
      keyboardCodes: {
        start: [KeyboardCode.Space],
        cancel: [KeyboardCode.Esc],
        end: [KeyboardCode.Space, KeyboardCode.Enter],
      }
    })
  );

  const [user, setUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletedProjectIds, setDeletedProjectIds] = useState<string[]>([]);

  const loadProjects = async () => {
    setLoading(true);
    setDeletedProjectIds([]); // Reset deleted tracker on load/cancel
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    if (data) {
      // Filter out about page
      const filteredData = data.filter((p: any) => p.title !== 'About-Page-Data-Do-Not-Delete');
      
      // Group by title, keep only the newest (already sorted by created_at desc)
      const uniqueProjectsMap = new Map();
      filteredData.forEach(p => {
         if (!uniqueProjectsMap.has(p.title)) {
             uniqueProjectsMap.set(p.title, p);
         }
      });
      
      let uniqueProjects = Array.from(uniqueProjectsMap.values());
      
      // Re-sort by sort_order
      uniqueProjects.sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));

      const safeData = uniqueProjects.map((p: any) => ({
        ...p,
        platforms: {
          apple: p.platforms?.apple || '',
          android: p.platforms?.android || '',
          web: p.platforms?.web || '',
          windows: p.platforms?.windows || '' 
        }
      }));
      setProjects(safeData as Project[]);
      setOriginalProjects(JSON.parse(JSON.stringify(safeData))); // Deep copy for change detection
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

    loadProjects();

    return () => subscription.unsubscribe();
  }, []);

  const handleProjectUpdate = (updatedProject: Project) => {
    setProjects(prevProjects => 
      prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p)
    );
  };

  const handleDeleteProject = (projectId: string) => {
    // Only "soft delete" in local state
    setDeletedProjectIds(prev => [...prev, projectId]);
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const handleAddProject = async (newProject: Omit<Project, 'id'>) => {
    // Insert immediately to get an ID
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        ...newProject,
        sort_order: projects.length // Add to end
      }])
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Fehler beim Erstellen: " + error.message);
      return;
    }

    if (data) {
      setProjects([...projects, data as Project]);
    }
  };

  const saveChangesToDatabase = async () => {
    setLoading(true);
    let hasError = false;

    // 1. Process deletions
    for (const id of deletedProjectIds) {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) {
        console.error("Lösch-Fehler für ID " + id, error);
        hasError = true;
      }
    }

    // 2. Save all updated/reordered projects
    const updates = projects.map((project, index) => ({
      ...project,
      sort_order: index
    }));

    // We send updates one by one.
    // Instead of UPDATE, we do INSERT to create a new version history entry.
    for (const project of updates) {
      // Check if project actually changed compared to original
      const original = originalProjects.find(op => op.id === project.id);
      
      let isChanged = true;
      if (original) {
        // Compare only the fields that we map to the database
        // Need to stringify carefully to ignore order of keys in objects
        const pStr = JSON.stringify({
          title: project.title, description: project.description, date: project.date,
          technologies: project.technologies, platforms: project.platforms, images: project.images,
          githubUrl: project.githubUrl, collaborators: project.collaborators, sort_order: project.sort_order,
          is_hidden: project.is_hidden, is_private: project.is_private
        });
        const oStr = JSON.stringify({
          title: original.title, description: original.description, date: original.date,
          technologies: original.technologies, platforms: original.platforms, images: original.images,
          githubUrl: original.githubUrl, collaborators: original.collaborators, sort_order: original.sort_order,
          is_hidden: original.is_hidden, is_private: original.is_private
        });
        isChanged = pStr !== oStr;
      }

      if (!isChanged) {
        continue; // Skip saving if nothing changed
      }

      const payload = {
          title: project.title,
          description: project.description,
          date: project.date,
          technologies: project.technologies,
          platforms: project.platforms,
          images: project.images,
          githubUrl: project.githubUrl,
          collaborators: project.collaborators,
          sort_order: project.sort_order,
          is_hidden: project.is_hidden,
          is_private: project.is_private
      };
      
      const { error } = await supabase
        .from('projects')
        .insert([payload]);

      if (error) {
        console.error("Speicher-Fehler für ID " + project.id, error);
        hasError = true;
      }
    }

    setLoading(false);
    
    if (hasError) {
      alert("Es gab einen Fehler beim Speichern! Überprüfe die Konsole.");
    } else {
      setDeletedProjectIds([]); // Clear deletions on success
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

  const filteredProjects = isEditMode ? projects : projects.filter(p => !p.is_hidden);

  if (loading && projects.length === 0) return <div className="h-screen flex items-center justify-center">Lade Portfolio...</div>;

  return (
    <main className="relative min-h-[calc(100vh-80px)] overflow-hidden flex flex-col items-center p-6 lg:p-12">
      {/* Dynamic Background */}
      <motion.div 
        style={{ x: springX, y: springY }}
        className="fixed top-0 left-0 pointer-events-none z-0"
      >
        <div className="w-72 h-72 bg-[#7700ff] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-40 dark:opacity-30 animate-blob" />
      </motion.div>

      <motion.div 
        style={{ x: springX2, y: springY2 }}
        className="fixed top-0 left-0 pointer-events-none z-0"
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