// server/index.ts
import express2 from "express";

// server/routes.ts
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
function registerRoutes(app2) {
  app2.get("/api/content/:section", async (req, res) => {
    try {
      const { section } = req.params;
      const contentDir = path.resolve(__dirname, "..", "content", section);
      console.log("Attempting to access directory:", contentDir);
      try {
        await fs.access(contentDir);
        console.log("Directory exists:", contentDir);
      } catch (error) {
        console.error(`Directory not found: ${contentDir}`);
        return res.status(404).json({
          error: "Section not found",
          details: `The ${section} section could not be found`,
          path: contentDir
        });
      }
      const files = await fs.readdir(contentDir);
      console.log("Files in directory:", files);
      const markdownFiles = files.filter((file) => file.endsWith(".md"));
      console.log("Markdown files found:", markdownFiles);
      if (markdownFiles.length === 0) {
        console.warn(`No markdown files found in ${contentDir}`);
        return res.status(404).json({
          error: "No content found",
          details: `No markdown files found in ${section} section`
        });
      }
      const content = await Promise.all(
        markdownFiles.map(async (file) => {
          try {
            const filePath = path.join(contentDir, file);
            console.log("Reading file:", filePath);
            const data = await fs.readFile(filePath, "utf-8");
            return data;
          } catch (error) {
            console.error(`Error reading file ${file}:`, error);
            throw new Error(`Failed to read file ${file}`);
          }
        })
      );
      console.log(`Successfully loaded ${content.length} files from ${section}`);
      res.json(content);
    } catch (error) {
      console.error("Error processing content request:", error);
      res.status(500).json({
        error: "Failed to load content",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path2, { dirname } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer } from "vite";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname(__filename2);
async function setupVite(app2, server) {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: { server }
    },
    clearScreen: false,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import { createServer } from "http";
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
(async () => {
  registerRoutes(app);
  const server = createServer(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const PORT = 5e3;
  server.listen(PORT, "0.0.0.0", () => {
    const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
    console.log(`${formattedTime} [express] serving on port ${PORT}`);
  });
})();
