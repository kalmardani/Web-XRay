import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to analyze a URL
  app.post("/api/analyze", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Fetch the HTML with a timeout
      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        timeout: 15000, // 15 seconds timeout
      });
      const html = response.data;
      const $ = cheerio.load(html);

      // Extract Metadata
      const title = $("title").text() || $("meta[property='og:title']").attr("content") || "Untitled";

      // Extract Images (img tags + OpenGraph)
      const images: string[] = [];
      
      // 1. Standard img tags
      $("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src");
        if (src) {
          try {
            const absoluteUrl = new URL(src, url).href;
            images.push(absoluteUrl);
          } catch (e) {}
        }
      });

      // 2. OpenGraph and Twitter Card images
      $("meta[property='og:image']").each((_, el) => {
        const content = $(el).attr("content");
        if (content) {
           try { images.push(new URL(content, url).href); } catch(e) {}
        }
      });
      $("meta[name='twitter:image']").each((_, el) => {
        const content = $(el).attr("content");
        if (content) {
           try { images.push(new URL(content, url).href); } catch(e) {}
        }
      });

      // Extract Videos (video tags + OpenGraph)
      const videos: string[] = [];
      $("video").each((_, el) => {
        const src = $(el).attr("src");
        if (src) {
           try { videos.push(new URL(src, url).href); } catch (e) {}
        }
        $(el).find("source").each((_, source) => {
           const sourceSrc = $(source).attr("src");
           if (sourceSrc) {
             try { videos.push(new URL(sourceSrc, url).href); } catch (e) {}
           }
        });
      });
      $("meta[property='og:video']").each((_, el) => {
        const content = $(el).attr("content");
        if (content) {
           try { videos.push(new URL(content, url).href); } catch(e) {}
        }
      });

      // Extract Files (PDF, ZIP, DOC, etc.)
      const files: { url: string; name: string; type: string }[] = [];
      const fileExtensions = /\.(pdf|zip|rar|7z|tar|gz|doc|docx|xls|xlsx|ppt|pptx|mp3|wav|flac|exe|dmg|iso)$/i;
      
      $("a").each((_, el) => {
        const href = $(el).attr("href");
        if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
          try {
            const absoluteUrl = new URL(href, url).href;
            const pathname = new URL(absoluteUrl).pathname;
            
            if (fileExtensions.test(pathname)) {
               const name = $(el).text().trim() || pathname.split('/').pop() || "Unknown File";
               const ext = pathname.split('.').pop()?.toUpperCase() || "FILE";
               files.push({ url: absoluteUrl, name, type: ext });
            }
          } catch (e) {}
        }
      });

      // Extract Scripts
      const scripts: string[] = [];
      $("script").each((_, el) => {
        const src = $(el).attr("src");
        if (src) {
          try {
            const absoluteUrl = new URL(src, url).href;
            scripts.push(absoluteUrl);
          } catch (e) {}
        }
      });

      // Extract Python Code
      const pythonSnippets: string[] = [];
      
      // 1. PyScript tags
      $("py-script").each((_, el) => {
        const code = $(el).text().trim();
        if (code) pythonSnippets.push(code);
      });
      
      // 2. Script tags with python type
      $("script[type='py'], script[type='pyscript']").each((_, el) => {
        const code = $(el).text().trim();
        if (code) pythonSnippets.push(code);
      });

      // 3. Code blocks with python class
      $("pre code, code").each((_, el) => {
        const className = $(el).attr("class") || "";
        if (className.includes("python") || className.includes("language-python") || className.includes("py")) {
          const code = $(el).text().trim();
          if (code) pythonSnippets.push(code);
        }
      });

      // Create a "Clean" version (Reader Mode)
      // Remove scripts, styles, iframes, and common annoyance classes
      const clean$ = cheerio.load(html);
      clean$("script").remove();
      clean$("style").remove();
      clean$("iframe").remove();
      clean$("noscript").remove();
      
      // Attempt to remove common overlay/modal classes (heuristic)
      clean$('[class*="overlay"]').remove();
      clean$('[class*="modal"]').remove();
      clean$('[class*="popup"]').remove();
      clean$('[class*="cookie"]').remove();
      clean$('[class*="subscribe"]').remove();
      clean$('[id*="overlay"]').remove();
      clean$('[id*="modal"]').remove();

      const cleanHtml = clean$("body").html() || "";

      res.json({
        title,
        originalHtml: html,
        cleanHtml,
        images: [...new Set(images)], // Deduplicate
        videos: [...new Set(videos)],
        scripts: [...new Set(scripts)],
        files: files, // No need to dedup objects yet, or could dedup by URL
        python: [...new Set(pythonSnippets)],
      });
    } catch (error: any) {
      console.error("Error analyzing URL:", error.message);
      if (error.code === 'ECONNABORTED') {
        return res.status(504).json({ error: "Request timed out. The website is taking too long to respond." });
      }
      res.status(500).json({ error: "Failed to fetch or analyze URL. The site might block automated requests or is unavailable." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
