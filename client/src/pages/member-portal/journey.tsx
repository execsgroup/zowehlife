import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Church, Calendar, CheckCircle, Clock, User } from "lucide-react";

interface JourneyItem {
  ministryId: string;
  ministryName: string;
  relationshipType: string;
  joinedAt: string;
  record: {
    id: string;
    createdAt: string;
    status?: string;
  } | null;
}

interface FollowUp {
  id: string;
  scheduledDate: string;
  status: string;
  completedAt: string | null;
}

export default function MemberJourney() {
  const [, setLocation] = useLocation();

  const { data: journeyData, isLoading: journeyLoading, error } = useQuery<{ journey: JourneyItem[] }>({
    queryKey: ["/api/member/journey"],
  });

  const { data: followUpsData, isLoading: followUpsLoading } = useQuery<{ followUps: FollowUp[] }>({
    queryKey: ["/api/member/follow-ups"],
  });

  if (error) {
    setLocation("/member-portal/login");
    return null;
  }

  const getRelationshipBadge = (type: string) => {
    switch (type) {
      case "convert":
        return <Badge className="bg-blue-600">New Believer</Badge>;
      case "new_member":
        return <Badge variant="secondary">New Member & Guest</Badge>;
      case "member":
        return <Badge>Full Member</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "SCHEDULED":
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/member-portal">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">My Spiritual Journey</h1>
            <p className="text-muted-foreground">Track your growth across ministries</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Journey Timeline
            </CardTitle>
            <CardDescription>
              Your milestones and connections across different ministries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {journeyLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : journeyData?.journey && journeyData.journey.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-6">
                  {journeyData.journey.map((item, index) => (
                    <div key={index} className="relative pl-10">
                      <div className="absolute left-2 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <Church className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{item.ministryName}</p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(item.joinedAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                            {getRelationshipBadge(item.relationshipType)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No journey data available yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Follow-Up Sessions
            </CardTitle>
            <CardDescription>
              Scheduled and completed follow-up meetings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {followUpsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : followUpsData?.followUps && followUpsData.followUps.length > 0 ? (
              <div className="space-y-3">
                {followUpsData.followUps.map((followUp) => (
                  <div
                    key={followUp.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(followUp.status)}
                      <div>
                        <p className="font-medium">
                          {new Date(followUp.scheduledDate).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        {followUp.completedAt && (
                          <p className="text-sm text-muted-foreground">
                            Completed on {new Date(followUp.completedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={followUp.status === "COMPLETED" ? "default" : "outline"}>
                      {followUp.status === "COMPLETED" ? "Completed" : "Scheduled"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No follow-up sessions scheduled yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
