import axios from 'axios';
import dotenv from "dotenv"
dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY;

async function analyzeAudioWithGemini(audioBase64, mimeType) {
    // Fallback to audio/mp3 if mimeType is undefined
    const safeMimeType = mimeType || 'audio/mp3';

    const prompt = `
    Listen to this audio command. First, internally transcribe what the user is commanding. 
    Then, return a JSON object with exactly this structure capturing the semantic tasks:
    {
        "transcript": "Exact transcription of the audio",
        "tasks": [
            {
                "task": "description of task",
                "date": "date if mentioned (e.g. tomorrow, '2023-10-31'), else 'No date'",
                "time": "time if mentioned (e.g. 5 PM), else 'No time'"
            }
        ]
    }
    `;

    const candidateModels = [
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash',
        'gemini-2.5-flash',
        'gemini-3.7-flash'
    ];

    let lastError = null;

    for (const model of candidateModels) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
            const response = await axios.post(url, {
                contents: [{
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: safeMimeType,
                                data: audioBase64
                            }
                        }
                    ]
                }],
                systemInstruction: {
                    parts: [{ text: "You are a JSON formatter. Only respond with valid JSON objects. Do not include markdown tags." }]
                },
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json"
                }
            }, { timeout: 30000 });

            const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                throw new Error(`Empty response received from ${model}`);
            }

            const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error('No valid JSON found in model response');
            }

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.warn(`Model ${model} failed:`, error.response?.data?.error?.message || error.message);
            lastError = error;
        }
    }

    throw lastError || new Error('All candidate models failed to process audio.');
}

export const setupTranscriptionRoutes = (app, upload) => {
    app.post('/transcribe', upload.single('audio'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "No audio file uploaded" });
            }

            if (!geminiApiKey) {
                return res.status(500).json({ status: 'error', error: 'Missing GEMINI_API_KEY in .env file in Backend folder.' });
            }

            const audioBytes = req.file.buffer.toString('base64');
            const fileMimeType = req.file.mimetype;

            const extractedData = await analyzeAudioWithGemini(audioBytes, fileMimeType);

            // Format natively generated tasks
            const formattedTasks = (extractedData.tasks || []).map(task => ({
                id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                task: task.task,
                date: task.date || "No date",
                time: task.time || "No time",
                status: "pending"
            }));

            return res.json({
                status: 'success',
                transcript: extractedData.transcript || "Audio transcribed successfully.",
                tasks: formattedTasks
            });

        } catch (error) {
            console.error('Processing error:', error);
            res.status(500).json({
                status: 'error',
                error: 'Processing failed',
                details: error.message
            });
        }
    });
};
