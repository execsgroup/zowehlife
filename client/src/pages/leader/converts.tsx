import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, Link } from "wouter";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Convert } from "@shared/schema";
import { Plus, Search, UserPlus, Phone, Mail, Loader2, Eye, FileSpreadsheet } from "lucide-react";
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
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nepal", "Netherlands",
  "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saudi Arabia", "Senegal", "Serbia", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Somalia", "South Africa", "South Korea",
  "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan",
  "Tanzania", "Thailand", "Togo", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const convertFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
  salvationDecision: z.enum(["I just made Jesus Christ my Lord and Savior", "I have rededicated my life to Jesus"]).optional(),
  wantsContact: z.enum(["Yes", "No"]).optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  ageGroup: z.enum(["Under 18", "18-24", "25-34", "35 and Above"]).optional(),
  isChurchMember: z.enum(["Yes", "No"]).optional(),
  prayerRequest: z.string().optional(),
  address: z.string().optional(),
  summaryNotes: z.string().optional(),
  status: z.enum(["NEW", "ACTIVE", "IN_PROGRESS", "CONNECTED", "INACTIVE"]),
});

type ConvertFormData = z.infer<typeof convertFormSchema>;

const statusColors: Record<string, string> = {
  NEW: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  ACTIVE: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  IN_PROGRESS: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  CONNECTED: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  INACTIVE: "bg-muted text-muted-foreground border-muted",
};

export default function LeaderConverts() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: converts, isLoading } = useQuery<Convert[]>({
    queryKey: ["/api/leader/converts"],
  });

  const form = useForm<ConvertFormData>({
    resolver: zodResolver(convertFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      country: undefined,
      salvationDecision: undefined,
      wantsContact: undefined,
      gender: undefined,
      ageGroup: undefined,
      isChurchMember: undefined,
      prayerRequest: "",
      address: "",
      summaryNotes: "",
      status: "NEW",
    },
  });

  // Check for ?new=true query param
  useEffect(() => {
    if (location.includes("new=true")) {
      setDialogOpen(true);
    }
  }, [location]);

  const createMutation = useMutation({
    mutationFn: async (data: ConvertFormData) => {
      await apiRequest("POST", "/api/leader/converts", data);
    },
    onSuccess: () => {
      toast({
        title: "Convert added",
        description: "The new convert has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/converts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader/stats"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add convert",
        variant: "destructive",
      });
    },
  });

  const filteredConverts = converts?.filter((convert) => {
    const matchesSearch =
      !search ||
      `${convert.firstName} ${convert.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      convert.phone?.includes(search) ||
      convert.email?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || convert.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleExportExcel = async () => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);

    const response = await fetch(`/api/leader/converts/export-excel?${params}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converts-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout title="My Converts">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Converts</h2>
            <p className="text-muted-foreground">
              Manage and track your church's new converts
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleExportExcel} variant="outline" className="gap-2" data-testid="button-export-excel">
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-convert">
                <Plus className="h-4 w-4" />
                Add Convert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Convert</DialogTitle>
                <DialogDescription>
                  Record information about a new believer
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="salvationDecision"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salvation Decision</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-salvation-decision">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="I just made Jesus Christ my Lord and Savior">
                              I just made Jesus Christ my Lord and Savior
                            </SelectItem>
                            <SelectItem value="I have rededicated my life to Jesus">
                              I have rededicated my life to Jesus
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                              data-testid="input-convert-firstname"
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
                              data-testid="input-convert-lastname"
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
                              type="tel"
                              placeholder="+1 (555) 000-0000"
                              {...field}
                              data-testid="input-convert-phone"
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
                              placeholder="email@example.com"
                              {...field}
                              data-testid="input-convert-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                            data-testid="input-convert-dob"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-country">
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-gender">
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
                      control={form.control}
                      name="ageGroup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age Group</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-age-group">
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="wantsContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wants to be Contacted?</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-wants-contact">
                                <SelectValue placeholder="Select option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isChurchMember"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Church Member?</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-church-member">
                                <SelectValue placeholder="Select option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="prayerRequest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prayer Request</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any prayer requests..."
                            className="resize-none"
                            {...field}
                            data-testid="input-prayer-request"
                          />
                        </FormControl>
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
                          <Input
                            placeholder="Street address, city, state"
                            {...field}
                            data-testid="input-convert-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="summaryNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any notes about this convert..."
                            className="resize-none"
                            {...field}
                            data-testid="input-convert-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-convert-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NEW">New</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="CONNECTED">Connected</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-save-convert"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Add Convert"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-converts"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="CONNECTED">Connected</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredConverts && filteredConverts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConverts.map((convert) => (
                    <TableRow key={convert.id} data-testid={`row-convert-${convert.id}`}>
                      <TableCell className="font-medium">
                        <Link href={`/leader/converts/${convert.id}`}>
                          <span className="hover:underline cursor-pointer text-primary" data-testid={`link-convert-name-${convert.id}`}>
                            {convert.firstName} {convert.lastName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell data-testid={`text-dob-${convert.id}`}>
                        {convert.dateOfBirth ? new Date(convert.dateOfBirth).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {convert.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {convert.phone}
                            </div>
                          )}
                          {convert.email && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {convert.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[convert.status] || ""}>
                          {convert.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(convert.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/leader/converts/${convert.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            data-testid={`button-view-convert-${convert.id}`}
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center">
                <UserPlus className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No converts found</h3>
                <p className="text-muted-foreground mb-4">
                  {search || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Add your first convert to get started"}
                </p>
                {!search && statusFilter === "all" && (
                  <Button onClick={() => setDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Convert
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
