import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, 
  TextInput, ScrollView, Modal, Alert, StatusBar, Image 
} from 'lucide-react-native' ? null : null; // Safe fallback

// React Native Components
import { 
  StyleSheet as RNStyleSheet, Text as RNText, View as RNView, 
  SafeAreaView as RNSafeAreaView, FlatList as RNFlatList, 
  TouchableOpacity as RNTouchableOpacity, TextInput as RNTextInput, 
  ScrollView as RNScrollView, Modal as RNModal, Alert as RNAlert, 
  StatusBar as RNStatusBar 
} from 'react-native';

interface JobItem {
  id: string;
  title: string;
  company: string;
  category: string;
  location: string;
  salary: string;
  experience: string;
}

const SAMPLE_JOBS: JobItem[] = [
  { id: '1', title: 'Senior Heavy Truck Driver', company: 'Bharat Logistics Pvt Ltd', category: 'HMV', location: 'Bengaluru, Karnataka', salary: '₹25,000 - ₹32,000 / mo', experience: '3-5 Yrs' },
  { id: '2', title: 'Executive Fleet Chauffeur', company: 'QuickRide Mobility', category: 'LMV', location: 'Indiranagar, Bengaluru', salary: '₹22,000 - ₹28,000 / mo', experience: '2+ Yrs' },
  { id: '3', title: 'School Bus Driver', company: 'Sunrise International School', category: 'Bus Driver', location: 'Mysuru, Karnataka', salary: '₹18,000 - ₹22,000 / mo', experience: '3+ Yrs' },
  { id: '4', title: 'Hyperlocal Delivery Pilot', company: 'Swift Express Logistics', category: 'Delivery', location: 'Chennai, Tamil Nadu', salary: '₹18,000 - ₹24,000 / mo', experience: '1-3 Yrs' },
  { id: '5', title: '40ft Container Trailer Driver', company: 'National Freight Carriers', category: 'Trailer', location: 'Chennai Port', salary: '₹32,000 - ₹42,000 / mo', experience: '5+ Yrs' },
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'applications' | 'documents' | 'profile'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>(['1']);

  const categories = ['All', 'HMV', 'LMV', 'Bus Driver', 'Delivery', 'Trailer'];

  const filteredJobs = SAMPLE_JOBS.filter((j) => {
    const matchesCategory = selectedCategory === 'All' || j.category.includes(selectedCategory);
    const matchesSearch = !searchQuery || j.title.toLowerCase().includes(searchQuery.toLowerCase()) || j.company.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleApply = (job: JobItem) => {
    if (!appliedJobIds.includes(job.id)) {
      setAppliedJobIds([...appliedJobIds, job.id]);
    }
    RNAlert.alert('Application Submitted! 🎉', `Your driver profile has been sent to ${job.company}. Track your status in the Applications tab.`);
    setSelectedJob(null);
  };

  return (
    <RNSafeAreaView style={styles.container}>
      <RNStatusBar barStyle="light-content" backgroundColor="#0A2540" />

      {/* App Header */}
      <RNView style={styles.header}>
        <RNView>
          <RNText style={styles.headerTitle}>DRIVER HUB</RNText>
          <RNText style={styles.headerSubtitle}>Drive Your Career Forward</RNText>
        </RNView>
        <RNView style={styles.driverBadge}>
          <RNText style={styles.driverBadgeText}>HMV Verified</RNText>
        </RNView>
      </RNView>

      {/* Screen Body */}
      {currentTab === 'home' && (
        <RNView style={styles.content}>
          {/* Search Bar */}
          <RNTextInput
            style={styles.searchInput}
            placeholder="Search driving jobs, companies..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {/* Horizontal Category Filters */}
          <RNView style={{ height: 42, marginBottom: 12 }}>
            <RNScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((cat) => (
                <RNTouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat && styles.categoryChipActive,
                  ]}
                >
                  <RNText
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </RNText>
                </RNTouchableOpacity>
              ))}
            </RNScrollView>
          </RNView>

          {/* Job List */}
          <RNFlatList
            data={filteredJobs}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isApplied = appliedJobIds.includes(item.id);
              return (
                <RNTouchableOpacity
                  style={styles.jobCard}
                  onPress={() => setSelectedJob(item)}
                >
                  <RNView style={styles.jobHeaderRow}>
                    <RNText style={styles.jobCompany}>{item.company}</RNText>
                    <RNView style={styles.categoryPill}>
                      <RNText style={styles.categoryPillText}>{item.category}</RNText>
                    </RNView>
                  </RNView>

                  <RNText style={styles.jobTitle}>{item.title}</RNText>
                  <RNText style={styles.jobLocation}>📍 {item.location}</RNText>
                  <RNText style={styles.jobSalary}>💰 {item.salary}</RNText>

                  <RNView style={styles.jobFooterRow}>
                    <RNText style={styles.jobExp}>Exp: {item.experience}</RNText>
                    {isApplied ? (
                      <RNText style={styles.appliedText}>✓ Applied</RNText>
                    ) : (
                      <RNText style={styles.applyBtnText}>View Details →</RNText>
                    )}
                  </RNView>
                </RNTouchableOpacity>
              );
            }}
          />
        </RNView>
      )}

      {currentTab === 'applications' && (
        <RNScrollView style={styles.content}>
          <RNText style={styles.sectionHeader}>My Job Applications ({appliedJobIds.length})</RNText>
          {SAMPLE_JOBS.filter(j => appliedJobIds.includes(j.id)).map((item) => (
            <RNView key={item.id} style={styles.applicationCard}>
              <RNText style={styles.appJobTitle}>{item.title}</RNText>
              <RNText style={styles.appCompany}>{item.company}</RNText>
              <RNView style={styles.statusRow}>
                <RNText style={styles.statusShortlisted}>● Shortlisted for Driving Test</RNText>
                <RNText style={styles.appDate}>Sep 14</RNText>
              </RNView>
            </RNView>
          ))}
        </RNScrollView>
      )}

      {currentTab === 'documents' && (
        <RNScrollView style={styles.content}>
          <RNText style={styles.sectionHeader}>My Driving Documents & License</RNText>
          <RNView style={styles.docItem}>
            <RNText style={styles.docTitle}>Commercial Driving License (HMV)</RNText>
            <RNText style={styles.docStatusVerified}>✓ Verified by Admin</RNText>
          </RNView>
          <RNView style={styles.docItem}>
            <RNText style={styles.docTitle}>Aadhar Card / Government ID</RNText>
            <RNText style={styles.docStatusVerified}>✓ Verified</RNText>
          </RNView>
          <RNView style={styles.docItem}>
            <RNText style={styles.docTitle}>Driver Resume (PDF)</RNText>
            <RNText style={styles.docStatusVerified}>✓ Uploaded</RNText>
          </RNView>
          <RNTouchableOpacity
            style={styles.uploadBtn}
            onPress={() => RNAlert.alert('Upload Document', 'Camera and Document Picker enabled in full Expo build.')}
          >
            <RNText style={styles.uploadBtnText}>+ Upload New Document</RNText>
          </RNTouchableOpacity>
        </RNScrollView>
      )}

      {currentTab === 'profile' && (
        <RNScrollView style={styles.content}>
          <RNText style={styles.sectionHeader}>Driver Profile</RNText>
          <RNView style={styles.profileCard}>
            <RNText style={styles.profileName}>Ravi Kumar</RNText>
            <RNText style={styles.profileDetail}>📞 +91 98765 43210</RNText>
            <RNText style={styles.profileDetail}>✉️ ravi.kumar@driverhub.in</RNText>
            <RNText style={styles.profileDetail}>📍 Bengaluru, Karnataka</RNText>
            <RNText style={styles.profileDetail}>🪪 HMV Commercial License (KA02 20180045920)</RNText>
            <RNText style={styles.profileDetail}>⏱️ 6 Years Highway Trucking Experience</RNText>
            <RNText style={styles.profileDetail}>💰 Expected Salary: ₹28,000 / mo</RNText>
          </RNView>
        </RNScrollView>
      )}

      {/* Bottom Navigation Bar */}
      <RNView style={styles.bottomNav}>
        <RNTouchableOpacity
          style={styles.navTab}
          onPress={() => setCurrentTab('home')}
        >
          <RNText style={[styles.navIcon, currentTab === 'home' && styles.navIconActive]}>🔍</RNText>
          <RNText style={[styles.navText, currentTab === 'home' && styles.navTextActive]}>Jobs</RNText>
        </RNTouchableOpacity>

        <RNTouchableOpacity
          style={styles.navTab}
          onPress={() => setCurrentTab('applications')}
        >
          <RNText style={[styles.navIcon, currentTab === 'applications' && styles.navIconActive]}>📄</RNText>
          <RNText style={[styles.navText, currentTab === 'applications' && styles.navTextActive]}>Applied</RNText>
        </RNTouchableOpacity>

        <RNTouchableOpacity
          style={styles.navTab}
          onPress={() => setCurrentTab('documents')}
        >
          <RNText style={[styles.navIcon, currentTab === 'documents' && styles.navIconActive]}>🪪</RNText>
          <RNText style={[styles.navText, currentTab === 'documents' && styles.navTextActive]}>Docs</RNText>
        </RNTouchableOpacity>

        <RNTouchableOpacity
          style={styles.navTab}
          onPress={() => setCurrentTab('profile')}
        >
          <RNText style={[styles.navIcon, currentTab === 'profile' && styles.navIconActive]}>👤</RNText>
          <RNText style={[styles.navText, currentTab === 'profile' && styles.navTextActive]}>Profile</RNText>
        </RNTouchableOpacity>
      </RNView>

      {/* Job Details Modal */}
      {selectedJob && (
        <RNModal visible={true} transparent={true} animationType="slide">
          <RNView style={styles.modalBackdrop}>
            <RNView style={styles.modalCard}>
              <RNText style={styles.modalCompany}>{selectedJob.company}</RNText>
              <RNText style={styles.modalTitle}>{selectedJob.title}</RNText>
              <RNText style={styles.modalDetail}>📍 {selectedJob.location}</RNText>
              <RNText style={styles.modalDetail}>💰 {selectedJob.salary}</RNText>
              <RNText style={styles.modalDetail}>⏱️ Required: {selectedJob.experience}</RNText>

              <RNText style={styles.modalDescHeader}>Requirements:</RNText>
              <RNText style={styles.modalDesc}>• Valid Commercial Driving License with clean record.</RNText>
              <RNText style={styles.modalDesc}>• Punctual and disciplined driving habits.</RNText>
              <RNText style={styles.modalDesc}>• Daily trip log sheet & safety inspections.</RNText>

              <RNView style={styles.modalBtnRow}>
                <RNTouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setSelectedJob(null)}
                >
                  <RNText style={styles.modalCancelText}>Close</RNText>
                </RNTouchableOpacity>

                <RNTouchableOpacity
                  style={styles.modalApplyBtn}
                  onPress={() => handleApply(selectedJob)}
                >
                  <RNText style={styles.modalApplyText}>Confirm & Apply</RNText>
                </RNTouchableOpacity>
              </RNView>
            </RNView>
          </RNView>
        </RNModal>
      )}
    </RNSafeAreaView>
  );
}

const styles = RNStyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#0A2540',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  driverBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  driverBadgeText: {
    color: '#0A2540',
    fontSize: 10,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1E293B',
    marginBottom: 10,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#0A2540',
    borderColor: '#0A2540',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  jobHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobCompany: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  jobLocation: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 2,
  },
  jobSalary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 8,
  },
  jobFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  jobExp: {
    fontSize: 11,
    color: '#94A3B8',
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0066CC',
  },
  appliedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  applicationCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  appJobTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  appCompany: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusShortlisted: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  appDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  docItem: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  docTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  docStatusVerified: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  uploadBtn: {
    backgroundColor: '#0A2540',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  profileDetail: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 6,
  },
  bottomNav: {
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navTab: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  navIcon: {
    fontSize: 18,
    opacity: 0.5,
  },
  navIconActive: {
    opacity: 1,
  },
  navText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  navTextActive: {
    color: '#0A2540',
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalCompany: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalDetail: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 4,
  },
  modalDescHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4,
  },
  modalDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 3,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modalApplyBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  modalApplyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0A2540',
  },
});
