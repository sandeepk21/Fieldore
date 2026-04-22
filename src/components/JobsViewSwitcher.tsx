import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type JobsView = 'list' | 'schedule';

type JobsViewSwitcherProps = {
  activeView: JobsView;
};

const JobsViewSwitcher: React.FC<JobsViewSwitcherProps> = ({ activeView }) => {
  const navigateToView = (view: JobsView) => {
    if (view === activeView) return;

    router.replace(view === 'list' ? '/(tabs)/JobList' : '/(tabs)/Scheduled');
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.activeTrack,
          activeView === 'schedule' ? styles.activeTrackLeft : styles.activeTrackRight,
        ]}
      />

      <TouchableOpacity
        style={[styles.segment, activeView === 'schedule' && styles.segmentActive]}
        activeOpacity={0.9}
        onPress={() => navigateToView('schedule')}
      >
        <Text style={[styles.segmentText, activeView === 'schedule' && styles.segmentTextActive]}>Schedule</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.segment, activeView === 'list' && styles.segmentActive]}
        activeOpacity={0.9}
        onPress={() => navigateToView('list')}
      >
        <Text style={[styles.segmentText, activeView === 'list' && styles.segmentTextActive]}>List</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#eef2ff',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#dbeafe',
    position: 'relative',
    overflow: 'hidden',
  },
  activeTrack: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '50%',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  activeTrackLeft: {
    left: 4,
  },
  activeTrackRight: {
    right: 4,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 1,
  },
  segmentActive: {
    transform: [{ scale: 1 }],
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#0f172a',
  },
});

export default JobsViewSwitcher;
