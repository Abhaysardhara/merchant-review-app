/**
 * StoreSelector.tsx
 *
 * Two-mode store picker:
 *   A) Type → debounced Places Text Search → tap a suggestion → immediate confirm
 *   B) Scroll/pan the map → tap any POI → bottom card appears → tap "Use This Business"
 *
 * Uses Places API (New):  places.googleapis.com/v1/places:searchText
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import type { PoiClickEvent, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { GOOGLE_MAPS_API_KEY } from '../config';

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

export interface SelectedStore {
  name: string;
  placeId: string;
  address: string;
  coordinate: { latitude: number; longitude: number };
}

interface StoreSelectorProps {
  onStoreSelect?: (store: SelectedStore) => void;
  initialRegion?: Region;
}

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  coordinate: { latitude: number; longitude: number };
}

// ─────────────────────────────────────────────
//  Places API (New) — Text Search
// ─────────────────────────────────────────────

async function searchPlaces(
  query: string,
  signal: AbortSignal,
): Promise<PlaceResult[]> {
  const url = 'https://places.googleapis.com/v1/places:searchText';
  const body = { textQuery: query, maxResultCount: 6, languageCode: 'en' };

  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
    },
    body: JSON.stringify(body),
  });

  const raw = await res.json();

  if (!res.ok) {
    const errMsg = (raw as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(errMsg);
  }

  const data = raw as {
    places?: Array<{
      id: string;
      displayName?: { text: string };
      formattedAddress?: string;
      location?: { latitude: number; longitude: number };
    }>;
  };

  return (data.places ?? [])
    .filter((p) => p.location)
    .map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? query,
      address: p.formattedAddress ?? '',
      coordinate: {
        latitude: p.location!.latitude,
        longitude: p.location!.longitude,
      },
    }));
}

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────

const DEFAULT_REGION: Region = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 20,
  longitudeDelta: 20,
};

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────

export function StoreSelector({ onStoreSelect, initialRegion }: StoreSelectorProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedStore, setSelectedStore] = useState<SelectedStore | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // When query is set programmatically (from a selection), skip the search trigger
  const skipNextSearchRef = useRef(false);

  // ── Camera animation ────────────────────────────────────────────────
  const animateMapTo = useCallback((
    coord: { latitude: number; longitude: number },
    delta = 0.008,
  ) => {
    mapRef.current?.animateToRegion(
      { ...coord, latitudeDelta: delta, longitudeDelta: delta },
      600,
    );
  }, []);

  // ── Debounced search (400ms) ────────────────────────────────────────
  useEffect(() => {
    setSearchError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Query was set by a selection (not user typing) — don't re-search
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsSearching(true);
      setShowResults(true);

      try {
        const found = await searchPlaces(query.trim(), abortRef.current.signal);
        setResults(found);
        if (found.length === 0) {
          setSearchError('No results found. Try a more specific name or add city.');
        } else if (found.length === 1) {
          // Single result — zoom straight to it
          animateMapTo(found[0].coordinate, 0.012);
        } else {
          // Multiple results — fit map to show all of them
          const lats = found.map((p) => p.coordinate.latitude);
          const lngs = found.map((p) => p.coordinate.longitude);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);
          const padding = 0.02;
          mapRef.current?.animateToRegion({
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: (maxLat - minLat) + padding,
            longitudeDelta: (maxLng - minLng) + padding,
          }, 700);
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== 'AbortError') {
          setSearchError(e.message);
        }
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // ── Path A: search suggestion tapped → zoom map + drop pin + confirm card ──
  const handleResultPress = useCallback((place: PlaceResult) => {
    skipNextSearchRef.current = true; // prevent setQuery from re-triggering the search
    Keyboard.dismiss();
    setShowResults(false);
    setQuery(place.name);
    animateMapTo(place.coordinate, 0.005);
    setSelectedStore(place);
  }, [animateMapTo]);

  // ── Path B: map POI tapped → show confirm card ──────────────────────
  const handlePoiClick = useCallback((event: PoiClickEvent) => {
    const { placeId, name, coordinate } = event.nativeEvent;
    skipNextSearchRef.current = true; // prevent setQuery from re-triggering the search
    Keyboard.dismiss();
    setShowResults(false);
    setQuery(name);
    animateMapTo(coordinate, 0.005);
    setSelectedStore({ name, placeId, address: '', coordinate });
  }, [animateMapTo]);

  // ── Confirm card button ──────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (selectedStore) onStoreSelect?.(selectedStore);
  }, [selectedStore, onStoreSelect]);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSearchError(null);
    setSelectedStore(null);
    inputRef.current?.focus();
  }, []);

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* ── Google Map ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion ?? DEFAULT_REGION}
        onPoiClick={handlePoiClick}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        onPress={() => { Keyboard.dismiss(); setShowResults(false); }}
      >
        {/* Search result markers — grey dots while dropdown is open */}
        {showResults && results.map((place) => (
          <Marker
            key={place.placeId}
            coordinate={place.coordinate}
            title={place.name}
            pinColor="#9CA3AF"
            onPress={() => handleResultPress(place)}
          />
        ))}

        {/* Selected store — purple pin */}
        {selectedStore && (
          <Marker
            coordinate={selectedStore.coordinate}
            title={selectedStore.name}
            description={selectedStore.address}
            pinColor="#4F46E5"
          />
        )}
      </MapView>

      {/* ── Search overlay ── */}
      <View style={styles.searchOverlay} pointerEvents="box-none">

        {/* Input pill */}
        <View style={styles.inputCard}>
          <Ionicons name="search-outline" size={20} color="#6B7280" />
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={query}
            onChangeText={(t) => { setQuery(t); setShowResults(true); setSelectedStore(null); }}
            onFocus={() => query.length >= 2 && setShowResults(true)}
            placeholder="Search business name or scroll map…"
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {isSearching
            ? <ActivityIndicator size="small" color="#4F46E5" />
            : query.length > 0
              ? (
                <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
        </View>

        {/* Results dropdown */}
        {showResults && (
          <View style={styles.resultsCard}>
            {isSearching && results.length === 0 ? (
              <View style={styles.stateRow}>
                <ActivityIndicator color="#4F46E5" />
                <Text style={styles.stateText}>Searching…</Text>
              </View>
            ) : searchError ? (
              <View style={styles.stateRow}>
                <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={[styles.stateText, { color: '#EF4444', flexShrink: 1 }]} numberOfLines={3}>{searchError}</Text>
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.placeId}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={results.length > 4}
                style={{ maxHeight: 280 }}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[
                      styles.resultRow,
                      index < results.length - 1 && styles.resultRowBorder,
                    ]}
                    onPress={() => handleResultPress(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.resultIcon}>
                      <Ionicons name="storefront-outline" size={16} color="#4F46E5" />
                    </View>
                    <View style={styles.resultText}>
                      <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                      {item.address ? (
                        <Text style={styles.resultAddress} numberOfLines={1}>{item.address}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}
      </View>

      {/* ── Selected store confirm card (shown after POI tap) ── */}
      {selectedStore && !showResults && (
        <View style={styles.confirmCard}>
          <View style={styles.storeInfo}>
            <View style={styles.storeIconBg}>
              <Ionicons name="storefront" size={20} color="#4F46E5" />
            </View>
            <View style={styles.storeText}>
              <Text style={styles.storeName} numberOfLines={1}>{selectedStore.name}</Text>
              {selectedStore.address ? (
                <Text style={styles.storeMeta} numberOfLines={1}>{selectedStore.address}</Text>
              ) : (
                <Text style={styles.storeMetaHint}>Tap confirm to use this business</Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Text style={styles.confirmBtnText}>Use This Business</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Hint pill (nothing selected) ── */}
      {!selectedStore && !showResults && (
        <View style={styles.hint}>
          <Ionicons name="finger-print-outline" size={14} color="#6B7280" />
          <Text style={styles.hintText}>Search above or tap any business on the map</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const TOP = Platform.OS === 'ios' ? 60 : 50;

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Search overlay
  searchOverlay: {
    position: 'absolute',
    top: TOP,
    left: 12,
    right: 12,
    zIndex: 20,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },

  // Results dropdown
  resultsCard: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
  },
  stateText: { fontSize: 13, color: '#6B7280', flex: 1 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  resultRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultIcon: {
    width: 34, height: 34,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  resultAddress: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Confirm card (after POI tap)
  confirmCard: {
    position: 'absolute',
    bottom: 28,
    left: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 10,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeIconBg: {
    width: 44, height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeText: { flex: 1 },
  storeName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  storeMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  storeMetaHint: { fontSize: 12, color: '#9CA3AF', marginTop: 2, fontStyle: 'italic' },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 13,
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // Hint pill
  hint: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.93)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
  },
  hintText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
});
