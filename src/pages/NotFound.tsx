import SEOHead from "@/components/SEOHead";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <SEOHead title="Page Not Found" description="The page you're looking for doesn't exist" path="/404" />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <h2 className="mb-4 text-xl text-muted-foreground">Page not found</h2>
        <p className="mb-4 text-sm text-muted-foreground">The page you are looking for does not exist or has been moved.</p>
        <a href="/" className="text-primary underline hover:text-primary/90" aria-label="Return to Vanity Palms home page">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
