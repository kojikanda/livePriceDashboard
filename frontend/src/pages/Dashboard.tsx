import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { DashboardProvider } from "../context/DashboardProvider";
import { SymbolPanel } from "../components/SymbolPanel";
import { PortfolioSimulator } from "../components/PortfolioSimulator";
import type { CryptoSymbol } from "../types/price";

const SYMBOLS: CryptoSymbol[] = ["BTC", "ETH", "SOL"];

export function Dashboard() {
  return (
    <DashboardProvider>
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" gutterBottom>
            Live Price Dashboard
          </Typography>

          {/* 3銘柄グリッド */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 2,
              alignItems: "start",
              "& > *": { minWidth: 0 },
            }}
          >
            {SYMBOLS.map((symbol) => (
              <SymbolPanel key={symbol} symbol={symbol} />
            ))}
          </Box>

          {/* 仮想ポートフォリオ */}
          <Accordion sx={{ mt: 2 }} disableGutters>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ bgcolor: "action.hover" }}
            >
              <Typography variant="h6">仮想ポートフォリオ</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <PortfolioSimulator />
            </AccordionDetails>
          </Accordion>
        </Box>
      </Container>
    </DashboardProvider>
  );
}
