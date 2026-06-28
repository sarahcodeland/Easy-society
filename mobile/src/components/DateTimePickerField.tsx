import React, { useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import RNDateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

const BR = '#8B2E2E';

interface Props {
  value: string;
  onChange: (iso: string) => void;
  mode?: 'date' | 'time';
  label?: string;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

function toISO(d: Date, mode: 'date' | 'time'): string {
  if (mode === 'time') {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  // YYYY-MM-DD using local time to avoid UTC shift
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${dd}`;
}

function formatDisplay(d: Date, mode: 'date' | 'time'): string {
  if (mode === 'time') {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function parseValue(value: string, mode: 'date' | 'time'): Date {
  if (!value) return new Date();
  if (mode === 'time') {
    const [h, m] = value.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }
  // Parse YYYY-MM-DD as local time (append T00:00 to avoid UTC shift)
  return new Date(`${value}T00:00`);
}

export default function DateTimePickerField({
  value,
  onChange,
  mode = 'date',
  label,
  placeholder,
  minimumDate,
  maximumDate,
}: Props) {
  const [show, setShow] = useState(false);
  // iOS only: buffer the selection until the user taps Done
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const parsed = value ? parseValue(value, mode) : null;

  function open() {
    setTempDate(parsed ?? new Date());
    setShow(true);
  }

  function handleChange(_evt: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setShow(false);
      if (selected) onChange(toISO(selected, mode));
    } else {
      // iOS — accumulate into temp state, confirm on Done
      if (selected) setTempDate(selected);
    }
  }

  function confirmIOS() {
    onChange(toISO(tempDate, mode));
    setShow(false);
  }

  const displayText = parsed ? formatDisplay(parsed, mode) : null;
  const icon: React.ComponentProps<typeof Ionicons>['name'] =
    mode === 'time' ? 'time-outline' : 'calendar-outline';
  const defaultPlaceholder = mode === 'time' ? 'Select time' : 'Select date';

  return (
    <>
      <TouchableOpacity style={S.field} onPress={open} activeOpacity={0.75}>
        <Ionicons name={icon} size={15} color={BR} />
        <Text style={[S.value, !displayText && S.placeholder]}>
          {displayText ?? (placeholder ?? defaultPlaceholder)}
        </Text>
        <Ionicons name="chevron-down" size={13} color="#bbb" />
      </TouchableOpacity>

      {/* ── Android: native dialog renders directly ── */}
      {Platform.OS === 'android' && show && (
        <RNDateTimePicker
          mode={mode}
          display="default"
          value={tempDate}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {/* ── iOS: bottom sheet with spinner + Done/Cancel ── */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <TouchableOpacity style={S.backdrop} activeOpacity={1} onPress={() => setShow(false)} />
          <View style={S.sheet}>
            <View style={S.sheetHeader}>
              <TouchableOpacity onPress={() => setShow(false)} hitSlop={12}>
                <Text style={S.cancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={S.sheetTitle}>{label ?? defaultPlaceholder}</Text>
              <TouchableOpacity onPress={confirmIOS} hitSlop={12}>
                <Text style={S.done}>Done</Text>
              </TouchableOpacity>
            </View>
            <RNDateTimePicker
              mode={mode}
              display="spinner"
              value={tempDate}
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              style={S.picker}
            />
          </View>
        </Modal>
      )}
    </>
  );
}

const S = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1.5,
    borderColor: '#E1D8D2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#fff',
    marginBottom: 5,
  },
  value: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#4A3F3A',
  },
  placeholder: {
    color: '#aaa',
    fontWeight: '400',
  },

  // iOS modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  cancel: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  done: {
    fontSize: 14,
    fontWeight: '700',
    color: BR,
  },
  picker: {
    backgroundColor: '#fff',
  },
});
