import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
}

const SITE_NAME = "Vanity Palms";
const DEFAULT_DESCRIPTION =
  "Compare verified cosmetic surgeons and aesthetic specialists side by side. Browse procedures, read reviews, and book consultations in Los Angeles.";
const BASE_URL = "https://vanitypalms.com";

export default function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "",
}: SEOHeadProps) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Find Verified Aesthetic Providers in LA`;
  const canonical = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
