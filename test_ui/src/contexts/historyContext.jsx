import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import CONTRACT_ABI from "../artifacts/add_swap_contract.json";
import { useEthersSigner } from "../components/useClientSigner";

const contractAbi = CONTRACT_ABI.abi;

// Create the context
const TransactionHistoryContext = createContext();

// Create a provider component
export function TransactionHistoryProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();

  const contract_address = import.meta.env.VITE_APP_ADD_SWAP_CONTRACT;

  // Function to fetch transaction history from the contract
  const fetchTransactionHistory = useCallback(async () => {
    if (!isConnected || !address || !signerPromise) return;

    const signer = await signerPromise;

    setLoading(true);
    setError(null);

    try {
      const contract = new ethers.Contract(
        contract_address,
        contractAbi,
        signer
      );

      // Call the contract's getTransactionHistory function
      const txHistoryData = await contract.getUserTransactionHistory();
      console.log("Raw transaction history:", txHistoryData);

      // Format the transaction data
      // Update the mapping to match the contract's return structure
      const formattedTransactions = txHistoryData.map((tx, index) => {
        return {
          id: Number(tx.id) || index,
          type: Number(tx.transactionType) === 1 ? "swap" : "liquidity",
          token0Symbol:
            tx.fromToken === "0x013b1c8a9257b8f3931d6a02da84515d9a19049c"
              ? "TKN0(USDC)"
              : tx.fromToken === "0xc3fb06c0057c3a1f85e34caf99a150f77a52e724"
              ? "TKN1(ABYATKN)"
              : tx.fromToken || "TKN0",
          token1Symbol:
            tx.toToken === "0x013b1c8a9257b8f3931d6a02da84515d9a19049c"
              ? "TKN0(USDC)"
              : tx.toToken === "0xc3fb06c0057c3a1f85e34caf99a150f77a52e724"
              ? "TKN1(ABYATKN)"
              : tx.toToken || "TKN1",
          token0Amount: ethers.formatUnits(tx.fromAmount || 0, 18), // Changed from amount0 to fromAmount
          token1Amount: ethers.formatUnits(tx.toAmount || 0, 18), // Changed from amount1 to toAmount
          timestamp: new Date(Number(tx.timestamp || 0) * 1000),
          hash: tx.hash, // Changed from txHash to hash
          status: tx.status || "confirmed",
        };
      });

      console.log("Formatted transactions:", formattedTransactions);
      setTransactions(formattedTransactions);
    } catch (err) {
      console.error("Error fetching transaction history:", err);
      setError("Failed to fetch transaction history: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [isConnected, address, signerPromise, contract_address]);

  // Fetch transaction history when the user connects their wallet
  useEffect(() => {
    if (isConnected) {
      fetchTransactionHistory();
    } else {
      setTransactions([]);
    }
  }, [isConnected, fetchTransactionHistory]);

  // Function to refresh transaction history (can be called after new transactions)
  const refreshHistory = () => {
    fetchTransactionHistory();
  };

  // Value provided by the context
  const value = {
    transactions,
    loading,
    error,
    refreshHistory,
  };

  return (
    <TransactionHistoryContext.Provider value={value}>
      {children}
    </TransactionHistoryContext.Provider>
  );
}

// Custom hook for using the transaction history context
export function useTransactionHistory() {
  const context = useContext(TransactionHistoryContext);

  if (context === undefined) {
    throw new Error(
      "useTransactionHistory must be used within a TransactionHistoryProvider"
    );
  }

  return context;
}
