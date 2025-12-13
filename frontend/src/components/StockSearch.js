import React, { useState } from "react";

function StockSearch() {
  const [symbol, setSymbol] = useState("");
  const [stock, setStock] = useState(null);

  const fetchStock = async () => {
    try {
      const response = await fetch(`http://localhost:5000/stock/${symbol}`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setStock(data[0]); // data comes as an array
    } catch (error) {
      console.error("Error fetching stock:", error);
      alert("Could not fetch stock data.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Search Stock</h2>
      <input
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        placeholder="Enter symbol (e.g., AAPL)"
      />
      <button onClick={fetchStock}>Search</button>

      {stock && (
        <div>
          <h3>{stock.name}</h3>
          <p>Price: ${stock.price}</p>
          <p>Symbol: {stock.symbol}</p>
        </div>
      )}
    </div>
  );
}

export default StockSearch;
