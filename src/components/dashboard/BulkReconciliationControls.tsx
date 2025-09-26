import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle, Loader2 } from "lucide-react";
import { useBulkReconciliation } from "@/hooks/useBulkReconciliation";

interface BulkReconciliationControlsProps {
  selectedClientIds: string[];
  onSelectionChange: (clientIds: string[]) => void;
  totalClients: number;
}

export function BulkReconciliationControls({ 
  selectedClientIds, 
  onSelectionChange, 
  totalClients 
}: BulkReconciliationControlsProps) {
  const { runBulkReconciliation, runAllReconciliations, isRunning, progress } = useBulkReconciliation();

  const handleRunSelected = async () => {
    if (selectedClientIds.length === 0) return;
    await runBulkReconciliation(selectedClientIds);
    onSelectionChange([]); // Clear selection after starting
  };

  const handleRunAll = async () => {
    await runAllReconciliations();
    onSelectionChange([]); // Clear selection after starting
  };

  const progressPercentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
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
              onClick={handleRunAll}
              disabled={isRunning}
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
  );
}