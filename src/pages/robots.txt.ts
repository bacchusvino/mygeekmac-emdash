import type { APIRoute } from "astro";

export const GET: APIRoute = ({ request }) => {
	const hostname = request.headers.get("host") || "mygeekmac.com";
	const isGeekPC = hostname.includes("mygeekpc");
	const origin = isGeekPC ? "https://mygeekpc.com" : "https://mygeekmac.com";

	const body = `User-agent: *
Allow: /

# AI search and indexing crawlers — explicitly welcomed
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Amazonbot
Allow: /

Sitemap: ${origin}/sitemap.xml
`;

	return new Response(body, {
		status: 200,
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			// Don't let Cloudflare edge cache this file — we've had stale-cache pain with it.
			"Cache-Control": "public, max-age=60, must-revalidate",
			"CDN-Cache-Control": "no-store",
		},
	});
};
