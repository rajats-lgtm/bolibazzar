import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, G, Circle } from 'react-native-svg';

export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <View>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Defs>
          <LinearGradient id="bbGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#4338ca" />
            <Stop offset="55%" stopColor="#e11d48" />
            <Stop offset="100%" stopColor="#f97316" />
          </LinearGradient>
        </Defs>
        <Path d="M10 6 h26 a18 18 0 0 1 0 26 h-4 a18 18 0 0 1 0 26 h-22 z" fill="url(#bbGrad)" />
        <Path d="M22 14 h12 a10 10 0 0 1 0 18 h-12 z M22 34 h16 a10 10 0 0 1 0 18 h-16 z" fill="#0a0a0f" />
        <G transform="translate(21 36)">
          <Path d="M0 2 h4 l1.5 12 h13 l1.8 -8 h-13.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="7" cy="17" r="1.6" fill="white" />
          <Circle cx="17" cy="17" r="1.6" fill="white" />
        </G>
      </Svg>
    </View>
  );
}
