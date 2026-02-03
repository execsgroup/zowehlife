import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useBasePath } from "@/hooks/use-base-path";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Member } from "@shared/schema";
import { Plus, Search, Users, Phone, Mail, Loader2, Eye, Copy, Link2, UserMinus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba",
  "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Estonia",
  "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana",
  "Greece", "Grenada", "Guatemala", "Guinea", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Mauritania", "Mauritius", "Mexico",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Namibia", "Nepal", "Netherlands",
  "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saudi Arabia", "Senegal", "Serbia", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Somalia", "South Africa", "South Korea",
  "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan",
  "Tanzania", "Thailand", "Togo", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const memberFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  address: z.string().optional(),
  memberSince: z.string().optional(),
  notes: z.string().optional(),
});

type MemberFormData = z.infer<typeof memberFormSchema>;

export default function LeaderMembers() {
  const { toast } = useToast();
  const basePath = useBasePath();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ["/api/leader/members"],
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/leader/remove/member/${memberId}`);
    },
    onSuccess: () => {
      toast({
        title: "Member removed",
        description: "The member has been removed from this ministry and notified via email.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/members"] });
      setRemoveDialogOpen(false);
      setMemberToRemove(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  const { data: tokens } = useQuery<{ publicToken: string | null; newMemberToken: string | null; memberToken: string | null }>({
    queryKey: ["/api/leader/church/tokens"],
  });

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      country: undefined,
      gender: undefined,
      address: "",
      memberSince: "",
      notes: "",
    },
  });

  const handleViewDetails = (member: Member) => {
    setLocation(`${basePath}/members/${member.id}`);
  };

  const createMutation = useMutation({
    mutationFn: async (data: MemberFormData) => {
      await apiRequest("POST", "/api/leader/members", data);
    },
    onSuccess: () => {
      toast({
        title: "Member added",
        description: "The member has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/members"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add member",
        variant: "destructive",
      });
    },
  });

  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/leader/church/generate-member-token", {});
    },
    onSuccess: () => {
      toast({
        title: "Link generated",
        description: "A new member registration link has been generated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/church/tokens"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate link",
        variant: "destructive",
      });
    },
  });

  const copyMemberLink = () => {
    if (tokens?.memberToken) {
      const link = `${window.location.origin}/member/${tokens.memberToken}`;
      navigator.clipboard.writeText(link);
      toast({
        title: "Link copied",
        description: "Member registration link copied to clipboard.",
      });
    }
  };

  const filteredMembers = members?.filter((m) => {
    const matchesSearch =
      !search ||
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      m.phone?.includes(search) ||
      m.email?.toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  return (
    <DashboardLayout title="Members">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Members</h2>
            <p className="text-muted-foreground">
              Manage your ministry's existing members
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {tokens?.memberToken ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="gap-2" onClick={copyMemberLink} data-testid="button-copy-member-link">
                    <Copy className="h-4 w-4" />
                    Copy Member Link
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy member registration link</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => generateTokenMutation.mutate()}
                disabled={generateTokenMutation.isPending}
                data-testid="button-generate-member-link"
              >
                {generateTokenMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Generate Member Link
              </Button>
            )}
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-add-member">
                  <Plus className="h-4 w-4" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Member</DialogTitle>
                  <DialogDescription>
                    Record information about an existing member
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
                    className="space-y-4"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="First name"
                                {...field}
                                data-testid="input-member-firstname"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Last name"
                                {...field}
                                data-testid="input-member-lastname"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Phone number"
                                {...field}
                                data-testid="input-member-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Email address"
                                {...field}
                                data-testid="input-member-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-member-gender">
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

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                data-testid="input-member-dob"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="memberSince"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Member Since</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                data-testid="input-member-since"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-member-country">
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {countries.map((country) => (
                                <SelectItem key={country} value={country}>
                                  {country}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Full address"
                              {...field}
                              data-testid="input-member-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Additional notes..."
                              {...field}
                              data-testid="input-member-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createMutation.isPending}
                      data-testid="button-submit-member"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Adding...
                        </>
                      ) : (
                        "Add Member"
                      )}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-members"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredMembers?.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No members found</h3>
                <p className="text-muted-foreground">
                  Add a member or adjust your search.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Member Since</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers?.map((m) => (
                      <TableRow key={m.id} data-testid={`row-member-${m.id}`}>
                        <TableCell>
                          <div 
                            className="font-medium cursor-pointer hover:text-primary hover:underline"
                            onClick={() => handleViewDetails(m)}
                            data-testid={`link-view-details-${m.id}`}
                          >
                            {m.firstName} {m.lastName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {m.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {m.phone}
                              </div>
                            )}
                            {m.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {m.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{m.gender || "-"}</TableCell>
                        <TableCell>
                          {m.memberSince ? format(new Date(m.memberSince), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={() => handleViewDetails(m)}
                                  data-testid={`button-view-member-${m.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Details</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => {
                                    setMemberToRemove(m);
                                    setRemoveDialogOpen(true);
                                  }}
                                  data-testid={`button-remove-member-${m.id}`}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove from Ministry</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member from Ministry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.firstName} {memberToRemove?.lastName} from this ministry? 
              They will be notified via email and can join another ministry if they wish. 
              This action does not deactivate their member portal account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && removeMutation.mutate(memberToRemove.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove-member"
            >
              {removeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
