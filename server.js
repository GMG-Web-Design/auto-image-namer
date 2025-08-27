const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Perplexity API configuration
const perplexityApiKey = process.env.PERPLEXITY_API_KEY;

// Analysis queue and storage
const analysisQueue = [];
let isProcessing = false;
const SAVED_ANALYSES_DIR = path.join(__dirname, 'saved-analyses');

// Ensure saved-analyses directory exists
if (!fsSync.existsSync(SAVED_ANALYSES_DIR)) {
  fsSync.mkdirSync(SAVED_ANALYSES_DIR, { recursive: true });
}

// Authentication configuration
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync('admin123', 10);

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware
app.use(cors());
app.use(express.json());
// Note: static middleware moved after routes to prevent index.html from overriding our routes

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Helper function to convert image to base64
function imageToBase64(buffer, mimetype) {
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
}

// Helper function to generate filename from description
function generateFilename(description, originalName) {
  // Get file extension
  const ext = path.extname(originalName);
  
  // Clean and format the description
  let filename = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  // Limit length and add extension
  filename = filename.substring(0, 50) + ext;
  
  return filename;
}

// Helper functions for analysis storage and queue management
async function saveAnalysis(analysisData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = analysisData.name ? analysisData.name.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-') : 'unnamed-analysis';
  const filename = `${timestamp}_${safeName}.json`;
  const filepath = path.join(SAVED_ANALYSES_DIR, filename);
  
  await fs.writeFile(filepath, JSON.stringify(analysisData, null, 2));
  return filename;
}

async function getRecentAnalyses() {
  try {
    const files = await fs.readdir(SAVED_ANALYSES_DIR);
    const analyses = [];
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filepath = path.join(SAVED_ANALYSES_DIR, file);
        const stats = await fs.stat(filepath);
        
        if (stats.mtime.getTime() > twentyFourHoursAgo) {
          const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
          analyses.push({
            id: file.replace('.json', ''),
            name: data.name || 'Unnamed Analysis',
            timestamp: data.timestamp,
            imageCount: data.results?.length || 0,
            status: data.status
          });
        }
      }
    }

    return analyses.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('Error getting recent analyses:', error);
    return [];
  }
}

async function cleanupOldAnalyses() {
  try {
    const files = await fs.readdir(SAVED_ANALYSES_DIR);
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filepath = path.join(SAVED_ANALYSES_DIR, file);
        const stats = await fs.stat(filepath);
        
        if (stats.mtime.getTime() < twentyFourHoursAgo) {
          await fs.unlink(filepath);
          console.log(`Cleaned up old analysis: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old analyses:', error);
  }
}

// Queue processing function
async function processQueue() {
  if (isProcessing || analysisQueue.length === 0) {
    return;
  }

  isProcessing = true;
  const currentAnalysis = analysisQueue[0];
  
  try {
    console.log(`Processing analysis: ${currentAnalysis.name || 'Unnamed'} (${currentAnalysis.files.length} images)`);
    
    // Update status
    currentAnalysis.status = 'processing';
    
    // Process the analysis (existing logic)
    const results = await processAnalysisFiles(currentAnalysis);
    
    // Save results
    const analysisData = {
      id: currentAnalysis.id,
      name: currentAnalysis.name,
      timestamp: currentAnalysis.timestamp,
      analysisMode: currentAnalysis.analysisMode,
      results: results,
      status: 'completed',
      textOutput: generateTextOutput(results)
    };
    
    await saveAnalysis(analysisData);
    
    // Update queue item
    currentAnalysis.status = 'completed';
    currentAnalysis.results = results;
    currentAnalysis.textOutput = analysisData.textOutput;
    
    console.log(`Analysis completed: ${currentAnalysis.name || 'Unnamed'}`);
    
  } catch (error) {
    console.error(`Error processing analysis ${currentAnalysis.id}:`, error);
    currentAnalysis.status = 'failed';
    currentAnalysis.error = error.message;
  }
  
  // Remove from queue after processing
  analysisQueue.shift();
  isProcessing = false;
  
  // Process next item in queue
  setTimeout(processQueue, 1000);
}

// Extract the existing analysis logic into a separate function
async function processAnalysisFiles(analysisItem) {
  const { files, analysisMode } = analysisItem;
  const results = [];
  const BATCH_SIZE = 5;
  const DELAY_BETWEEN_BATCHES = 2000;
  const DELAY_BETWEEN_REQUESTS = 500;
  
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    
    console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(files.length/BATCH_SIZE)} (${batch.length} images)`);
    
    for (const file of batch) {
      try {
        let analysis;
        
        if (analysisMode.startsWith('sonar')) {
          analysis = await analyzeSonarPro(file, analysisMode === 'sonar-web');
        } else {
          analysis = await analyzeOpenAI(file, analysisMode === 'openai-advanced');
        }
        
        results.push({
          original: file.originalname,
          analysis: analysis
        });
        
        if (file !== batch[batch.length - 1]) {
          await delay(DELAY_BETWEEN_REQUESTS);
        }
        
      } catch (error) {
        console.error(`Error processing ${file.originalname}:`, error);
        results.push({
          original: file.originalname,
          analysis: `**Original:** ${file.originalname}\n**Error:** Unable to process this image\n**Description:** Error occurred during analysis\n**Website Usage:** N/A\n**Professional Assessment:** Could not assess due to processing error`,
          error: true
        });
      }
    }
    
    if (i + BATCH_SIZE < files.length) {
      console.log(`Waiting ${DELAY_BETWEEN_BATCHES/1000} seconds before next batch...`);
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }
  
  return results;
}

function generateTextOutput(results) {
  const header = "Added the folder to the project with images in it. use the below to rename the images and put them in relevant spots on the site. Replace images and adjust content as necessary. Ensure you move the images to the proper location within the project so they show up\n\n";
  
  const analysisText = results
    .map(result => result.analysis)
    .join('\n\n---\n\n');
  
  return header + analysisText;
}

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  } else {
    return res.redirect('/');
  }
}

// Route to serve the login page (now home page)
app.get('/', (req, res) => {
  // If already authenticated, redirect to image analysis
  if (req.session && req.session.authenticated) {
    return res.redirect('/imageanalysis');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Legacy login route (redirect to home)
app.get('/login', (req, res) => {
  res.redirect('/');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_USERNAME && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    req.session.authenticated = true;
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out successfully' });
});

// Route to serve the image analysis page (protected)
app.get('/imageanalysis', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// New API routes for analysis management (protected)
app.get('/api/analyses', requireAuth, async (req, res) => {
  try {
    const analyses = await getRecentAnalyses();
    res.json(analyses);
  } catch (error) {
    console.error('Error getting analyses:', error);
    res.status(500).json({ error: 'Failed to get analyses' });
  }
});

app.get('/api/analyses/:id', requireAuth, async (req, res) => {
  try {
    const filepath = path.join(SAVED_ANALYSES_DIR, `${req.params.id}.json`);
    const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
    res.json(data);
  } catch (error) {
    console.error('Error getting analysis:', error);
    res.status(404).json({ error: 'Analysis not found' });
  }
});

app.get('/api/queue', requireAuth, (req, res) => {
  const queueStatus = analysisQueue.map(item => ({
    id: item.id,
    name: item.name || 'Unnamed Analysis',
    status: item.status,
    imageCount: item.files.length,
    timestamp: item.timestamp
  }));
  
  res.json({
    queue: queueStatus,
    isProcessing: isProcessing,
    queueLength: analysisQueue.length
  });
});

app.delete('/api/queue/:id', requireAuth, (req, res) => {
  const analysisId = req.params.id;
  const itemIndex = analysisQueue.findIndex(item => item.id === analysisId);
  
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Analysis not found in queue' });
  }
  
  const item = analysisQueue[itemIndex];
  
  // Don't allow removing currently processing item
  if (item.status === 'processing') {
    return res.status(400).json({ error: 'Cannot remove analysis that is currently processing' });
  }
  
  // Remove from queue
  analysisQueue.splice(itemIndex, 1);
  
  console.log(`Analysis removed from queue: ${item.name || 'Unnamed'} (${item.files.length} images)`);
  
  res.json({ 
    success: true, 
    message: `Analysis "${item.name || 'Unnamed'}" removed from queue` 
  });
});

// Route to handle image analysis - now with queueing (protected)
app.post('/analyze', requireAuth, upload.array('images', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const analysisMode = req.body.analysisMode || 'sonar';
    const analysisName = req.body.analysisName || '';
    
    // Create analysis item for queue
    const analysisItem = {
      id: uuidv4(),
      name: analysisName,
      timestamp: new Date().toISOString(),
      analysisMode: analysisMode,
      files: req.files,
      status: 'queued'
    };
    
    // Add to queue
    analysisQueue.push(analysisItem);
    
    console.log(`Analysis queued: ${analysisName || 'Unnamed'} (${req.files.length} images) - Position ${analysisQueue.length} in queue`);
    
    // Start processing if not already processing
    if (!isProcessing) {
      processQueue();
    }
    
    res.json({
      success: true,
      analysisId: analysisItem.id,
      queuePosition: analysisQueue.length,
      message: analysisQueue.length === 1 ? 'Analysis started' : `Analysis queued at position ${analysisQueue.length}`
    });

  } catch (error) {
    console.error('Error in /analyze route:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Serve static files after all routes are defined
app.use(express.static('public'));

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  res.status(500).json({ error: error.message });
});

// Analysis functions
async function analyzeSonarPro(file, includeWebSearch) {
  const base64Image = imageToBase64(file.buffer, file.mimetype);
  
  let prompt = `Analyze this image with the original filename "${file.originalname}". Provide a detailed analysis in the following format:

**Original:** ${file.originalname}
**Suggested:** [new descriptive filename with extension]
**Description:** [Detailed description of what the image shows - be very specific about elements, colors, layout, text, UI components, etc.]
**Website Usage:** [Explain where and how this could be used on a website - hero section, about page, product gallery, blog post, etc.]
**Professional Assessment:** [State whether this image is suitable for professional website use or if it has issues like being blurry, poorly cropped, unprofessional lighting, etc. IMPORTANT: If this appears to be a screenshot, has visible UI elements (browser bars, desktop elements, app interfaces), or looks like it needs cropping to remove unwanted parts, mark it as NOT suitable for website use. Screenshots and images with extraneous UI elements are unprofessional for website use. Be honest about quality.]

Focus on creating meaningful, SEO-friendly filenames that describe both the content and potential use case. Pay special attention to identifying screenshots or images with extraneous elements.`;

  if (includeWebSearch) {
    // First, get basic image analysis
    const imageAnalysis = await callPerplexityAPI(prompt, base64Image, false);
    
    // Then do web research based on the image content
    const webResearchPrompt = `Based on this image analysis: "${imageAnalysis}", research current web design trends, similar successful implementations, and industry best practices. Provide additional insights about:
- Current design trends that match this style
- Similar implementations on popular websites
- Modern naming conventions for this type of content
- Industry-specific recommendations`;
    
    const webResearch = await callPerplexityAPI(webResearchPrompt, null, true);
    
    return `${imageAnalysis}\n\n**Web Research & Trends:**\n${webResearch}`;
  } else {
    return await callPerplexityAPI(prompt, base64Image, false);
  }
}

async function analyzeOpenAI(file, isAdvanced) {
  const base64Image = imageToBase64(file.buffer, file.mimetype);
  
  const standardPrompt = `Analyze this image with the original filename "${file.originalname}". Provide a detailed analysis in the following format:

**Original:** ${file.originalname}
**Suggested:** [new descriptive filename with extension]
**Description:** [Detailed description of what the image shows - be very specific about elements, colors, layout, text, UI components, etc.]
**Website Usage:** [Explain where and how this could be used on a website - hero section, about page, product gallery, blog post, etc.]
**Professional Assessment:** [State whether this image is suitable for professional website use or if it has issues like being blurry, poorly cropped, unprofessional lighting, etc. IMPORTANT: If this appears to be a screenshot, has visible UI elements (browser bars, desktop elements, app interfaces), or looks like it needs cropping to remove unwanted parts, mark it as NOT suitable for website use. Screenshots and images with extraneous UI elements are unprofessional for website use. Be honest about quality.]

Focus on creating meaningful, SEO-friendly filenames that describe both the content and potential use case. Pay special attention to identifying screenshots or images with extraneous elements.`;

  const advancedPrompt = `Analyze this image with the original filename "${file.originalname}". Provide an ultra-detailed professional analysis in the following format:

**Original:** ${file.originalname}
**Suggested:** [new descriptive filename with extension - include technical context]
**Description:** [Extremely detailed description including specific UI elements, typography, color schemes, layout patterns, brand elements, etc.]
**Technical Specs:** [Image dimensions if visible, file format recommendations, compression suggestions, resolution assessment]
**Website Suitability Assessment:** [CRITICAL EVALUATION: Should this image be used on a website at all? Check for: sensitive/confidential information, personal data, inappropriate content, unprofessional elements, poor image quality, copyright concerns, or anything that could harm brand reputation. ESPECIALLY IMPORTANT: If this appears to be a screenshot, has visible UI elements (browser bars, desktop elements, app interfaces, window frames, taskbars), or looks like it needs cropping to remove unwanted parts, mark it as NOT suitable for website use. Screenshots and images with extraneous UI elements are unprofessional for website use. Be brutally honest - if it shouldn't be used, clearly state WHY NOT.]
**Website Usage:** [Only if suitable for web use - Multiple specific use cases with detailed placement recommendations - hero sections, landing pages, product showcases, blog headers, social media, etc.]
**SEO Considerations:** [Alt text suggestions, semantic meaning, keyword opportunities]
**Accessibility Assessment:** [Color contrast, readability, accessibility concerns, screen reader considerations]
**Professional Assessment:** [Comprehensive quality evaluation including composition, lighting, technical quality, brand consistency, and specific improvement recommendations]
**Content Strategy:** [How this image fits into broader content marketing, user experience considerations, conversion potential]

Focus on creating highly optimized, contextual filenames that serve both technical and marketing purposes.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: isAdvanced ? advancedPrompt : standardPrompt
          },
          {
            type: "image_url",
            image_url: {
              url: base64Image,
              detail: "high"
            }
          }
        ]
      }
    ],
    max_tokens: isAdvanced ? 500 : 300
  });

  return response.choices[0].message.content.trim();
}

async function callPerplexityAPI(prompt, base64Image, useWebSearch) {
  const messages = [
    {
      role: "user",
      content: base64Image ? [
        {
          type: "text",
          text: prompt
        },
        {
          type: "image_url",
          image_url: {
            url: base64Image
          }
        }
      ] : prompt
    }
  ];

  // Use correct model names from Perplexity docs
  const model = useWebSearch ? "sonar-pro" : "sonar";

  const response = await axios.post('https://api.perplexity.ai/chat/completions', {
    model: model,
    stream: false, // Required parameter for Perplexity API
    messages: messages,
    max_tokens: 400,
    temperature: 0.2,
    top_p: 0.9
  }, {
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${perplexityApiKey}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data.choices[0].message.content.trim();
}

// For Vercel deployment, we need to handle the serverless environment differently
if (process.env.NODE_ENV !== 'production') {
  // Start cleanup job - runs every hour (only in development)
  setInterval(cleanupOldAnalyses, 60 * 60 * 1000);
  
  // Run cleanup on startup (only in development)
  cleanupOldAnalyses();
  
  app.listen(PORT, () => {
    console.log(`🚀 Auto Image Namer running at http://localhost:${PORT}`);
    console.log('📝 Make sure to set your OPENAI_API_KEY and PERPLEXITY_API_KEY in the .env file');
    console.log('📁 Analysis storage and queueing system initialized');
  });
} else {
  // For production (Vercel), run cleanup on each cold start
  cleanupOldAnalyses().catch(console.error);
}

// Export for Vercel
module.exports = app; 