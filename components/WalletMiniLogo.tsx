import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { palette } from '@/constants/toppay';

type WalletMiniLogoProps = {
  color: string;
  mark: string;
  name: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const walletLogos = {
  bkash: {
    label: 'bKash',
    background: '#D62872',
    accent: '#FCE7F0',
  },
  nagad: {
    label: 'Nagad',
    background: '#F05A28',
    accent: '#FFF1E8',
  },
  rocket: {
    label: 'Rocket',
    background: '#6D3A9C',
    accent: '#F0E8F8',
  },
};

function getWalletLogo(name: string) {
  const key = name.trim().toLowerCase();

  if (key.includes('bkash')) {
    return walletLogos.bkash;
  }

  if (key.includes('nagad')) {
    return walletLogos.nagad;
  }

  if (key.includes('rocket')) {
    return walletLogos.rocket;
  }

  return null;
}

export default function WalletMiniLogo({
  color,
  mark,
  name,
  size = 38,
  style,
}: WalletMiniLogoProps) {
  const walletLogo = getWalletLogo(name);
  const fontSize = Math.max(8, Math.round(size * 0.24));
  const accentSize = Math.max(8, Math.round(size * 0.27));

  if (!walletLogo) {
    return (
      <View
        style={[
          styles.logo,
          {
            width: size,
            height: size,
            borderRadius: 8,
            backgroundColor: color,
          },
          style,
        ]}>
        <Text style={[styles.fallbackText, { fontSize: Math.max(11, Math.round(size * 0.3)) }]}>
          {mark}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.logo,
        {
          width: size,
          height: size,
          borderRadius: 8,
          backgroundColor: walletLogo.background,
        },
        style,
      ]}>
      <View
        style={[
          styles.accent,
          {
            width: accentSize,
            height: accentSize,
            borderRadius: Math.round(accentSize / 2),
            backgroundColor: walletLogo.accent,
          },
        ]}
      />
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        style={[styles.brandText, { fontSize }]}>
        {walletLogo.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    right: -3,
    top: -3,
    opacity: 0.36,
  },
  brandText: {
    width: '92%',
    color: palette.surface,
    fontWeight: '900',
    textAlign: 'center',
  },
  fallbackText: {
    color: palette.surface,
    fontWeight: '900',
    textAlign: 'center',
  },
});
