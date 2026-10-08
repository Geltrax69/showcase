module.exports = async (req, res) => {
  const { q } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }
  
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }
  
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${apiKey}`;
  
  try {
    const apiRes = await fetch(url);
    const data = await apiRes.json();
    return res.status(apiRes.status).json(data);
  } catch (error) {
    console.error('Error in geocoding proxy:', error);
    return res.status(500).json({ error: 'Failed to fetch geocoding data from OpenWeather' });
  }
};
