import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { memberPrayerRequestSubmissionSchema, type MemberPrayerRequestSubmission } from "@shared/schema";
import { ArrowLeft, Plus, HandHeart, Loader2, Lock, Globe } from "lucide-react";

interface PrayerRequest {
  id: string;
  requestText: string;
  category: string | null;
  isPrivate: boolean;
  status: string;
  createdAt: string;
}

export default function MemberPrayerRequests() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: prayerRequests, isLoading, error } = useQuery<PrayerRequest[]>({
    queryKey: ["/api/member/prayer-requests"],
  });

  const form = useForm({
    resolver: zodResolver(memberPrayerRequestSubmissionSchema),
    defaultValues: {
      requestText: "",
      isPrivate: false,
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: MemberPrayerRequestSubmission) => {
      return await apiRequest("POST", "/api/member/prayer-requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/prayer-requests"] });
      form.reset();
      setDialogOpen(false);
      toast({
        title: "Prayer request submitted",
        description: "Your prayer request has been submitted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit prayer request.",
        variant: "destructive",
      });
    },
  });

  if (error) {
    setLocation("/member-portal/login");
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return <Badge variant="outline">Submitted</Badge>;
      case "BEING_PRAYED_FOR":
        return <Badge variant="secondary">Being Prayed For</Badge>;
      case "ANSWERED":
        return <Badge className="bg-green-600">Answered</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-muted p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/member-portal">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Prayer Requests</h1>
              <p className="text-muted-foreground">Submit and track your prayer requests</p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-prayer-request">
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Prayer Request</DialogTitle>
                <DialogDescription>
                  Share your prayer request with your ministry leaders.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => submitMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="requestText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Prayer Request</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Share what's on your heart..."
                            className="min-h-[120px] resize-none"
                            {...field}
                            data-testid="textarea-prayer-request"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isPrivate"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <Label>Private Request</Label>
                          <p className="text-sm text-muted-foreground">
                            Only ministry leaders will see this request
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-private"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitMutation.isPending} data-testid="button-submit-prayer">
                      {submitMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Request"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : prayerRequests && prayerRequests.length > 0 ? (
          <div className="space-y-4">
            {prayerRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      {request.isPrivate ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{request.requestText}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <HandHeart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Prayer Requests Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Submit your first prayer request to share with your ministry.
                </p>
                <Button onClick={() => setDialogOpen(true)} data-testid="button-first-prayer-request">
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Prayer Request
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
