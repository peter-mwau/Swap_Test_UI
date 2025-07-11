import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import Providers from "./providers/Provider.jsx";
import { TransactionHistoryProvider } from "./contexts/historyContext.jsx";
import { UserPositionProvider } from "./contexts/userPositionContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Providers>
        <TransactionHistoryProvider>
          <UserPositionProvider>
            <App />
          </UserPositionProvider>
        </TransactionHistoryProvider>
      </Providers>
    </BrowserRouter>
  </StrictMode>
);
