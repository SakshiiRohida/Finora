export const stockUniverseFallback = [
  { symbol: "RELIANCE", name: "Reliance Industries" },
  { symbol: "TCS", name: "TCS" },
  { symbol: "INFY", name: "Infosys" },
  { symbol: "HDFCBANK", name: "HDFC Bank" },
  { symbol: "ICICIBANK", name: "ICICI Bank" },
  { symbol: "SBIN", name: "State Bank of India" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank" },
  { symbol: "AXISBANK", name: "Axis Bank" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever" },
  { symbol: "ITC", name: "ITC" }
];

export type StockUniverseEntry = (typeof stockUniverseFallback)[number] & {
  symbol: string;
  name: string;
};





