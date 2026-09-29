import { Router } from 'express';
import axios from 'axios';
import { pool } from '../../db/pool';
import { asyncHandler, ApiError } from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';
import { env } from '../../config/env';
import { cached } from '../../utils/cache';

const router = Router();

interface Coords { lat: number; lng: number }

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// Most LGD villages have no lat/lng. Walk up area -> city (sub-district) ->
// district and use the first level that has coordinates, or that
// OpenWeather's geocoder can find within the right state. Found coordinates
// are saved on that level (not copied down to the village, which would fake
// precision), so each sub-district is geocoded at most once.
async function resolveCoords(areaId: string): Promise<Coords | null> {
  const { rows } = await pool.query<{ id: string; name: string; type: string; lat: number | null; lng: number | null }>(
    `WITH RECURSIVE chain AS (
       SELECT id, name, type, parent_id, lat, lng FROM locations WHERE id = $1
       UNION ALL
       SELECT l.id, l.name, l.type, l.parent_id, l.lat, l.lng FROM locations l JOIN chain c ON l.id = c.parent_id
     )
     SELECT id, name, type::text AS type, lat, lng FROM chain`,
    [areaId],
  );
  const state = rows.find((r) => r.type === 'state');
  for (const level of ['area', 'city', 'district']) {
    const loc = rows.find((r) => r.type === level);
    if (!loc) continue;
    if (loc.lat != null && loc.lng != null) return { lat: Number(loc.lat), lng: Number(loc.lng) };

    const { data } = await axios.get('https://api.openweathermap.org/geo/1.0/direct', {
      params: { q: `${loc.name},IN`, limit: 5, appid: env.openWeatherApiKey },
      timeout: 8000,
    });
    const hit = (Array.isArray(data) ? data : []).find(
      (g: { state?: string }) => !state || norm(g.state) === norm(state.name),
    );
    if (hit) {
      await pool.query('UPDATE locations SET lat = $2, lng = $3 WHERE id = $1', [loc.id, hit.lat, hit.lon]);
      return { lat: hit.lat, lng: hit.lon };
    }
  }
  return null;
}

// GET /weather — auto-detected from the user's registered area's lat/lng.
// Cached per-location for 15 min so 1M users in the same city don't all
// trigger separate OpenWeatherMap calls.
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = await pool.query('SELECT location_id FROM users WHERE id = $1', [req.auth!.userId]);
    const areaId: string | undefined = me.rows[0]?.location_id;
    if (!areaId) throw new ApiError(400, 'Complete your profile/location first');

    if (!env.openWeatherApiKey) {
      throw new ApiError(503, 'Weather service not configured (missing OPENWEATHER_API_KEY)');
    }

    const coords = await resolveCoords(areaId);
    if (!coords) {
      throw new ApiError(404, 'Could not find weather coordinates for your area');
    }

    const weather = await cached(`weather:${areaId}`, 900, async () => {
      const { data } = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: { lat: coords.lat, lon: coords.lng, appid: env.openWeatherApiKey, units: 'metric' },
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
