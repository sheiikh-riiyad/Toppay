import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

const appMark = require('../logo.png') as number;
const appWordmark = require('../first-logo.png') as number;

type AppLogoProps = {
  height?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
  variant?: 'mark' | 'wordmark';
  width?: number;
};

export default function AppLogo({
  height,
  size = 44,
  style,
  variant = 'mark',
  width,
}: AppLogoProps) {
  if (variant === 'wordmark') {
    const logoWidth = width ?? 260;
    const logoHeight = height ?? Math.round(logoWidth * (2 / 3));

    return (
      <View
        style={[
          styles.frame,
          {
            width: logoWidth,
            height: logoHeight,
            borderRadius: 8,
          },
          style,
        ]}>
        <Image source={appWordmark} resizeMode="cover" style={styles.image} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: Math.max(8, Math.round(size * 0.24)),
        },
        style,
      ]}>
      <Image source={appMark} resizeMode="cover" style={styles.image} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
