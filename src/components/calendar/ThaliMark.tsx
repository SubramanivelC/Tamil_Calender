import React from 'react';
import { View } from 'react-native';

/**
 * Small தாலி/mangalyam pictogram used as the Subha Muhurtham marker in the
 * calendar grids: a V-shaped chain whose two strands meet at the pendant
 * (a filled dot). Drawn with plain Views so it scales with `size` and reads
 * on any theme; gold by default on the calendar palette.
 */
export function ThaliMark({ color, size = 9 }: { color: string; size?: number }) {
  const chain = Math.max(1, Math.round(size * 0.14));
  const strandH = size * 0.55;
  return (
    <View style={{ width: size, height: size * 1.1, alignItems: 'center' }}>
      {/* Thali chain: two tilted strands forming a V */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', height: strandH }}>
        <View
          style={{
            width: chain,
            height: strandH,
            backgroundColor: color,
            transform: [{ rotate: '26deg' }],
          }}
        />
        <View
          style={{
            width: chain,
            height: strandH,
            backgroundColor: color,
            transform: [{ rotate: '-26deg' }],
            marginLeft: -chain,
          }}
        />
      </View>
      {/* Pendant (the thali itself) hanging at the vertex */}
      <View
        style={{
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: size * 0.21,
          backgroundColor: color,
          marginTop: -1,
        }}
      />
    </View>
  );
}
