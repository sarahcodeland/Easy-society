import { Router } from 'express';
import axios from 'axios';
import { pool } from '../../db/pool';
import { asyncHandler, ApiError } from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';
import { env } from '../../config/env';
import { cached } from '../../utils/cache';

const router = Router();

// GET /weather — auto-detected from the user's registered area's lat/lng.
// Cached per-location for 15 min so 1M users in the same city don't all
// trigger separate OpenWeatherMap calls.
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = await pool.query(
      `SELECT l.id, l.lat, l.lng FROM users u JOIN locations l ON l.id = u.location_id WHERE u.id = $1`,
      [req.auth!.userId],
    );
    const location = me.rows[0];
    if (!location?.lat || !location?.lng) {
      throw new ApiError(400, 'Your registered area has no coordinates on file');
    }

    if (!env.openWeatherApiKey) {
      throw new ApiError(503, 'Weather service not configured (missing OPENWEATHER_API_KEY)');
    }

    const weather = await cached(`weather:${location.id}`, 900, async () => {
      const { data } = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: { lat: location.lat, lon: location.lng, appid: env.openWeatherApiKey, units: 'metric' },
      });
      return {
        temp_celsius: data.main?.temp,
        feels_like_celsius: data.main?.feels_like,
        humidity_pct: data.main?.humidity,
        condition: data.weather?.[0]?.main,
        description: data.weather?.[0]?.description,
        wind_speed_mps: data.wind?.speed,
        fetched_at: new Date().toISOString(),
      };
    });

    res.json({ weather });
  }),
);

export default router;
