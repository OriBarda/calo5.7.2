import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";
import { RootState, AppDispatch } from "@/src/store";
import { signOut, forceSignOut } from "@/src/store/authSlice";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);

  const handleSignOut = async () => {
    try {
      console.log("Starting signout process...");

      const result = await dispatch(signOut());
      console.log("SignOut result:", result);

      // Always navigate to signin regardless of the result
      console.log("Navigating to signin...");
      router.replace("/(auth)/signin");
    } catch (error) {
      console.error("SignOut catch error:", error);
      // Force signout and navigate even if there's an error
      dispatch(forceSignOut());
      router.replace("/(auth)/signin");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={100} color="#007AFF" />
        </View>
        <Text style={styles.name}>{user?.name || "User"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Age</Text>
          <Text style={styles.infoValue}>{user?.age || "Not set"}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Weight</Text>
          <Text style={styles.infoValue}>
            {user?.weight_kg ? `${user.weight_kg} kg` : "Not set"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Height</Text>
          <Text style={styles.infoValue}>
            {user?.height_cm ? `${user.height_cm} cm` : "Not set"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Subscription</Text>
          <Text style={styles.infoValue}>
            {user?.subscription_type || "Free"}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create-outline" size={20} color="#007AFF" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.signOutButton, isLoading && styles.disabledButton]}
          onPress={handleSignOut}
          disabled={isLoading}
        >
          <Ionicons name="log-out-outline" size={20} color="#dc3545" />
          <Text style={styles.signOutButtonText}>
            {isLoading ? "Signing Out..." : "Sign Out"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "white",
    alignItems: "center",
    paddingVertical: 30,
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  email: {
    fontSize: 16,
    color: "#666",
  },
  infoSection: {
    backgroundColor: "white",
    marginHorizontal: 15,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  infoLabel: {
    fontSize: 16,
    color: "#333",
  },
  infoValue: {
    fontSize: 16,
    color: "#666",
    textTransform: "capitalize",
  },
  actions: {
    paddingHorizontal: 15,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  editButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
  },
  signOutButtonText: {
    color: "#dc3545",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
