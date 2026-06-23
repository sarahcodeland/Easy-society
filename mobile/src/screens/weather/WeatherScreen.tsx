import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { apiClient } from '../../api/client';

export default function WeatherScreen() {
  const [weather, setWeather] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get('/weather')
      .then(({ data }) => setWeather(data.weather))
      .catch((err) => setError(err.response?.data?.error ?? 'Could not load weather'));
  }, []);

  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!weather) return <View style={styles.center}><ActivityIndicator /></View>;

  return (
    <View style={styles.center}>
      <Text style={styles.temp}>{Math.round(weather.temp_celsius)}°C</Text>
      <Text style={styles.condition}>{weather.description}</Text>
      <Text style={styles.detail}>Feels like {Math.round(weather.feels_like_celsius)}°C</Text>
      <Text style={styles.detail}>Humidity {weather.humidity_pct}%</Text>
      <Text style={styles.detail}>Wind {weather.wind_speed_mps} m/s</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  temp: { fontSize: 56, fontWeight: '700' },
  condition: { fontSize: 18, color: '#555', textTransform: 'capitalize', marginTop: 4 },
  detail: { fontSize: 14, color: '#777', marginTop: 8 },
  error: { color: '#b00020', textAlign: 'center' },
});
