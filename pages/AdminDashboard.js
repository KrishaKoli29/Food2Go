/**
 * AdminDashboard.js
 *
 * Simple admin screen for managing business approval.
 * Admins can view all registered businesses and approve, reject, or suspend them.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { API_ADMIN } from "../constants/api";
import { useAuth } from "../AuthContext";

// ─── Status badge helper ──────────────────────────────────────────────────────

const STATUS_COLORS = {
  pending: { bg: "#FFF3CD", text: "#856404", border: "#FFEAA7" },
  approved: { bg: "#D4EDDA", text: "#155724", border: "#C3E6CB" },
  rejected: { bg: "#F8D7DA", text: "#721C24", border: "#F5C6CB" },
  suspended: { bg: "#E2E3E5", text: "#383D41", border: "#D6D8DB" },
};

function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { token, logout } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // id of the row being actioned

  // Reject modal state
  const [rejectModal, setRejectModal] = useState({ visible: false, businessId: null, storeName: "" });
  const [rejectReason, setRejectReason] = useState("");

  // ─── Fetch businesses ───────────────────────────────────────────────────────

  const fetchBusinesses = useCallback(async () => {
    try {
      const res = await fetch(`${API_ADMIN}/businesses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setBusinesses(data);
      } else {
        Alert.alert("Error", data.error || "Failed to load businesses.");
      }
    } catch (_) {
      Alert.alert("Connection Error", "Could not reach the server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBusinesses();
  };

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleApprove = (id, storeName) => {
    Alert.alert("Approve Business", `Approve "${storeName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          setActionLoading(id);
          try {
            const res = await fetch(`${API_ADMIN}/businesses/${id}/approve`, {
              method: "PATCH",
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
              setBusinesses((prev) =>
                prev.map((b) => (b._id === id ? { ...b, status: "approved", rejectionReason: null } : b))
              );
              Alert.alert("✅ Approved", `"${storeName}" is now approved.`);
            } else {
              Alert.alert("Error", data.error || "Failed to approve.");
            }
          } catch (_) {
            Alert.alert("Error", "Could not reach the server.");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const openRejectModal = (id, storeName) => {
    setRejectReason("");
    setRejectModal({ visible: true, businessId: id, storeName });
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      Alert.alert("Required", "Please enter a rejection reason.");
      return;
    }
    const { businessId, storeName } = rejectModal;
    setRejectModal((m) => ({ ...m, visible: false }));
    setActionLoading(businessId);
    try {
      const res = await fetch(`${API_ADMIN}/businesses/${businessId}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setBusinesses((prev) =>
          prev.map((b) =>
            b._id === businessId ? { ...b, status: "rejected", rejectionReason: rejectReason.trim() } : b
          )
        );
        Alert.alert("❌ Rejected", `"${storeName}" has been rejected.`);
      } else {
        Alert.alert("Error", data.error || "Failed to reject.");
      }
    } catch (_) {
      Alert.alert("Error", "Could not reach the server.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = (id, storeName) => {
    Alert.alert("Suspend Business", `Suspend "${storeName}"? They will not be able to publish bags.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Suspend",
        style: "destructive",
        onPress: async () => {
          setActionLoading(id);
          try {
            const res = await fetch(`${API_ADMIN}/businesses/${id}/suspend`, {
              method: "PATCH",
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
              setBusinesses((prev) =>
                prev.map((b) => (b._id === id ? { ...b, status: "suspended" } : b))
              );
              Alert.alert("⏸️ Suspended", `"${storeName}" has been suspended.`);
            } else {
              Alert.alert("Error", data.error || "Failed to suspend.");
            }
          } catch (_) {
            Alert.alert("Error", "Could not reach the server.");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading businesses…</Text>
      </View>
    );
  }

  // Group counts for the summary header
  const counts = businesses.reduce(
    (acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; },
    {}
  );

  return (
    <View style={styles.screen}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛡️ Admin Dashboard</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* ── Summary chips ───────────────────────────────────────────────── */}
      <View style={styles.summaryRow}>
        {[
          { label: "Pending", key: "pending", color: "#856404" },
          { label: "Approved", key: "approved", color: "#155724" },
          { label: "Rejected", key: "rejected", color: "#721C24" },
          { label: "Suspended", key: "suspended", color: "#383D41" },
        ].map(({ label, key, color }) => (
          <View key={key} style={styles.chip}>
            <Text style={[styles.chipCount, { color }]}>{counts[key] || 0}</Text>
            <Text style={styles.chipLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── Business list ───────────────────────────────────────────────── */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B35"]} />}
      >
        {businesses.length === 0 ? (
          <Text style={styles.empty}>No businesses registered yet.</Text>
        ) : (
          businesses.map((biz) => (
            <View key={biz._id} style={styles.card}>
              {/* Info */}
              <View style={styles.cardHeader}>
                <Text style={styles.storeName}>{biz.storeName}</Text>
                <StatusBadge status={biz.status} />
              </View>

              <Text style={styles.email}>📧 {biz.email}</Text>
              <Text style={styles.location}>
                📍 {biz.latitude?.toFixed(4)}, {biz.longitude?.toFixed(4)}
              </Text>

              {biz.rejectionReason ? (
                <Text style={styles.rejectionNote}>
                  Reason: {biz.rejectionReason}
                </Text>
              ) : null}

              {/* Action buttons */}
              <View style={styles.actionRow}>
                {biz.status !== "approved" && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleApprove(biz._id, biz.storeName)}
                    disabled={actionLoading === biz._id}
                  >
                    {actionLoading === biz._id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.actionBtnText}>✅ Approve</Text>
                    )}
                  </TouchableOpacity>
                )}

                {biz.status !== "rejected" && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => openRejectModal(biz._id, biz.storeName)}
                    disabled={actionLoading === biz._id}
                  >
                    <Text style={styles.actionBtnText}>❌ Reject</Text>
                  </TouchableOpacity>
                )}

                {biz.status !== "suspended" && biz.status !== "rejected" && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.suspendBtn]}
                    onPress={() => handleSuspend(biz._id, biz.storeName)}
                    disabled={actionLoading === biz._id}
                  >
                    <Text style={styles.actionBtnText}>⏸ Suspend</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Reject reason modal ─────────────────────────────────────────── */}
      <Modal
        visible={rejectModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModal((m) => ({ ...m, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reject Business</Text>
            <Text style={styles.modalSubtitle}>
              "{rejectModal.storeName}"
            </Text>
            <Text style={styles.modalLabel}>Rejection Reason *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter reason for rejection…"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setRejectModal((m) => ({ ...m, visible: false }))}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirm]}
                onPress={handleRejectSubmit}
              >
                <Text style={styles.modalConfirmText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F0F2F5",
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#666",
  },

  // Header
  header: {
    backgroundColor: "#1A1A2E",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },

  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },

  logoutText: {
    color: "#fff",
    fontSize: 13,
  },

  // Summary chips
  summaryRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },

  chip: {
    flex: 1,
    alignItems: "center",
  },

  chipCount: {
    fontSize: 22,
    fontWeight: "bold",
  },

  chipLabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },

  // List
  list: {
    flex: 1,
  },

  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 60,
    fontSize: 16,
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  storeName: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },

  email: {
    fontSize: 13,
    color: "#555",
    marginBottom: 3,
  },

  location: {
    fontSize: 13,
    color: "#555",
    marginBottom: 6,
  },

  rejectionNote: {
    fontSize: 12,
    color: "#721C24",
    backgroundColor: "#F8D7DA",
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },

  // Status badge
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Action buttons
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  approveBtn: {
    backgroundColor: "#28A745",
  },

  rejectBtn: {
    backgroundColor: "#DC3545",
  },

  suspendBtn: {
    backgroundColor: "#6C757D",
  },

  actionBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },

  modalSubtitle: {
    fontSize: 14,
    color: "#555",
    marginBottom: 16,
  },

  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },

  modalInput: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 20,
  },

  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },

  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  modalCancel: {
    backgroundColor: "#F0F2F5",
  },

  modalCancelText: {
    color: "#555",
    fontWeight: "600",
  },

  modalConfirm: {
    backgroundColor: "#DC3545",
  },

  modalConfirmText: {
    color: "#fff",
    fontWeight: "700",
  },
});
