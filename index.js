import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = "0096403ea6c34a8180ceba2acbfc1bc2";
const CLIENT_SECRET = "ca0eae43c6d745a3bbeee1233701e7d0";

async function getToken() {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const data = await res.json();
  return data.access_token;
}

app.get("/", (req, res) => {
  res.send("🎧 Spotify Proxy aktif! /api/artist/:isim endpointini kullan.");
});

app.get("/api/artist/:q", async (req, res) => {
  try {
    const q = req.params.q;
    const token = await getToken();

    const search = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=artist&limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const sData = await search.json();
    const artist = sData.artists?.items?.[0];
    if (!artist) return res.json({ ok: false, message: "Artist bulunamadı." });

    const top = await fetch(`https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const tData = await top.json();
    const tracks = tData.tracks || [];

    const previews = tracks.filter(t => t.preview_url).map(t => ({
      name: t.name,
      preview_url: t.preview_url,
      album: t.album.name,
      cover: t.album.images[0]?.url,
      artists: t.artists.map(a => a.name).join(", ")
    }));

    res.json({
      ok: true,
      artist: artist.name,
      total: tracks.length,
      previews: previews.length,
      tracks: previews
    });

  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Spotify proxy çalışıyor ${PORT}`));
