import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type HistoricalTradeModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (quantity: number) => void;
  side: "BUY" | "SELL";
  symbol: string;
  date: string;
  price: number;
  maxQuantity?: number;
};

const HistoricalTradeModal = ({
  open,
  onClose,
  onSubmit,
  side,
  symbol,
  date,
  price,
  maxQuantity = 0
}: HistoricalTradeModalProps) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setValue("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = () => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a positive quantity.");
      return;
    }

    if (side === "SELL" && parsed > maxQuantity + 1e-6) {
      setError(`You only hold ${maxQuantity.toFixed(2)} shares of ${symbol}.`);
      return;
    }

    setError(null);
    onSubmit(Number(parsed.toFixed(4)));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {side === "BUY" ? "Buy" : "Sell"} {symbol}
          </DialogTitle>
          <DialogDescription>
            {date ? `Trade will execute on ${date}` : "Select a date on the timeline to trade."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Historical price</span>
            <span className="font-semibold">₹{price.toFixed(2)}</span>
          </div>
          {side === "SELL" && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Available to sell</span>
              <span className="font-semibold">{maxQuantity.toFixed(2)} shares</span>
            </div>
          )}
          <Input
            autoFocus
            placeholder="Quantity (shares)"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Cannot submit trade</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {side === "BUY" ? "Buy" : "Sell"} now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HistoricalTradeModal;

