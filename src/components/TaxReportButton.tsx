import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TaxReportButton() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("tax-report", {
        body: { user_id: user.id },
      });

      if (error) throw error;

      if (data?.pdf_base64) {
        const byteChars = atob(data.pdf_base64);
        const byteArray = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteArray[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `quarterly-profit-summary-${new Date().toISOString().slice(0, 7)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Report downloaded!");
      }
    } catch (err: any) {
      toast.error("Failed to generate report: " + (err.message || "Unknown error"));
    }
    setLoading(false);
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={generateReport}
      disabled={loading}
      className="border-border text-muted-foreground hover:text-foreground active:scale-[0.97] transition-transform"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1" />}
      Export Quarterly PDF
    </Button>
  );
}
