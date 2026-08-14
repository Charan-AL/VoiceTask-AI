import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import { setupTranscriptionRoutes } from './transcriptionService.js';

const app = express();
const port = process.env.PORT || 3000;

// CORS Middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Middleware configuration
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// Multer configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Setup routes
setupTranscriptionRoutes(app, upload);

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: "healthy",
        message: "Voice-to-Action Backend is running",
        version: "1.0.0"
    });
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
