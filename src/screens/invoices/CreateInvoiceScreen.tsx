import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

interface InvoiceItem {
  description: string;
  quantity: string;
  rate: string;
  amount: string;
}

export const CreateInvoiceScreen: React.FC = () => {
  const navigation = useNavigation();

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientWallet, setClientWallet] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: "1", rate: "", amount: "0" },
  ]);
  const [notes, setNotes] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("USDC");

  const currencies = ["USDC", "USDT", "WETH", "WBTC"];

  const addItem = () => {
    setItems([
      ...items,
      { description: "", quantity: "1", rate: "", amount: "0" },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (
    index: number,
    field: keyof InvoiceItem,
    value: string,
  ) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;

    // Calculate amount when quantity or rate changes
    if (field === "quantity" || field === "rate") {
      const quantity = parseFloat(updatedItems[index].quantity) || 0;
      const rate = parseFloat(updatedItems[index].rate) || 0;
      updatedItems[index].amount = (quantity * rate).toFixed(2);
    }

    setItems(updatedItems);
  };

  const calculateTotal = () => {
    return items.reduce(
      (total, item) => total + parseFloat(item.amount || "0"),
      0,
    );
  };

  const handleCreateInvoice = () => {
    if (!clientName || !clientEmail || !invoiceNumber || !dueDate) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const total = calculateTotal();
    if (total <= 0) {
      Alert.alert("Error", "Invoice total must be greater than 0");
      return;
    }

    // Here you would typically save the invoice and potentially send it
    Alert.alert(
      "Invoice Created",
      `Invoice #${invoiceNumber} for ${total.toFixed(2)} ${selectedCurrency} has been created successfully.`,
      [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  return (
    <Screen preset="scroll">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={palette.primaryBlue}
            />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text variant="title">Create Invoice</Text>
            <Text color={palette.neutralMid} style={styles.subtitle}>
              Generate a professional invoice with crypto payment options
            </Text>
          </View>
        </View>

        {/* Client Information */}
        <View style={styles.section}>
          <Text variant="subtitle" style={styles.sectionTitle}>
            Client Information
          </Text>
          <View style={styles.formGroup}>
            <Input
              label="Client Name *"
              value={clientName}
              onChangeText={setClientName}
              placeholder="Enter client or company name"
            />
            <Input
              label="Client Email *"
              value={clientEmail}
              onChangeText={setClientEmail}
              placeholder="client@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Client Wallet Address"
              value={clientWallet}
              onChangeText={setClientWallet}
              placeholder="0x... (optional)"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <Text variant="subtitle" style={styles.sectionTitle}>
            Invoice Details
          </Text>
          <View style={styles.formGroup}>
            <Input
              label="Invoice Number *"
              value={invoiceNumber}
              onChangeText={setInvoiceNumber}
              placeholder="INV-001"
            />
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Input
                  label="Issue Date"
                  value={issueDate}
                  onChangeText={setIssueDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.dateField}>
                <Input
                  label="Due Date *"
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Currency Selection */}
        <View style={styles.section}>
          <Text variant="subtitle" style={styles.sectionTitle}>
            Payment Currency
          </Text>
          <View style={styles.currencyContainer}>
            {currencies.map((currency) => (
              <TouchableOpacity
                key={currency}
                style={[
                  styles.currencyOption,
                  selectedCurrency === currency && styles.selectedCurrency,
                ]}
                onPress={() => setSelectedCurrency(currency)}
              >
                <Text
                  style={[
                    styles.currencyText,
                    selectedCurrency === currency &&
                      styles.selectedCurrencyText,
                  ]}
                >
                  {currency}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Invoice Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="subtitle" style={styles.sectionTitle}>
              Invoice Items
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={addItem}>
              <MaterialCommunityIcons
                name="plus"
                size={20}
                color={palette.primaryBlue}
              />
              <Text style={styles.addButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>Item {index + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeItem(index)}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={20}
                      color={palette.errorRed}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <Input
                label="Description"
                value={item.description}
                onChangeText={(value) =>
                  updateItem(index, "description", value)
                }
                placeholder="Describe the service or product"
              />

              <View style={styles.itemRow}>
                <View style={styles.quantityField}>
                  <Input
                    label="Qty"
                    value={item.quantity}
                    onChangeText={(value) =>
                      updateItem(index, "quantity", value)
                    }
                    placeholder="1"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.rateField}>
                  <Input
                    label={`Rate (${selectedCurrency})`}
                    value={item.rate}
                    onChangeText={(value) => updateItem(index, "rate", value)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.amountField}>
                  <Text style={styles.amountLabel}>Amount</Text>
                  <Text style={styles.amountValue}>
                    {parseFloat(item.amount || "0").toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {/* Total */}
          <View style={styles.totalCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                {calculateTotal().toFixed(2)} {selectedCurrency}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Input
            label="Notes (Optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any additional notes or payment terms..."
            multiline
            numberOfLines={3}
            style={styles.notesInput}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            label="Save as Draft"
            variant="outline"
            onPress={() => {
              Alert.alert("Draft Saved", "Invoice has been saved as draft");
              navigation.goBack();
            }}
            style={styles.draftButton}
          />
          <Button
            label="Create & Send"
            onPress={handleCreateInvoice}
            style={styles.createButton}
          />
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
    marginTop: -spacing.sm,
  },
  headerContent: {
    flex: 1,
    gap: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  formGroup: {
    gap: spacing.md,
  },
  dateRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  dateField: {
    flex: 1,
  },
  currencyContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  currencyOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: palette.white,
  },
  selectedCurrency: {
    borderColor: palette.primaryBlue,
    backgroundColor: "#EBF8FF",
  },
  currencyText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  selectedCurrencyText: {
    color: palette.primaryBlue,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.primaryBlue,
  },
  itemCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  removeButton: {
    padding: spacing.xs,
  },
  itemRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-end",
  },
  quantityField: {
    flex: 1,
  },
  rateField: {
    flex: 2,
  },
  amountField: {
    flex: 1.5,
    alignItems: "flex-end",
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.neutralMid,
    marginBottom: spacing.xs,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.primaryBlue,
    textAlign: "right",
  },
  totalCard: {
    backgroundColor: palette.primaryBlue + "10",
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.primaryBlue + "20",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.primaryBlue,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  draftButton: {
    flex: 1,
  },
  createButton: {
    flex: 1,
  },
});
