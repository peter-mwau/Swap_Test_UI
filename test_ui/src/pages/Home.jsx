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
import { useDisconnect, useAccount, useBalance } from "wagmi";
import {
  TransactionHistoryProvider,
  useTransactionHistory,
} from "../contexts/historyContext";

import { ethers } from "ethers";
import USDC_ABI from "../artifacts/usdc.json";
import ABYTKN_ABI from "../artifacts/abyatkn.json";

import CONTRACT_ABI from "../artifacts/add_swap_contract.json";
const contractAbi = CONTRACT_ABI.abi;
const usdcAbi = USDC_ABI.abi;
const abyatknAbi = ABYTKN_ABI.abi;

const UniswapTestUI = () => {
  const [activeTab, setActiveTab] = useState("swap");
  const [loadingg, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showPoolInfo, setShowPoolInfo] = useState(false);
  const signerPromise = useEthersSigner();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const [isCopied, setIsCopied] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef(null);
  const toggleRef = useRef(null);
  const { data: balanceData } = useBalance({ address });
  const { transactions, loading, refreshHistory } = useTransactionHistory();

  console.log("Transactions:", transactions);

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
    liquidity: "0.0",
    volume24h: "0.0",
    fees24h: "0.0",
    apr: "0.0",
    token0Price: "0.0",
    token1Price: "0.0",
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

  // Contract addresses
  const CONTRACT_ADDRESSES = {
    ADD_SWAP_CONTRACT: import.meta.env.VITE_APP_ADD_SWAP_CONTRACT,
    TOKEN0: import.meta.env.VITE_APP_USDC_ADDRESS, // USDC
    TOKEN1: import.meta.env.VITE_APP_ABYATKN_ADDRESS, // ABYTKN
    UNISWAP_POOL: import.meta.env.VITE_APP_ABYATKN_USDC_500, // Uniswap pool address
  };

  // Function to calculate output amount (replace with actual price calculation)
  const calculateOutputAmount = async (
    inputAmount,
    inputTokenSymbol,
    outputTokenSymbol
  ) => {
    if (!inputAmount || parseFloat(inputAmount) === 0)
      return { output: "0", impact: 0, minReceived: "0" };

    try {
      const provider = await signerPromise;
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
        contractAbi,
        provider
      );

      const poolAddress = CONTRACT_ADDRESSES.UNISWAP_POOL;
      const token0Price = await contract.getTokenPrice(poolAddress);

      // Ensure token0Price is valid before formatting
      const rate =
        inputTokenSymbol === "TOKEN0"
          ? parseFloat(ethers.formatUnits(token0Price, 18)) || 0 // Fallback to 0 if invalid
          : 1 / (parseFloat(ethers.formatUnits(token0Price, 18)) || 1); // Fallback to 1 if invalid

      const output = (parseFloat(inputAmount) * rate).toFixed(6);
      const impact = Math.min((parseFloat(inputAmount) / 1000) * 0.1, 5);
      const minReceived = (
        parseFloat(output) *
        (1 - slippageTolerance / 100)
      ).toFixed(6);

      console.log("Rate:", rate);
      console.log("Input Amount:", inputAmount);
      console.log("Output:", output);

      return { output, impact, minReceived };
    } catch (error) {
      console.error("Price calculation error:", error);
      // Fallback to mock calculation
      const rate = inputTokenSymbol === "TOKEN0" ? 1.2345 : 0.8102;
      const output = (parseFloat(inputAmount) * rate).toFixed(6);
      const impact = Math.min((parseFloat(inputAmount) / 1000) * 0.1, 5);
      const minReceived = (
        parseFloat(output) *
        (1 - slippageTolerance / 100)
      ).toFixed(6);
      return { output, impact, minReceived };
    }
  };

  // Update output amount when input changes
  useEffect(() => {
    const updateOutputAmount = async () => {
      if (
        swapData.inputAmount &&
        swapData.inputTokenSymbol !== swapData.outputTokenSymbol
      ) {
        const result = await calculateOutputAmount(
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
    };

    updateOutputAmount();
  }, [
    swapData.inputAmount,
    swapData.inputTokenSymbol,
    swapData.outputTokenSymbol,
    slippageTolerance,
  ]);

  // Wrap loadBalances in useCallback
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

  const TRANSACTION_TYPES = {
    SWAP: 0,
    LIQUIDITY: 1,
  };

  // Wrap loadPoolInfo in useCallback
  const loadPoolInfo = useCallback(async () => {
    if (!isConnected) return;

    try {
      const signer = await signerPromise;
      if (!signer) {
        console.log("No signer available");
        return;
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
        contractAbi,
        signer
      );

      const poolAddress = CONTRACT_ADDRESSES.UNISWAP_POOL;

      if (!poolAddress) {
        console.error("Pool address not found in environment variables");
        setError("Pool address not configured");
        return;
      }

      let poolData = {};

      try {
        const poolInfo = await contract.getPoolInfo(poolAddress);
        poolData.sqrtPriceX96 = poolInfo[0]?.toString() || "0";
        poolData.tick = poolInfo[1]?.toString() || "0";
        poolData.liquidity = poolInfo[2]
          ? ethers.formatUnits(poolInfo[2], 18) // Use ethers.formatUnits
          : "0";
      } catch (err) {
        console.log("Error getting pool info:", err.message);
        poolData.liquidity = "N/A";
        poolData.sqrtPriceX96 = "N/A";
        poolData.tick = "N/A";
      }

      try {
        const balances = await contract.getPoolBalances(poolAddress);
        poolData.token0Balance =
          balances[0] !== undefined
            ? ethers.formatUnits(balances[0], 18) // Use ethers.formatUnits
            : "0";
        poolData.token1Balance =
          balances[1] !== undefined
            ? ethers.formatUnits(balances[1], 18) // Use ethers.formatUnits
            : "0";
      } catch (err) {
        console.log("Error getting pool balances:", err.message);
        poolData.token0Balance = "N/A";
        poolData.token1Balance = "N/A";
      }

      try {
        const token0Price = await contract.getTokenPrice(poolAddress);
        poolData.token0Price =
          token0Price !== undefined
            ? ethers.formatUnits(token0Price, 18) // Use ethers.formatUnits
            : "N/A";
        poolData.token1Price =
          token0Price !== undefined
            ? (1 / parseFloat(ethers.formatUnits(token0Price, 18))).toFixed(6)
            : "N/A";
        console.log("Token0 Price:", token0Price);
      } catch (err) {
        console.log("Error getting token price:", err.message);
        poolData.token0Price = "N/A";
        poolData.token1Price = "N/A";
      }

      console.log("Pool Info:", poolInfo);
      console.log("Pool Balances:", balances);

      setPoolInfo({
        liquidity: poolData.liquidity,
        sqrtPriceX96: poolData.sqrtPriceX96,
        tick: poolData.tick,
        token0Balance: poolData.token0Balance,
        token1Balance: poolData.token1Balance,
        token0Price: poolData.token0Price,
        token1Price: poolData.token1Price,
        volume24h: "N/A",
        fees24h: "N/A",
        apr: "N/A",
      });
    } catch (error) {
      console.error("Error loading pool info:", error);
      setError("Failed to load pool info: " + error.message);
      setPoolInfo({
        liquidity: "N/A",
        sqrtPriceX96: "N/A",
        tick: "N/A",
        token0Balance: "N/A",
        token1Balance: "N/A",
        token0Price: "N/A",
        token1Price: "N/A",
        volume24h: "N/A",
        fees24h: "N/A",
        apr: "N/A",
      });
    }
  }, [isConnected, signerPromise]);

  // Update useEffect to use stable references
  useEffect(() => {
    if (isConnected) {
      loadBalances();
      loadPoolInfo();
      const interval = setInterval(() => {
        loadBalances();
        loadPoolInfo();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isConnected, address, loadBalances, loadPoolInfo]);

  // 4. Add token minting functions
  const mintTokens = async (amount, tokenSymbol) => {
    console.log("Minting", amount, "of", tokenSymbol);

    if (!amount || isNaN(parseFloat(amount))) {
      console.error("Invalid amount provided for minting:", amount);
      setError("Please enter a valid amount to mint");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setLoading(true);

    try {
      const signer = await signerPromise;
      if (!signer) return;

      const contract =
        tokenSymbol === "TOKEN0"
          ? new ethers.Contract(CONTRACT_ADDRESSES.TOKEN0, USDC_ABI.abi, signer)
          : new ethers.Contract(
              CONTRACT_ADDRESSES.TOKEN1,
              ABYTKN_ABI.abi,
              signer
            );

      const parsedAmount = ethers.parseEther(amount.toString()); // Ensure amount is valid
      const tx = await contract.mint(address, parsedAmount);

      setTxHash(tx.hash);
      await tx.wait();

      setSuccess(`Successfully minted ${amount} ${tokenSymbol}!`);
      loadBalances(); // Refresh balances
      setMintData({
        ...mintData,
        usdcAmount: "",
        abytknAmount: "",
      });
    } catch (error) {
      console.error("Minting error:", error);
      setError(`Failed to mint ${tokenSymbol}: ${error.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setSuccess("");
        setError("");
        setTxHash("");
      }, 5000);
    }
  };

  // 5. Add state for minting
  const [mintData, setMintData] = useState({
    usdcAmount: "",
    abytknAmount: "",
  });

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

      // First approve the input token
      const inputTokenAbi =
        swapData.inputTokenSymbol === "TOKEN0" ? USDC_ABI.abi : ABYTKN_ABI.abi;
      const inputTokenContract = new ethers.Contract(
        inputToken,
        inputTokenAbi,
        signer
      );
      const amountToSwap = ethers.parseUnits(swapData.inputAmount, 18);

      // Check and approve if needed
      const allowance = await inputTokenContract.allowance(
        address,
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT
      );
      if (allowance < amountToSwap) {
        const approveTx = await inputTokenContract.approve(
          CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
          amountToSwap
        );
        await approveTx.wait();
      }

      // Then perform the swap
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
        contractAbi,
        signer
      );

      const tx = await contract.swapExactInputSingle(
        inputToken,
        outputToken,
        amountToSwap
      );

      setTxHash(tx.hash);
      await tx.wait();

      try {
        // Assume the contract has a function called recordTransaction
        const recordTxResponse = await contract.addTransactionToHistory(
          TRANSACTION_TYPES.SWAP, // transaction type
          swapData.inputTokenSymbol, // token0 symbol
          swapData.outputTokenSymbol, // token1 symbol
          amountToSwap, // token0 amount (parsed for blockchain)
          amountToSwap, // token1 amount (parsed for blockchain)
          tx.hash // transaction hash
        );

        await recordTxResponse.wait();
        console.log(
          "Transaction recorded on blockchain:",
          recordTxResponse.hash
        );
        refreshHistory();
      } catch (recordError) {
        console.error(
          "Failed to record transaction on blockchain:",
          recordError
        );
        setSuccess("Swap completed successfully!");
      }

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

  // Handle add liquidity
  const handleAddLiquidity = async () => {
    console.log("Liquidity Data:", liquidityData);

    if (
      !liquidityData.token0Amount ||
      isNaN(parseFloat(liquidityData.token0Amount)) ||
      !liquidityData.token1Amount ||
      isNaN(parseFloat(liquidityData.token1Amount))
    ) {
      setError("Please enter valid amounts for both tokens");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setLoading(true);
    try {
      const signer = await signerPromise;
      if (!signer) {
        setError("No signer available");
        setLoading(false);
        return;
      }

      // Parse token amounts
      const token0AmountParsed = ethers.parseUnits(
        liquidityData.token0Amount.toString(),
        18
      );
      const token1AmountParsed = ethers.parseUnits(
        liquidityData.token1Amount.toString(),
        18
      );

      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
        contractAbi,
        signer
      );

      // Step 1: Approve tokens to be spent by the contract
      const token0Contract = new ethers.Contract(
        CONTRACT_ADDRESSES.TOKEN0, // USDC address
        USDC_ABI.abi,
        signer
      );
      const token1Contract = new ethers.Contract(
        CONTRACT_ADDRESSES.TOKEN1, // ABYTKN address
        ABYTKN_ABI.abi,
        signer
      );

      // Check the actual decimals for each token
      const token0Decimals = await token0Contract.decimals();
      const token1Decimals = await token1Contract.decimals();

      console.log("Token0 Decimals:", token0Decimals);
      console.log("Token1 Decimals:", token1Decimals);

      // Approval transactions
      console.log("Approving tokens for spending...");
      const token0Allowance = await token0Contract.allowance(
        address,
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT
      );
      if (token0Allowance < token0AmountParsed) {
        const tx0 = await token0Contract.approve(
          CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
          token0AmountParsed
        );
        await tx0.wait();
        console.log("TOKEN0 approved");
      }

      const token1Allowance = await token1Contract.allowance(
        address,
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT
      );
      if (token1Allowance < token1AmountParsed) {
        const tx1 = await token1Contract.approve(
          CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
          token1AmountParsed
        );
        await tx1.wait();
        console.log("TOKEN1 approved");
      }

      try {
        const gasEstimate = await contract.estimateGas.addLiquidity(
          token0AmountParsed,
          token1AmountParsed
        );
        console.log("Gas estimate:", gasEstimate.toString());
      } catch (error) {
        console.error("Gas estimation error:", error);
      }

      // Step 2: Call the addLiquidity function
      console.log("Adding liquidity...");
      console.log("Token0 amount:", ethers.formatUnits(token0AmountParsed, 18));
      console.log("Token1 amount:", ethers.formatUnits(token1AmountParsed, 18));

      // Check balances before transaction
      const token0Balance = await token0Contract.balanceOf(address);
      const token1Balance = await token1Contract.balanceOf(address);
      console.log(
        "Current token0 balance:",
        ethers.formatUnits(token0Balance, 18)
      );
      console.log(
        "Current token1 balance:",
        ethers.formatUnits(token1Balance, 18)
      );

      // Check allowances before transaction
      const currentAllowance0 = await token0Contract.allowance(
        address,
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT
      );
      const currentAllowance1 = await token1Contract.allowance(
        address,
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT
      );
      console.log(
        "Current token0 allowance:",
        ethers.formatUnits(currentAllowance0, 18)
      );
      console.log(
        "Current token1 allowance:",
        ethers.formatUnits(currentAllowance1, 18)
      );

      // Try with manual gas limit
      const tx = await contract.addLiquidity(
        token0AmountParsed,
        token1AmountParsed,
        {
          gasLimit: 5000000, // Increased gas limit
        }
      );
      setTxHash(tx.hash);
      await tx.wait();
      console.log("Liquidity added successfully!");

      // Step 3: Record transaction in history
      try {
        const recordTxResponse = await contract.addTransactionToHistory(
          TRANSACTION_TYPES.LIQUIDITY,
          liquidityData.token0Symbol,
          liquidityData.token1Symbol,
          token0AmountParsed,
          token1AmountParsed,
          tx.hash
        );
        await recordTxResponse.wait();
        console.log(
          "Transaction recorded on blockchain:",
          recordTxResponse.hash
        );
        refreshHistory();
      } catch (recordError) {
        console.error(
          "Failed to record transaction on blockchain:",
          recordError
        );
      }

      setSuccess("Liquidity added successfully!");
      loadBalances();
    } catch (error) {
      console.error("Add liquidity failed:", error);
      setError("Failed to add liquidity: " + error.message);
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

  const signOut = () => {
    disconnect();
    // setDropdownVisible(false);
  };

  const copyText = (text, setCopied) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  useEffect(() => {
    const onClick = (e) => {
      if (
        dropdownVisible &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !toggleRef.current.contains(e.target)
      )
        setDropdownVisible(false);
    };
    const onKey = (e) =>
      e.key === "Escape" && dropdownVisible && setDropdownVisible(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [dropdownVisible]);

  // if (loading) return <p>Loading transactions...</p>;
  // if (error) return <p>Error: {error}</p>;

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
                // Render the ConnectButton when not connected
                <ConnectButton className="items-center mx-auto my-auto justify-center relative" />
              ) : (
                // Render the connected state UI
                <div className="flex items-center justify-between ">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-700 font-medium">Connected</span>
                  </div>
                  {/* Dropdown */}
                  <div className="relative z-10">
                    <button
                      ref={toggleRef}
                      onClick={() => setDropdownVisible((v) => !v)}
                      className="flex items-center space-x-2 bg-blue-500 text-black px-4 py-2 rounded-lg hover:bg-blue-600"
                      aria-haspopup="menu"
                      aria-expanded={dropdownVisible}
                    >
                      <span
                        className={`h-3 w-3 rounded-full bg-green-500`}
                        aria-label="Connected"
                      />
                      <Wallet2Icon size={20} />
                    </button>

                    {dropdownVisible && (
                      <div
                        ref={dropdownRef}
                        role="menu"
                        className="absolute right-0 mt-2 w-72 bg-white border rounded-xl shadow-2xl overflow-hidden"
                      >
                        <div className="bg-yellow-500/10 p-4 flex items-center space-x-3 border-b">
                          <Wallet2Icon
                            className="w-10 h-10 text-blue-600 
                          "
                          />
                          <div>
                            <h3 className="font-bold text-lg text-gray-800 ">
                              Wallet Details
                            </h3>
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          {/* Status */}
                          <div className="flex justify-between">
                            <span className="flex items-center space-x-2 ">
                              <ChartNetwork />
                              <span>Status</span>
                            </span>
                            <span className="flex items-center space-x-1 text-green-500">
                              <Check />
                              <span>Connected</span>
                            </span>
                          </div>

                          {/* Copy Address */}
                          <div className="flex justify-between ">
                            <button
                              onClick={() => copyText(address, setIsCopied)}
                              className="flex items-center space-x-1 hover:underline"
                            >
                              {isCopied ? (
                                <CopyCheckIcon className="w-5 h-5 text-yellow-500" />
                              ) : (
                                <CopyIcon className="w-5 h-5 text-gray-600 " />
                              )}{" "}
                              <span>Address</span>
                            </button>
                            <span className="font-semibold text-sm truncate max-w-[150px]">
                              {address.slice(0, 6)}...{address.slice(-4)}
                            </span>
                          </div>

                          {/* Ether Balance */}
                          <div className="flex justify-between ">
                            <span className="flex items-center space-x-2">
                              <Wallet />
                              <span>Balance</span>
                            </span>
                            <span className="font-semibold dark:text-yellow-500">
                              {balanceData
                                ? parseFloat(balanceData.formatted).toFixed(5)
                                : "0.00000"}{" "}
                              {balanceData?.symbol}
                            </span>
                          </div>

                          {/* Disconnect */}
                          <button
                            onClick={signOut}
                            className="w-full flex items-center justify-center space-x-2 text-red-500 hover:bg-red-50 hover:cursor-pointer p-2 rounded-lg"
                          >
                            <Power />
                            <span>Disconnect</span>
                          </button>
                        </div>
                      </div>
                    )}
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
                <button
                  onClick={() => setActiveTab("mint")}
                  className={`flex-1 px-6 py-4 font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === "mint"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Droplet size={20} />
                  Mint Tokens
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
                              {swapData?.priceImpact.toFixed(2)}%
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
                        !isConnected || loadingg || !swapData.inputAmount
                      }
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
                          TOKEN0(USDC)
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
                          TOKEN1(ABYTKN)
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
                        loadingg ||
                        !liquidityData.token0Amount ||
                        !liquidityData.token1Amount
                      }
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      {loadingg ? (
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
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Recent Transactions
                      </h3>
                      <button
                        onClick={refreshHistory}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                      >
                        Refresh
                      </button>
                    </div>

                    {loading ? (
                      <div className="text-center py-8 text-gray-500">
                        <Activity
                          size={48}
                          className="mx-auto mb-4 opacity-50 animate-spin"
                        />
                        <p>Loading transactions...</p>
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Clock size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No transactions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
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
                                {tx.timestamp.toLocaleDateString()}{" "}
                                {tx.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-sm text-gray-700">
                              {tx.type === "swap" ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {tx.token0Amount}
                                  </span>
                                  <span className="text-gray-600">
                                    {tx.token0Symbol}
                                  </span>
                                  <ArrowDownUp
                                    size={12}
                                    className="mx-1 text-gray-400"
                                  />
                                  <span className="font-medium">
                                    {tx.token1Amount}
                                  </span>
                                  <span className="text-gray-600">
                                    {tx.token1Symbol}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>Added</span>
                                  <span className="font-medium">
                                    {tx.token0Amount}
                                  </span>
                                  <span className="text-gray-600">
                                    {tx.token0Symbol}
                                  </span>
                                  <span>+</span>
                                  <span className="font-medium">
                                    {tx.token1Amount}
                                  </span>
                                  <span className="text-gray-600">
                                    {tx.token1Symbol}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <div className="text-xs text-gray-500 font-mono truncate max-w-[200px] hover:max-w-full transition-all duration-300">
                                {tx.hash}
                              </div>
                              <a
                                href={`https://aware-fake-trim-testnet.explorer.testnet.skalenodes.com/tx/${tx.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                View on Explorer
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "mint" && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                      <h3 className="font-semibold text-blue-900 mb-2">
                        Token Minting
                      </h3>
                      <p className="text-sm text-blue-800">
                        Mint test tokens for development and testing purposes.
                      </p>
                    </div>

                    {/* USDC Minting */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900">Mint USDC</h4>
                      <div className="space-y-2">
                        <input
                          type="number"
                          placeholder="Amount to mint"
                          value={mintData.usdcAmount}
                          onChange={(e) =>
                            setMintData({
                              ...mintData,
                              usdcAmount: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => {
                            console.log("Mint Data:", mintData);
                            console.log("Minting Amount:", mintData.usdcAmount);
                            console.log(
                              "Minting Token Symbol:",
                              mintData.tokenSymbol
                            );
                            mintTokens(
                              mintData.usdcAmount,
                              mintData.tokenSymbol
                            );
                          }}
                          disabled={
                            !isConnected || loadingg || !mintData.usdcAmount
                          }
                          className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loadingg ? "Minting..." : "Mint USDC"}
                        </button>
                      </div>
                    </div>

                    {/* ABYTKN Minting */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900">
                        Mint ABYTKN
                      </h4>
                      <div className="space-y-2">
                        <input
                          type="number"
                          placeholder="Amount to mint"
                          value={mintData.abytknAmount}
                          onChange={(e) =>
                            setMintData({
                              ...mintData,
                              abytknAmount: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() =>
                            mintTokens(
                              mintData.abytknAmount,
                              mintData.tokenSymbol
                            )
                          }
                          disabled={
                            !isConnected || loadingg || !mintData.abytknAmount
                          }
                          className="w-full bg-purple-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loadingg ? "Minting..." : "Mint ABYTKN"}
                        </button>
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> Make sure your token contracts
                        have minting functionality enabled and you have the
                        required permissions.
                      </p>
                    </div>
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
                    <span className="font-medium text-gray-700">
                      {token === "TOKEN0"
                        ? "TOKEN0 (USDC)"
                        : token === "TOKEN1"
                        ? "TOKEN1 (ABYTKN)"
                        : token}
                    </span>
                    <span className="text-gray-500 truncate max-w-[150px]">
                      {balance}
                    </span>
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
                    <span className="font-medium text-gray-900 truncate max-w-[200px]">
                      {poolInfo.liquidity !== "0" ? poolInfo.liquidity : "N/A"}
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
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tick</span>
                    <span className="font-medium text-gray-900">
                      {poolInfo.tick}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sqrt Price X96</span>
                    <span className="font-medium text-gray-900 truncate max-w-[200px]">
                      {poolInfo.sqrtPriceX96}
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
                  <span className="font-mono truncate max-w-[300px]">
                    {txHash}
                  </span>
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
