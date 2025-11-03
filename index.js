import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

const ELEVEN_VOICES_URL = "https://api.elevenlabs.io/v2/voices?voice_type=personal";
const ELEVEN_HISTORY_URL = "https://api.elevenlabs.io/v1/history?page_size=25";

function getApiKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("Missing ELEVENLABS_API_KEY in server/.env");
  return key;
}

app.get('/api/voices', async (req, res) => {
  try {
    const r = await fetch(ELEVEN_VOICES_URL, {
      headers: { 'xi-api-key': getApiKey() }
    });
    const body = await r.text();
    res.status(r.status).type(r.headers.get('content-type') || 'application/json').send(body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const r = await fetch(ELEVEN_HISTORY_URL, {
      headers: { 'xi-api-key': getApiKey() }
    });
    const body = await r.text();
    res.status(r.status).type(r.headers.get('content-type') || 'application/json').send(body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.get('/api/history/:id/audio', async (req, res) => {
  const { id } = req.params;
  try {
    const url = `https://api.elevenlabs.io/v1/history/${id}/audio`;
    const r = await fetch(url, {
      headers: { 'xi-api-key': getApiKey(), 'accept': 'audio/mpeg' }
    });
    res.status(r.status);
    // forward headers & stream
    for (const [k, v] of r.headers) res.setHeader(k, v);
    r.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch audio' });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`[server] listening on http://localhost:${port}`));