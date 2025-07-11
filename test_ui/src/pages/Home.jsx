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
  RefreshCw,
  Minus,
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
import RemoveLiquidity from "../components/removeLiquidity";
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
  const [poolPrice, setPoolPrice] = useState(1000);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [isInitialRatio, setIsInitialRatio] = useState(true);

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
  const loadPoolInfo = async () => {
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
          ? ethers.formatUnits(poolInfo[2], 18)
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
          balances[0] !== undefined ? ethers.formatUnits(balances[0], 18) : "0";
        poolData.token1Balance =
          balances[1] !== undefined ? ethers.formatUnits(balances[1], 18) : "0";
      } catch (err) {
        console.log("Error getting pool balances:", err.message);
        poolData.token0Balance = "N/A";
        poolData.token1Balance = "N/A";
      }

      try {
        const token0Price = await contract.getTokenPrice(poolAddress);
        poolData.token0Price =
          token0Price !== undefined
            ? ethers.formatUnits(token0Price, 18)
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

      // Get the current pool price for liquidity provision
      const priceData = await getCurrentPoolPrice(contract);
      setPoolPrice(priceData.price);
      setIsInitialRatio(priceData.isInitialRatio);

      console.log("Pool Info:", poolInfo);
      console.log("Pool Balances:", balances);
      console.log("Current Pool Price:", priceData);

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
  };

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
  }, [isConnected, address, loadBalances]);

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

  const getCurrentPoolPrice = async (contract) => {
    try {
      const poolAddress = CONTRACT_ADDRESSES.UNISWAP_POOL;

      if (
        !poolAddress ||
        poolAddress === "0x0000000000000000000000000000000000000000"
      ) {
        console.log("No pool address configured - using initial ratio");
        return { price: 1000, isInitialRatio: true };
      }

      console.log("Using pool address:", poolAddress);

      // Try direct pool contract call using tick value instead
      try {
        const poolInterface = new ethers.Interface([
          "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
          "function token0() view returns (address)",
          "function token1() view returns (address)",
          "function liquidity() view returns (uint128)",
        ]);

        const poolContract = new ethers.Contract(
          poolAddress,
          poolInterface,
          contract.runner
        );

        // Get slot0 data which contains tick and sqrtPriceX96
        const slot0 = await poolContract.slot0();
        const poolToken0 = await poolContract.token0();
        const poolToken1 = await poolContract.token1();

        // Get liquidity to check if pool has been initialized
        const liquidity = await poolContract.liquidity();

        console.log("Pool data:", {
          sqrtPriceX96: slot0.sqrtPriceX96.toString(),
          tick: slot0.tick.toString(),
          poolToken0,
          poolToken1,
          liquidity: liquidity.toString(),
        });

        // Check if pool has liquidity
        if (liquidity.toString() === "0" && !slot0.tick) {
          console.log("Pool has no liquidity - using initial ratio");
          return { price: 1000, isInitialRatio: true };
        }

        // Use the tick value to calculate price (more accurate than sqrtPriceX96 for display)
        const tick = parseInt(slot0.tick.toString());
        let rawPrice = Math.pow(1.0001, tick);

        console.log("Raw price from tick:", rawPrice);

        // Get token contracts to check decimals
        const token0Contract = new ethers.Contract(
          poolToken0,
          USDC_ABI.abi, // Using as generic ERC20 ABI
          contract.runner
        );

        const token1Contract = new ethers.Contract(
          poolToken1,
          ABYTKN_ABI.abi, // Using as generic ERC20 ABI
          contract.runner
        );

        // Get decimals
        const token0Decimals = await token0Contract.decimals();
        const token1Decimals = await token1Contract.decimals();

        console.log("Token decimals:", {
          token0: token0Decimals,
          token1: token1Decimals,
        });

        // Adjust for decimal differences
        const decimalAdjustment = Math.pow(10, token1Decimals - token0Decimals);
        rawPrice = rawPrice * decimalAdjustment;

        console.log("Price after decimal adjustment:", rawPrice);

        // Check token ordering to determine if we need to invert
        const token0IsUsdc =
          poolToken0.toLowerCase() === CONTRACT_ADDRESSES.TOKEN0.toLowerCase();

        let finalPrice;
        if (token0IsUsdc) {
          // If USDC is token0, price is USDC/ABYTKN, but we want ABYTKN/USDC
          finalPrice = 1 / rawPrice;
        } else {
          // If ABYTKN is token0, price is ABYTKN/USDC which is what we want
          finalPrice = rawPrice;
        }

        console.log("Final calculated price (ABYTKN per USDC):", finalPrice);

        // Sanity check
        if (finalPrice > 0 && finalPrice < 1000000) {
          return { price: finalPrice, isInitialRatio: false };
        } else {
          console.warn("Price outside reasonable range:", finalPrice);
          return { price: 1000, isInitialRatio: true };
        }
      } catch (directError) {
        console.log("Error with direct pool call:", directError.message);
      }

      // Fallback to contract methods if direct call fails
      try {
        const poolInfo = await contract.getPoolInfo(poolAddress);
        if (poolInfo && poolInfo.length > 1) {
          const tick = parseInt(poolInfo[1].toString());
          console.log("Pool tick from contract:", tick);

          // Calculate price from tick
          const rawPrice = Math.pow(1.0001, tick);

          // Check token ordering
          const contractToken0 = await contract.token0();
          const token0IsUsdc =
            contractToken0.toLowerCase() ===
            CONTRACT_ADDRESSES.TOKEN0.toLowerCase();

          // Adjust based on token order
          const price = token0IsUsdc ? 1 / rawPrice : rawPrice;

          console.log("Contract method calculated price:", price);

          if (price > 0 && price < 1000000) {
            return { price, isInitialRatio: false };
          }
        }
      } catch (contractError) {
        console.log("Error using contract method:", contractError.message);
      }

      // Final fallback
      console.log("All methods failed, using initial ratio");
      return { price: 1000, isInitialRatio: true };
    } catch (error) {
      console.error("Error fetching pool price:", error);
      return { price: 1000, isInitialRatio: true };
    }
  };

  const fetchPoolPrice = async () => {
    if (!isConnected) return;

    setIsLoadingPrice(true);
    try {
      const signer = await signerPromise;
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
        contractAbi,
        signer
      );

      const priceData = await getCurrentPoolPrice(contract);
      setPoolPrice(priceData.price);
      setIsInitialRatio(priceData.isInitialRatio);

      console.log("Pool price fetched:", priceData);
    } catch (error) {
      console.error("Error fetching pool price:", error);
    } finally {
      setIsLoadingPrice(false);
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

      // Initialize the contract
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
        contractAbi,
        signer
      );

      // Get contract token addresses
      const contractToken0Address = await contract.token0();
      const contractToken1Address = await contract.token1();

      console.log("Token addresses:", {
        contract: {
          token0: contractToken0Address,
          token1: contractToken1Address,
        },
        config: {
          token0: CONTRACT_ADDRESSES.TOKEN0,
          token1: CONTRACT_ADDRESSES.TOKEN1,
        },
      });

      // Get token contracts
      const token0Contract = new ethers.Contract(
        contractToken0Address,
        USDC_ABI.abi, // Using as generic ERC20 ABI
        signer
      );

      const token1Contract = new ethers.Contract(
        contractToken1Address,
        ABYTKN_ABI.abi, // Using as generic ERC20 ABI
        signer
      );

      // Get token details
      const token0Symbol = await token0Contract.symbol();
      const token1Symbol = await token1Contract.symbol();
      const token0Decimals = await token0Contract.decimals();
      const token1Decimals = await token1Contract.decimals();

      console.log("Token details:", {
        token0: {
          address: contractToken0Address,
          symbol: token0Symbol,
          decimals: token0Decimals,
        },
        token1: {
          address: contractToken1Address,
          symbol: token1Symbol,
          decimals: token1Decimals,
        },
      });

      // Determine which token is which in contract vs UI
      const token0IsUsdc =
        contractToken0Address.toLowerCase() ===
        CONTRACT_ADDRESSES.TOKEN0.toLowerCase();

      // Prepare the amounts based on token order
      let amount0Desired, amount1Desired;
      if (token0IsUsdc) {
        amount0Desired = ethers.parseUnits(
          liquidityData.token0Amount.toString(),
          token0Decimals
        );
        amount1Desired = ethers.parseUnits(
          liquidityData.token1Amount.toString(),
          token1Decimals
        );
      } else {
        amount0Desired = ethers.parseUnits(
          liquidityData.token1Amount.toString(),
          token0Decimals
        );
        amount1Desired = ethers.parseUnits(
          liquidityData.token0Amount.toString(),
          token1Decimals
        );
      }

      console.log("Liquidity amounts:", {
        amount0: {
          token: token0Symbol,
          value: ethers.formatUnits(amount0Desired, token0Decimals),
        },
        amount1: {
          token: token1Symbol,
          value: ethers.formatUnits(amount1Desired, token1Decimals),
        },
      });

      // Check balances
      const balance0 = await token0Contract.balanceOf(address);
      const balance1 = await token1Contract.balanceOf(address);

      console.log("Current balances:", {
        [token0Symbol]: ethers.formatUnits(balance0, token0Decimals),
        [token1Symbol]: ethers.formatUnits(balance1, token1Decimals),
      });

      // Check if balances are sufficient
      if (balance0 < amount0Desired) {
        setError(`Insufficient ${token0Symbol} balance`);
        setLoading(false);
        return;
      }

      if (balance1 < amount1Desired) {
        setError(`Insufficient ${token1Symbol} balance`);
        setLoading(false);
        return;
      }

      // Check and approve allowances
      const allowance0 = await token0Contract.allowance(
        address,
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT
      );
      const allowance1 = await token1Contract.allowance(
        address,
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT
      );

      console.log("Current allowances:", {
        [token0Symbol]: ethers.formatUnits(allowance0, token0Decimals),
        [token1Symbol]: ethers.formatUnits(allowance1, token1Decimals),
      });

      // Approve token0 if needed
      if (allowance0 < amount0Desired) {
        console.log(`Approving ${token0Symbol}...`);
        const tx0 = await token0Contract.approve(
          CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
          ethers.MaxUint256
        );
        await tx0.wait();
        console.log(`${token0Symbol} approved`);
      }

      // Approve token1 if needed
      if (allowance1 < amount1Desired) {
        console.log(`Approving ${token1Symbol}...`);
        const tx1 = await token1Contract.approve(
          CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
          ethers.MaxUint256
        );
        await tx1.wait();
        console.log(`${token1Symbol} approved`);
      }

      // Add liquidity
      console.log("Adding liquidity...");

      // Try to estimate gas first
      try {
        const gasEstimate = await contract.estimateGas.addLiquidity(
          amount0Desired,
          amount1Desired
        );
        console.log("Gas estimate:", gasEstimate.toString());

        // Add 20% buffer to gas estimate
        const gasLimit = (gasEstimate * 120n) / 100n;

        const tx = await contract.addLiquidity(amount0Desired, amount1Desired, {
          gasLimit: gasLimit,
        });

        setTxHash(tx.hash);
        console.log("Transaction sent:", tx.hash);

        const receipt = await tx.wait();
        console.log("Transaction receipt:", receipt);

        if (receipt.status === 1) {
          setSuccess("Liquidity added successfully!");
          setLiquidityData({
            token0Amount: "",
            token1Amount: "",
          });
          loadBalances();
          if (typeof refreshHistory === "function") {
            refreshHistory();
          }
        } else {
          setError("Transaction failed");
        }
      } catch (gasError) {
        console.warn("Gas estimation failed:", gasError);

        // If gas estimation fails, try with fixed gas limit
        const tx = await contract.addLiquidity(amount0Desired, amount1Desired, {
          gasLimit: 1500000, // Set high fixed gas limit
        });

        setTxHash(tx.hash);
        console.log("Transaction sent with fixed gas limit:", tx.hash);

        const receipt = await tx.wait();
        console.log("Transaction receipt:", receipt);

        if (receipt.status === 1) {
          setSuccess("Liquidity added successfully!");
          setLiquidityData({
            token0Amount: "",
            token1Amount: "",
          });
          loadBalances();
          if (typeof refreshHistory === "function") {
            refreshHistory();
          }
        } else {
          setError("Transaction failed");
        }
      }
    } catch (error) {
      console.error("Add liquidity failed:", error);

      let errorMsg = "Failed to add liquidity";

      if (error.reason) {
        errorMsg += `: ${error.reason}`;
      } else if (error.message) {
        if (error.message.includes("user rejected")) {
          errorMsg = "Transaction rejected by user";
        } else if (error.message.includes("insufficient funds")) {
          errorMsg = "Insufficient funds for gas";
        } else if (error.message.includes("execution reverted")) {
          errorMsg = "Transaction reverted by contract";

          // Try to extract more information from the error
          if (error.data) {
            errorMsg += ` - ${error.data}`;
          } else if (error.error && error.error.data) {
            errorMsg += ` - ${error.error.data}`;
          }
        } else {
          errorMsg += `: ${error.message}`;
        }
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setSuccess("");
        setError("");
      }, 5000);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchPoolPrice();
    }
  }, [isConnected]);

  const refreshPoolPrice = async () => {
    if (!signerPromise) return;

    setIsLoadingPrice(true);
    try {
      const signer = await signerPromise;
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
        contractAbi,
        signer
      );

      // Get the pool price
      const tokenPrice = await contract.getTokenPrice(
        CONTRACT_ADDRESSES.UNISWAP_POOL
      );

      if (tokenPrice) {
        // The contract's getTokenPrice might return different format based on token order
        // Let's check what the actual token order is
        const contractToken0 = await contract.token0();
        const contractToken1 = await contract.token1();

        // Contract token0 is your config TOKEN1 (ABYTKN)
        // Contract token1 is your config TOKEN0 (USDC)

        // If getTokenPrice returns price of token1 in terms of token0
        // That would be USDC price in terms of ABYTKN
        // But we want ABYTKN price in terms of USDC for the UI

        let formattedPrice = parseFloat(ethers.formatUnits(tokenPrice, 18));

        // Check if we need to invert the price
        const contractToken0IsABYTKN =
          contractToken0.toLowerCase() ===
          CONTRACT_ADDRESSES.TOKEN1.toLowerCase();

        if (contractToken0IsABYTKN) {
          // If contract token0 is ABYTKN, then the price might be USDC per ABYTKN
          // We want ABYTKN per USDC, so we need to invert
          if (formattedPrice > 0) {
            formattedPrice = 1 / formattedPrice;
          }
        }

        console.log("Refreshed pool price:", formattedPrice);
        setPoolPrice(formattedPrice);
        setIsInitialRatio(false);
      }
    } catch (error) {
      console.error("Error refreshing pool price:", error);
      // Fallback to a reasonable default
      setPoolPrice(1000); // 1000 ABYTKN per USDC
      setIsInitialRatio(true);
    } finally {
      setIsLoadingPrice(false);
    }
  };

  const handleUSDCAmountChangeWithPoolPrice = async (value, poolPrice) => {
    // Since your UI shows USDC as token0 but contract has it as token1,
    // we need to handle this correctly
    const newLiquidityData = {
      ...liquidityData,
      token0Amount: value, // This is USDC amount in your UI
      token1Amount:
        value && poolPrice ? (parseFloat(value) * poolPrice).toFixed(6) : "", // This is ABYTKN amount in your UI
    };

    setLiquidityData(newLiquidityData);
  };

  const handleABYTKNAmountChangeWithPoolPrice = async (value, poolPrice) => {
    // Since your UI shows ABYTKN as token1 but contract has it as token0,
    // we need to handle this correctly
    const newLiquidityData = {
      ...liquidityData,
      token1Amount: value, // This is ABYTKN amount in your UI
      token0Amount:
        value && poolPrice ? (parseFloat(value) / poolPrice).toFixed(6) : "", // This is USDC amount in your UI
    };

    setLiquidityData(newLiquidityData);
  };

  // Helper function to calculate and validate ratio
  const calculateRatioWithPoolPrice = (
    token0Amount,
    token1Amount,
    poolPrice
  ) => {
    if (!token0Amount || !token1Amount || !poolPrice) return null;

    const amount0 = parseFloat(token0Amount); // USDC amount (from UI)
    const amount1 = parseFloat(token1Amount); // ABYTKN amount (from UI)

    if (amount0 <= 0 || amount1 <= 0) return null;

    const currentRatio = amount1 / amount0; // ABYTKN per USDC (UI ratio)
    const tolerance = 0.05; // 5% tolerance

    const isValidRatio =
      Math.abs(currentRatio - poolPrice) / poolPrice <= tolerance;

    return {
      ratio: currentRatio,
      poolPrice: poolPrice,
      isValidRatio,
      tolerance,
      suggestedToken1Amount: (amount0 * poolPrice).toFixed(6), // Suggested ABYTKN amount
      suggestedToken0Amount: (amount1 / poolPrice).toFixed(6), // Suggested USDC amount
      priceDifference: (((currentRatio - poolPrice) / poolPrice) * 100).toFixed(
        2
      ),
    };
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
        const maxAmount = balances.TOKEN0;
        handleUSDCAmountChangeWithPoolPrice(maxAmount, poolPrice);
        setLiquidityData({ ...liquidityData, token0Amount: balance });
      } else {
        const maxAmount = balances.TOKEN1;
        handleABYTKNAmountChangeWithPoolPrice(maxAmount, poolPrice);
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

  const debugPoolConnection = async () => {
    console.log("=== DEBUGGING POOL CONNECTION ===");

    try {
      const signer = await signerPromise;
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
        contractAbi,
        signer
      );

      // 1. Check contract addresses
      console.log("Contract Addresses:", {
        addSwapContract: CONTRACT_ADDRESSES.ADD_SWAP_CONTRACT,
        uniswapPool: CONTRACT_ADDRESSES.UNISWAP_POOL,
        token0: CONTRACT_ADDRESSES.TOKEN0,
        token1: CONTRACT_ADDRESSES.TOKEN1,
      });

      // 2. Get contract's token addresses
      try {
        const contractToken0 = await contract.token0();
        const contractToken1 = await contract.token1();
        console.log("Contract tokens:", {
          token0: contractToken0,
          token1: contractToken1,
        });
      } catch (error) {
        console.error("Error getting contract tokens:", error);
      }

      // 3. Test your existing getPoolInfo function
      try {
        const poolInfo = await contract
          .getPoolInfo
          // CONTRACT_ADDRESSES.UNISWAP_POOL
          ();
        console.log("getPoolInfo result:", poolInfo);

        if (poolInfo && poolInfo.length > 0) {
          console.log("Pool info details:", {
            sqrtPriceX96: poolInfo[0]?.toString(),
            tick: poolInfo[1]?.toString(),
            liquidity: poolInfo[2]?.toString(),
          });
        }
      } catch (error) {
        console.error("Error with getPoolInfo:", error);
      }

      // 4. Test your existing getTokenPrice function
      try {
        const tokenPrice = await contract
          .getTokenPrice
          // CONTRACT_ADDRESSES.UNISWAP_POOL
          ();
        console.log("getTokenPrice result:", tokenPrice?.toString());

        if (tokenPrice) {
          const priceFormatted = ethers.formatUnits(tokenPrice, 18);
          console.log("Token price formatted:", priceFormatted);
        }
      } catch (error) {
        console.error("Error with getTokenPrice:", error);
      }

      // 5. Test direct pool contract call
      try {
        const poolInterface = new ethers.Interface([
          "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
          "function token0() view returns (address)",
          "function token1() view returns (address)",
          "function liquidity() view returns (uint128)",
        ]);

        const poolContract = new ethers.Contract(
          CONTRACT_ADDRESSES.UNISWAP_POOL,
          poolInterface,
          signer
        );

        const slot0 = await poolContract.slot0();
        const poolToken0 = await poolContract.token0();
        const poolToken1 = await poolContract.token1();
        const liquidity = await poolContract.liquidity();

        console.log("Direct pool contract results:", {
          sqrtPriceX96: slot0.sqrtPriceX96.toString(),
          tick: slot0.tick.toString(),
          token0: poolToken0,
          token1: poolToken1,
          liquidity: liquidity.toString(),
        });

        // Check if this is actually a valid pool with liquidity
        if (liquidity.toString() !== "0") {
          console.log("✅ Pool has liquidity - should be able to get price");

          // Calculate price from sqrtPriceX96 - FIXED VERSION
          const Q96 = 2n ** 96n; // Using BigInt instead of BigNumber
          const sqrtPriceX96 = BigInt(slot0.sqrtPriceX96.toString());

          // Calculate price = (sqrtPriceX96 / 2^96)^2
          const priceRaw = (sqrtPriceX96 * sqrtPriceX96) / (Q96 * Q96);

          console.log("Price calculation:", {
            sqrtPriceX96: sqrtPriceX96.toString(),
            Q96: Q96.toString(),
            priceRaw: priceRaw.toString(),
          });

          // Get token decimals for proper formatting
          const token0Contract = new ethers.Contract(
            poolToken0,
            [
              "function decimals() view returns (uint8)",
              "function symbol() view returns (string)",
            ],
            signer
          );

          const token1Contract = new ethers.Contract(
            poolToken1,
            [
              "function decimals() view returns (uint8)",
              "function symbol() view returns (string)",
            ],
            signer
          );

          const token0Decimals = await token0Contract.decimals();
          const token1Decimals = await token1Contract.decimals();
          const token0Symbol = await token0Contract.symbol();
          const token1Symbol = await token1Contract.symbol();

          console.log("Token info:", {
            token0: { symbol: token0Symbol, decimals: token0Decimals },
            token1: { symbol: token1Symbol, decimals: token1Decimals },
          });

          // Adjust for decimal differences
          const decimalDifference = token1Decimals - token0Decimals;
          let adjustedPrice = priceRaw;

          if (decimalDifference > 0) {
            adjustedPrice = priceRaw / 10n ** BigInt(decimalDifference);
          } else if (decimalDifference < 0) {
            adjustedPrice = priceRaw * 10n ** BigInt(-decimalDifference);
          }

          console.log("Adjusted price:", adjustedPrice.toString());

          // Convert to readable format
          const priceFormatted = Number(adjustedPrice) / Math.pow(10, 18);
          console.log(
            `Price of ${token1Symbol} in terms of ${token0Symbol}:`,
            priceFormatted
          );

          // Determine which token is which based on your config
          const token0IsYourToken0 =
            poolToken0.toLowerCase() ===
            CONTRACT_ADDRESSES.TOKEN0.toLowerCase();

          if (token0IsYourToken0) {
            console.log(`✅ Token order matches config`);
            console.log(
              `Price: 1 ${token1Symbol} = ${priceFormatted} ${token0Symbol}`
            );
          } else {
            console.log(`⚠️  Token order is reversed from config`);
            console.log(
              `Price: 1 ${token0Symbol} = ${priceFormatted} ${token1Symbol}`
            );
            if (priceFormatted > 0) {
              console.log(
                `Inverse price: 1 ${token1Symbol} = ${
                  1 / priceFormatted
                } ${token0Symbol}`
              );
            }
          }
        } else {
          console.log(
            "❌ Pool has no liquidity - this might be why price fetching fails"
          );
        }
      } catch (error) {
        console.error("Error with direct pool call:", error);
      }

      // 6. Test if the pool address is actually correct
      try {
        const code = await signer.provider.getCode(
          CONTRACT_ADDRESSES.UNISWAP_POOL
        );
        if (code === "0x") {
          console.log(
            "❌ Pool address has no contract code - address might be wrong"
          );
        } else {
          console.log("✅ Pool address has contract code");
        }
      } catch (error) {
        console.error("Error checking pool code:", error);
      }
    } catch (error) {
      console.error("Debug function error:", error);
    }

    console.log("=== END DEBUG ===");
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
                  onClick={() => setActiveTab("removeLiquidity")}
                  className={`flex-1 px-6 py-4 font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === "removeLiquidity"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Minus size={20} />
                  Remove Liquidity
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
                    {/* Token Order Info - Add this for clarity */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <div className="flex items-center gap-2">
                        <Info size={16} className="text-yellow-600" />
                        <div>
                          <p className="text-sm text-yellow-800 font-medium">
                            Pool Token Order
                          </p>
                          <p className="text-xs text-yellow-700">
                            Contract Token0: ABYTKN • Contract Token1: USDC
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Pool Price Display */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-800">
                            <strong>Current Pool Price:</strong>{" "}
                            {isLoadingPrice ? (
                              <span className="animate-pulse">Loading...</span>
                            ) : (
                              <>
                                {poolPrice.toFixed(2)} ABYTKN per USDC
                                {isInitialRatio && (
                                  <span className="text-xs text-orange-600 ml-2">
                                    (Initial Ratio - Pool may not exist yet)
                                  </span>
                                )}
                              </>
                            )}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            Fee Tier: 0.05% (500) • Full Range Liquidity
                          </p>
                        </div>
                        <button
                          onClick={refreshPoolPrice}
                          disabled={isLoadingPrice}
                          className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50"
                          title="Refresh pool price"
                        >
                          <RefreshCw
                            size={16}
                            className={isLoadingPrice ? "animate-spin" : ""}
                          />
                        </button>
                      </div>
                    </div>

                    {/* USDC Amount Input */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-gray-700">
                          USDC Amount
                          <span className="text-xs text-gray-500 ml-1">
                            (Contract Token1)
                          </span>
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
                            handleUSDCAmountChangeWithPoolPrice(
                              e.target.value,
                              poolPrice
                            )
                          }
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-24"
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white border border-gray-300 rounded-lg px-3 py-1 text-sm font-semibold">
                          USDC
                        </div>
                      </div>
                    </div>

                    {/* ABYTKN Amount Input */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-gray-700">
                          ABYTKN Amount
                          <span className="text-xs text-gray-500 ml-1">
                            (Contract Token0)
                          </span>
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
                            handleABYTKNAmountChangeWithPoolPrice(
                              e.target.value,
                              poolPrice
                            )
                          }
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-24"
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white border border-gray-300 rounded-lg px-3 py-1 text-sm font-semibold">
                          ABYTKN
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Ratio Validation Display */}
                    {liquidityData.token0Amount &&
                      liquidityData.token1Amount && (
                        <div className="space-y-3">
                          {(() => {
                            const ratioValidation = calculateRatioWithPoolPrice(
                              liquidityData.token0Amount,
                              liquidityData.token1Amount,
                              poolPrice
                            );

                            if (!ratioValidation) return null;

                            const isValid =
                              ratioValidation.isValidRatio || isInitialRatio;

                            return (
                              <div
                                className={`border rounded-xl p-4 ${
                                  isValid
                                    ? "bg-green-50 border-green-200"
                                    : "bg-red-50 border-red-200"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`w-2 h-2 rounded-full mt-2 ${
                                      isValid ? "bg-green-500" : "bg-red-500"
                                    }`}
                                  ></div>
                                  <div className="flex-1">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <p
                                          className={`font-semibold ${
                                            isValid
                                              ? "text-green-800"
                                              : "text-red-800"
                                          }`}
                                        >
                                          Your Ratio
                                        </p>
                                        <p
                                          className={
                                            isValid
                                              ? "text-green-700"
                                              : "text-red-700"
                                          }
                                        >
                                          {ratioValidation.ratio.toFixed(2)}{" "}
                                          ABYTKN/USDC
                                        </p>
                                      </div>
                                      <div>
                                        <p
                                          className={`font-semibold ${
                                            isValid
                                              ? "text-green-800"
                                              : "text-red-800"
                                          }`}
                                        >
                                          Pool Price
                                        </p>
                                        <p
                                          className={
                                            isValid
                                              ? "text-green-700"
                                              : "text-red-700"
                                          }
                                        >
                                          {poolPrice.toFixed(2)} ABYTKN/USDC
                                        </p>
                                      </div>
                                    </div>

                                    {!isValid && !isInitialRatio && (
                                      <div className="mt-3 p-3 bg-red-100 rounded-lg">
                                        <p className="text-red-800 text-sm font-semibold">
                                          Price Difference:{" "}
                                          {ratioValidation.priceDifference}%
                                        </p>
                                        <p className="text-red-700 text-xs mt-1">
                                          Consider adjusting your amounts:
                                        </p>
                                        <div className="mt-2 space-y-1 text-xs">
                                          <p className="text-red-600">
                                            • For {liquidityData.token0Amount}{" "}
                                            USDC → Use{" "}
                                            {
                                              ratioValidation.suggestedToken1Amount
                                            }{" "}
                                            ABYTKN
                                          </p>
                                          <p className="text-red-600">
                                            • For {liquidityData.token1Amount}{" "}
                                            ABYTKN → Use{" "}
                                            {
                                              ratioValidation.suggestedToken0Amount
                                            }{" "}
                                            USDC
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {isValid && (
                                      <div className="mt-2">
                                        <p
                                          className={`text-xs ${
                                            isValid
                                              ? "text-green-600"
                                              : "text-red-600"
                                          }`}
                                        >
                                          {isInitialRatio
                                            ? "✅ Using initial pool ratio (pool may not exist yet)"
                                            : "✅ Ratio matches current pool price within tolerance"}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                    {/* Quick Ratio Buttons */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        Quick Add
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { usdc: "100", label: "$100" },
                          { usdc: "500", label: "$500" },
                          { usdc: "1000", label: "$1000" },
                        ].map((preset, index) => (
                          <button
                            key={index}
                            onClick={() =>
                              handleUSDCAmountChangeWithPoolPrice(
                                preset.usdc,
                                poolPrice
                              )
                            }
                            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Add Liquidity Button */}
                    <button
                      onClick={handleAddLiquidity}
                      disabled={
                        !isConnected ||
                        loading ||
                        !liquidityData.token0Amount ||
                        !liquidityData.token1Amount ||
                        (!calculateRatioWithPoolPrice(
                          liquidityData.token0Amount,
                          liquidityData.token1Amount,
                          poolPrice
                        )?.isValidRatio &&
                          !isInitialRatio)
                      }
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 hover:cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Activity className="animate-spin" size={20} />
                          Adding Liquidity...
                        </>
                      ) : isLoadingPrice ? (
                        <>
                          <RefreshCw className="animate-spin" size={20} />
                          Loading Pool Price...
                        </>
                      ) : !calculateRatioWithPoolPrice(
                          liquidityData.token0Amount,
                          liquidityData.token1Amount,
                          poolPrice
                        )?.isValidRatio &&
                        !isInitialRatio &&
                        liquidityData.token0Amount &&
                        liquidityData.token1Amount ? (
                        "Adjust Ratio to Match Pool Price"
                      ) : (
                        <>
                          <Plus size={20} />
                          Add Liquidity
                        </>
                      )}
                    </button>

                    {/* Debug and Test Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={debugPoolConnection}
                        className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                      >
                        Debug Pool Connection
                      </button>
                      <button
                        onClick={refreshPoolPrice}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Refresh Price
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "removeLiquidity" && <RemoveLiquidity />}

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
                        {[...transactions]
                          .sort((a, b) => b.timestamp - a.timestamp) // Sort by timestamp, newest first
                          .map((tx) => (
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
                                    <Plus
                                      size={16}
                                      className="text-green-600"
                                    />
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
                  <span className="font-mono truncate w-[200px] relative text-wrap">
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
