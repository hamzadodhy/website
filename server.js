const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const archiver = require('archiver');
const app = express();
const port = 3000;

// Serve static files from the current directory
app.use(express.static('.'));

// API endpoint to get files from a project folder
app.get('/api/files', async (req, res) => {
    try {
        const projectFolder = req.query.folder;
        const folderPath = path.join(__dirname, 'projects', projectFolder);
        
        // Read directory contents
        const files = await fs.readdir(folderPath);
        
        // Filter out system files and get file details
        const fileDetails = await Promise.all(
            files
                .filter(file => !file.startsWith('.')) // Filter out hidden files
                .map(async file => {
                    const filePath = path.join(projectFolder, file);
                    const stats = await fs.stat(path.join(folderPath, file));
                    return {
                        name: file,
                        path: `/projects/${filePath}`,
                        size: stats.size,
                        isDirectory: stats.isDirectory()
                    };
                })
        );

        res.json(fileDetails);
    } catch (error) {
        console.error('Error reading project files:', error);
        res.status(500).json({ error: 'Error reading project files' });
    }
});

// API endpoint to download all files as ZIP
app.get('/api/download-project', async (req, res) => {
    try {
        const projectFolder = req.query.folder;
        const folderPath = path.join(__dirname, 'projects', projectFolder);
        
        // Set response headers
        res.attachment(`${projectFolder}.zip`);
        res.setHeader('Content-Type', 'application/zip');

        // Create zip archive
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        // Pipe archive data to response
        archive.pipe(res);

        // Get all files in the directory
        const files = await fs.readdir(folderPath);
        
        // Add each file to the archive
        for (const file of files) {
            if (!file.startsWith('.')) { // Skip hidden files
                const filePath = path.join(folderPath, file);
                const stats = await fs.stat(filePath);
                
                if (stats.isFile()) {
                    archive.file(filePath, { name: file });
                }
            }
        }

        // Finalize archive
        await archive.finalize();

    } catch (error) {
        console.error('Error creating ZIP:', error);
        res.status(500).json({ error: 'Error creating ZIP file' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 