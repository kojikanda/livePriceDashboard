import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Typography, Box } from "@mui/material";

const socket = io("http://localhost:3001");

function App() {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    // イベント名: btcPriceでWebSocket通信実行
    socket.on("btcPrice", (data: { price: number }) => {
      setPrice(data.price);
    });

    return () => {
      socket.off("btcPrice");
    };
  }, []);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4">BTC Price</Typography>
      <Typography variant="h2">
        {price !== null ? `$${price.toLocaleString()}` : "接続中..."}
      </Typography>
    </Box>
  );
}

export default App;
