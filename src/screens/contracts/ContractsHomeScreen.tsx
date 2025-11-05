import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { ContractsStackParamList } from "@/navigation/types";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const FILTERS = [
  "All",
  "Active",
  "Pending Signature",
  "Completed",
  "Disputed",
] as const;

type ContractItem = {
  id: string;
  counterparty: string;
  value: string;
  status: "Active" | "Pending Signature" | "Completed" | "Disputed";
  updatedAt: string;
};

const STATUS_COLOR: Record<ContractItem["status"], string> = {
  Active: palette.primaryBlue,
  "Pending Signature": palette.warningYellow,
  Completed: palette.accentGreen,
  Disputed: palette.errorRed,
};

const mockContracts: ContractItem[] = [
  {
    id: "CT-1209",
    counterparty: "Kigali Imports Ltd.",
    value: "USDC 25,000",
    status: "Active",
    updatedAt: "Oct 27",
  },
  {
    id: "CT-1210",
    counterparty: "Lagos Commodities",
    value: "USDC 12,400",
    status: "Pending Signature",
    updatedAt: "Oct 26",
  },
  {
    id: "CT-1188",
    counterparty: "Accra Textiles Co.",
    value: "USDC 42,350",
    status: "Completed",
    updatedAt: "Oct 24",
  },
  {
    id: "CT-1179",
    counterparty: "Cairo Metals",
    value: "USDC 16,870",
    status: "Disputed",
    updatedAt: "Oct 19",
  },
];

export const ContractsHomeScreen: React.FC = () => {
  const navigation =
    useNavigation<
      StackNavigationProp<ContractsStackParamList, "ContractsHome">
    >();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const summary = useMemo(
    () =>
      mockContracts.reduce(
        (acc, contract) => {
          acc.total += 1;
          if (contract.status === "Active") acc.active += 1;
          if (contract.status === "Completed") acc.completed += 1;
          return acc;
        },
        { total: 0, active: 0, completed: 0 }
      ),
    []
  );

  const filteredContracts = useMemo(() => {
    return mockContracts.filter((contract) => {
      const matchesSearch =
        contract.counterparty.toLowerCase().includes(search.toLowerCase()) ||
        contract.id.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All" || contract.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [filter, search]);

  return (
    <Screen>
      <View style={styles.headerStats}>
        <View style={styles.statCard}>
          <Text variant="subtitle" color={palette.primaryBlue}>
            Total Contracts
          </Text>
          <Text variant="title">{summary.total}</Text>
        </View>
        <View style={styles.statCard}>
          <Text variant="subtitle" color={palette.primaryBlue}>
            Active
          </Text>
          <Text variant="title">{summary.active}</Text>
        </View>
        <View style={styles.statCard}>
          <Text variant="subtitle" color={palette.primaryBlue}>
            Completed
          </Text>
          <Text variant="title">{summary.completed}</Text>
        </View>
      </View>

      <TextInput
        placeholder="Search contract ID or counterparty"
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
        placeholderTextColor={palette.neutralMid}
      />

      <View style={styles.filterRow}>
        {FILTERS.map((item) => (
          <Button
            key={item}
            label={item}
            variant={filter === item ? "primary" : "outline"}
            onPress={() => setFilter(item)}
            style={styles.filterButton}
          />
        ))}
      </View>

      <View style={styles.actionsRow}>
        <Button
          label="New Contract"
          onPress={() => navigation.navigate("NewContract")}
          style={styles.actionButton}
        />
        <Button
          label="Document Center"
          variant="outline"
          onPress={() => navigation.navigate("DocumentCenter")}
          style={styles.actionButton}
        />
      </View>

      <FlatList
        data={filteredContracts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("ContractDetail", { id: item.id })
            }
            style={({ pressed }) => [
              styles.contractCard,
              pressed && styles.contractCardPressed,
            ]}
          >
            <View style={styles.contractHeader}>
              <Text variant="subtitle" color={palette.primaryBlue}>
                {item.id}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: STATUS_COLOR[item.status] },
                ]}
              />
            </View>
            <Text style={styles.counterparty}>{item.counterparty}</Text>
            <View style={styles.contractFooter}>
              <Text color={palette.primaryBlue} style={styles.contractValue}>
                {item.value}
              </Text>
              <View style={styles.footerMeta}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={16}
                  color={palette.neutralMid}
                />
                <Text variant="small" color={palette.neutralMid}>
                  Updated {item.updatedAt}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text color={palette.neutralMid}>
            No contracts match your filters.
          </Text>
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginHorizontal: 4,
    gap: spacing.xs,
  },
  searchInput: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: palette.white,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  filterButton: {
    minWidth: 110,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  contractCard: {
    backgroundColor: palette.white,
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  contractCardPressed: {
    opacity: 0.85,
  },
  contractHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  counterparty: {
    color: palette.neutralDark,
    fontWeight: "500",
  },
  contractFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contractValue: {
    fontWeight: "700",
  },
  footerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
