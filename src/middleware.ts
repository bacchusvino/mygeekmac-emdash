import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
	const hostname = context.request.headers.get("host") || "";
	const site = hostname.includes("mygeekpc") ? "geekpc" : "geekmac";
	context.locals.site = site;
	context.locals.ga4Id =
		site === "geekpc" ? "G-E4Q29203RC" : "G-9C8FX748QC";
	return next();
});
