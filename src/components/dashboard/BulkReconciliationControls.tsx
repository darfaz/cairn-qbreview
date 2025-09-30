import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlayCircle, Loader2 } from "lucide-react";
import { triggerBulkReviews } from "@/lib/reviews";
import { toast } from "sonner";

interface BulkReconciliationControlsProps {
  selectedClientIds: string[];
  onSelectionChange: (clientIds: string[]) => void;
  totalClients: number;
  allClientIds: string[];
}

export function BulkReconciliationControls({ 
  selectedClientIds, 
  onSelectionChange, 
  totalClients,
  allClientIds
}: BulkReconciliationControlsProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [showRunAllDialog, setShowRunAllDialog] = useState(false);

  const handleRunSelected = async () => {
    if (selectedClientIds.length === 0) return;
    
    setIsRunning(true);
    setProgress({ completed: 0, total: selectedClientIds.length });
    
    try {
      const results = await triggerBulkReviews(selectedClientIds);
      
      // Update progress as we go
      results.forEach((_, index) => {
        setProgress({ completed: index + 1, total: selectedClientIds.length });
      });
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (failCount === 0) {
        toast.success(`Successfully started ${successCount} reviews`);
      } else {
        toast.warning(`Started ${successCount} reviews, ${failCount} failed`);
      }
      
      onSelectionChange([]); // Clear selection after starting
    } catch (error: any) {
      toast.error('Failed to start bulk reviews: ' + error.message);
    } finally {
      setIsRunning(false);
      setProgress({ completed: 0, total: 0 });
    }
  };

  const handleRunAll = async () => {
    setShowRunAllDialog(false);
    setIsRunning(true);
    setProgress({ completed: 0, total: allClientIds.length });
    
    try {
      const results = await triggerBulkReviews(allClientIds);
      
      // Update progress as we go
      results.forEach((_, index) => {
        setProgress({ completed: index + 1, total: allClientIds.length });
      });
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (failCount === 0) {
        toast.success(`Successfully started ${successCount} reviews`);
      } else {
        toast.warning(`Started ${successCount} reviews, ${failCount} failed`);
      }
      
      onSelectionChange([]); // Clear selection
    } catch (error: any) {
      toast.error('Failed to start bulk reviews: ' + error.message);
    } finally {
      setIsRunning(false);
      setProgress({ completed: 0, total: 0 });
    }
  };

  const progressPercentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Bulk Reconciliation
          </CardTitle>
          <CardDescription>
            Run reconciliations for multiple companies at once with automatic rate limiting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2 flex-1">
              <Button
                onClick={handleRunSelected}
                disabled={selectedClientIds.length === 0 || isRunning}
                variant="default"
                className="flex-1"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Run Selected ({selectedClientIds.length})
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowRunAllDialog(true)}
                disabled={isRunning || totalClients === 0}
                variant="outline"
                className="flex-1"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Run All ({totalClients})
                  </>
                )}
              </Button>
            </div>
          </div>

          {isRunning && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Progress: {progress.completed} of {progress.total}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Processing with rate limiting to avoid API throttling. This may take several minutes.
              </p>
            </div>
          )}

          {selectedClientIds.length > 0 && !isRunning && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                {selectedClientIds.length} companies selected for reconciliation
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showRunAllDialog} onOpenChange={setShowRunAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run reviews for all {totalClients} clients?</AlertDialogTitle>
            <AlertDialogDescription>
              This will trigger the review process for all clients in your firm. Each review will be processed sequentially with a 3-second delay between requests.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRunAll}>
              Run All Reviews
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}