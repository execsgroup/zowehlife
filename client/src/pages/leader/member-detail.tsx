import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRoute, Link, useLocation } from "wouter";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useBasePath } from "@/hooks/use-base-path";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Member } from "@shared/schema";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Loader2,
  Edit,
  User,
  Globe,
  Users,
  Cake,
  Church,
} from "lucide-react";
import { format } from "date-fns";

const updateMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
  gender: z.enum(["Male", "Female", ""]).optional(),
  ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above", ""]).optional(),
  address: z.string().optional(),
  memberSince: z.string().optional(),
  notes: z.string().optional(),
});

const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "United States", "United Kingdom", "Canada", "Nigeria", "Ghana", "Kenya", "South Africa", "Zimbabwe"
];

type UpdateMemberData = z.infer<typeof updateMemberSchema>;

export default function MemberDetail() {
  const { toast } = useToast();
  const basePath = useBasePath();
  const [location] = useLocation();
  const memberId = location.split('/').pop();

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: member, isLoading } = useQuery<Member>({
    queryKey: ["/api/leader/members", memberId],
    enabled: !!memberId,
  });

  const editForm = useForm<UpdateMemberData>({
    resolver: zodResolver(updateMemberSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      country: "",
      gender: "",
      ageGroup: "",
      address: "",
      memberSince: "",
      notes: "",
    },
  });

  const openEditDialog = () => {
    if (member) {
      editForm.reset({
        firstName: member.firstName,
        lastName: member.lastName,
        phone: member.phone || "",
        email: member.email || "",
        dateOfBirth: member.dateOfBirth || "",
        country: member.country || "",
        gender: (member.gender || "") as "" | "Male" | "Female",
        ageGroup: (member.ageGroup || "") as "" | "Under 18" | "18-24" | "25-34" | "35 and Above",
        address: member.address || "",
        memberSince: member.memberSince || "",
        notes: member.notes || "",
      });
    }
    setEditDialogOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateMemberData) => {
      await apiRequest("PATCH", `/api/leader/members/${memberId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Member updated",
        description: "The member information has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/members", memberId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/members"] });
      setEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update member",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Member Details">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!member) {
    return (
      <DashboardLayout title="Member Not Found">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Member not found</h3>
            <p className="text-muted-foreground mb-4">
              The member you're looking for doesn't exist or you don't have access.
            </p>
            <Link href={`${basePath}/members`}>
              <Button>Back to Members</Button>
            </Link>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Member Details">
      <div className="space-y-6">
        <Link href={`${basePath}/members`}>
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Members
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">
                  {member.firstName} {member.lastName}
                </CardTitle>
                <CardDescription>
                  Added: {format(new Date(member.createdAt), "MMMM d, yyyy")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={openEditDialog} className="gap-1">
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Contact Information</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {member.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${member.phone}`} className="hover:underline">
                      {member.phone}
                    </a>
                  </div>
                )}
                {member.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${member.email}`} className="hover:underline">
                      {member.email}
                    </a>
                  </div>
                )}
                {member.address && (
                  <div className="flex items-center gap-2 md:col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{member.address}</span>
                  </div>
                )}
                {member.country && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{member.country}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Personal Details</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {member.dateOfBirth && (
                  <div className="flex items-center gap-2">
                    <Cake className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Date of Birth:</span>
                      {format(new Date(member.dateOfBirth), "MMMM d, yyyy")}
                    </span>
                  </div>
                )}
                {member.gender && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Gender:</span>
                      {member.gender}
                    </span>
                  </div>
                )}
                {member.ageGroup && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Age Group:</span>
                      {member.ageGroup}
                    </span>
                  </div>
                )}
                {member.memberSince && (
                  <div className="flex items-center gap-2">
                    <Church className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground mr-1">Member Since:</span>
                      {format(new Date(member.memberSince), "MMMM d, yyyy")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {member.notes && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Notes</h4>
                  <p className="whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                    {member.notes}
                  </p>
                </div>
              </>
            )}

            {member.selfSubmitted === "true" && (
              <>
                <Separator />
                <Badge variant="secondary" className="w-fit">
                  Self-submitted via public form
                </Badge>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Member</DialogTitle>
              <DialogDescription>
                Update the member's information
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={editForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={editForm.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="ageGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age Group</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select age group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Under 18">Under 18</SelectItem>
                            <SelectItem value="18-24">18-24</SelectItem>
                            <SelectItem value="25-34">25-34</SelectItem>
                            <SelectItem value="35 and Above">35 and Above</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editForm.control}
                  name="memberSince"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member Since</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    "Update Member"
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
