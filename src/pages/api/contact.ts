import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, locals }) => {
	const data = await request.formData();
	const name = data.get("name")?.toString() || "";
	const phone = data.get("phone")?.toString() || "";
	const email = data.get("email")?.toString() || "";
	const interest = data.get("interest")?.toString() || "";
	const message = data.get("message")?.toString() || "";
	const honeypot = data.get("bot-field")?.toString() || "";
	const site = data.get("site")?.toString() || "geekmac";

	// Spam check — honeypot
	if (honeypot) {
		return Response.redirect(new URL("/thank-you", request.url).toString(), 303);
	}

	// Basic validation
	if (!name || !phone) {
		return new Response("Name and phone are required.", { status: 400 });
	}

	// Store in D1
	try {
		const env = (locals as any).runtime?.env;
		if (env?.DB) {
			await env.DB.prepare(
				`CREATE TABLE IF NOT EXISTS leads (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					name TEXT, phone TEXT, email TEXT, interest TEXT, message TEXT,
					site TEXT, created_at TEXT
				)`
			).run();

			await env.DB.prepare(
				"INSERT INTO leads (name, phone, email, interest, message, site, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
			)
				.bind(name, phone, email, interest, message, site, new Date().toISOString())
				.run();
		}
	} catch (e) {
		console.error("D1 storage error:", e);
	}

	// Send email notification via Cloudflare Email Workers or MailChannels
	try {
		const env = (locals as any).runtime?.env;
		if (env?.EMAIL) {
			// If Email Workers binding is available
			await env.EMAIL.send({
				to: "josh@mygeekmac.com",
				from: "leads@mygeekmac.com",
				subject: `New Lead from ${site === "geekpc" ? "MyGeekPC" : "MyGeekMac"}: ${name}`,
				text: `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\nInterest: ${interest}\nMessage: ${message}\nSite: ${site}\nTime: ${new Date().toISOString()}`,
			});
		} else {
			// Fallback: Use MailChannels (free on Cloudflare Workers)
			await fetch("https://api.mailchannels.net/tx/v1/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					personalizations: [{ to: [{ email: "josh@mygeekmac.com", name: "Josh Pirtle" }] }],
					from: { email: "leads@mygeekmac.com", name: `${site === "geekpc" ? "MyGeekPC" : "MyGeekMac"} Lead` },
					subject: `New Lead: ${name} — ${interest || "General Inquiry"}`,
					content: [{
						type: "text/plain",
						value: `New lead from ${site === "geekpc" ? "MyGeekPC" : "MyGeekMac"}\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nInterest: ${interest}\nMessage: ${message}\nSubmitted: ${new Date().toISOString()}`
					}],
				}),
			});
		}
	} catch (e) {
		console.error("Email notification error:", e);
	}

	return Response.redirect(new URL("/thank-you", request.url).toString(), 303);
};
