import { Image } from 'expo-image';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { palette } from '@/constants/toppay';

const bkashLogo = require('../BKash-bKash2-Logo.wine.svg') as number;
const nagadLogo = require('../Nagad.svg') as number;
const rocketLogo = require('../Rocket.svg') as number;

type WalletMiniLogoProps = {
  color: string;
  mark: string;
  name: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const walletLogos = {
  bkash: {
    source: bkashLogo,
    borderColor: '#F8D2E1',
    paddingRatio: 0.08,
  },
  nagad: {
    source: nagadLogo,
    borderColor: '#FCE1CC',
    paddingRatio: 0.1,
  },
  rocket: {
    source: rocketLogo,
    borderColor: '#E6DAF0',
    paddingRatio: 0.08,
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

  const padding = Math.round(size * walletLogo.paddingRatio);
  const imageSize = Math.max(1, size - padding * 2);

  return (
    <View
      style={[
        styles.logo,
        {
          width: size,
          height: size,
          borderRadius: 8,
          backgroundColor: palette.surface,
          borderColor: walletLogo.borderColor,
        },
        style,
      ]}>
      <Image
        contentFit="contain"
        source={walletLogo.source}
        style={{ width: imageSize, height: imageSize }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackText: {
    color: palette.surface,
    fontWeight: '900',
    textAlign: 'center',
  },
});
