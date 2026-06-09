import { Calendar, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TimeParts = {
  hour12: number;
  minute: number;
  meridiem: 'AM' | 'PM';
};

type JobSchedulePickerProps = {
  visible: boolean;
  initialDate: string;
  initialTime: string;
  title?: string;
  confirmText?: string;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
};

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => index * 5);
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const toTwoDigits = (value: number) => String(value).padStart(2, '0');

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${toTwoDigits(date.getMonth() + 1)}-${toTwoDigits(date.getDate())}`;

const parseIsoDate = (value: string) => {
  if (!value.trim()) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const getCalendarDays = (cursor: Date) => {
  const startOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const endOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const cells: (Date | null)[] = [];

  for (let index = 0; index < startOfMonth.getDay(); index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= endOfMonth.getDate(); day += 1) {
    cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
};

const parseTimeParts = (value: string): TimeParts => {
  const [hourString, minuteString] = value.split(':');
  const hour24 = Number(hourString);
  const minute = Number(minuteString);

  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
    return { hour12: 9, minute: 0, meridiem: 'AM' };
  }

  return {
    hour12: hour24 % 12 || 12,
    minute,
    meridiem: hour24 >= 12 ? 'PM' : 'AM',
  };
};

const formatTimeParts = ({ hour12, minute, meridiem }: TimeParts) => {
  const normalizedHour12 = Math.min(Math.max(hour12, 1), 12);
  const normalizedMinute = Math.min(Math.max(minute, 0), 59);
  const hour24 =
    meridiem === 'PM'
      ? normalizedHour12 === 12
        ? 12
        : normalizedHour12 + 12
      : normalizedHour12 === 12
        ? 0
        : normalizedHour12;

  return `${toTwoDigits(hour24)}:${toTwoDigits(normalizedMinute)}`;
};

const formatMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);

export const formatScheduleDateLabel = (value: string, emptyLabel = 'Choose a date') => {
  if (!value) return emptyLabel;

  const date = parseIsoDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const formatScheduleTimeLabel = (value: string, emptyLabel = 'Choose a time') => {
  if (!value) return emptyLabel;

  const [hourString, minuteString] = value.split(':');
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;

  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

export default function JobSchedulePicker({
  visible,
  initialDate,
  initialTime,
  title = 'Schedule job',
  confirmText = 'Apply schedule',
  onClose,
  onConfirm,
}: JobSchedulePickerProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [timeParts, setTimeParts] = useState<TimeParts>(parseTimeParts(initialTime));
  const [calendarCursor, setCalendarCursor] = useState(() => parseIsoDate(initialDate) || new Date());
  const [isChoosingMonthYear, setIsChoosingMonthYear] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const nextDate = parseIsoDate(initialDate) || new Date();
    setSelectedDate(initialDate);
    setTimeParts(parseTimeParts(initialTime));
    setCalendarCursor(nextDate);
    setIsChoosingMonthYear(false);
  }, [initialDate, initialTime, visible]);

  const selectedTime = formatTimeParts(timeParts);
  const calendarDays = useMemo(() => getCalendarDays(calendarCursor), [calendarCursor]);
  const summaryDateLabel = formatScheduleDateLabel(selectedDate, 'Not set');
  const summaryTimeLabel = formatScheduleTimeLabel(selectedTime, 'Not set');

  const handleQuickDate = (offsetDays: number) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offsetDays);

    setSelectedDate(toIsoDate(date));
    setCalendarCursor(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={styles.sheetSafeArea}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>Schedule</Text>
                <Text style={styles.title}>{title}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Calendar size={16} color="#2563eb" />
                    <View>
                      <Text style={styles.summaryLabel}>Start date</Text>
                      <Text style={styles.summaryValue}>{summaryDateLabel}</Text>
                    </View>
                  </View>
                  <View style={styles.summaryItem}>
                    <Clock size={16} color="#2563eb" />
                    <View>
                      <Text style={styles.summaryLabel}>Start time</Text>
                      <Text style={styles.summaryValue}>{summaryTimeLabel}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Date</Text>
                <View style={styles.quickDateRow}>
                  <TouchableOpacity style={styles.quickDateChip} onPress={() => handleQuickDate(0)}>
                    <Text style={styles.quickDateChipText}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickDateChip} onPress={() => handleQuickDate(1)}>
                    <Text style={styles.quickDateChipText}>Tomorrow</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickDateChip} onPress={() => handleQuickDate(7)}>
                    <Text style={styles.quickDateChipText}>Next Week</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.calendarCard}>
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity
                      style={styles.calendarNavBtn}
                      onPress={() => setCalendarCursor(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                    >
                      <ChevronLeft size={18} color="#334155" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setIsChoosingMonthYear(current => !current)}
                      style={styles.calendarMonthButton}
                    >
                      <Text style={styles.calendarMonthLabel}>{formatMonthLabel(calendarCursor)} ▾</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.calendarNavBtn}
                      onPress={() => setCalendarCursor(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                    >
                      <ChevronRight size={18} color="#334155" />
                    </TouchableOpacity>
                  </View>

                  {isChoosingMonthYear ? (
                    <View style={styles.monthYearPickerContainer}>
                      <View style={styles.monthYearColumns}>
                        <View style={styles.monthYearColumn}>
                          <Text style={styles.monthYearTitle}>Month</Text>
                          <ScrollView showsVerticalScrollIndicator={false} style={styles.monthYearScroll}>
                            {MONTH_LABELS.map((monthName, index) => {
                              const isSelected = calendarCursor.getMonth() === index;

                              return (
                                <TouchableOpacity
                                  key={monthName}
                                  style={[styles.monthYearChip, isSelected && styles.monthYearChipActive]}
                                  onPress={() =>
                                    setCalendarCursor(current => new Date(current.getFullYear(), index, 1))
                                  }
                                >
                                  <Text
                                    style={[
                                      styles.monthYearChipText,
                                      isSelected && styles.monthYearChipTextActive,
                                    ]}
                                  >
                                    {monthName}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>

                        <View style={styles.monthYearColumn}>
                          <Text style={styles.monthYearTitle}>Year</Text>
                          <ScrollView showsVerticalScrollIndicator={false} style={styles.monthYearScroll}>
                            {Array.from({ length: 21 }, (_, index) => new Date().getFullYear() - 10 + index).map(year => {
                              const isSelected = calendarCursor.getFullYear() === year;

                              return (
                                <TouchableOpacity
                                  key={year}
                                  style={[styles.monthYearChip, isSelected && styles.monthYearChipActive]}
                                  onPress={() =>
                                    setCalendarCursor(current => new Date(year, current.getMonth(), 1))
                                  }
                                >
                                  <Text
                                    style={[
                                      styles.monthYearChipText,
                                      isSelected && styles.monthYearChipTextActive,
                                    ]}
                                  >
                                    {year}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.backToCalendarButton}
                        onPress={() => setIsChoosingMonthYear(false)}
                      >
                        <Text style={styles.backToCalendarText}>Back to calendar</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={styles.weekdayRow}>
                        {WEEKDAY_LABELS.map(label => (
                          <Text key={label} style={styles.weekdayText}>
                            {label}
                          </Text>
                        ))}
                      </View>

                      <View style={styles.calendarGrid}>
                        {calendarDays.map((date, index) => {
                          const isoDate = date ? toIsoDate(date) : '';
                          const isSelected = isoDate === selectedDate;
                          const isToday = isoDate === toIsoDate(new Date());

                          return (
                            <TouchableOpacity
                              key={`${isoDate}-${index}`}
                              style={[
                                styles.calendarCell,
                                isSelected && styles.calendarCellSelected,
                                !date && styles.calendarCellEmpty,
                                isToday && !isSelected && styles.calendarCellToday,
                              ]}
                              disabled={!date}
                              onPress={() => {
                                if (date) {
                                  setSelectedDate(isoDate);
                                }
                              }}
                            >
                              <Text
                                style={[
                                  styles.calendarCellText,
                                  isSelected && styles.calendarCellTextSelected,
                                  isToday && !isSelected && styles.calendarCellTextToday,
                                ]}
                              >
                                {date ? date.getDate() : ''}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Time</Text>
                <View style={styles.timePreviewCard}>
                  <Text style={styles.timePreviewLabel}>Selected time</Text>
                  <Text style={styles.timePreviewValue}>
                    {timeParts.hour12}:{toTwoDigits(timeParts.minute)} {timeParts.meridiem}
                  </Text>
                </View>

                <View style={styles.timeColumns}>
                  <View style={styles.timeColumn}>
                    <Text style={styles.timeColumnLabel}>Hour</Text>
                    <View style={styles.timeChipWrap}>
                      {HOUR_OPTIONS.map(hour => (
                        <TouchableOpacity
                          key={hour}
                          style={[styles.timeChip, timeParts.hour12 === hour && styles.timeChipActive]}
                          onPress={() => setTimeParts(current => ({ ...current, hour12: hour }))}
                        >
                          <Text
                            style={[
                              styles.timeChipText,
                              timeParts.hour12 === hour && styles.timeChipTextActive,
                            ]}
                          >
                            {hour}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.timeColumn}>
                    <Text style={styles.timeColumnLabel}>Minutes</Text>
                    <View style={styles.timeChipWrap}>
                      {MINUTE_OPTIONS.map(minute => (
                        <TouchableOpacity
                          key={minute}
                          style={[styles.timeChip, timeParts.minute === minute && styles.timeChipActive]}
                          onPress={() => setTimeParts(current => ({ ...current, minute }))}
                        >
                          <Text
                            style={[
                              styles.timeChipText,
                              timeParts.minute === minute && styles.timeChipTextActive,
                            ]}
                          >
                            {toTwoDigits(minute)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.meridiemRow}>
                  {(['AM', 'PM'] as const).map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[styles.meridiemChip, timeParts.meridiem === option && styles.meridiemChipActive]}
                      onPress={() => setTimeParts(current => ({ ...current, meridiem: option }))}
                    >
                      <Text
                        style={[
                          styles.meridiemChipText,
                          timeParts.meridiem === option && styles.meridiemChipTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => onConfirm(selectedDate, selectedTime)}
              >
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetSafeArea: {
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: '92%',
  },
  sheetHandle: {
    width: 56,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  content: {
    paddingBottom: 20,
    gap: 18,
  },
  summaryCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  summaryRow: {
    gap: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  summaryValue: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  quickDateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickDateChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  quickDateChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  calendarCard: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  calendarMonthButton: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 14,
    paddingVertical: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
  },
  calendarMonthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 10,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calendarCell: {
    width: '12.95%',
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  calendarCellSelected: {
    backgroundColor: '#2563eb',
  },
  calendarCellToday: {
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  calendarCellEmpty: {
    backgroundColor: 'transparent',
  },
  calendarCellText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  calendarCellTextSelected: {
    color: '#ffffff',
  },
  calendarCellTextToday: {
    color: '#2563eb',
  },
  monthYearPickerContainer: {
    marginTop: 16,
    gap: 14,
  },
  monthYearColumns: {
    flexDirection: 'row',
    gap: 12,
  },
  monthYearColumn: {
    flex: 1,
  },
  monthYearTitle: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  monthYearScroll: {
    maxHeight: 240,
  },
  monthYearChip: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  monthYearChipActive: {
    backgroundColor: '#2563eb',
  },
  monthYearChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  monthYearChipTextActive: {
    color: '#ffffff',
  },
  backToCalendarButton: {
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
  },
  backToCalendarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  timePreviewCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timePreviewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timePreviewValue: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  timeColumns: {
    gap: 14,
  },
  timeColumn: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeColumnLabel: {
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  timeChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    minWidth: 52,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  timeChipActive: {
    backgroundColor: '#2563eb',
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  timeChipTextActive: {
    color: '#ffffff',
  },
  meridiemRow: {
    flexDirection: 'row',
    gap: 10,
  },
  meridiemChip: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  meridiemChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  meridiemChipText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  meridiemChipTextActive: {
    color: '#ffffff',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  confirmButton: {
    flex: 1.4,
    borderRadius: 18,
    paddingVertical: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});
