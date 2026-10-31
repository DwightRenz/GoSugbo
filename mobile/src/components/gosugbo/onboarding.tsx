import { useRef, useState, type ComponentRef } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const slides = [
  {
    title: 'Kawasan Falls',
    image: require('../../../assets/onboarding/kawasan.png'),
  },
  {
    title: 'Osmena Peak',
    image: require('../../../assets/onboarding/osmena.png'),
  },
  {
    title: 'Moalboal',
    image: require('../../../assets/onboarding/moalboal.png'),
  },
];

type Props = {
  onGetStarted: () => void;
  onLogin: () => void;
};

export default function Onboarding({
  onGetStarted,
  onLogin,
}: Props) {
  const carousel = useRef<ComponentRef<typeof ScrollView>>(null);

  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  function goToSlide(index: number) {
    carousel.current?.scrollTo({
      x: index * pageWidth,
      animated: true,
    });

    setActiveIndex(index);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <Text style={styles.logo}>
        <Text style={styles.logoAccent}>Go</Text>Sugbo·
      </Text>

      <View
        style={styles.carousel}
        onLayout={({ nativeEvent }) => {
          const { width, height } = nativeEvent.layout;

          setPageWidth(width);
          setPageHeight(height);

          carousel.current?.scrollTo({
            x: activeIndex * width,
            animated: false,
          });
        }}
      >
        {pageWidth > 0 && pageHeight > 0 && (
          <ScrollView
            ref={carousel}
            style={styles.pager}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={({ nativeEvent }) => {
              const index = Math.round(
                nativeEvent.contentOffset.x / pageWidth
              );

              setActiveIndex(
                Math.max(0, Math.min(index, slides.length - 1))
              );
            }}
          >
            {slides.map((slide) => (
              <View
                key={slide.title}
                style={[
                  styles.slide,
                  {
                    width: pageWidth,
                    height: pageHeight,
                  },
                ]}
              >
                <View
                  style={[
                    styles.photoFrame,
                    {
                      maxHeight: (pageWidth - 48) / 1.06,
                    },
                  ]}
                >
                  <Image
                    source={slide.image}
                    style={styles.photo}
                    resizeMode="cover"
                    accessibilityLabel={slide.title}
                  />
                </View>

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    EXPLORE CEBU
                  </Text>
                </View>

                <Text style={styles.title}>
                  {slide.title}
                </Text>

                <Text style={styles.description}>
                  From the north to the south of Cebu, book a ride
                  or have your favorite local food brought to you.
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.dots}>
        {slides.map((slide, index) => (
          <Pressable
            key={slide.title}
            onPress={() => goToSlide(index)}
            accessibilityRole="button"
            accessibilityLabel={`Show ${slide.title}`}
            accessibilityState={{
              selected: activeIndex === index,
            }}
            style={styles.dotTarget}
          >
            <View
              style={[
                styles.dot,
                activeIndex === index && styles.activeDot,
              ]}
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={onGetStarted}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.buttonText}>
            Get started
          </Text>

          <Text style={styles.arrow}>→</Text>
        </Pressable>

        <Pressable
          onPress={onLogin}
          accessibilityRole="button"
          style={styles.loginButton}
        >
          <Text style={styles.loginText}>
            Already have an account?{' '}
            <Text style={styles.loginLink}>Log in</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4EADC',
  },

  logo: {
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 20,
    color: '#4C1C24',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -1,
  },

  logoAccent: {
    color: '#B74738',
  },

  carousel: {
    flex: 1,
    minHeight: 0,
  },

  pager: {
    flex: 1,
  },

  slide: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },

  photoFrame: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },

  photo: {
    width: '100%',
    height: '100%',
  },

  badge: {
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#D7B58B',
  },

  badgeText: {
    color: '#4C1C24',
    fontSize: 10,
    fontWeight: '700',
  },

  title: {
    marginTop: 14,
    color: '#4C1C24',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  description: {
    marginTop: 8,
    color: '#86766E',
    fontSize: 13,
    lineHeight: 19,
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
  },

  dotTarget: {
    minWidth: 32,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#DFCEB8',
  },

  activeDot: {
    width: 22,
    backgroundColor: '#8D2738',
  },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  button: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#4C1C24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  pressed: {
    opacity: 0.8,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  arrow: {
    color: '#FFFFFF',
    fontSize: 22,
  },

  loginButton: {
    minHeight: 48,
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginText: {
    color: '#4C1C24',
    fontSize: 12,
  },

  loginLink: {
    fontWeight: '700',
  },
});