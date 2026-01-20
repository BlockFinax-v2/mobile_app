import { Text } from "@/components/ui/Text";
import {
  getAllSupportedTokens,
  SupportedNetworkId,
  useWallet,
  WalletNetwork,
} from "@/contexts/WalletContext";
import { formatBalanceForUI } from "@/utils/tokenUtils";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance?: string;
  usdValue?: number;
}

interface TokenSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectToken: (token: TokenInfo) => void;
  selectedToken?: TokenInfo;
  networkId: SupportedNetworkId;
  showBalances?: boolean;
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  visible,
  onClose,
  onSelectToken,
  selectedToken,
  networkId,
  showBalances = true,
}) => {
  const { balances, selectedNetwork } = useWallet();

  const availableTokens = React.useMemo(() => {
    return getAllSupportedTokens(networkId);
  }, [networkId]);

  const tokensWithBalances = React.useMemo(() => {
    return availableTokens.map((token) => {
      let balance = "0";
      let usdValue = 0;

      if (showBalances && selectedNetwork.id === networkId) {
        if (token.address === "0x0000000000000000000000000000000000000000") {
          // Native token - use proper formatting for small amounts
          balance = formatBalanceForUI(balances.primary);
          usdValue = balances.primaryUsd;
        } else {
          // ERC-20 token
          const tokenBalance = balances.tokens.find(
            (t) => t.address.toLowerCase() === token.address.toLowerCase()
          );
          balance = tokenBalance?.balance || "0";
          usdValue = tokenBalance?.usdValue || 0;
        }
      }

      return {
        ...token,
        balance,
        usdValue,
      };
    });
  }, [availableTokens, balances, networkId, selectedNetwork.id, showBalances]);

  const handleTokenSelect = (token: TokenInfo) => {
    onSelectToken(token);
    onClose();
  };

  const getTokenIcon = (symbol: string) => {
    switch (symbol.toUpperCase()) {
      case "ETH":
        return "ethereum";
      case "MATIC":
        return "triangle";
      case "BNB":
        return "alpha-b-circle";
      case "USDC":
        return "currency-usd-circle";
      case "USDT":
        return "currency-usd";
      case "DAI":
        return "alpha-d-circle";
      case "BUSD":
        return "currency-usd-circle-outline";
      case "USDB":
        return "currency-usd-circle-outline";
      case "USDBC":
        return "currency-usd-circle-outline";
      default:
        return "currency-usd-circle-outline";
    }
  };

  const getTokenColor = (symbol: string) => {
    switch (symbol.toUpperCase()) {
      case "ETH":
        return "#627EEA";
      case "MATIC":
        return "#8247E5";
      case "BNB":
        return "#F3BA2F";
      case "USDC":
        return "#2775CA";
      case "USDT":
        return "#26A17B";
      case "DAI":
        return "#F5AC37";
      case "BUSD":
        return "#F0B90B";
      case "USDB":
        return "#0052FF";
      case "USDBC":
        return "#0052FF";
      default:
        return palette.neutralMid;
    }
  };

  const renderTokenItem = (token: TokenInfo) => {
    const isSelected = selectedToken?.address === token.address;
    const icon = getTokenIcon(token.symbol);
    const color = getTokenColor(token.symbol);
    const hasBalance = parseFloat(token.balance || "0") > 0;

    return (
      <Pressable
        key={token.address}
        style={[styles.tokenItem, isSelected && styles.selectedTokenItem]}
        onPress={() => handleTokenSelect(token)}
      >
        <View style={styles.tokenLeft}>
          <View style={[styles.tokenIcon, { backgroundColor: color }]}>
            <MaterialCommunityIcons
              name={icon as any}
              size={20}
              color={palette.white}
            />
          </View>
          <View style={styles.tokenInfo}>
            <Text style={styles.tokenSymbol}>{token.symbol || 'Unknown'}</Text>
            <Text style={styles.tokenName}>{token.name || 'Unknown Token'}</Text>
          </View>
        </View>

        {showBalances && (
          <View style={styles.tokenRight}>
            <View style={styles.balanceInfo}>
              <Text
                style={[styles.tokenBalance, !hasBalance && styles.zeroBalance]}
              >
                {formatBalanceForUI(parseFloat(token.balance || "0"))}
              </Text>
              {token.usdValue && token.usdValue > 0 && (
                <Text style={styles.tokenUsdValue}>
                  ${token.usdValue.toFixed(2)}
                </Text>
              )}
            </View>
            {isSelected && (
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={palette.successGreen}
              />
            )}
          </View>
        )}

        {!showBalances && isSelected && (
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color={palette.successGreen}
          />
        )}
      </Pressable>
    );
  };

  // Separate tokens into native and stablecoins
  const nativeTokens = tokensWithBalances.filter(
    (token) => token.address === "0x0000000000000000000000000000000000000000"
  );

  const stablecoins = tokensWithBalances.filter(
    (token) => token.address !== "0x0000000000000000000000000000000000000000"
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons
              name="coins"
              size={24}
              color={palette.primaryBlue}
            />
            <Text variant="title">Select Token</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons
              name="close"
              size={24}
              color={palette.neutralDark}
            />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Native Tokens */}
          {nativeTokens.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="ethereum"
                  size={18}
                  color={palette.primaryBlue}
                />
                <Text style={styles.sectionTitle}>Native Token</Text>
              </View>
              {nativeTokens.map(renderTokenItem)}
            </View>
          )}

          {/* Stablecoins */}
          {stablecoins.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="currency-usd"
                  size={18}
                  color={palette.successGreen}
                />
                <Text style={styles.sectionTitle}>Stablecoins</Text>
              </View>
              {stablecoins.map(renderTokenItem)}
            </View>
          )}

          {/* Info Footer */}
          <View style={styles.infoFooter}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color={palette.neutralMid}
            />
            <Text style={styles.infoText}>
              Only tokens supported on this network are shown
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralLighter,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  tokenItem: {
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedTokenItem: {
    borderColor: palette.primaryBlue,
    backgroundColor: palette.primaryBlue + "08",
  },
  tokenLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  tokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  tokenInfo: {
    flex: 1,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  tokenName: {
    fontSize: 12,
    color: palette.neutralMid,
    marginTop: 2,
  },
  tokenRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  balanceInfo: {
    alignItems: "flex-end",
  },
  tokenBalance: {
    fontSize: 14,
    fontWeight: "500",
    color: palette.neutralDark,
  },
  zeroBalance: {
    color: palette.neutralMid,
  },
  tokenUsdValue: {
    fontSize: 12,
    color: palette.neutralMid,
    marginTop: 2,
  },
  infoFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.lg,
    backgroundColor: palette.surface,
  },
  infoText: {
    fontSize: 12,
    color: palette.neutralMid,
    flex: 1,
  },
});
