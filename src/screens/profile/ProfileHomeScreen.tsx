import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import React, { useState } from "react";
import { StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

export const ProfileHomeScreen: React.FC = () => {
  const [publicProfile, setPublicProfile] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "How others see you",
    firstName: "John",
    lastName: "Doe",
    email: "john@company.com",
    phone: "+1 (555) 123-4567",
    website: "https://example.com",
    companyName: "Acme Corp",
    jobTitle: "Senior Developer",
    taxId: "Business tax identification",
    country: "United States",
    city: "New York",
    streetAddress: "123 Main Street",
    postalCode: "10001",
    idNumber: "Document number",
    linkedin: "https://linkedin.com/in/username",
    twitter: "https://twitter.com/username",
    bio: "Tell others about yourself...",
  });

  return (
    <Screen preset="scroll">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerSection}>
          <MaterialCommunityIcons
            name="account"
            size={24}
            color={palette.neutralDark}
          />
          <Text variant="title" style={styles.sectionTitle}>
            Profile Management
          </Text>
        </View>

        {/* Profile Picture */}
        <View style={styles.section}>
          <Text variant="subtitle" style={styles.sectionLabel}>
            Profile Picture
          </Text>
          <TouchableOpacity style={styles.uploadAvatar}>
            <MaterialCommunityIcons
              name="account-circle-outline"
              size={48}
              color={palette.neutralMid}
            />
            <View style={styles.uploadInfo}>
              <View style={styles.uploadButton}>
                <MaterialCommunityIcons
                  name="upload"
                  size={18}
                  color={palette.primaryBlue}
                />
                <Text color={palette.primaryBlue} style={styles.uploadText}>
                  Upload Avatar
                </Text>
              </View>
              <Text color={palette.neutralMid} style={styles.uploadHint}>
                Max file size: 2MB. Supported formats: JPG, PNG, GIF
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="account"
              size={20}
              color={palette.neutralDark}
            />
            <Text variant="subtitle" style={styles.sectionLabel}>
              Basic Information
            </Text>
          </View>

          <Input
            label="Display Name"
            value={formData.displayName}
            onChangeText={(text) =>
              setFormData({ ...formData, displayName: text })
            }
            placeholder="How others see you"
          />

          <Input
            label="First Name"
            value={formData.firstName}
            onChangeText={(text) =>
              setFormData({ ...formData, firstName: text })
            }
            placeholder="John"
          />

          <Input
            label="Last Name"
            value={formData.lastName}
            onChangeText={(text) =>
              setFormData({ ...formData, lastName: text })
            }
            placeholder="Doe"
          />

          <Input
            label="Date of Birth"
            value=""
            placeholder="Select date"
            editable={false}
          />

          <Input
            label="Nationality"
            value=""
            placeholder="Country of citizenship"
            editable={false}
          />
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="email-outline"
              size={20}
              color={palette.neutralDark}
            />
            <Text variant="subtitle" style={styles.sectionLabel}>
              Contact Information
            </Text>
          </View>

          <Input
            label="Email Address"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="john@company.com"
            keyboardType="email-address"
          />

          <Input
            label="Phone Number"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="+1 (555) 123-4567"
            keyboardType="phone-pad"
          />

          <Input
            label="Website"
            value={formData.website}
            onChangeText={(text) => setFormData({ ...formData, website: text })}
            placeholder="https://example.com"
            keyboardType="url"
          />
        </View>

        {/* Company Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="office-building"
              size={20}
              color={palette.neutralDark}
            />
            <Text variant="subtitle" style={styles.sectionLabel}>
              Company Information
            </Text>
          </View>

          <Input
            label="Company Name"
            value={formData.companyName}
            onChangeText={(text) =>
              setFormData({ ...formData, companyName: text })
            }
            placeholder="Acme Corp"
          />

          <Input
            label="Job Title"
            value={formData.jobTitle}
            onChangeText={(text) =>
              setFormData({ ...formData, jobTitle: text })
            }
            placeholder="Senior Developer"
          />

          <Input
            label="Tax ID / Business Registration"
            value={formData.taxId}
            onChangeText={(text) => setFormData({ ...formData, taxId: text })}
            placeholder="Business tax identification"
          />
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={20}
              color={palette.neutralDark}
            />
            <Text variant="subtitle" style={styles.sectionLabel}>
              Location
            </Text>
          </View>

          <Input
            label="Country"
            value={formData.country}
            onChangeText={(text) => setFormData({ ...formData, country: text })}
            placeholder="United States"
          />

          <Input
            label="City"
            value={formData.city}
            onChangeText={(text) => setFormData({ ...formData, city: text })}
            placeholder="New York"
          />

          <Input
            label="Street Address"
            value={formData.streetAddress}
            onChangeText={(text) =>
              setFormData({ ...formData, streetAddress: text })
            }
            placeholder="123 Main Street"
          />

          <Input
            label="Postal Code"
            value={formData.postalCode}
            onChangeText={(text) =>
              setFormData({ ...formData, postalCode: text })
            }
            placeholder="10001"
          />
        </View>

        {/* Identity Verification */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={20}
              color={palette.neutralDark}
            />
            <Text variant="subtitle" style={styles.sectionLabel}>
              Identity Verification
            </Text>
          </View>

          <Input
            label="ID Type"
            value=""
            placeholder="Select ID type"
            editable={false}
          />

          <Input
            label="ID Number"
            value={formData.idNumber}
            onChangeText={(text) =>
              setFormData({ ...formData, idNumber: text })
            }
            placeholder="Document number"
          />
        </View>

        {/* Social Links */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="web"
              size={20}
              color={palette.neutralDark}
            />
            <Text variant="subtitle" style={styles.sectionLabel}>
              Social Links
            </Text>
          </View>

          <Input
            label="LinkedIn"
            value={formData.linkedin}
            onChangeText={(text) =>
              setFormData({ ...formData, linkedin: text })
            }
            placeholder="https://linkedin.com/in/username"
          />

          <Input
            label="Twitter"
            value={formData.twitter}
            onChangeText={(text) => setFormData({ ...formData, twitter: text })}
            placeholder="https://twitter.com/username"
          />

          <Input
            label="Bio"
            value={formData.bio}
            onChangeText={(text) => setFormData({ ...formData, bio: text })}
            placeholder="Tell others about yourself..."
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Public Profile Toggle */}
        <View style={styles.toggleSection}>
          <View style={styles.toggleContent}>
            <Text variant="subtitle">Public Profile</Text>
            <Text color={palette.neutralMid} style={styles.toggleDescription}>
              Allow others to view your profile information
            </Text>
          </View>
          <Switch
            value={publicProfile}
            onValueChange={setPublicProfile}
            trackColor={{
              false: palette.neutralLight,
              true: palette.primaryBlue,
            }}
            thumbColor={palette.white}
          />
        </View>

        {/* Action Button */}
        <Button
          label="Create Profile"
          onPress={() => {}}
          style={styles.createButton}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "600",
  },
  uploadAvatar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: palette.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  uploadInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: "600",
  },
  uploadHint: {
    fontSize: 12,
  },
  toggleSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: palette.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  toggleContent: {
    flex: 1,
    gap: spacing.xs,
  },
  toggleDescription: {
    fontSize: 14,
  },
  createButton: {
    marginTop: spacing.md,
  },
});
