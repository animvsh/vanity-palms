import { useState, useMemo } from "react";
import ProviderCard from "@/components/ProviderCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, SlidersHorizontal, X, GitCompareArrows, ArrowRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import Reveal from "@/components/Reveal";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead from "@/components/SEOHead";
import StepIndicator from "@/components/StepIndicator";
import { useProviders, useProcedures } from "@/hooks/useQueries";

const ProviderListing = () => {
  const [searchParams] = useSearchParams();
  const { data: providers = [], isLoading: providersLoading, error: providersError } = useProviders();
  const { data: allProcedures = [], isLoading: proceduresLoading } = useProcedures();
  const loading = providersLoading || proceduresLoading;
  const error = providersError ? "Failed to load providers. Please try again." : null;
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [sortBy, setSortBy] = useState("rating");
  const [maxDistance, setMaxDistance] = useState([25]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 25000]);
  const [minRating, setMinRating] = useState("any");
  const [minExperience, setMinExperience] = useState([0]);
  const [gender, setGender] = useState("all");
  const [consultationType, setConsultationType] = useState("all");
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (maxDistance[0] !== 25) count++;
    if (priceRange[0] !== 0 || priceRange[1] !== 25000) count++;
    if (minRating !== "any") count++;
    if (minExperience[0] !== 0) count++;
    if (gender !== "all") count++;
    if (consultationType !== "all") count++;
    if (selectedProcedures.length > 0) count++;
    return count;
  }, [maxDistance, priceRange, minRating, minExperience, gender, consultationType, selectedProcedures]);

  const resetFilters = () => {
    setMaxDistance([25]);
    setPriceRange([0, 25000]);
    setMinRating("any");
    setMinExperience([0]);
    setGender("all");
    setConsultationType("all");
    setSelectedProcedures([]);
  };

  const filteredProviders = useMemo(() => {
    const ratingThreshold = minRating === "any" ? 0 : parseFloat(minRating);
    const result = providers.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.specialty.some(s => s.toLowerCase().includes(search.toLowerCase()));
      const matchesDistance = p.distance <= maxDistance[0];
      const matchesRating = p.rating >= ratingThreshold;
      const matchesExperience = p.yearsExperience >= minExperience[0];
      const matchesGender = gender === "all" || p.gender.toLowerCase() === gender.toLowerCase();
      const matchesConsultationType = consultationType === "all" ||
        p.consultationType.includes(consultationType);
      const matchesPrice = p.procedures.some(
        proc => proc.price >= priceRange[0] && proc.price <= priceRange[1]
      );
      const matchesProcedures = selectedProcedures.length === 0 ||
        selectedProcedures.every(procId => p.procedures.some(pp => pp.procedureId === procId));
      return matchesSearch && matchesDistance && matchesRating && matchesExperience &&
        matchesGender && matchesConsultationType && matchesPrice && matchesProcedures;
    });
    if (sortBy === "rating") result.sort((a, b) => b.rating - a.rating);
    else if (sortBy === "distance") result.sort((a, b) => a.distance - b.distance);
    else if (sortBy === "reviews") result.sort((a, b) => b.reviewCount - a.reviewCount);
    else if (sortBy === "experience") result.sort((a, b) => b.yearsExperience - a.yearsExperience);
    return result;
  }, [providers, search, sortBy, maxDistance, priceRange, minRating, minExperience, gender, consultationType, selectedProcedures]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-32 text-center">
        <p className="text-lg font-medium text-foreground mb-2">Something went wrong</p>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-10">
        <Skeleton className="h-10 w-48 mb-3" />
        <Skeleton className="h-5 w-80 mb-10" />
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Skeleton className="h-11 flex-1 min-w-[200px] rounded-xl" />
          <Skeleton className="h-11 w-[180px] rounded-xl" />
          <Skeleton className="h-11 w-11 rounded-xl" />
        </div>
        <Skeleton className="h-4 w-24 mb-5" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <SEOHead
        title="Find Providers"
        description="Search and compare verified cosmetic surgeons and aesthetic specialists in Los Angeles. Filter by procedure, rating, experience, and more."
        path="/providers"
      />
      <div className="container mx-auto px-6 py-10">
        <StepIndicator current={4} />
        <Reveal>
          <div className="mb-10">
            <h1 className="text-display-sm sm:text-display text-foreground">Find providers</h1>
            <p className="mt-3 text-body-lg text-muted-foreground">Browse verified aesthetic specialists in Los Angeles</p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] group">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input placeholder="Search by name or specialty..." className="pl-10 rounded-xl h-11 transition-shadow focus:shadow-lg focus:shadow-primary/5" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] rounded-xl h-11">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="distance">Nearest</SelectItem>
                <SelectItem value="reviews">Most Reviews</SelectItem>
                <SelectItem value="experience">Most Experienced</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className={`rounded-xl h-11 w-11 relative transition-all duration-200 ${showFilters ? "bg-primary text-primary-foreground border-primary" : ""}`} onClick={() => setShowFilters(!showFilters)} aria-label="Toggle filters" aria-expanded={showFilters}>
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </Reveal>

        {showFilters && (
          <Reveal direction="scale">
            <div className="mb-6 apple-card p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-foreground">Filters</h3>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button onClick={resetFilters} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                      Reset all
                    </button>
                  )}
                  <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-foreground/5" aria-label="Close filters">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-3 block text-[13px] font-medium text-foreground">
                    Max Distance: <span className="text-primary font-semibold">{maxDistance[0]} miles</span>
                  </label>
                  <Slider value={maxDistance} onValueChange={setMaxDistance} max={50} min={1} step={1} className="py-2" />
                </div>

                <div>
                  <label className="mb-3 block text-[13px] font-medium text-foreground">
                    Price Range: <span className="text-primary font-semibold">${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      max={priceRange[1]}
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([Math.min(Number(e.target.value), priceRange[1]), priceRange[1]])}
                      className="h-9 rounded-lg text-sm w-full"
                      placeholder="Min"
                    />
                    <span className="text-muted-foreground text-xs shrink-0">to</span>
                    <Input
                      type="number"
                      min={priceRange[0]}
                      max={50000}
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0])])}
                      className="h-9 rounded-lg text-sm w-full"
                      placeholder="Max"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-[13px] font-medium text-foreground">
                    Minimum Rating
                  </label>
                  <Select value={minRating} onValueChange={setMinRating}>
                    <SelectTrigger className="rounded-lg h-9">
                      <SelectValue placeholder="Any rating" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="any">Any Rating</SelectItem>
                      <SelectItem value="4.0">4.0+</SelectItem>
                      <SelectItem value="4.5">4.5+</SelectItem>
                      <SelectItem value="4.8">4.8+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-3 block text-[13px] font-medium text-foreground">
                    Min Experience: <span className="text-primary font-semibold">{minExperience[0]} years</span>
                  </label>
                  <Slider value={minExperience} onValueChange={setMinExperience} max={30} min={0} step={1} className="py-2" />
                </div>

                <div>
                  <label className="mb-3 block text-[13px] font-medium text-foreground">
                    Gender
                  </label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="rounded-lg h-9">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-3 block text-[13px] font-medium text-foreground">
                    Consultation Type
                  </label>
                  <Select value={consultationType} onValueChange={setConsultationType}>
                    <SelectTrigger className="rounded-lg h-9">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="In-Person">In-Person</SelectItem>
                      <SelectItem value="Virtual">Virtual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {allProcedures.length > 0 && (
                <div className="col-span-full">
                  <label className="mb-3 block text-[13px] font-medium text-foreground">Procedures</label>
                  <div className="flex flex-wrap gap-2">
                    {allProcedures.map((proc) => (
                      <button
                        key={proc.id}
                        onClick={() => setSelectedProcedures(prev =>
                          prev.includes(proc.id) ? prev.filter(x => x !== proc.id) : [...prev, proc.id]
                        )}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-medium border transition-all ${
                          selectedProcedures.includes(proc.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {proc.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        )}

        {selectedProcedures.length >= 2 && (
          <Reveal direction="scale">
            <div className="mb-4 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-[13px] text-foreground">
              Showing providers who perform all {selectedProcedures.length} selected procedures
            </div>
          </Reveal>
        )}

        {selectedIds.length > 0 && (
          <Reveal direction="scale">
            <div className="mb-6 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <GitCompareArrows className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-[13px] font-semibold text-foreground">
                    {selectedIds.length} provider{selectedIds.length > 1 ? "s" : ""} selected
                  </span>
                  <span className="text-[12px] text-muted-foreground ml-2">(select up to 3)</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="rounded-full text-[13px] transition-transform active:scale-95" onClick={() => setSelectedIds([])}>Clear</Button>
                <Link to={`/compare?ids=${selectedIds.join(",")}`}>
                  <Button size="sm" className="rounded-full text-[13px] transition-transform active:scale-95" disabled={selectedIds.length < 2}>
                    Compare <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </Reveal>
        )}

        <div className="mb-5 text-[13px] text-muted-foreground" aria-live="polite">
          {filteredProviders.length} provider{filteredProviders.length !== 1 ? "s" : ""}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProviders.map((p, i) => (
            <Reveal key={p.id} delay={i * 60}>
              <ProviderCard
                provider={p}
                showSelect
                selected={selectedIds.includes(p.id)}
                onSelect={toggleSelect}
                contextSignal={
                  selectedProcedures.length >= 2
                    ? "Performs all selected procedures"
                    : p.specialty[0]
                      ? `Frequently booked for ${p.specialty[0]}`
                      : undefined
                }
              />
            </Reveal>
          ))}
        </div>

        {filteredProviders.length === 0 && (
          <Reveal direction="scale">
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Search className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">No providers found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          </Reveal>
        )}
      </div>
    </PageTransition>
  );
};

export default ProviderListing;
