module.exports = async (req, res) => {
  const { q, lat, lon, units } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }
  
  const unitsParam = units || 'metric';
  let url;
  
  if (lat && lon) {
    url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unitsParam}`;
  } else if (q) {
    url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(q)}&appid=${apiKey}&units=${unitsParam}`;
  } else {
    return res.status(400).json({ error: 'Missing parameters q or lat/lon' });
  }
  
  try {
    const apiRes = await fetch(url);
    const data = await apiRes.json();
    return res.status(apiRes.status).json(data);
  } catch (error) {
    console.error('Error in forecast proxy:', error);
    return res.status(500).json({ error: 'Failed to fetch forecast data from OpenWeather' });
  }
};
