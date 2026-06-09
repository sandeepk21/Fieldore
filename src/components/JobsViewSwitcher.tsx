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
        style={[styles.tab, activeView === 'schedule' && styles.tabActive]}
        activeOpacity={0.75}
        onPress={() => navigateToView('schedule')}
      >
        <Text style={[styles.tabText, activeView === 'schedule' && styles.tabTextActive]}>
          SCHEDULE
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeView === 'list' && styles.tabActive]}
        activeOpacity={0.75}
        onPress={() => navigateToView('list')}
      >
        <Text style={[styles.tabText, activeView === 'list' && styles.tabTextActive]}>
          JOB LIST
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginTop: 8,
    marginHorizontal: -16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3.5,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: {
    borderBottomColor: '#2563eb', // brand blue-600
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8', // slate-400
    letterSpacing: 1.2,
  },
  tabTextActive: {
    color: '#2563eb', // brand blue-600
  },
});

export default JobsViewSwitcher;


