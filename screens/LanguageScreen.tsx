import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';
import { useI18n, LANGUAGES, type LangMeta } from '../i18n';

type Props = NativeStackScreenProps<MerchantStackParamList, 'Language'>;

function LangRow({
  lang,
  selected,
  onPress,
}: {
  lang: LangMeta;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.row, selected && s.rowSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={s.flag}>{lang.flag}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[s.label, selected && s.labelSelected]}>{lang.label}</Text>
        <Text style={s.native}>{lang.nativeLabel}</Text>
      </View>
      {selected && <Ionicons name="checkmark-circle" size={22} color="#4F46E5" />}
    </TouchableOpacity>
  );
}

export function LanguageScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { locale, setLocale, t } = useI18n();
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? LANGUAGES.filter(
        (l) =>
          l.label.toLowerCase().includes(search.toLowerCase()) ||
          l.nativeLabel.toLowerCase().includes(search.toLowerCase()),
      )
    : LANGUAGES;

  const indianLangs = filtered.filter((l) => l.region === 'indian');
  const globalLangs = filtered.filter((l) => l.region === 'global');

  const handleSelect = useCallback(
    async (code: string) => {
      await setLocale(code);
      navigation.goBack();
    },
    [setLocale, navigation],
  );

  type Section = { type: 'header'; title: string } | { type: 'lang'; lang: LangMeta };
  const data: Section[] = [];

  if (indianLangs.length > 0) {
    data.push({ type: 'header', title: t('language_indian') });
    indianLangs.forEach((l) => data.push({ type: 'lang', lang: l }));
  }
  if (globalLangs.length > 0) {
    data.push({ type: 'header', title: t('language_global') });
    globalLangs.forEach((l) => data.push({ type: 'lang', lang: l }));
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('language_title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color="#94A3B8" style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t('language_searchPlaceholder')}
          placeholderTextColor="#CBD5E1"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={data}
        keyExtractor={(item, i) =>
          item.type === 'header' ? `h-${item.title}` : `l-${item.lang.code}`
        }
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return <Text style={s.sectionTitle}>{item.title}</Text>;
          }
          return (
            <LangRow
              lang={item.lang}
              selected={locale === item.lang.code}
              onPress={() => handleSelect(item.lang.code)}
            />
          );
        }}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 24 }]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    backgroundColor: '#1E1B4B',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 12, height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },

  list: { paddingHorizontal: 16, paddingTop: 4 },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 0.8, marginTop: 18, marginBottom: 6, marginLeft: 4,
    textTransform: 'uppercase',
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  rowSelected: {
    borderColor: '#4F46E5', backgroundColor: '#F5F3FF',
  },
  flag: { fontSize: 24 },
  label: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  labelSelected: { color: '#4F46E5' },
  native: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
});
