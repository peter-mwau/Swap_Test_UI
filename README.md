# Swap Test UI

Swap Test UI is a React-based decentralized application (dApp) designed to interact with a local Uniswap deployment. It provides a user-friendly interface for swapping tokens, adding liquidity, and viewing transaction history.

## Features

- **Token Swapping**: Easily swap between two tokens with real-time price impact and slippage tolerance settings.
- **Liquidity Management**: Add liquidity to the pool with full-range liquidity support.
- **Wallet Integration**: Connect your wallet using MetaMask for seamless interaction.
- **Transaction History**: View recent transactions with detailed information.
- **Pool Information**: Access liquidity, volume, fees, APR, and token prices.

## Technologies Used

- **React**: Frontend framework for building the user interface.
- **Vite**: Fast development environment for React applications.
- **TailwindCSS**: Utility-first CSS framework for styling.
- **Ethers.js**: Library for interacting with Ethereum blockchain.
- **Lucide React**: Icon library for React.

## Setup Instructions

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repo/swap-test-ui.git
   cd swap-test-ui
   ```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open the application in your browser at http://localhost:3000.

## Configuration

- Update the contract addresses in Home.jsx to match your local deployment.
- Ensure MetaMask is installed and connected to the correct network.

## License

- This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgments

- `Uniswap` for the decentralized exchange protocol.
- `Vite` for the development environment.
- `TailwindCSS` for styling utilities.
- `Ethers.js` for blockchain interaction.
