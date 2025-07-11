import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Wallet,
  Plus,
  ArrowDownUp,
  Droplet,
  Activity,
  AlertCircle,
  CheckCircle,
  Settings,
  Info,
  Clock,
  TrendingUp,
  DollarSign,
  Wallet2Icon,
  ChartNetwork,
  Check,
  CopyCheckIcon,
  CopyIcon,
  Wallet2,
  Power,
} from "lucide-react";
import { useEthersSigner } from "../components/useClientSigner";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance } from "wagmi";

import { ethers } from "ethers";
import USDC_ABI from "../artifacts/usdc.json";
import ABYTKN_ABI from "../artifacts/abyatkn.json";

import CONTRACT_ABI from "../artifacts/add_swap_contract.json";
const contractAbi = CONTRACT_ABI.abi;
const usdcAbi = USDC_ABI.abi;
const abyatknAbi = ABYTKN_ABI.abi;

const SwapComponent = () => {
  // Slippage settings
  const [slippageTolerance, setSlippageTolerance] = useState(0.5);
  const [customSlippage, setCustomSlippage] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const { isConnected, address } = useAccount();
  const signerPromise = useEthersSigner();
  const { data: balanceData } = useBalance({ address });
  const [loadingg, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txHash, setTxHash] = useState("");
  const [balances, setBalances] = useState({
    TOKEN0: "0.0",
    TOKEN1: "0.0",
    ETH: "0.0",
  });

  // Swap state
  const [swapData, setSwapData] = useState({
    inputToken: "",
    outputToken: "",
    inputAmount: "",
    outputAmount: "",
    inputTokenSymbol: "TOKEN0",
    outputTokenSymbol: "TOKEN1",
    priceImpact: 0,
    minimumReceived: "0",
  });

  const CONTRACT_ADDRESSES = {
    ADD_SWAP_CONTRACT: import.meta.env.VITE_APP_ADD_SWAP_CONTRACT,
    TOKEN0: import.meta.env.VITE_APP_USDC_ADDRESS, // USDC
    TOKEN1: import.meta.env.VITE_APP_ABYATKN_ADDRESS, // ABYTKN
    UNISWAP_POOL: import.meta.env.VITE_APP_ABYATKN_USDC_500, // Uniswap pool address
  };

  const loadBalances = useCallback(async () => {
    if (!isConnected || !address) return;

    try {
      const signer = await signerPromise;
      if (!signer) return;

      const provider = signer.provider;

      const usdcContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TOKEN0,
        usdcAbi,
        signer
      );
      const abytknContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TOKEN1,
        abyatknAbi,
        signer
      );

      const usdcBalance = await usdcContract.balanceOf(address);
      const abytknBalance = await abytknContract.balanceOf(address);
      const ethBalance = await provider.getBalance(address);

      console.log("USDC Balance:", usdcBalance);
      console.log("ABYTKN Balance:", abytknBalance);
      console.log("ETH Balance:", ethBalance);

      setBalances({
        TOKEN0: usdcBalance ? ethers.formatUnits(usdcBalance, 18) : "0.0",
        TOKEN1: abytknBalance ? ethers.formatUnits(abytknBalance, 18) : "0.0",
        ETH: ethBalance ? ethers.formatUnits(ethBalance, 18) : "0.0",
      });
    } catch (error) {
      console.error("Error loading balances:", error);
      setError("Failed to load balances");
    }
  }, [isConnected, address, signerPromise]);

  // Handle swap
  const handleSwap = async () => {
    console.log("Swap Data:", swapData);

    // Validate required fields using symbols
    if (
      !swapData.inputAmount ||
      !swapData.inputTokenSymbol ||
      !swapData.outputTokenSymbol
    ) {
      setError("Please fill in all swap fields");
      setTimeout(() => setError(""), 3000);
      return;
    }

    // Map symbols to token addresses
    const inputToken =
      swapData.inputTokenSymbol === "TOKEN0"
        ? CONTRACT_ADDRESSES.TOKEN0
        : CONTRACT_ADDRESSES.TOKEN1;
    const outputToken =
      swapData.outputTokenSymbol === "TOKEN0"
        ? CONTRACT_ADDRESSES.TOKEN0
        : CONTRACT_ADDRESSES.TOKEN1;

    setLoading(true);

    try {
      const signer = await signerPromise;
      if (!signer) return;

      const amountToSwap = ethers.parseUnits(swapData.inputAmount, 18);

      // First approve the input token
      const inputTokenAbi =
        swapData.inputTokenSymbol === "TOKEN0" ? USDC_ABI.abi : ABYTKN_ABI.abi;
      const inputTokenContract = new ethers.Contract(
        inputToken,
        inputTokenAbi,
        signer
      );

      // Check and approve if needed
      const allowance = await inputTokenContract.allowance(
        address,
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT
      );
      // If allowance is less than amount to swap, approve more
      if (allowance < amountToSwap) {
        console.log("Approving tokens for swapping...");

        // Approve a large amount to avoid future approvals
        const MAX_UINT256 = ethers.MaxUint256;

        try {
          const approveTx = await inputTokenContract.approve(
            CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
            MAX_UINT256
          );

          console.log("Approval transaction sent:", approveTx.hash);
          await approveTx.wait();
          console.log("Token approved successfully");

          // Check allowance after approval
          const newAllowance = await inputTokenContract.allowance(
            address,
            CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT
          );
          console.log("New allowance:", ethers.formatUnits(newAllowance, 18));
        } catch (approvalError) {
          console.error("Approval failed:", approvalError);
          setError("Failed to approve token: " + approvalError.message);
          setLoading(false);
          return;
        }
      }

      // Then perform the swap
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
        contractAbi,
        signer
      );

      const balance = await inputTokenContract.balanceOf(address);
      if (balance < amountToSwap) {
        setError(`Insufficient ${swapData.inputTokenSymbol} balance`);
        setLoading(false);
        return;
      }

      // Try to estimate gas first to catch errors early
      // try {
      //   const gasEstimate = await contract.estimateGas.swapExactInputSingle(
      //     inputToken,
      //     outputToken,
      //     amountToSwap
      //   );
      //   console.log("Gas estimate:", gasEstimate.toString());
      // } catch (gasError) {
      //   console.error("Gas estimation error:", gasError);
      //   // Continue anyway, we'll handle errors in the main try/catch
      // }

      const tx = await contract.swapExactInputSingle(
        inputToken,
        outputToken,
        amountToSwap
      );

      setTxHash(tx.hash);
      await tx.wait();

      // try {
      //   // Assume the contract has a function called recordTransaction
      //   const recordTxResponse = await contract.addTransactionToHistory(
      //     TRANSACTION_TYPES.SWAP, // transaction type
      //     swapData.inputTokenSymbol, // token0 symbol
      //     swapData.outputTokenSymbol, // token1 symbol
      //     amountToSwap, // token0 amount (parsed for blockchain)
      //     swapData.outputAmount, // token1 amount (parsed for blockchain)
      //     tx.hash // transaction hash
      //   );

      //   await recordTxResponse.wait();
      //   console.log(
      //     "Transaction recorded on blockchain:",
      //     recordTxResponse.hash
      //   );
      //   refreshHistory();
      // } catch (recordError) {
      //   console.error(
      //     "Failed to record transaction on blockchain:",
      //     recordError
      //   );
      //   setSuccess("Swap completed successfully!");
      // }

      setSwapData({ ...swapData, inputAmount: "", outputAmount: "0" });
      loadBalances();
    } catch (error) {
      setError("Swap failed: " + error.message);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setSuccess("");
        setError("");
        setTxHash("");
      }, 5000);
    }
  };

  // Swap input/output tokens
  const swapTokens = () => {
    setSwapData({
      ...swapData,
      inputToken: swapData.outputToken,
      outputToken: swapData.inputToken,
      inputTokenSymbol: swapData.outputTokenSymbol,
      outputTokenSymbol: swapData.inputTokenSymbol,
      inputAmount: swapData.outputAmount,
      outputAmount: swapData.inputAmount,
    });
  };

  const setMaxBalance = (tokenSymbol) => {
    const balance = balances[tokenSymbol];
    if (activeTab === "swap") {
      setSwapData({ ...swapData, inputAmount: balance });
    } else if (activeTab === "liquidity") {
      if (tokenSymbol === "TOKEN0") {
        setLiquidityData({ ...liquidityData, token0Amount: balance });
      } else {
        setLiquidityData({ ...liquidityData, token1Amount: balance });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Settings size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
          <h3 className="font-semibold text-gray-900">Transaction Settings</h3>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Slippage Tolerance
            </label>
            <div className="flex gap-2 mb-2">
              {[0.1, 0.5, 1.0].map((value) => (
                <button
                  key={value}
                  onClick={() => setSlippageTolerance(value)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    slippageTolerance === value
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {value}%
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Custom"
                value={customSlippage}
                onChange={(e) => {
                  setCustomSlippage(e.target.value);
                  if (e.target.value)
                    setSlippageTolerance(parseFloat(e.target.value));
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">%</span>
            </div>
          </div>
        </div>
      )}

      {/* From Token */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-gray-700">From</label>
          {isConnected && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Balance: {balances[swapData.inputTokenSymbol]}
              </span>
              <button
                onClick={() => setMaxBalance(swapData.inputTokenSymbol)}
                className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-md hover:bg-blue-200 transition-colors"
              >
                MAX
              </button>
            </div>
          )}
        </div>
        <div className="relative">
          <input
            type="number"
            placeholder="0.0"
            value={swapData.inputAmount}
            onChange={(e) =>
              setSwapData({
                ...swapData,
                inputAmount: e.target.value,
              })
            }
            className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-24"
          />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <select
              value={swapData.inputTokenSymbol}
              onChange={(e) => {
                const symbol = e.target.value;
                setSwapData({
                  ...swapData,
                  inputTokenSymbol: symbol,
                  inputToken:
                    symbol === "TOKEN0"
                      ? CONTRACT_ADDRESSES.TOKEN0
                      : CONTRACT_ADDRESSES.TOKEN1,
                });
              }}
              className="bg-white border border-gray-300 rounded-lg px-3 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TOKEN0">TOKEN0(USDC)</option>
              <option value="TOKEN1">TOKEN1(ABYTKN)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center">
        <button
          onClick={swapTokens}
          className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-all duration-200 hover:scale-110"
        >
          <ArrowDownUp size={20} className="text-gray-600" />
        </button>
      </div>

      {/* To Token */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-gray-700">To</label>
          {isConnected && (
            <span className="text-xs text-gray-500">
              Balance: {balances[swapData.outputTokenSymbol]}
            </span>
          )}
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="0.0"
            value={swapData?.outputAmount}
            readOnly
            className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-semibold text-gray-500 pr-24"
          />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <select
              value={swapData?.outputTokenSymbol}
              onChange={(e) => {
                const symbol = e.target.value;
                setSwapData({
                  ...swapData,
                  outputTokenSymbol: symbol,
                  outputToken:
                    symbol === "TOKEN0"
                      ? CONTRACT_ADDRESSES.TOKEN0
                      : CONTRACT_ADDRESSES.TOKEN1,
                });
              }}
              className="bg-white border border-gray-300 rounded-lg px-3 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TOKEN1">TOKEN1(ABYTKN)</option>
              <option value="TOKEN0">TOKEN0(USDC)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Swap Details */}
      {swapData.inputAmount && parseFloat(swapData.inputAmount) > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Price Impact</span>
            <span
              className={`font-medium ${
                swapData.priceImpact > 3
                  ? "text-red-600"
                  : swapData.priceImpact > 1
                  ? "text-yellow-600"
                  : "text-green-600"
              }`}
            >
              {swapData?.priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Minimum Received</span>
            <span className="font-medium text-gray-900">
              {swapData.minimumReceived} {swapData.outputTokenSymbol}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Slippage Tolerance</span>
            <span className="font-medium text-gray-900">
              {slippageTolerance}%
            </span>
          </div>
        </div>
      )}

      <button
        onClick={handleSwap}
        disabled={!isConnected || loadingg || !swapData.inputAmount}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
      >
        {loadingg ? (
          <>
            <Activity className="animate-spin" size={20} />
            Swapping...
          </>
        ) : (
          <>
            <ArrowDownUp size={20} />
            Swap Tokens
          </>
        )}
      </button>
    </div>
  );
};

export default SwapComponent;
