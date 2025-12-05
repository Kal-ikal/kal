import React, { useState, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, RefreshControl, StyleSheet, Platform } from "react-native";
// Hapus useSmartNavigation karena kita akan pakai router langsung untuk login
import { useCustomBackHandler } from '../hooks/useCustomBackHandler';
import { Calendar, BarChart2, Users, Shield, Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
// Tambahkan useRouter
import { useRouter } from "expo-router";
import "./global.css"

interface Feature {
  icon: React.JSX.Element;
  title: string;
  description: string;
}

interface FAQ {
  question: string;
  answer: string;
}

const LandingScreen: React.FC = () => {
  // Ganti useSmartNavigation dengan useRouter
  const router = useRouter();
  useCustomBackHandler();
  
  // PERUBAHAN 2: Gunakan hook insets
  const insets = useSafeAreaInsets();
  
  const [activeFeature, setActiveFeature] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const features: Feature[] = [
    {
      icon: <Calendar color="#3B82F6" size={24} />,
      title: "Easy Leave Requests",
      description: "Apply for leave in seconds with our intuitive interface",
    },
    {
      icon: <BarChart2 color="#10B981" size={24} />,
      title: "Track Usage",
      description: "Visualize your leave patterns with interactive charts",
    },
    {
      icon: <Users color="#8B5CF6" size={24} />,
      title: "Team Coordination",
      description: "See team availability and plan accordingly",
    },
    {
      icon: <Shield color="#F59E0B" size={24} />,
      title: "Secure & Reliable",
      description: "Enterprise-grade security for your data",
    },
  ];

  const faqs: FAQ[] = [
    {
      question: "How secure is my leave data?",
      answer: "We use bank-level encryption and comply with data protection regulations."
    },
    {
      question: "Can I integrate with existing HR systems?",
      answer: "Yes! We offer seamless integration with popular HR platforms through our REST API."
    },
    {
      question: "Is there a mobile app available?",
      answer: "Our progressive web app works perfectly on all devices with native app-like experience."
    },
    {
      question: "What kind of support do you offer?",
      answer: "We provide 24/7 customer support via chat, email, and phone for all clients."
    }
  ];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const nextFeature = () => {
    setActiveFeature((prev) => (prev + 1) % features.length);
  };

  const prevFeature = () => {
    setActiveFeature((prev) => (prev - 1 + features.length) % features.length);
  };

  return (
    <View 
      style={[
        styles.container, 
        { 
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }
      ]}
    >
      <StatusBar 
        style="dark"
        backgroundColor="#EFF6FF"
      />
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom }} // Tambahkan padding bottom di sini
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3B82F6"]}
            tintColor="#3B82F6"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.logo}>
              Annual & Benefit
            </Text>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            Simplify Your Leave Management
          </Text>
          <Text style={styles.heroDescription}>
            Track, request, and manage your leave entitlements with ease. All in one place.
          </Text>

          <View style={styles.heroContentContainer}>
            <View style={styles.imageContainer}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1480694313141-fce5e697ee25?w=900&auto=format&fit=crop&q=60",
                }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            </View>
            
            {/* BUTTON FIX: Menggunakan router.push */}
            <TouchableOpacity
              onPress={() => router.push("/(auth)/login")}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>      

        {/* Interactive Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>
            Why Choose Annual & Benefit?
          </Text>

          <View style={styles.carouselContainer}>
            <View style={styles.carouselContent}>
              <View style={styles.featureIconContainer}>
                {features[activeFeature].icon}
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureCarouselTitle}>
                  {features[activeFeature].title}
                </Text>
                <Text style={styles.featureCarouselDescription}>
                  {features[activeFeature].description}
                </Text>
              </View>
            </View>

            <View style={styles.carouselControls}>
              <View style={styles.dotsContainer}>
                {features.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setActiveFeature(index)}
                    style={[
                      styles.dot,
                      index === activeFeature ? styles.activeDot : styles.inactiveDot
                    ]}
                  />
                ))}
              </View>
              
              <View style={styles.arrowControls}>
                <TouchableOpacity 
                  onPress={prevFeature}
                  style={styles.arrowButton}
                >
                  <Text style={styles.arrowText}>←</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={nextFeature}
                  style={styles.arrowButton}
                >
                  <Text style={styles.arrowText}>→</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setActiveFeature(index)}
                style={[
                  styles.featureCard,
                  activeFeature === index && styles.activeFeatureCard
                ]}
              >
                <View style={styles.featureCardIcon}>
                  {feature.icon}
                </View>
                <Text style={styles.featureCardTitle}>
                  {feature.title}
                </Text>
                <Text style={styles.featureCardDescription}>
                  {feature.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>
            Frequently Asked Questions
          </Text>

          <View style={styles.faqContainer}>
            {faqs.map((faq, index) => (
              <View 
                key={index}
                style={styles.faqItem}
              >
                <View style={styles.faqContent}>
                  <View style={styles.faqIcon}>
                    <Plus size={16} color="#3B82F6" />
                  </View>
                  <View style={styles.faqText}>
                    <Text style={styles.faqQuestion}>
                      {faq.question}
                    </Text>
                    <Text style={styles.faqAnswer}>
                      {faq.answer}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Annual & Benefit. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // PERUBAHAN 4: Rename safeArea to container (optional but cleaner)
  container: {
    flex: 1,
    backgroundColor: '#EFF6FF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: '#EFF6FF',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1F2937',
    marginBottom: 16,
  },
  heroDescription: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 400,
  },
  heroContentContainer: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  featuresSection: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 24,
    backgroundColor: '#F9FAFB',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  carouselContainer: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 24,
  },
  carouselContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureIconContainer: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureCarouselTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  featureCarouselDescription: {
    color: '#6B7280',
  },
  carouselControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    backgroundColor: '#2563EB',
  },
  inactiveDot: {
    backgroundColor: '#D1D5DB',
  },
  arrowControls: {
    flexDirection: 'row',
    gap: 8,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: '#6B7280',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  featureCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  activeFeatureCard: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  featureCardIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  featureCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  featureCardDescription: {
    color: '#6B7280',
    fontSize: 12,
  },
  faqSection: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    backgroundColor: 'white',
  },
  faqContainer: {
    gap: 16,
  },
  faqItem: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  faqContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  faqIcon: {
    backgroundColor: '#DBEAFE',
    padding: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  faqText: {
    flex: 1,
  },
  faqQuestion: {
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  faqAnswer: {
    color: '#6B7280',
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#111827',
  },
  footerText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
  },
});

export default LandingScreen;