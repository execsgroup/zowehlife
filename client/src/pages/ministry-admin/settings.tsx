import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Settings, MapPin, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

interface Church {
  id: string;
  name: string;
  location: string | null;
  logoUrl: string | null;
  createdAt: string;
  publicToken: string;
  newMemberToken: string | null;
  memberToken: string | null;
}

export default function MinistryAdminSettings() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const [, navigate] = useLocation();
  
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const { data: church, isLoading } = useQuery<Church>({
    queryKey: ["/api/ministry-admin/church"],
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/ministry-admin/church/cancel");
    },
    onSuccess: () => {
      toast({
        title: "Account cancelled",
        description: "Your ministry account has been cancelled. You will be logged out.",
      });
      queryClient.clear();
      closeDeleteDialog();
      setTimeout(() => {
        logout();
        navigate("/");
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel account",
        variant: "destructive",
      });
    },
  });

  const openDeleteDialog = () => {
    setDeleteStep(1);
    setConfirmText("");
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteStep(1);
    setConfirmText("");
  };

  const handleDeleteStep1 = () => {
    setDeleteStep(2);
  };

  const handleDeleteConfirm = () => {
    if (confirmText === "Cancel Account") {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Settings className="h-6 w-6" />
            Ministry Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your ministry account settings.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ministry Information</CardTitle>
            <CardDescription>
              Details about your ministry account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Ministry Name</p>
                <p className="font-medium">{church?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{church?.location || "Not specified"}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {church?.createdAt ? format(new Date(church.createdAt), "PPP") : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="secondary">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect your entire ministry.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
              <div>
                <h3 className="font-medium text-destructive">Cancel Ministry Account</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently cancel your ministry account. All data including leaders, converts, and members will be archived.
                  The Platform Admin can restore your account if needed.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={openDeleteDialog}
                data-testid="button-cancel-account"
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Cancel Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {deleteStep === 1 ? "Cancel Ministry Account?" : "Confirm Cancellation"}
            </DialogTitle>
            <DialogDescription>
              {deleteStep === 1 ? (
                <>
                  Are you sure you want to cancel your ministry account for{" "}
                  <span className="font-semibold">{church?.name}</span>?
                  This will remove all ministry data including leaders, converts, and members.
                  The Platform Admin can restore your account if needed.
                </>
              ) : (
                <>
                  This action will cancel your ministry account and log you out.
                  To confirm, please type <span className="font-bold">Cancel Account</span> below.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {deleteStep === 2 && (
            <div className="py-4">
              <Input
                placeholder="Type 'Cancel Account' to confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                data-testid="input-confirm-cancel"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeDeleteDialog}
              data-testid="button-cancel-delete"
            >
              Go Back
            </Button>
            {deleteStep === 1 ? (
              <Button
                variant="destructive"
                onClick={handleDeleteStep1}
                data-testid="button-proceed-delete"
              >
                Yes, Cancel Account
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={confirmText !== "Cancel Account" || deleteMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Confirm Cancellation"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
