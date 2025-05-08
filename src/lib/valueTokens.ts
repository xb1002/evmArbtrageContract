import { Token } from "./type";

// 这是arbitrum的计价token
export const valueTokens: Token[] = [
  // weth
  {
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
    address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    price: 1900,
  },
  //   usdc
  {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    price: 1,
  },
  //   USD₮0
  {
    name: "USD₮0",
    symbol: "USD₮0",
    decimals: 6,
    address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    price: 1,
  },
  //   wbtc
  {
    name: "Wrapped Bitcoin",
    symbol: "WBTC",
    decimals: 8,
    address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    price: 90000,
  },
];
