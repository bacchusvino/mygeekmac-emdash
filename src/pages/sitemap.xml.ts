import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";

// Static pages that exist for both sites. Per-site adjustments below.
const BASE_PAGES = [
	{ path: "/", priority: 1.0, changefreq: "weekly" },
	{ path: "/services", priority: 0.9, changefreq: "monthly" },
	{ path: "/about", priority: 0.8, changefreq: "monthly" },
	{ path: "/contact", priority: 0.8, changefreq: "monthly" },
	{ path: "/blog/", priority: 0.8, changefreq: "weekly" },
];

// /membership only exists for mygeekpc (per Base.astro nav config)
const GEEKPC_EXTRA = [
	{ path: "/membership", priority: 0.9, changefreq: "monthly" },
];

const escapeXml = (s: string) =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const GET: APIRoute = async ({ request }) => {
	const hostname = request.headers.get("host") || "mygeekmac.com";
	const isGeekPC = hostname.includes("mygeekpc");
	const origin = isGeekPC ? "https://mygeekpc.com" : "https://mygeekmac.com";

	// Static pages
	const staticPages = isGeekPC ? [...BASE_PAGES, ...GEEKPC_EXTRA] : BASE_PAGES;

	// Pull published blog posts from EmDash
	let posts: Array<{ id: string; lastmod?: string }> = [];
	try {
		const { entries } = await getEmDashCollection("posts", {
			status: "published",
			sort: { field: "published_date", order: "desc" },
		});
		posts = (entries || []).map((p: any) => ({
			id: p.id,
			lastmod: p.data?.published_date || p.data?.updated_at,
		}));
	} catch {
		// If EmDash query fails, still emit static pages
		posts = [];
	}

	const today = new Date().toISOString().split("T")[0];

	const urlElements: string[] = [];

	for (const page of staticPages) {
		urlElements.push(
			`  <url>\n    <loc>${origin}${page.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`
		);
	}

	for (const post of posts) {
		const lastmod = post.lastmod
			? new Date(post.lastmod).toISOString().split("T")[0]
			: today;
		urlElements.push(
			`  <url>\n    <loc>${origin}/blog/${escapeXml(post.id)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`
		);
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlElements.join("\n")}\n</urlset>\n`;

	return new Response(xml, {
		status: 200,
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
