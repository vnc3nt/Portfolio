'use client';

import { useState, useEffect } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';
import { Edit3, Save, X, ImagePlus, Loader2, History } from 'lucide-react';
import { supabase } from '@/utils/supabase';
import { User } from '@supabase/supabase-js';

// Define the shape of our About content
interface AboutContent {
  id?: string;
  headline: string;
  text: string;
  imageUrl: string;
}

export default function AboutPage() {
  const [content, setContent] = useState<AboutContent>({
    headline: 'Über mich',
    text: 'Hier steht dein Text...',
    imageUrl: ''
  });
  const [originalContent, setOriginalContent] = useState<AboutContent | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyVersions, setHistoryVersions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState<AboutContent | null>(null);

  const fetchHistory = async () => {
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('title', 'About-Page-Data-Do-Not-Delete')
      .order('created_at', { ascending: false });
    
    console.log("FETCHED ABOUT DATA:", data, "ERROR:", error);
    if (data) {
      setHistoryVersions(data);
    }
    setHistoryLoading(false);
  };

  const handleRestoreVersion = async (oldVersion: any) => {
    if (!confirm('Diese alte Version als neue aktuelle Version wiederherstellen?')) return;
    
    const payload = {
        title: oldVersion.title, 
        description: oldVersion.description,
        images: oldVersion.images,
        is_hidden: oldVersion.is_hidden,
        is_private: false, // changed for visibility
        technologies: oldVersion.technologies,
        platforms: oldVersion.platforms,
        date: oldVersion.date,
        sort_order: oldVersion.sort_order,
        githubUrl: oldVersion.githubUrl,
        liveUrl: oldVersion.liveUrl
    };

    const { error } = await supabase.from('projects').insert([payload]);
    if (!error) {
      setIsHistoryModalOpen(false);
      setPreviewContent(null);
      fetchContent();
    } else {
      alert("Fehler beim Wiederherstellen: " + error.message);
    }
  };
  
  // Reuse background animation logic
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });
  const springX2 = useSpring(mouseX, { stiffness: 30, damping: 25 });
  const springY2 = useSpring(mouseY, { stiffness: 30, damping: 25 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - 144);
      mouseY.set(e.clientY - 144);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Auth & Data fetching
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    fetchContent();

    return () => subscription.unsubscribe();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    // Immer nur den aktuellsten Eintrag holen
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('title', 'About-Page-Data-Do-Not-Delete')
        .order('created_at', { ascending: false })
        .limit(1)
        ;

    console.log("FETCHED ABOUT DATA:", data, "ERROR:", error);
    if (data && data.length > 0) {
        const latestData = data[0];
        const newContent = {
            id: latestData.id,
            headline: latestData.technologies?.[0] || 'Über mich',
            text: latestData.description || '',
            imageUrl: latestData.images?.[0] || ''
        };
        setContent(newContent);
        setOriginalContent(newContent);
    }
    setLoading(false);
  };

  const saveContent = async () => {
    // Only save if there's actual change
    const isChanged = !originalContent || 
        content.headline !== originalContent.headline || 
        content.text !== originalContent.text ||
        content.imageUrl !== originalContent.imageUrl;

    if (!isChanged) {
        setIsEditMode(false);
        return;
    }

    setLoading(true);
    
    // Standardized payload matching AddProjectModal structure
    // This reduces the chance of database constraint violations
    const payload = {
        title: 'About-Page-Data-Do-Not-Delete', 
        description: content.text,
        images: content.imageUrl ? [content.imageUrl] : [],
        is_hidden: true,
        is_private: false, // Must be false so public users can see the About page
        // Using technologies[0] for storing the headline
        technologies: [content.headline],
        platforms: { apple: '', android: '', web: '', windows: '' }, // Ensure object structure matches DB expectation
        date: new Date().getFullYear().toString(),
        sort_order: -999, // Ensure it's pushed to start/end if ever queried
        githubUrl: null, // Avoid undefined if DB has constraints
        liveUrl: null    // Avoid undefined if DB has constraints
    };

    try {
      // Immer neu einfügen (Versionierung)
      const result = await supabase.from('projects').insert([payload]);

      if (result.error) {
        console.error('Supabase error:', result.error);
        alert("Fehler beim Speichern: " + result.error.message);
      } else {
        setIsEditMode(false);
        fetchContent();
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      alert("Unerwarteter Fehler: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `about-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `about/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('portfolio-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio-images')
        .getPublicUrl(filePath);

      setContent(prev => ({ ...prev, imageUrl: publicUrl }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      alert('Upload Fehler: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading && !content.headline) return <div className="h-screen flex items-center justify-center">Lade...</div>;

  return (
    <main className="relative min-h-[calc(100vh-80px)] overflow-hidden flex flex-col items-center p-6 lg:p-12">
      {/* Background */}
      <motion.div style={{ x: springX, y: springY }} className="fixed top-0 left-0 pointer-events-none z-0">
        <div className="w-72 h-72 bg-[#7700ff] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-40 dark:opacity-30 animate-blob" />
      </motion.div>
      <motion.div style={{ x: springX2, y: springY2 }} className="fixed top-0 left-0 pointer-events-none z-0">
        <div className="w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-40 dark:opacity-30 animate-blob animation-delay-2000" />
      </motion.div>

      {/* Admin Bar */}
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
                onClick={fetchHistory}
                className="flex items-center justify-center w-10 h-10 bg-blue-500/20 text-blue-500 dark:text-blue-400 rounded-full font-medium hover:bg-blue-500/30 transition-all"
                title="Versionsverlauf"
              >
                <History size={18} />
              </button>
              <button 
                onClick={saveContent} // Calls the save function
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full font-medium hover:bg-green-600 transition-all"
              >
                <Save size={18} /> Speichern
              </button>
              <button 
                onClick={() => { setIsEditMode(false); fetchContent(); }}
                className="flex items-center justify-center w-10 h-10 bg-red-500/20 text-red-500 dark:text-red-400 rounded-full font-medium hover:bg-red-500/30 transition-all"
              >
                <X size={18} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto mt-20 bg-white/10 dark:bg-black/20 backdrop-blur-lg rounded-3xl p-8 lg:p-12 border border-white/20 shadow-2xl">
        
        {/* Image Section */}
        <div className="flex justify-center mb-8">
            <div className={`relative w-48 h-48 rounded-full overflow-hidden border-4 border-white/20 shadow-xl ${isEditMode ? 'cursor-pointer hover:border-[#7700ff] transition-colors group' : ''}`}>
                {content.imageUrl ? (
                    <img src={content.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                        <ImagePlus size={48} />
                    </div>
                )}
                
                {isEditMode && (
                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        {uploading ? <Loader2 className="animate-spin text-white" /> : <ImagePlus className="text-white" />}
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                )}
            </div>
        </div>

        {/* Headline */}
        <div className="text-center mb-8">
            {isEditMode ? (
                <input 
                    type="text" 
                    value={content.headline}
                    onChange={(e) => setContent(prev => ({ ...prev, headline: e.target.value }))}
                    className="w-full bg-transparent text-4xl md:text-5xl font-bold text-center border-b border-[#7700ff]/50 focus:outline-none text-gray-900 dark:text-white pb-2"
                    placeholder="Überschrift"
                />
            ) : (
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                    {content.headline}
                </h1>
            )}
        </div>

        {/* Text Body */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
            {isEditMode ? (
                <textarea 
                    value={content.text}
                    onChange={(e) => setContent(prev => ({ ...prev, text: e.target.value }))}
                    className="w-full h-96 bg-black/5 dark:bg-black/20 rounded-xl p-6 resize-none focus:outline-none focus:ring-2 focus:ring-[#7700ff] text-base leading-relaxed"
                    placeholder="Schreibe etwas über dich..."
                />
            ) : (
                <p className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
                    {content.text}
                </p>
            )}
        </div>
      </div>

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-black/90 border border-white/20 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden mt-20">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History size={24} className="text-[#7700ff]" />
                Versionsverlauf
              </h2>
              <button 
                onClick={() => { setIsHistoryModalOpen(false); setPreviewContent(null); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {historyLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#7700ff]" size={32} /></div>
              ) : (
                <div className="space-y-4">
                  {historyVersions.map((v, i) => {
                    const isLatest = i === 0;
                    const dateStr = v.created_at ? new Date(v.created_at).toLocaleString('de-DE') : 'Unbekannt';
                    
                    return (
                      <div key={v.id} className={`p-4 rounded-xl border ${isLatest ? 'border-[#7700ff] bg-[#7700ff]/5' : 'border-gray-200 dark:border-white/10 bg-black/5'} flex justify-between items-center`}>
                        <div>
                          <p className="font-semibold">{dateStr} {isLatest && <span className="ml-2 text-xs bg-[#7700ff] text-white px-2 py-0.5 rounded-full">Aktuell</span>}</p>
                          <p className="text-sm text-gray-500 line-clamp-1">{v.technologies?.[0] || 'Ohne Titel'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setPreviewContent(previewContent?.id === v.id ? null : {
                              id: v.id,
                              headline: v.technologies?.[0] || 'Über mich',
                              text: v.description || '',
                              imageUrl: v.images?.[0] || ''
                            })}
                            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-lg transition-colors"
                          >
                            {previewContent?.id === v.id ? 'Schließen' : 'Vorschau'}
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

              {/* Preview Box */}
              {previewContent && (
                <div className="mt-8 border-t border-gray-200 dark:border-white/10 pt-8">
                  <h3 className="text-lg font-bold mb-4">Vorschau</h3>
                  <div className="bg-black/5 dark:bg-black/20 p-6 rounded-xl">
                    <h4 className="text-2xl font-bold mb-4 text-center">{previewContent.headline}</h4>
                    {previewContent.imageUrl && (
                      <div className="flex justify-center mb-6">
                        <img src={previewContent.imageUrl} alt="Vorschau Profilbild" className="w-32 h-32 rounded-full object-cover border-2 border-white/20" />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{previewContent.text}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
