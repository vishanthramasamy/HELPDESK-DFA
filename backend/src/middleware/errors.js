export function notFound(_req, res) {
  res.status(404).json({ error: 'API endpoint not found.' });
}

export function errorHandler(error, _req, res, _next) {
  console.error(error.message);
  if (error.message === 'Origin is not allowed by CORS') return res.status(403).json({ error: 'This website origin is not allowed to access the API.' });
  if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
  if (error.code === 11000) return res.status(409).json({ error: 'That value is already in use.' });
  const status = Number.isInteger(error.status) ? error.status : 500;
  res.status(status).json({ error: status >= 500 ? 'The server could not complete the request.' : error.message });
}
