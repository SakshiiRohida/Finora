import React from "react";
import LearnList from "./components/LearnList";
import StockSearch from "./components/StockSearch";

function App() {
  return (
    <div style={{ fontFamily: "Arial", padding: "20px" }}>
      <h1>Finora</h1>
      <p>Your guide to smart investing</p>

      <h2>📘 Learn</h2>
      <LearnList />

      <h2>📊 Stock Search</h2>
      <StockSearch />
    </div>
  );
}

export default App;
