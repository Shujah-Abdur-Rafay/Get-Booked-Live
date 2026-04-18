import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Pen, Type, Eraser, CheckCircle, Loader2 } from "lucide-react";

type SignContractDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  venueName: string;
  eventDate: string;
  guarantee: number;
  onSigned: () => void;
};

export default function SignContractDialog({
  open, onOpenChange, bookingId, venueName, eventDate, guarantee, onSigned,
}: SignContractDialogProps) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [tab, setTab] = useState<string>("draw");
  const [submitting, setSubmitting] = useState(false);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#0E1420";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#C8FF3E";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    if (open && tab === "draw") {
      setTimeout(initCanvas, 50);
    }
  }, [open, tab, initCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    setIsDrawing(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const endDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    initCanvas();
    setHasDrawn(false);
  };

  const getSignatureData = (): string | null => {
    if (tab === "draw") {
      if (!hasDrawn || !canvasRef.current) return null;
      return canvasRef.current.toDataURL("image/png");
    }
    if (!typedName.trim()) return null;
    // Generate typed signature as canvas image
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#0E1420";
    ctx.fillRect(0, 0, 500, 120);
    ctx.fillStyle = "#C8FF3E";
    ctx.font = "italic 42px 'Georgia', serif";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName.trim(), 20, 60);
    return canvas.toDataURL("image/png");
  };

  const handleSign = async () => {
    if (!user) return;
    const sigData = getSignatureData();
    if (!sigData) {
      toast.error(tab === "draw" ? "Please draw your signature" : "Please type your name");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("contract_signatures").insert({
        booking_id: bookingId,
        user_id: user.id,
        signature_data: sigData,
        signature_type: tab,
      } as any);

      if (error) {
        if (error.code === "23505") {
          toast.error("You've already signed this contract");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Contract signed successfully!");
      onSigned();
      onOpenChange(false);
    } catch {
      toast.error("Failed to sign contract");
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = new Date(eventDate).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[hsl(var(--card))] border-white/[0.06] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-syne text-lg">Sign Contract</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Review and sign the performance agreement below.
          </DialogDescription>
        </DialogHeader>

        {/* Contract summary */}
        <div className="rounded-lg bg-background/50 border border-white/[0.06] p-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Venue</span>
            <span className="font-medium text-foreground">{venueName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium text-foreground">{formattedDate}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Guarantee</span>
            <span className="font-syne font-bold text-[hsl(var(--primary))]">${guarantee.toLocaleString()}</span>
          </div>
        </div>

        {/* Signature input */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-background/50">
            <TabsTrigger value="draw" className="gap-1.5 text-xs data-[state=active]:bg-[hsl(var(--primary))]/10 data-[state=active]:text-[hsl(var(--primary))]">
              <Pen className="w-3.5 h-3.5" /> Draw
            </TabsTrigger>
            <TabsTrigger value="typed" className="gap-1.5 text-xs data-[state=active]:bg-[hsl(var(--primary))]/10 data-[state=active]:text-[hsl(var(--primary))]">
              <Type className="w-3.5 h-3.5" /> Type
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-3">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="w-full h-[120px] rounded-lg border border-white/[0.06] cursor-crosshair touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={clearCanvas}
              >
                <Eraser className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Draw your signature above</p>
          </TabsContent>

          <TabsContent value="typed" className="mt-3 space-y-3">
            <Input
              placeholder="Type your full name"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              className="bg-background/50 border-white/[0.06]"
            />
            {typedName.trim() && (
              <div className="rounded-lg bg-[#0E1420] border border-white/[0.06] p-4 h-[80px] flex items-center">
                <span className="text-[hsl(var(--primary))] text-3xl italic font-serif select-none">
                  {typedName}
                </span>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Legal text */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          By signing, you agree to the terms outlined in this performance agreement. 
          This constitutes a legally binding electronic signature under applicable e-sign laws.
        </p>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1 border-white/[0.06] active:scale-[0.97] transition-transform"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90 active:scale-[0.97] transition-transform"
            onClick={handleSign}
            disabled={submitting || (tab === "draw" && !hasDrawn) || (tab === "typed" && !typedName.trim())}
          >
            {submitting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Signing...</>
            ) : (
              <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Sign Contract</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
