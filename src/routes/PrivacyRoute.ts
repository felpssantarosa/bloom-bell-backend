import type { Request, Response } from "express";

export class PrivacyController {
	public execute(_req: Request, res: Response) {
		const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Privacy Policy - Bloom Bell Backend</title>
  </head>
  <body>
    <article>
      <h1>Privacy Policy</h1>

      <p>This Privacy Policy describes what information the Bloom Bell Backend (“we", “us", “the Service") collects, uses, and shares when you use our service.</p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li><strong>Discord Identifiers</strong>: User ID and related Discord metadata necessary to send notifications.</li>
        <li><strong>Queue Data</strong>: Non-identifying queue state information from Final Fantasy XIV for the purpose of alerts.</li>
        <li><strong>Bot Interaction Data</strong>: Commands or messages you send to the bot (only as needed for operation).</li>
        <li><strong>No Sensitive Personal Data</strong>: We do <em>not</em> collect email addresses, payment info, or any sensitive personal data.</li>
      </ul>

      <h2>2. How We Use Information</h2>
      <p>To provide real-time queue notifications and to troubleshoot and improve the Service.</p>

      <h2>3. Data Sharing</h2>
      <p>We do <em>not</em> sell or rent your data. We may share non-identifying data for analytics.</p>

      <h2>4. Data Retention</h2>
      <p>Data is retained only as long as needed to operate the Service.</p>

      <h2>5. Security</h2>
      <p>We implement reasonable safeguards to protect your data.</p>

      <h2>6. Children</h2>
      <p>The Service is not directed at children under 13, and we do not knowingly collect information from them.</p>

      <h2>7. Updates to Policy</h2>
      <p>We may revise this policy. Continued use means you agree to updated terms.</p>

      <p>Contact: https://github.com/felpssantarosa/bloom-bell-backend</p>

      <p>Last updated: 03/01/2026</p>
    </article>
  </body>
</html>`;

		res.status(200).type("html").send(html);
	}
}
