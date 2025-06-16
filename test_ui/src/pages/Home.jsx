import React, { useState, useEffect } from "react";
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
} from "lucide-react";

import { ethers } from "ethers";

import CONTRACT_ABI from "../artifacts/add_swap_contract.json";
const contractAbi = CONTRACT_ABI.abi;

const UniswapTestUI = () => {
  const [account, setAccount] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState("swap");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showPoolInfo, setShowPoolInfo] = useState(false);

  // Token balances
  const [balances, setBalances] = useState({
    TOKEN0: "0.0",
    TOKEN1: "0.0",
    ETH: "0.0",
  });

  // Slippage settings
  const [slippageTolerance, setSlippageTolerance] = useState(0.5);
  const [customSlippage, setCustomSlippage] = useState("");

  // Pool information
  const [poolInfo, setPoolInfo] = useState({
    liquidity: "1,234,567.89",
    volume24h: "987,654.32",
    fees24h: "4,938.27",
    apr: "12.45",
    token0Price: "1.2345",
    token1Price: "0.8102",
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

  // Liquidity state
  const [liquidityData, setLiquidityData] = useState({
    token0Amount: "",
    token1Amount: "",
    token0Symbol: "TOKEN0",
    token1Symbol: "TOKEN1",
  });

  // Transaction history
  const [txHistory, setTxHistory] = useState([
    {
      id: 1,
      type: "swap",
      fromToken: "TOKEN0",
      toToken: "TOKEN1",
      fromAmount: "100",
      toAmount: "123.45",
      timestamp: new Date(Date.now() - 3600000),
      hash: "0x1234...5678",
      status: "confirmed",
    },
    {
      id: 2,
      type: "liquidity",
      token0: "TOKEN0",
      token1: "TOKEN1",
      token0Amount: "50",
      token1Amount: "61.73",
      timestamp: new Date(Date.now() - 7200000),
      hash: "0x8765...4321",
      status: "confirmed",
    },
  ]);

  // Contract addresses
  const CONTRACT_ADDRESSES = {
    ADD_SWAP_CONTRACT: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82", // Your deployed contract address
    TOKEN0: "0x0165878A594ca255338adfa4d48449f69242Eb8F", // Your token0 address
    TOKEN1: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853", // Your token1 address
  };

  // Mock function to calculate output amount (replace with actual price calculation)
  const calculateOutputAmount = (inputAmount, inputToken, outputToken) => {
    if (!inputAmount || parseFloat(inputAmount) === 0) return "0";

    // Mock exchange rate (1 TOKEN0 = 1.2345 TOKEN1)
    const rate = inputToken === "TOKEN0" ? 1.2345 : 0.8102;
    const output = (parseFloat(inputAmount) * rate).toFixed(6);

    // Calculate price impact (mock calculation)
    const impact = Math.min((parseFloat(inputAmount) / 1000) * 0.1, 5); // Max 5% impact

    // Calculate minimum received with slippage
    const minReceived = (
      parseFloat(output) *
      (1 - slippageTolerance / 100)
    ).toFixed(6);

    return { output, impact, minReceived };
  };

  // Update output amount when input changes
  useEffect(() => {
    if (
      swapData.inputAmount &&
      swapData.inputTokenSymbol !== swapData.outputTokenSymbol
    ) {
      const result = calculateOutputAmount(
        swapData.inputAmount,
        swapData.inputTokenSymbol,
        swapData.outputTokenSymbol
      );

      setSwapData((prev) => ({
        ...prev,
        outputAmount: result.output,
        priceImpact: result.impact,
        minimumReceived: result.minReceived,
      }));
    } else {
      setSwapData((prev) => ({
        ...prev,
        outputAmount: "0",
        priceImpact: 0,
        minimumReceived: "0",
      }));
    }
  }, [
    swapData.inputAmount,
    swapData.inputTokenSymbol,
    swapData.outputTokenSymbol,
    slippageTolerance,
  ]);

  // Mock function to load balances
  const loadBalances = async () => {
    // Replace with actual balance fetching
    setBalances({
      TOKEN0: (Math.random() * 1000).toFixed(2),
      TOKEN1: (Math.random() * 1000).toFixed(2),
      ETH: (Math.random() * 10).toFixed(4),
    });
  };

  // Connect wallet function
  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);
        setIsConnected(true);
        setSuccess("Wallet connected successfully!");
        loadBalances();
        setTimeout(() => setSuccess(""), 3000);
      } catch (error) {
        setError("Failed to connect wallet", error);
        setTimeout(() => setError(""), 3000);
      }
    } else {
      setError("Please install MetaMask");
      setTimeout(() => setError(""), 3000);
    }
  };

  // Function to get the signer
  const getSigner = () => {
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      return provider.getSigner();
    } else {
      setError("Ethereum provider not found. Please install MetaMask.");
      return null;
    }
  };

  // Handle swap
  const handleSwap = async () => {
    if (
      !swapData.inputAmount ||
      !swapData.inputToken ||
      !swapData.outputToken
    ) {
      setError("Please fill in all swap fields");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setLoading(true);
    try {
      const signer = getSigner();
      if (!signer) return;

      // Here you would call your contract's swapExactInputSingle function
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
        contractAbi,
        signer
      );
      const tx = await contract.swapExactInputSingle(
        swapData.inputToken,
        swapData.outputToken,
        ethers.utils.parseEther(swapData.inputAmount)
      );
      setTxHash(tx.hash);

      // Add to transaction history
      const newTx = {
        id: txHistory.length + 1,
        type: "swap",
        fromToken: swapData.inputTokenSymbol,
        toToken: swapData.outputTokenSymbol,
        fromAmount: swapData.inputAmount,
        toAmount: swapData.outputAmount,
        timestamp: new Date(),
        hash: txHash,
        status: "confirmed",
      };

      setTxHistory((prev) => [newTx, ...prev]);
      setSuccess("Swap completed successfully!");
      setSwapData({ ...swapData, inputAmount: "", outputAmount: "0" });
      loadBalances(); // Refresh balances
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

  // Handle add liquidity
  const handleAddLiquidity = async () => {
    if (!liquidityData.token0Amount || !liquidityData.token1Amount) {
      setError("Please enter amounts for both tokens");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setLoading(true);
    try {
      const signer = getSigner();
      if (!signer) return;

      // Here you would call your contract's addLiquidity function
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
        contractAbi,
        signer
      );
      const tx = await contract.addLiquidity(
        ethers.utils.parseEther(liquidityData.token0Amount),
        ethers.utils.parseEther(liquidityData.token1Amount)
      );
      setTxHash(tx.hash);

      // Add to transaction history
      const newTx = {
        id: txHistory.length + 1,
        type: "liquidity",
        token0: liquidityData.token0Symbol,
        token1: liquidityData.token1Symbol,
        token0Amount: liquidityData.token0Amount,
        token1Amount: liquidityData.token1Amount,
        timestamp: new Date(),
        hash: txHash,
        status: "confirmed",
      };

      setTxHistory((prev) => [newTx, ...prev]);
      setSuccess("Liquidity added successfully!");
      setLiquidityData({
        ...liquidityData,
        token0Amount: "",
        token1Amount: "",
      });
      loadBalances(); // Refresh balances
    } catch (error) {
      setError("Add liquidity failed: " + error.message);
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

  // Set max balance
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <Droplet className="text-blue-600" />
            Uniswap Local Test
          </h1>
          <p className="text-gray-600">Test your local Uniswap deployment</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Trading Interface */}
          <div className="lg:col-span-2">
            {/* Wallet Connection */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-6 p-6">
              {!isConnected ? (
                <button
                  onClick={connectWallet}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Wallet size={20} />
                  Connect Wallet
                </button>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-700 font-medium">Connected</span>
                  </div>
                  <div className="text-sm text-gray-500 font-mono">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </div>
                </div>
              )}
            </div>

            {/* Main Trading Panel */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("swap")}
                  className={`flex-1 px-6 py-4 font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === "swap"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <ArrowDownUp size={20} />
                  Swap
                </button>
                <button
                  onClick={() => setActiveTab("liquidity")}
                  className={`flex-1 px-6 py-4 font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === "liquidity"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Plus size={20} />
                  Add Liquidity
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`flex-1 px-6 py-4 font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === "history"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Clock size={20} />
                  History
                </button>
              </div>

              <div className="p-6">
                {/* Swap Tab */}
                {activeTab === "swap" && (
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
                        <h3 className="font-semibold text-gray-900">
                          Transaction Settings
                        </h3>
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
                                  setSlippageTolerance(
                                    parseFloat(e.target.value)
                                  );
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
                        <label className="text-sm font-semibold text-gray-700">
                          From
                        </label>
                        {isConnected && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              Balance: {balances[swapData.inputTokenSymbol]}
                            </span>
                            <button
                              onClick={() =>
                                setMaxBalance(swapData.inputTokenSymbol)
                              }
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
                            <option value="TOKEN0">TOKEN0</option>
                            <option value="TOKEN1">TOKEN1</option>
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
                        <label className="text-sm font-semibold text-gray-700">
                          To
                        </label>
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
                          value={swapData.outputAmount}
                          readOnly
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-semibold text-gray-500 pr-24"
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                          <select
                            value={swapData.outputTokenSymbol}
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
                            <option value="TOKEN1">TOKEN1</option>
                            <option value="TOKEN0">TOKEN0</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Swap Details */}
                    {swapData.inputAmount &&
                      parseFloat(swapData.inputAmount) > 0 && (
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
                              {swapData.priceImpact.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              Minimum Received
                            </span>
                            <span className="font-medium text-gray-900">
                              {swapData.minimumReceived}{" "}
                              {swapData.outputTokenSymbol}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              Slippage Tolerance
                            </span>
                            <span className="font-medium text-gray-900">
                              {slippageTolerance}%
                            </span>
                          </div>
                        </div>
                      )}

                    <button
                      onClick={handleSwap}
                      disabled={
                        !isConnected || loading || !swapData.inputAmount
                      }
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      {loading ? (
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
                )}

                {/* Add Liquidity Tab */}
                {activeTab === "liquidity" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-gray-700">
                          Token 0 Amount
                        </label>
                        {isConnected && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              Balance: {balances.TOKEN0}
                            </span>
                            <button
                              onClick={() => setMaxBalance("TOKEN0")}
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
                          value={liquidityData.token0Amount}
                          onChange={(e) =>
                            setLiquidityData({
                              ...liquidityData,
                              token0Amount: e.target.value,
                            })
                          }
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-24"
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white border border-gray-300 rounded-lg px-3 py-1 text-sm font-semibold">
                          TOKEN0
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-gray-700">
                          Token 1 Amount
                        </label>
                        {isConnected && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              Balance: {balances.TOKEN1}
                            </span>
                            <button
                              onClick={() => setMaxBalance("TOKEN1")}
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
                          value={liquidityData.token1Amount}
                          onChange={(e) =>
                            setLiquidityData({
                              ...liquidityData,
                              token1Amount: e.target.value,
                            })
                          }
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-24"
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white border border-gray-300 rounded-lg px-3 py-1 text-sm font-semibold">
                          TOKEN1
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> This will add full-range
                        liquidity (min to max tick). Fee tier: 0.05% (500)
                      </p>
                    </div>

                    <button
                      onClick={handleAddLiquidity}
                      disabled={
                        !isConnected ||
                        loading ||
                        !liquidityData.token0Amount ||
                        !liquidityData.token1Amount
                      }
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Activity className="animate-spin" size={20} />
                          Adding Liquidity...
                        </>
                      ) : (
                        <>
                          <Plus size={20} />
                          Add Liquidity
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Transaction History Tab */}
                {activeTab === "history" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Recent Transactions
                    </h3>
                    {txHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Clock size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No transactions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {txHistory.map((tx) => (
                          <div
                            key={tx.id}
                            className="bg-gray-50 rounded-xl p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {tx.type === "swap" ? (
                                  <ArrowDownUp
                                    size={16}
                                    className="text-blue-600"
                                  />
                                ) : (
                                  <Plus size={16} className="text-green-600" />
                                )}
                                <span className="font-medium text-gray-900 capitalize">
                                  {tx.type}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    tx.status === "confirmed"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {tx.status}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {tx.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-sm text-gray-700">
                              {tx.type === "swap" ? (
                                <div>
                                  {tx.fromAmount} {tx.fromToken} → {tx.toAmount}{" "}
                                  {tx.toToken}
                                </div>
                              ) : (
                                <div>
                                  Added {tx.token0Amount} {tx.token0} +{" "}
                                  {tx.token1Amount} {tx.token1}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 font-mono mt-1">
                              {tx.hash}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Token Balances */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Token Balances
              </h3>
              <div className="space-y-3">
                {Object.entries(balances).map(([token, balance]) => (
                  <div
                    key={token}
                    className="flex justify-between items-center"
                  >
                    <span className="font-medium text-gray-700">{token}</span>
                    <span className="text-gray-500">{balance}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Pool Information */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Pool Information
                </h3>
                <button
                  onClick={() => setShowPoolInfo(!showPoolInfo)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Info size={20} className="text-gray-600" />
                </button>
              </div>
              {showPoolInfo && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Liquidity</span>
                    <span className="font-medium text-gray-900">
                      {poolInfo.liquidity}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">24h Volume</span>
                    <span className="font-medium text-gray-900">
                      {poolInfo.volume24h}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">24h Fees</span>
                    <span className="font-medium text-gray-900">
                      {poolInfo.fees24h}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">APR</span>
                    <span className="font-medium text-gray-900">
                      {poolInfo.apr}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">TOKEN0 Price</span>
                    <span className="font-medium text-gray-900">
                      {poolInfo.token0Price}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">TOKEN1 Price</span>
                    <span className="font-medium text-gray-900">
                      {poolInfo.token1Price}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {/* Transaction Status */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Transaction Status
              </h3>
              {txHash ? (
                <div className="text-sm text-gray-700">
                  <CheckCircle
                    size={20}
                    className="text-green-600 inline-block mr-2"
                  />
                  Transaction successful! Hash:{" "}
                  <span className="font-mono">{txHash}</span>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  <AlertCircle size={20} className="inline-block mr-2" />
                  No recent transactions
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Notifications */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-100 border border-red-200 text-red-700 px-4 py-2 rounded-lg shadow-lg">
            <AlertCircle size={20} className="inline-block mr-2" />
            {error}
          </div>
        )}
        {success && (
          <div className="fixed bottom-4 right-4 bg-green-100 border border-green-200 text-green-700 px-4 py-2 rounded-lg shadow-lg">
            <CheckCircle size={20} className="inline-block mr-2" />
            {success}
          </div>
        )}
      </div>
    </div>
  );
};
export default UniswapTestUI;
