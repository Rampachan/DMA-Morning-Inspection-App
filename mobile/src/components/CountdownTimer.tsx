import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCountdown } from '../hooks/useCountdown';
import { WINDOW_OPEN_HOUR, WINDOW_OPEN_MINUTE, WINDOW_CLOSE_HOUR, WINDOW_CLOSE_MINUTE } from '../config';

function fmt(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

const OPEN_LABEL = fmt(WINDOW_OPEN_HOUR, WINDOW_OPEN_MINUTE);
const CLOSE_LABEL = fmt(WINDOW_CLOSE_HOUR, WINDOW_CLOSE_MINUTE);

const CountdownTimer: React.FC = () => {
  const { phase, formatted } = useCountdown();

  if (phase === 'before_open') {
    return (
      <View style={[styles.container, styles.neutral]}>
        <Text style={styles.neutralText}>
          🕐 Inspection window opens at {OPEN_LABEL}
        </Text>
      </View>
    );
  }

  if (phase === 'open') {
    return (
      <View style={[styles.container, styles.open]}>
        <Text style={styles.openText}>⏱ Window closes in {formatted}</Text>
        <Text style={styles.openSub}>Submit before {CLOSE_LABEL}</Text>
      </View>
    );
  }

  // phase === 'closed'
  return (
    <View style={[styles.container, styles.closed]}>
      <Text style={styles.closedText}>
        ⚠️ Window Closed — Submission will be marked LATE
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  neutral: { backgroundColor: '#f0f0f0' },
  open: { backgroundColor: '#e6f9ec' },
  closed: { backgroundColor: '#fdecea' },
  neutralText: { fontSize: 14, color: '#555', fontWeight: '500' },
  openText: { fontSize: 18, color: '#1a7a3a', fontWeight: '700' },
  openSub: { fontSize: 12, color: '#2e7d32', marginTop: 2 },
  closedText: { fontSize: 14, color: '#c62828', fontWeight: '700', textAlign: 'center' },
});

export default CountdownTimer;
