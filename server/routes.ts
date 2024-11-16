import type { Express } from "express";
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function registerRoutes(app: Express) {
  // Get content for a specific section
  app.get('/api/content/:section', async (req, res) => {
    try {
      const { section } = req.params;
      const contentDir = path.resolve(__dirname, '..', 'content', section);
      
      console.log('Attempting to access directory:', contentDir);
      
      // Check if directory exists
      try {
        await fs.access(contentDir);
        console.log('Directory exists:', contentDir);
      } catch (error) {
        console.error(`Directory not found: ${contentDir}`);
        return res.status(404).json({ 
          error: 'Section not found',
          details: `The ${section} section could not be found`,
          path: contentDir
        });
      }
      
      const files = await fs.readdir(contentDir);
      console.log('Files in directory:', files);
      
      const markdownFiles = files.filter(file => file.endsWith('.md'));
      console.log('Markdown files found:', markdownFiles);
      
      if (markdownFiles.length === 0) {
        console.warn(`No markdown files found in ${contentDir}`);
        return res.status(404).json({ 
          error: 'No content found',
          details: `No markdown files found in ${section} section`
        });
      }
      
      const content = await Promise.all(
        markdownFiles.map(async (file) => {
          try {
            const filePath = path.join(contentDir, file);
            console.log('Reading file:', filePath);
            const data = await fs.readFile(filePath, 'utf-8');
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
      console.error('Error processing content request:', error);
      res.status(500).json({ 
        error: 'Failed to load content',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Save content to a specific file
  app.post('/api/content/:section/:filename', async (req, res) => {
    try {
      const { section, filename } = req.params;
      const { content } = req.body;
      
      const filePath = path.resolve(__dirname, '..', 'content', section, filename);
      await fs.writeFile(filePath, content, 'utf-8');
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving content:', error);
      res.status(500).json({ 
        error: 'Failed to save content',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
}
