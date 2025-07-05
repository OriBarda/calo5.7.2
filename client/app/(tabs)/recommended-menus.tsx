import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { mealPlanAPI } from "@/src/services/api";

interface MealTemplate {
  template_id: string;
  name: string;
  description?: string;
  meal_timing: string;
  dietary_category: string;
  prep_time_minutes?: number;
  difficulty_level?: number;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  ingredients: any[];
  instructions: any[];
  allergens: string[];
  image_url?: string;
}

interface WeeklyMealPlan {
  [day: string]: {
    [mealTiming: string]: MealTemplate[];
  };
}

interface MealPlanConfig {
  name: string;
  meals_per_day: number;
  snacks_per_day: number;
  rotation_frequency_days: number;
  include_leftovers: boolean;
  fixed_meal_times: boolean;
  dietary_preferences: string[];
  excluded_ingredients: string[];
}

export default function RecommendedMenusScreen() {
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyMealPlan>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isReplacingMeal, setIsReplacingMeal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealTemplate | null>(null);
  const [currentDay, setCurrentDay] = useState("Monday");
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [selectedMealDayTiming, setSelectedMealDayTiming] = useState<{
    day: string;
    timing: string;
  } | null>(null);
  const [mealPlanConfig, setMealPlanConfig] = useState<MealPlanConfig>({
    name: "My AI Meal Plan",
    meals_per_day: 3,
    snacks_per_day: 0,
    rotation_frequency_days: 7,
    include_leftovers: false,
    fixed_meal_times: false,
    dietary_preferences: [],
    excluded_ingredients: [],
  });

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const mealTimings = [
    "BREAKFAST",
    "LUNCH",
    "DINNER",
    "MORNING_SNACK",
    "AFTERNOON_SNACK",
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMealPlan();
    setRefreshing(false);
  };

  const handleMealPress = (meal: MealTemplate, day: string, timing: string) => {
    setSelectedMeal(meal);
    setSelectedMealDayTiming({ day, timing });
    setShowMealModal(true);
  };
  useEffect(() => {
    loadMealPlan();
  }, []);

  const loadMealPlan = async () => {
    try {
      setIsLoading(true);
      const result = await mealPlanAPI.loadMealPlan();

      if (result.success) {
        const planData = result.data;
        setWeeklyPlan(planData.weeklyPlan || {});
        setActivePlanId(planData.planId || null);
      } else {
        console.warn("❌ loadMealPlan failed:", result.error);
        setWeeklyPlan({});
        setActivePlanId(null);
      }
    } catch (error) {
      console.error("💥 Unexpected error in loadMealPlan:", error);
      Alert.alert("Error", "Failed to load meal plan");
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new AI meal plan
  const createAIMealPlan = async () => {
    try {
      setIsCreatingPlan(true);
      const result = await mealPlanAPI.createAIMealPlan(mealPlanConfig);

      if (result.success) {
        setActivePlanId(result.data.plan_id || result.data.planId);
        Alert.alert("Success!", "Your AI-powered meal plan has been created!", [
          { text: "OK", onPress: () => loadMealPlan() },
        ]);
        setShowConfigModal(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("💥 createAIMealPlan error:", error);
      Alert.alert("Error", error.message || "Failed to create meal plan");
    } finally {
      setIsCreatingPlan(false);
    }
  };

  // Replace selected meal
  const handleReplaceMeal = async () => {
    if (!selectedMeal || !activePlanId || !selectedMealDayTiming) {
      Alert.alert("Error", "Missing selected meal data");
      return;
    }

    try {
      setIsReplacingMeal(true);
      const dayIndex = dayNames.indexOf(selectedMealDayTiming.day);
      const payload = {
        day_of_week: dayIndex,
        meal_timing: selectedMeal.meal_timing,
        meal_order: 1,
        preferences: {
          dietary_category: selectedMeal.dietary_category,
          max_prep_time: selectedMeal.prep_time_minutes || 45,
        },
      };

      const result = await mealPlanAPI.replaceMeal(activePlanId, payload);

      if (result.success) {
        Alert.alert("Success!", "Meal replaced with AI suggestion!");
        setShowMealModal(false);
        await loadMealPlan();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("💥 handleReplaceMeal error:", error);
      Alert.alert("Error", error.message || "Failed to replace meal");
    } finally {
      setIsReplacingMeal(false);
    }
  };

  // Mark meal as favorite
  const handleMarkFavorite = async () => {
    if (!selectedMeal) return;

    try {
      const result = await mealPlanAPI.markMealAsFavorite(
        selectedMeal.template_id
      );

      if (result.success) {
        Alert.alert("Success", "Meal marked as favorite!");
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("💥 handleMarkFavorite error:", error);
      Alert.alert("Error", error.message || "Failed to mark as favorite");
    }
  };

  // Generate shopping list
  const generateShoppingList = async () => {
    if (!activePlanId) {
      Alert.alert("Error", "No active meal plan");
      return;
    }

    try {
      const today = new Date();
      const startOfWeek = new Date(
        today.setDate(today.getDate() - today.getDay())
      );
      const weekStartDate = startOfWeek.toISOString().split("T")[0];

      const result = await mealPlanAPI.generateShoppingList(
        activePlanId,
        weekStartDate
      );

      if (result.success) {
        const itemCount = result.data.items_json
          ? Object.keys(result.data.items_json).length
          : 0;
        const totalCost = result.data.total_estimated_cost || 0;

        Alert.alert(
          "Shopping List Ready!",
          `Items: ${itemCount}, Estimated Cost: $${totalCost.toFixed(2)}`
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("💥 generateShoppingList error:", error);
      Alert.alert("Error", error.message || "Failed to generate shopping list");
    }
  };

  const renderMealCard = (meal: MealTemplate, day: string, timing: string) => {
    const getDifficultyColor = (level?: number) => {
      switch (level) {
        case 1:
          return "#4CAF50";
        case 2:
          return "#FF9800";
        case 3:
          return "#F44336";
        default:
          return "#9E9E9E";
      }
    };

    const getCategoryColor = (category: string) => {
      switch (category) {
        case "VEGETARIAN":
          return "#8BC34A";
        case "VEGAN":
          return "#4CAF50";
        case "KETO":
          return "#9C27B0";
        case "HIGH_PROTEIN":
          return "#FF5722";
        case "MEDITERRANEAN":
          return "#2196F3";
        case "LOW_CARB":
          return "#795548";
        case "GLUTEN_FREE":
          return "#FFC107";
        case "DAIRY_FREE":
          return "#E91E63";
        default:
          return "#607D8B";
      }
    };

    return (
      <TouchableOpacity
        key={`${day}-${timing}-${meal.template_id}`}
        style={[
          styles.mealCard,
          { borderLeftColor: getCategoryColor(meal.dietary_category) },
        ]}
        onPress={() => handleMealPress(meal, day, timing)}
      >
        {meal.image_url && (
          <Image
            source={{ uri: meal.image_url }}
            style={styles.mealImage}
            onError={(error) => console.log("Image load error:", error)}
          />
        )}

        <View style={styles.mealContent}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealName}>{meal.name}</Text>
            <View style={styles.mealBadges}>
              {meal.difficulty_level && (
                <View
                  style={[
                    styles.difficultyBadge,
                    {
                      backgroundColor: getDifficultyColor(
                        meal.difficulty_level
                      ),
                    },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {meal.difficulty_level === 1
                      ? "Easy"
                      : meal.difficulty_level === 2
                      ? "Medium"
                      : "Hard"}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: getCategoryColor(meal.dietary_category) },
                ]}
              >
                <Text style={styles.badgeText}>
                  {meal.dietary_category.replace("_", " ")}
                </Text>
              </View>
            </View>
          </View>

          {meal.description && (
            <Text style={styles.mealDescription} numberOfLines={2}>
              {meal.description}
            </Text>
          )}

          <View style={styles.mealInfo}>
            {meal.prep_time_minutes && (
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.infoText}>
                  {meal.prep_time_minutes} min
                </Text>
              </View>
            )}
            {meal.calories && (
              <View style={styles.infoItem}>
                <Ionicons name="flame-outline" size={16} color="#666" />
                <Text style={styles.infoText}>
                  {Math.round(meal.calories)} cal
                </Text>
              </View>
            )}
            {meal.protein_g && (
              <View style={styles.infoItem}>
                <Ionicons name="fitness-outline" size={16} color="#666" />
                <Text style={styles.infoText}>
                  {Math.round(meal.protein_g)}g protein
                </Text>
              </View>
            )}
          </View>

          <View style={styles.mealActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setSelectedMeal(meal);
                setSelectedMealDayTiming({ day, timing });
                handleReplaceMeal();
              }}
              disabled={isReplacingMeal}
            >
              {isReplacingMeal ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Ionicons name="refresh-outline" size={18} color="#007AFF" />
              )}
              <Text style={styles.actionText}>AI Replace</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setSelectedMeal(meal);
                handleMarkFavorite();
              }}
            >
              <Ionicons name="heart-outline" size={18} color="#FF6B6B" />
              <Text style={styles.actionText}>Favorite</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="star-outline" size={18} color="#FFD700" />
              <Text style={styles.actionText}>Rate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDayPlan = (day: string) => {
    const dayPlan = weeklyPlan[day];
    if (!dayPlan) return null;

    return (
      <View key={day} style={styles.dayContainer}>
        <Text style={styles.dayTitle}>{day}</Text>

        {mealTimings.map((timing) => {
          const meals = dayPlan[timing];
          if (!meals || meals.length === 0) return null;

          return (
            <View key={timing} style={styles.timingSection}>
              <Text style={styles.timingTitle}>
                {timing
                  .replace("_", " ")
                  .toLowerCase()
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
              {meals.map((meal) => renderMealCard(meal, day, timing))}
            </View>
          );
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your AI meal plan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Recommended Menus</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowConfigModal(true)}
          >
            <Ionicons name="settings-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          {activePlanId && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={generateShoppingList}
            >
              <Ionicons name="list-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Compact Day Selector */}
      {Object.keys(weeklyPlan).length > 0 && (
        <View style={styles.daySelector}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daySelectorContent}
          >
            {dayNames.map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  currentDay === day && styles.dayButtonActive,
                ]}
                onPress={() => setCurrentDay(day)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    currentDay === day && styles.dayButtonTextActive,
                  ]}
                >
                  {day.substring(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Meal Plan Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {Object.keys(weeklyPlan).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No AI Meal Plan Yet</Text>
            <Text style={styles.emptyText}>
              Create your personalized AI-powered meal plan based on your
              preferences, goals, and dietary restrictions!
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowConfigModal(true)}
            >
              <Text style={styles.createButtonText}>Create AI Meal Plan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          renderDayPlan(currentDay)
        )}
      </ScrollView>

      {/* Meal Detail Modal */}
      <Modal
        visible={showMealModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMealModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedMeal && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedMeal.name}</Text>
                  <TouchableOpacity onPress={() => setShowMealModal(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {selectedMeal.image_url && (
                    <Image
                      source={{ uri: selectedMeal.image_url }}
                      style={styles.modalImage}
                      onError={(error) =>
                        console.log("Modal image load error:", error)
                      }
                    />
                  )}

                  {selectedMeal.description && (
                    <Text style={styles.modalDescription}>
                      {selectedMeal.description}
                    </Text>
                  )}

                  {/* Nutrition Info */}
                  <View style={styles.nutritionGrid}>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>
                        {Math.round(selectedMeal.calories || 0)}
                      </Text>
                      <Text style={styles.nutritionLabel}>Calories</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>
                        {Math.round(selectedMeal.protein_g || 0)}g
                      </Text>
                      <Text style={styles.nutritionLabel}>Protein</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>
                        {Math.round(selectedMeal.carbs_g || 0)}g
                      </Text>
                      <Text style={styles.nutritionLabel}>Carbs</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>
                        {Math.round(selectedMeal.fats_g || 0)}g
                      </Text>
                      <Text style={styles.nutritionLabel}>Fat</Text>
                    </View>
                  </View>

                  {/* Ingredients */}
                  {selectedMeal.ingredients &&
                    selectedMeal.ingredients.length > 0 && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Ingredients</Text>
                        {selectedMeal.ingredients.map((ingredient, index) => (
                          <Text key={index} style={styles.ingredientText}>
                            • {ingredient.quantity || ""}{" "}
                            {ingredient.unit || ""}{" "}
                            {ingredient.name || ingredient}
                          </Text>
                        ))}
                      </View>
                    )}

                  {/* Instructions */}
                  {selectedMeal.instructions &&
                    selectedMeal.instructions.length > 0 && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Instructions</Text>
                        {selectedMeal.instructions.map((instruction, index) => (
                          <Text key={index} style={styles.instructionText}>
                            {instruction.step || index + 1}.{" "}
                            {instruction.text || instruction}
                          </Text>
                        ))}
                      </View>
                    )}

                  {/* Allergens */}
                  {selectedMeal.allergens &&
                    selectedMeal.allergens.length > 0 && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Allergens</Text>
                        <View style={styles.allergenContainer}>
                          {selectedMeal.allergens.map((allergen, index) => (
                            <View key={index} style={styles.allergenBadge}>
                              <Text style={styles.allergenText}>
                                {allergen}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalActionButton}
                    onPress={handleReplaceMeal}
                    disabled={isReplacingMeal}
                  >
                    {isReplacingMeal ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                      <Ionicons
                        name="refresh-outline"
                        size={20}
                        color="#007AFF"
                      />
                    )}
                    <Text style={styles.modalActionText}>AI Replace</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalActionButton}
                    onPress={handleMarkFavorite}
                  >
                    <Ionicons name="heart-outline" size={20} color="#FF6B6B" />
                    <Text style={styles.modalActionText}>Favorite</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Configuration Modal */}
      <Modal
        visible={showConfigModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConfigModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Meal Plan Settings</Text>
              <TouchableOpacity onPress={() => setShowConfigModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.configSectionTitle}>
                🤖 AI will create your personalized meal plan
              </Text>
              <Text style={styles.configDescription}>
                Based on your profile, preferences, and goals, our AI will
                generate a complete weekly meal plan with recipes, nutrition
                info, and shopping lists.
              </Text>

              <Text style={styles.configSectionTitle}>Meal Structure</Text>

              <View style={styles.configOption}>
                <Text style={styles.configLabel}>Meals per day</Text>
                <View style={styles.configButtons}>
                  {[2, 3, 4, 5].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.configButton,
                        mealPlanConfig.meals_per_day === num &&
                          styles.configButtonActive,
                      ]}
                      onPress={() =>
                        setMealPlanConfig((prev) => ({
                          ...prev,
                          meals_per_day: num,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.configButtonText,
                          mealPlanConfig.meals_per_day === num &&
                            styles.configButtonTextActive,
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.configOption}>
                <Text style={styles.configLabel}>Snacks per day</Text>
                <View style={styles.configButtons}>
                  {[0, 1, 2].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.configButton,
                        mealPlanConfig.snacks_per_day === num &&
                          styles.configButtonActive,
                      ]}
                      onPress={() =>
                        setMealPlanConfig((prev) => ({
                          ...prev,
                          snacks_per_day: num,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.configButtonText,
                          mealPlanConfig.snacks_per_day === num &&
                            styles.configButtonTextActive,
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.configOption}>
                <Text style={styles.configLabel}>Change meals every</Text>
                <View style={styles.configButtons}>
                  {[
                    { value: 1, label: "Daily" },
                    { value: 3, label: "3 days" },
                    { value: 7, label: "Weekly" },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.configButton,
                        mealPlanConfig.rotation_frequency_days ===
                          option.value && styles.configButtonActive,
                      ]}
                      onPress={() =>
                        setMealPlanConfig((prev) => ({
                          ...prev,
                          rotation_frequency_days: option.value,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.configButtonText,
                          mealPlanConfig.rotation_frequency_days ===
                            option.value && styles.configButtonTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => setShowConfigModal(false)}
              >
                <Text style={styles.modalActionText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionButton, styles.primaryButton]}
                onPress={createAIMealPlan}
                disabled={isCreatingPlan}
              >
                {isCreatingPlan ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text
                    style={[styles.modalActionText, styles.primaryButtonText]}
                  >
                    Create AI Plan
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  headerActions: {
    flexDirection: "row",
    gap: 15,
  },
  headerButton: {
    padding: 5,
  },
  // Enhanced Compact Day Selector Styles
  daySelector: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 4,
  },
  daySelectorContent: {
    paddingHorizontal: 12,
    alignItems: "center",
  },
  dayButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 2,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 44,
    height: 28,
  },
  dayButtonActive: {
    backgroundColor: "#007AFF",
  },
  dayButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
  },
  dayButtonTextActive: {
    color: "white",
  },
  content: {
    flex: 1,
  },
  dayContainer: {
    padding: 15,
  },
  dayTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  timingSection: {
    marginBottom: 25,
  },
  timingTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#007AFF",
  },
  mealCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    overflow: "hidden",
  },
  mealImage: {
    width: "100%",
    height: 150,
  },
  mealContent: {
    padding: 15,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  mealName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  mealBadges: {
    flexDirection: "row",
    gap: 5,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
  mealDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  mealInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: "#666",
  },
  mealActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 15,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionText: {
    fontSize: 12,
    color: "#666",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#333",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  createButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 12,
    width: "90%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalBody: {
    padding: 20,
  },
  modalImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },
  modalDescription: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginBottom: 20,
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
  },
  nutritionItem: {
    alignItems: "center",
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
  },
  nutritionLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  ingredientText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
  instructionText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
    lineHeight: 22,
  },
  allergenContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  allergenBadge: {
    backgroundColor: "#FFE5E5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  allergenText: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  modalActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  primaryButton: {
    backgroundColor: "#007AFF",
  },
  primaryButtonText: {
    color: "white",
  },
  configSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  configDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    lineHeight: 20,
  },
  configOption: {
    marginBottom: 25,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 10,
    color: "#333",
  },
  configButtons: {
    flexDirection: "row",
    gap: 10,
  },
  configButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  configButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  // Added or adjusted from the previous context to ensure no errors
  configButtonText: {
    // Ensure this style exists
    color: "#333",
  },
  configButtonTextActive: {
    // Ensure this style exists
    color: "white",
  },
});
