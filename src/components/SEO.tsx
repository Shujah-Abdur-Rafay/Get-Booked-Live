import { Helmet } from "react-helmet-async";

const SITE_URL = "https://getbooked.live";
const SITE_NAME = "GetBooked.Live";
const DEFAULT_OG_IMAGE = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663474163600/ydiWucfOGTgdELam.png";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: string;
  jsonLd?: Record<string, unknown>;
}

export default function SEO({
  title,
  description,
  canonical,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  jsonLd,
}: SEOProps) {
  const canonicalUrl = canonical ?? `${SITE_URL}${window.location.pathname}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@getbookedlive" />

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}

export { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE };
