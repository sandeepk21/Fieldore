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
        <Text style={[styles.segmentText, activeView === 'list' && styles.segmentTextActive]}>Joblist</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    padding: 4,
  },
  segment: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb', // blue-600
  },
});

export default JobsViewSwitcher;
