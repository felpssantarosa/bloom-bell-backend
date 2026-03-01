import type { Request, Response } from "express";

export class TermsController {
	public execute(_req: Request, res: Response) {
		const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Terms of Service - Bloom Bell Backend</title>
  </head>
  <body>
    <article>
      <h1>Terms of Service</h1>
      <p>Welcome to Bloom Bell Backend (“the Service”), provided by the developers of the Bloom Bell project.</p>

      <p>By using this Service, you agree to these terms:</p>

      <ol>
        <li><strong>Use at Your Own Risk</strong><br>This Service is provided “as is”, without warranties of any kind. The developers are not liable for any damages or losses arising from use of the Service.</li>
        <li><strong>User Responsibilities</strong><br>You must use the Service legally and in accordance with all applicable laws and Discord’s Terms of Service.</li>
        <li><strong>No Warranty</strong><br>The developers make no guarantees about uptime, performance, or fitness for any particular purpose.</li>
        <li><strong>Third-Party Services</strong><br>The Service may interact with third-party APIs (e.g., Discord). Use of such APIs is subject to their own terms and policies.</li>
        <li><strong>Modifications</strong><br>The developers may update, modify, or discontinue the Service at any time without notice.</li>
      </ol>

      <p>If you do not agree with these terms, do not use the Service.</p>

      <p>Last updated: 03/01/2026</p>
    </article>
  </body>
</html>`;

		res.status(200).type("html").send(html);
	}
}
