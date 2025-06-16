import { Routes, Route } from "react-router-dom";
import UniswapTestUI from "./pages/Home";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<UniswapTestUI />} />
      </Routes>
    </>
  );
}

export default App;
