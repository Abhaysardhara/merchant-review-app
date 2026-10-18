import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<MerchantStackParamList, 'Welcome'>;

const SLIDES = [
  {
    icon: 'star' as const,
    accentColor: '#6366f1',
    accentLight: '#8b5cf6',
    pillBg: 'rgba(99,102,241,0.12)',
    pillBorder: 'rgba(99,102,241,0.15)',
    pillText: '#8b5cf6',
    title: 'Welcome to\nReviewReach',
    subtitle:
      'The simplest way for local businesses to collect more Google reviews — no ad spend required.',
    highlight: 'No marketing budget needed',
    showSkip: true,
  },
  {
    icon: 'qr-code' as const,
    accentColor: '#06b6d4',
    accentLight: '#38bdf8',
    pillBg: 'rgba(6,182,212,0.12)',
    pillBorder: 'rgba(6,182,212,0.15)',
    pillText: '#38bdf8',
    title: 'QR Codes &\nLink Sharing',
    subtitle:
      'Generate a QR code or share a link via WhatsApp, SMS, or email. Customers get an AI-drafted review in seconds.',
    highlight: 'Scan or tap — review posted',
    showSkip: true,
  },
  {
    icon: 'analytics' as const,
    accentColor: '#10b981',
    accentLight: '#34d399',
    pillBg: 'rgba(16,185,129,0.12)',
    pillBorder: 'rgba(16,185,129,0.15)',
    pillText: '#34d399',
    title: 'Track Every\nReview',
    subtitle:
      'Real-time analytics for each branch — scans, link visits, reviews copied, and conversion rate at a glance.',
    highlight: "Know what's working",
    showSkip: true,
  },
  {
    icon: 'globe' as const,
    accentColor: '#8b5cf6',
    accentLight: '#c084fc',
    pillBg: 'rgba(139,92,246,0.12)',
    pillBorder: 'rgba(139,92,246,0.15)',
    pillText: '#c084fc',
    title: 'Multi-Branch\n& Multi-Language',
    subtitle:
      'Manage every location from one account. AI generates reviews in 25+ languages to match your customers.',
    highlight: 'Built for growing businesses',
    showSkip: false,
  },
];

/* ── Floating orb that drifts & pulses ─────────────────────────── */
function FloatingOrb({
  size,
  color,
  startX,
  startY,
  delay,
}: {
  size: number;
  color: string;
  startX: number;
  startY: number;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 6000,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });
  const scale = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.15, 1],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.06, 0.1, 0.06],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    />
  );
}

/* ── Pulsing ring around icon ──────────────────────────────────── */
function PulseRing({ color, trigger }: { color: string; trigger: number }) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    scale.setValue(0.8);
    opacity.setValue(0.6);
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1.6,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [trigger, scale, opacity]);

  return (
    <Animated.View
      style={[
        s.pulseRing,
        {
          borderColor: color,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

/* ── Slide content with staggered entrance ─────────────────────── */
function SlideContent({
  item,
  isActive,
}: {
  item: (typeof SLIDES)[number];
  isActive: boolean;
}) {
  const iconScale = useRef(new Animated.Value(0.5)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subY = useRef(new Animated.Value(20)).current;
  const subOpacity = useRef(new Animated.Value(0)).current;
  const pillScale = useRef(new Animated.Value(0.8)).current;
  const pillOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) {
      // reset
      iconScale.setValue(0.5);
      iconOpacity.setValue(0);
      titleY.setValue(30);
      titleOpacity.setValue(0);
      subY.setValue(20);
      subOpacity.setValue(0);
      pillScale.setValue(0.8);
      pillOpacity.setValue(0);
      return;
    }

    Animated.stagger(120, [
      // icon
      Animated.parallel([
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(iconOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // title
      Animated.parallel([
        Animated.spring(titleY, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      // subtitle
      Animated.parallel([
        Animated.spring(subY, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(subOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      // pill
      Animated.parallel([
        Animated.spring(pillScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(pillOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    isActive,
    iconScale,
    iconOpacity,
    titleY,
    titleOpacity,
    subY,
    subOpacity,
    pillScale,
    pillOpacity,
  ]);

  return (
    <View style={s.slideInner}>
      {/* Icon with pulse ring */}
      <Animated.View
        style={[
          s.iconWrapper,
          { transform: [{ scale: iconScale }], opacity: iconOpacity },
        ]}
      >
        <PulseRing color={item.accentColor} trigger={isActive ? 1 : 0} />
        <View style={[s.iconCircle, { borderColor: `${item.accentColor}40` }]}>
          <LinearGradient
            colors={[`${item.accentColor}18`, `${item.accentColor}08`]}
            style={s.iconCircleInner}
          >
            <Ionicons name={item.icon} size={48} color={item.accentColor} />
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.Text
        style={[
          s.title,
          { transform: [{ translateY: titleY }], opacity: titleOpacity },
        ]}
      >
        {item.title}
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text
        style={[
          s.subtitle,
          { transform: [{ translateY: subY }], opacity: subOpacity },
        ]}
      >
        {item.subtitle}
      </Animated.Text>

      {/* Highlight pill */}
      <Animated.View
        style={[
          s.highlightPill,
          {
            backgroundColor: item.pillBg,
            borderColor: item.pillBorder,
            transform: [{ scale: pillScale }],
            opacity: pillOpacity,
          },
        ]}
      >
        <Text style={[s.highlightText, { color: item.pillText }]}>
          {item.highlight}
        </Text>
      </Animated.View>
    </View>
  );
}

/* ── Main screen ───────────────────────────────────────────────── */
export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  const currentSlide = SLIDES[currentIndex];
  const isLast = currentIndex === SLIDES.length - 1;

  const goNext = () => {
    // micro-bounce on button press
    Animated.sequence([
      Animated.timing(btnScale, {
        toValue: 0.95,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(btnScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (isLast) {
      navigation.replace('SignIn');
    } else {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const skip = () => navigation.replace('SignIn');

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  return (
    <LinearGradient
      colors={['#1a1e2e', '#111827', '#0d1117']}
      locations={[0, 0.5, 1]}
      style={s.root}
    >
      {/* Animated floating orbs */}
      <FloatingOrb
        size={420}
        color={currentSlide.accentColor}
        startX={-80}
        startY={height * 0.05}
        delay={0}
      />
      <FloatingOrb
        size={320}
        color={currentSlide.accentLight}
        startX={width * 0.5}
        startY={height * 0.4}
        delay={2000}
      />
      <FloatingOrb
        size={200}
        color={currentSlide.accentColor}
        startX={width * 0.6}
        startY={height * 0.15}
        delay={4000}
      />

      {/* Skip button */}
      <View style={[s.skipRow, { paddingTop: insets.top + 12 }]}>
        {currentSlide.showSkip ? (
          <TouchableOpacity onPress={skip} activeOpacity={0.7}>
            <Text style={s.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => (
          <View style={[s.slide, { width }]}>
            <SlideContent item={item} isActive={index === currentIndex} />
          </View>
        )}
      />

      {/* Bottom section */}
      <View style={[s.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {/* Dots */}
        <View style={s.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [
              (i - 1) * width,
              i * width,
              (i + 1) * width,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.15, 1, 0.15],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[
                  s.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: currentSlide.accentColor,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* CTA button */}
        <TouchableOpacity onPress={goNext} activeOpacity={1}>
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <LinearGradient
              colors={[currentSlide.accentColor, currentSlide.accentLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.ctaBtn}
            >
              <Text style={s.ctaText}>
                {isLast ? 'Get Started' : 'Next'}
              </Text>
              <Text style={s.ctaArrow}>{'\u2192'}</Text>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

/* ── Styles ────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1 },

  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    height: 44,
    zIndex: 1,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
  },

  slide: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: height * 0.06,
  },

  slideInner: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },

  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconCircleInner: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 4,
  },

  highlightPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  highlightText: {
    fontSize: 13,
    fontWeight: '600',
  },

  bottom: {
    paddingHorizontal: 24,
    gap: 28,
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  ctaArrow: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
});
