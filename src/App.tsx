import { useState } from "react";
import { Search, Image, FileCode, Eye, Download, ShieldAlert, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AnalysisResult {
  title: string;
  originalHtml: string;
  cleanHtml: string;
  images: string[];
  videos: string[];
  scripts: string[];
  files: { url: string; name: string; type: string }[];
  python: string[];
}

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"clean" | "media" | "files" | "scripts" | "python" | "source">("clean");

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to analyze URL");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans selection:bg-emerald-500/30">
      <header className="border-b border-white/10 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-neutral-900">
              <Eye size={20} strokeWidth={2.5} />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Web X-Ray</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">Inspect & Extract</h2>
            <p className="text-neutral-400">
              Analyze webpages, remove scripts/overlays, and extract media assets.
            </p>
          </div>

          <form onSubmit={handleAnalyze} className="relative group">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-xl group-hover:bg-emerald-500/30 transition-all opacity-0 group-hover:opacity-100" />
            <div className="relative flex gap-2 bg-neutral-800 p-2 rounded-2xl border border-white/10 shadow-xl">
              <div className="flex-1 flex items-center px-4 gap-3">
                <Search className="text-neutral-500" size={20} />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 bg-transparent border-none outline-none text-neutral-100 placeholder:text-neutral-600 h-10"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-400 text-neutral-900 font-semibold px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Scanning...</span>
                  </>
                ) : (
                  "Analyze"
                )}
              </button>
            </div>
          </form>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-center text-sm text-neutral-500"
            >
              <p>Connecting to site... This may take up to 15 seconds for slower pages.</p>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3"
            >
              <ShieldAlert size={20} />
              {error}
            </motion.div>
          )}
        </div>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold truncate max-w-xl" title={result.title}>
                  {result.title}
                </h3>
                <div className="flex bg-neutral-800 p-1 rounded-lg border border-white/5 overflow-x-auto">
                  {(["clean", "media", "files", "scripts", "python", "source"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                        activeTab === tab
                          ? "bg-neutral-700 text-white shadow-sm"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      {tab === "clean" && "Clean View"}
                      {tab === "media" && "Media"}
                      {tab === "files" && "Files"}
                      {tab === "scripts" && "Scripts"}
                      {tab === "python" && "Python"}
                      {tab === "source" && "Source"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-neutral-800/50 border border-white/5 rounded-2xl overflow-hidden min-h-[500px]">
                {activeTab === "clean" && (
                  <div className="p-8 bg-white text-neutral-900 min-h-[500px]">
                    <div className="prose max-w-none [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_video]:max-w-full">
                      {result.cleanHtml.length < 500 && (
                         <div className="mb-6 p-4 bg-orange-50 text-orange-800 rounded-lg text-sm border border-orange-100 flex items-start gap-3">
                            <ShieldAlert className="shrink-0 mt-0.5" size={18} />
                            <div>
                              <strong>Warning: Low Content Detected</strong>
                              <p className="mt-1">
                                This page appears to have very little content. It might be a <strong>Single Page Application (SPA)</strong> that requires JavaScript to render, or it might be blocking automated access.
                                <br/>
                                Try checking the <strong>Source</strong> tab to see if the content is hidden in the raw HTML.
                              </p>
                            </div>
                         </div>
                      )}
                      <div className="mb-4 p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-100">
                        <strong>Note:</strong> Scripts, iframes, and known overlay elements have been removed.
                      </div>
                      {/* Render sanitized HTML safely */}
                      <div dangerouslySetInnerHTML={{ __html: result.cleanHtml }} />
                    </div>
                  </div>
                )}

                {activeTab === "media" && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {result.images.length === 0 && result.videos.length === 0 && (
                        <div className="col-span-full text-center py-20 text-neutral-500">
                          <Image size={48} className="mx-auto mb-4 opacity-50" />
                          <p>No media assets found.</p>
                        </div>
                      )}
                      
                      {result.videos.map((vid, idx) => (
                        <div key={`vid-${idx}`} className="group relative bg-neutral-900 rounded-xl overflow-hidden border border-white/10">
                          <div className="aspect-video bg-black flex items-center justify-center">
                            <video src={vid} controls className="w-full h-full object-contain" />
                          </div>
                          <div className="p-3 flex items-center justify-between bg-neutral-800">
                            <span className="text-xs text-neutral-400 font-mono truncate max-w-[200px]">{vid.split('/').pop()}</span>
                            <a
                              href={vid}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 hover:bg-neutral-700 rounded-lg text-emerald-400 transition-colors"
                              title="Download Video"
                            >
                              <Download size={16} />
                            </a>
                          </div>
                        </div>
                      ))}

                      {result.images.map((img, idx) => (
                        <div key={`img-${idx}`} className="group relative bg-neutral-900 rounded-xl overflow-hidden border border-white/10">
                          <div className="aspect-square bg-neutral-950/50 relative">
                            <img src={img} alt="" className="w-full h-full object-contain" />
                          </div>
                          <div className="p-3 flex items-center justify-between bg-neutral-800">
                            <span className="text-xs text-neutral-400 font-mono truncate max-w-[200px]">{img.split('/').pop()}</span>
                            <a
                              href={img}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 hover:bg-neutral-700 rounded-lg text-emerald-400 transition-colors"
                              title="Download Image"
                            >
                              <Download size={16} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "files" && (
                  <div className="p-6">
                    <div className="space-y-2">
                       {result.files.length === 0 && (
                        <div className="text-center py-20 text-neutral-500">
                          <FileCode size={48} className="mx-auto mb-4 opacity-50" />
                          <p>No downloadable files found.</p>
                        </div>
                      )}
                      {result.files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-neutral-900 rounded-lg border border-white/5 hover:border-emerald-500/30 transition-colors group">
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-emerald-500 font-bold text-xs">
                              {file.type}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-sm font-medium text-neutral-200 truncate">{file.name}</span>
                              <span className="text-xs text-neutral-500 truncate">{file.url}</span>
                            </div>
                          </div>
                          <a
                            href={file.url}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-emerald-400 transition-colors"
                            title="Download File"
                          >
                            <Download size={18} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "scripts" && (
                  <div className="p-6">
                    <div className="space-y-2">
                       {result.scripts.length === 0 && (
                        <div className="text-center py-20 text-neutral-500">
                          <FileCode size={48} className="mx-auto mb-4 opacity-50" />
                          <p>No external scripts found.</p>
                        </div>
                      )}
                      {result.scripts.map((script, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-neutral-900 rounded-lg border border-white/5 hover:border-emerald-500/30 transition-colors group">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileCode size={16} className="text-emerald-500 shrink-0" />
                            <span className="text-sm font-mono text-neutral-300 truncate">{script}</span>
                          </div>
                          <a
                            href={script}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-md text-emerald-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            Open
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "python" && (
                  <div className="p-6">
                    <div className="space-y-4">
                       {result.python.length === 0 && (
                        <div className="text-center py-20 text-neutral-500">
                          <FileCode size={48} className="mx-auto mb-4 opacity-50" />
                          <p>No Python code snippets found.</p>
                        </div>
                      )}
                      {result.python.map((code, idx) => (
                        <div key={idx} className="bg-neutral-950 rounded-xl overflow-hidden border border-white/10">
                          <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-white/5">
                            <span className="text-xs font-mono text-neutral-500">Snippet #{idx + 1}</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(code);
                                // Optional: add toast notification
                              }}
                              className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
                            >
                              Copy Code
                            </button>
                          </div>
                          <pre className="p-4 overflow-x-auto text-xs font-mono text-emerald-500 leading-relaxed">
                            {code}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "source" && (
                  <div className="relative h-[600px] overflow-hidden">
                     <textarea
                      readOnly
                      className="w-full h-full bg-neutral-950 text-emerald-500 font-mono text-xs p-6 resize-none focus:outline-none"
                      value={result.originalHtml}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
