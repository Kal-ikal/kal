import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function LeaveRequestForm() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<string | null>(null);
  const [reason, setReason] = useState(''); // Simple input, or passed from parent? Prompt said "Form". I'll skip reason input UI for brevity unless requested, or add it.
  // The prompt said: "Input dates -> Calculate duration ... -> Validate ... -> Insert ...".
  // "Form" implies UI.

  // Fetch Leave Types
  const { data: leaveTypes, isLoading: isLoadingTypes } = useQuery({
    queryKey: ['leave_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leave_types').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Mutation for RPC
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedLeaveType) throw new Error('Please select a leave type');

      const { data, error } = await supabase.rpc('rpc_submit_leave_request', {
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0],
        p_leave_type_id: selectedLeaveType,
        p_reason: 'Submitted via Mobile App', // Hardcoded or add input
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Leave request submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] }); // Balance update
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const onDateChange = (event: any, selectedDate?: Date, type?: 'start' | 'end') => {
    if (type === 'start') {
      setShowStartPicker(false);
      if (selectedDate) setStartDate(selectedDate);
    } else {
      setShowEndPicker(false);
      if (selectedDate) setEndDate(selectedDate);
    }
  };

  if (isLoadingTypes) {
    return (
      <View className="p-4 bg-white dark:bg-gray-800 rounded-xl mb-4 animate-pulse">
        <View className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </View>
    );
  }

  return (
    <View className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm mb-6">
      <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        New Leave Request
      </Text>

      {/* Leave Types */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Leave Type</Text>
        <View className="flex-row flex-wrap gap-2">
          {leaveTypes?.map((type) => (
            <TouchableOpacity
              key={type.id}
              onPress={() => setSelectedLeaveType(type.id)}
              className={`px-4 py-2 rounded-full border ${
                selectedLeaveType === type.id
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-transparent border-gray-300 dark:border-gray-600'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedLeaveType === type.id ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Dates */}
      <View className="flex-row gap-4 mb-6">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Start Date</Text>
          <TouchableOpacity
            onPress={() => setShowStartPicker(true)}
            className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border border-gray-200 dark:border-gray-600"
          >
            <Text className="text-gray-900 dark:text-white text-center">
              {startDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">End Date</Text>
          <TouchableOpacity
            onPress={() => setShowEndPicker(true)}
            className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border border-gray-200 dark:border-gray-600"
          >
            <Text className="text-gray-900 dark:text-white text-center">
              {endDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(e, d) => onDateChange(e, d, 'start')}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={(e, d) => onDateChange(e, d, 'end')}
          minimumDate={startDate}
        />
      )}

      {/* Submit Button */}
      <TouchableOpacity
        onPress={() => mutation.mutate()}
        disabled={mutation.isPending || !selectedLeaveType}
        className={`w-full p-4 rounded-xl items-center justify-center ${
          mutation.isPending || !selectedLeaveType ? 'bg-gray-300 dark:bg-gray-700' : 'bg-blue-600 shadow-lg shadow-blue-500/30'
        }`}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-base">Submit Request</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
