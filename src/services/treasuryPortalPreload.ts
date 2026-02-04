import { Storage } from "@/utils/storage";
import { ethers } from "ethers";
import {
  stakingService,
  DIAMOND_ADDRESSES,
  AllStakesInfo,
  StakingConfig,
  Proposal,
  DAOStats,
  DAOConfig,
} from "@/services/stakingService";
import {
  getAllSupportedTokens,
  SupportedNetworkId,
  WalletNetwork,
} from "@/contexts/WalletContext";

type TokenBalance = { symbol: string; balance?: string };

type WalletBalances = {
  tokens?: TokenBalance[];
};

type PreloadParams = {
  address: string;
  selectedNetwork: WalletNetwork;
  getNetworkById: (id: SupportedNetworkId) => WalletNetwork | undefined;
  balances?: WalletBalances | null;
  displayBalances?: WalletBalances | null;
};

const POOL_READ_ABI = [
  "function getTotalStakedUSD() view returns (uint256)",
  "function getStakers() view returns (address[])",
  "function getAllStakesForUser(address staker) view returns (address[] tokens,uint256[] amounts,uint256[] usdEquivalents,bool[] isFinancierFlags,uint256[] deadlines,uint256[] pendingRewards,uint256 totalUsdValue)",
];

export const preloadTreasuryPortalData = async ({
  address,
  selectedNetwork,
  getNetworkById,
  balances,
  displayBalances,
}: PreloadParams): Promise<void> => {
  if (!address || !selectedNetwork) return;

  const getCacheKey = (suffix: string) =>
    `treasury_portal_${address}_${selectedNetwork.chainId}_${suffix}`;

  let aggregatedUserTotalUSD = 0;
  let aggregatedVotingPower = 0;
  let votingNetworksCount = 0;
  let aggregatedGlobalPoolUSD = 0;
  const aggregatedStakedBySymbol: Record<string, number> = {};

  const aggregationOrder: SupportedNetworkId[] = [
    "ethereum-sepolia",
    "lisk-sepolia",
    "base-sepolia",
  ];

  const tokenMetaMap: Record<string, { symbol: string }> = {};
  aggregationOrder.forEach((id) => {
    const tokens = getAllSupportedTokens(id);
    tokens.forEach((t) => {
      tokenMetaMap[t.address.toLowerCase()] = { symbol: t.symbol };
    });
  });

  const originalNetwork = selectedNetwork;

  try {
    for (const networkId of aggregationOrder) {
      const network = getNetworkById(networkId);
      if (!network) continue;

      stakingService.setNetwork(network.chainId, network as WalletNetwork);

      const stakes = await stakingService.getAllStakesForUser(address);
      const networkTotal = parseFloat(stakes.totalUsdValue || "0");
      if (!Number.isNaN(networkTotal)) {
        aggregatedUserTotalUSD += networkTotal;
      }

      stakes.tokens.forEach((tokenAddr, idx) => {
        const meta = tokenMetaMap[tokenAddr.toLowerCase()];
        const symbol = meta?.symbol || "TOKEN";
        const amount = parseFloat(stakes.amounts[idx] || "0");
        if (!Number.isNaN(amount)) {
          aggregatedStakedBySymbol[symbol] =
            (aggregatedStakedBySymbol[symbol] || 0) + amount;
        }
      });

      const diamondAddress = DIAMOND_ADDRESSES[network.chainId];
      if (diamondAddress) {
        try {
          const provider = new ethers.providers.JsonRpcProvider(network.rpcUrl);
          const poolReader = new ethers.Contract(
            diamondAddress,
            POOL_READ_ABI,
            provider,
          );

          let networkPoolUSD = 0;
          try {
            const totalStakedUSD = await poolReader.getTotalStakedUSD();
            networkPoolUSD = parseFloat(
              ethers.utils.formatUnits(totalStakedUSD, 6),
            );
          } catch (innerErr) {
            try {
              const stakers: string[] = await poolReader.getStakers();
              let summed = 0;
              for (const staker of stakers) {
                const stakeData = await poolReader.getAllStakesForUser(staker);
                summed += parseFloat(
                  ethers.utils.formatUnits(stakeData.totalUsdValue, 6),
                );
              }
              networkPoolUSD = summed;
            } catch (fallbackErr) {
              console.warn("Global pool fallback failed for", networkId, fallbackErr);
            }
          }

          if (!Number.isNaN(networkPoolUSD)) {
            aggregatedGlobalPoolUSD += networkPoolUSD;
          }
        } catch (err) {
          console.warn("Global pool lookup failed for", networkId, err);
        }
      }

      try {
        const provider = new ethers.providers.JsonRpcProvider(network.rpcUrl);
        const diamondAddress = DIAMOND_ADDRESSES[network.chainId];
        if (diamondAddress) {
          const stakeContract = new ethers.Contract(
            diamondAddress,
            [
              "function getStake(address staker) view returns (uint256 amount, uint256 timestamp, uint256 votingPower, bool active, uint256 pendingRewards, uint256 timeUntilUnlock, uint256 deadline, bool financierStatus)",
            ],
            provider,
          );
          const stake = await stakeContract.getStake(address);
          const vp = parseFloat(ethers.utils.formatUnits(stake.votingPower, 6));
          if (!Number.isNaN(vp)) {
            aggregatedVotingPower += vp;
            votingNetworksCount += 1;
          }
        }
      } catch (err) {
        console.warn("Voting power lookup failed for", networkId, err);
      }
    }
  } finally {
    stakingService.setNetwork(
      originalNetwork.chainId,
      originalNetwork as WalletNetwork,
    );
  }

  stakingService.setNetwork(
    selectedNetwork.chainId,
    selectedNetwork as WalletNetwork,
  );
  let allStakesInfo: AllStakesInfo | null = null;
  let stakingConfig: StakingConfig | null = null;
  let currentAPR = 0;
  let isFinancier = false;
  let proposals: Proposal[] = [];
  let daoStats: DAOStats | null = null;
  let daoConfig: DAOConfig | null = null;

  try {
    allStakesInfo = await stakingService.getAllStakesForUser(address);
  } catch (error) {
    console.warn("Failed to load current network stakes", error);
  }

  try {
    stakingConfig = await stakingService.getStakingConfig();
    currentAPR =
      (stakingConfig?.currentRewardRate ?? 0) > 0
        ? stakingConfig?.currentRewardRate ?? 0
        : stakingConfig?.initialApr ?? 0;
  } catch (error) {
    console.warn("Failed to load staking config", error);
  }

  try {
    isFinancier = await stakingService.isFinancier(address);
  } catch (error) {
    console.warn("Failed to load financier status", error);
  }

  try {
    const [allProposals, stats, config] = await Promise.allSettled([
      stakingService.getAllProposals(),
      stakingService.getDAOStats(),
      stakingService.getDAOConfig(),
    ]);

    proposals = allProposals.status === "fulfilled" ? allProposals.value : [];
    daoStats =
      stats.status === "fulfilled"
        ? stats.value
        : {
          totalProposals: 0,
          activeProposals: 0,
          passedProposals: 0,
          executedProposals: 0,
        };
    daoConfig = config.status === "fulfilled" ? config.value : null;
  } catch (error) {
    console.warn("Failed to load governance data", error);
  }

  const poolTotal = aggregatedGlobalPoolUSD || aggregatedUserTotalUSD;
  const votingPowerPercentage =
    votingNetworksCount > 0
      ? (aggregatedVotingPower / votingNetworksCount) * 100
      : 0;

  const walletTokens = displayBalances?.tokens?.length
    ? displayBalances.tokens
    : balances?.tokens;
  const walletBalanceMap: Record<string, number> = {};
  if (walletTokens?.length) {
    walletTokens.forEach((t) => {
      const amt = parseFloat(t.balance || "0");
      if (!Number.isNaN(amt)) {
        walletBalanceMap[t.symbol] = amt;
      }
    });
  }

  const availableBalances =
    Object.keys(walletBalanceMap).length > 0
      ? walletBalanceMap
      : aggregatedStakedBySymbol;

  const cacheData: Record<string, string> = {
    userTotalStakedUSD: aggregatedUserTotalUSD.toString(),
    userVotingPowerPercentage: votingPowerPercentage.toString(),
    globalPoolTotalUSD: poolTotal.toString(),
    currentAPR: currentAPR.toString(),
    isFinancier: isFinancier.toString(),
    availableBalances: JSON.stringify(availableBalances),
    allStakesInfo: JSON.stringify(allStakesInfo),
    stakingConfig: JSON.stringify(stakingConfig),
    proposals: JSON.stringify(proposals),
    daoStats: JSON.stringify(daoStats),
    daoConfig: JSON.stringify(daoConfig),
  };

  Object.entries(cacheData).forEach(([key, value]) => {
    Storage.setItem(getCacheKey(key), value);
  });
};
