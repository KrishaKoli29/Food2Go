import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import api from "../api";

export default function NGODashboard({ user, onLogout, onProfileUpdate }) {
  // Pre-fill from the user session (populated at login); server fetch will confirm/update
  const [ngoName, setNgoName] = useState(user?.ngoName || "");
  const [ngoContact, setNgoContact] = useState(user?.ngoContact || "");
  const [profileDirty, setProfileDirty] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [available, setAvailable] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const profileLoaded = useRef(false);

  // Load persisted profile from the server on mount (authoritative copy)
  useEffect(() => {
    if (!user?.id || profileLoaded.current) return;
    profileLoaded.current = true;
    api.get(`/api/auth/ngo/profile?userId=${user.id}`)
      .then((res) => {
        setNgoName(res.data.ngoName || "");
        setNgoContact(res.data.ngoContact || "");
        setProfileDirty(false);
      })
      .catch((err) => console.warn("Could not fetch NGO profile:", err.message));
  }, [user?.id]);

  const refresh = useCallback(async (showError = true) => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [availableResponse, mineResponse] = await Promise.all([
        api.get("/api/donations/available"),
        api.get(`/api/donations/ngo/${user.id}`),
      ]);
      setAvailable(availableResponse.data.donations || []);
      setMine(mineResponse.data.donations || []);
    } catch (error) {
      console.error("NGO DONATIONS LOAD ERROR:", error.response?.data || error.message);
      if (showError) Alert.alert("Unable to load donations", error.response?.data?.message || "Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { refresh(false); }, [refresh]);

  const saveProfile = async () => {
    if (!ngoName.trim() || !ngoContact.trim()) {
      Alert.alert("Incomplete details", "Please enter both your NGO name and contact number.");
      return;
    }
    try {
      setSavingProfile(true);
      const res = await api.put("/api/auth/ngo/profile", {
        userId: user.id,
        ngoName: ngoName.trim(),
        ngoContact: ngoContact.trim(),
      });
      setNgoName(res.data.ngoName);
      setNgoContact(res.data.ngoContact);
      setProfileDirty(false);
      // Notify parent so currentUser stays up-to-date across logout/login
      if (onProfileUpdate) {
        onProfileUpdate({ ngoName: res.data.ngoName, ngoContact: res.data.ngoContact });
      }
      Alert.alert("Profile saved", "Your organization details have been saved.");
    } catch (error) {
      Alert.alert("Could not save profile", error.response?.data?.error || "Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const accept = async (donation) => {
    if (!ngoName.trim() || !ngoContact.trim()) {
      Alert.alert("NGO details required", "Enter your NGO name and contact number before accepting a donation.");
      return;
    }
    try {
      setBusyId(donation._id);
      await api.post(`/api/donations/${donation._id}/accept`, {
        ngoUserId: user.id,
        ngoName: ngoName.trim(),
        ngoContact: ngoContact.trim(),
      });
      Alert.alert("Donation accepted", "Contact the business and arrange pickup within the listed time window.");
      await refresh(false);
    } catch (error) {
      Alert.alert("Could not accept donation", error.response?.data?.message || "Refresh and try again.");
      await refresh(false);
    } finally {
      setBusyId(null);
    }
  };

  const updateStatus = async (donation, status) => {
    try {
      setBusyId(donation._id);
      await api.patch(`/api/donations/${donation._id}/status`, { ngoUserId: user.id, status });
      await refresh(false);
      Alert.alert("Status updated", `Donation marked ${status.toLowerCase()}.`);
    } catch (error) {
      Alert.alert("Unable to update", error.response?.data?.message || "Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const renderDonation = (donation, isMine = false) => (
    <View key={donation._id} style={styles.card}>
      <Text style={styles.foodTitle}>{donation.category}</Text>
      <Text style={styles.detail}>Donated by: {donation.businessName}</Text>
      <Text style={styles.detail}>Quantity: {donation.quantity}</Text>
      <Text style={styles.detail}>Diet type: {donation.dietType}</Text>
      <Text style={styles.detail}>Pickup: {donation.pickupStartTime} - {donation.pickupEndTime}</Text>
      {donation.notes ? <Text style={styles.detail}>Notes: {donation.notes}</Text> : null}
      <Text style={styles.status}>Status: {donation.status}</Text>
      {isMine && donation.status === "Accepted" && (
        <TouchableOpacity style={styles.actionButton} disabled={busyId === donation._id} onPress={() => updateStatus(donation, "Collected")}>
          {busyId === donation._id ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Mark as Collected</Text>}
        </TouchableOpacity>
      )}
      {isMine && donation.status === "Collected" && (
        <TouchableOpacity style={styles.actionButton} disabled={busyId === donation._id} onPress={() => updateStatus(donation, "Completed")}>
          {busyId === donation._id ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Mark as Completed</Text>}
        </TouchableOpacity>
      )}
      {!isMine && (
        <TouchableOpacity style={styles.actionButton} disabled={busyId === donation._id} onPress={() => accept(donation)}>
          {busyId === donation._id ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Accept Free Donation</Text>}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>NGO Donation Marketplace 💚</Text>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Organization Details</Text>
        <Text style={styles.detail}>Account: {user?.email || "NGO account"}</Text>
        <TextInput
          style={styles.input}
          placeholder="NGO / charity name"
          value={ngoName}
          onChangeText={(v) => { setNgoName(v); setProfileDirty(true); }}
        />
        <TextInput
          style={styles.input}
          placeholder="Contact number"
          value={ngoContact}
          onChangeText={(v) => { setNgoContact(v); setProfileDirty(true); }}
          keyboardType="phone-pad"
        />
        <Text style={styles.helper}>These details are shared with the donating business when you accept a donation.</Text>
        {profileDirty || (!ngoName && !ngoContact) ? (
          <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={savingProfile}>
            {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Profile</Text>}
          </TouchableOpacity>
        ) : (
          <Text style={styles.savedLabel}>✓ Profile saved</Text>
        )}
        <TouchableOpacity style={styles.actionButton} onPress={() => refresh()} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Refresh Donations</Text>}
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Available Free Food</Text>
      {loading && available.length === 0 ? <ActivityIndicator size="large" color="#198754" /> : available.length === 0 ? <Text style={styles.empty}>No donations are available right now.</Text> : available.map((item) => renderDonation(item))}
      <Text style={styles.sectionTitle}>My Accepted Donations</Text>
      {mine.length === 0 ? <Text style={styles.empty}>You have not accepted any donations yet.</Text> : mine.map((item) => renderDonation(item, true))}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}><Text style={styles.buttonText}>Logout</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7F4" },
  content: { padding: 16, paddingBottom: 28 },
  heading: { fontSize: 24, fontWeight: "bold", color: "#176B3A", textAlign: "center", marginVertical: 16 },
  sectionTitle: { fontSize: 19, fontWeight: "bold", color: "#176B3A", marginTop: 12, marginBottom: 10 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 15, marginBottom: 13, borderWidth: 1, borderColor: "#DFE8DF", elevation: 2 },
  foodTitle: { fontSize: 18, fontWeight: "bold", color: "#176B3A", marginBottom: 7 },
  detail: { color: "#444", marginTop: 5, fontSize: 14 },
  status: { color: "#8B5CF6", fontWeight: "bold", marginTop: 10 },
  input: { borderWidth: 1, borderColor: "#D6DDD6", borderRadius: 8, padding: 11, marginTop: 10, color: "#222" },
  helper: { color: "#666", fontSize: 12, marginTop: 8, lineHeight: 17 },
  actionButton: { backgroundColor: "#198754", padding: 13, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 12, minHeight: 45 },
  saveButton: { backgroundColor: "#1565C0", padding: 13, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 12, minHeight: 45 },
  savedLabel: { color: "#198754", fontWeight: "bold", textAlign: "center", marginTop: 10, fontSize: 13 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  empty: { textAlign: "center", color: "#666", marginVertical: 14 },
  logoutButton: { backgroundColor: "#C62828", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 20 },
});
