import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Toast } from '../../components/Toast';

export default function EncashmentScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Fetch Profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('leave_balance, basic_salary')
        .eq('id', session?.user?.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Calculation Logic (Client Side Estimate)
  const calculateEstimate = () => {
    if (!profile?.leave_balance || !profile?.basic_salary) return 0;
    const balance = Number(profile.leave_balance);
    const salary = Number(profile.basic_salary);
    // Formula: FLOOR((basic_salary / 21) * leave_balance)
    return Math.floor((salary / 21) * balance);
  };

  const estimatedAmount = calculateEstimate();

  // Mutation
  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('rpc_process_encashment');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setShowConfirmation(false);
      Alert.alert('Success', `Encashment processed! Amount: Rp ${data.encashment_amount.toLocaleString('id-ID')}`);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <Toast />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Leave Encashment
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 mb-8">
          Convert your unused leave balance into cash.
        </Text>

        {/* Balance Card */}
        <View className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm mb-6 border border-gray-100 dark:border-gray-700">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-gray-500 dark:text-gray-400 font-medium">Current Balance</Text>
            <View className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">
              <Text className="text-blue-600 dark:text-blue-400 font-bold text-xs">ANNUAL</Text>
            </View>
          </View>
          <Text className="text-4xl font-extrabold text-gray-900 dark:text-white mb-1">
            {profile?.leave_balance || 0}
            <Text className="text-lg font-medium text-gray-500 dark:text-gray-400"> days</Text>
          </Text>
        </View>

        {/* Estimate Card */}
        <View className="bg-blue-600 p-6 rounded-3xl shadow-xl shadow-blue-500/30 mb-8 relative overflow-hidden">
          {/* Decorative Circle */}
          <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />

          <Text className="text-blue-100 font-medium mb-2">Estimated Payout</Text>
          <Text className="text-3xl font-bold text-white mb-4">
            Rp {estimatedAmount.toLocaleString('id-ID')}
          </Text>
          <View className="flex-row items-center bg-blue-500/50 self-start px-3 py-1 rounded-lg">
            <Ionicons name="information-circle-outline" size={16} color="white" />
            <Text className="text-white text-xs ml-1">Based on basic salary / 21 days</Text>
          </View>
        </View>

        {/* Action Button */}
        {Number(profile?.leave_balance) > 0 ? (
          <TouchableOpacity
            onPress={() => setShowConfirmation(true)}
            className="w-full bg-gray-900 dark:bg-white p-4 rounded-xl flex-row items-center justify-center shadow-lg"
          >
            <Text className="text-white dark:text-gray-900 font-bold text-lg mr-2">
              Process Encashment
            </Text>
            <Ionicons name="arrow-forward" size={20} color={isLoading ? "gray" : "currentColor"} />
          </TouchableOpacity>
        ) : (
          <View className="w-full bg-gray-200 dark:bg-gray-800 p-4 rounded-xl items-center">
            <Text className="text-gray-500 dark:text-gray-400 font-medium">
              No balance available to encash
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal (Simple Overlay) */}
      {showConfirmation && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center p-6 z-50">
          <View className="bg-white dark:bg-gray-800 w-full p-6 rounded-3xl">
            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              Confirm Encashment
            </Text>
            <Text className="text-gray-500 dark:text-gray-400 text-center mb-6">
              Are you sure you want to encash {profile?.leave_balance} days for Rp {estimatedAmount.toLocaleString('id-ID')}? This action cannot be undone.
            </Text>

            <View className="flex-row gap-4">
              <TouchableOpacity
                onPress={() => setShowConfirmation(false)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 p-4 rounded-xl items-center"
              >
                <Text className="font-bold text-gray-700 dark:text-gray-300">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="flex-1 bg-blue-600 p-4 rounded-xl items-center"
              >
                {mutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="font-bold text-white">Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
