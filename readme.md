# 🌸 Bloom Bell Backend

### Required server to run the Bloom Bell plugin. It handles Discord authentication and sending notifications.

# How to use

### Requirements:

- Node v22+

<br/>

1. Clone the repository

```bash
git clone https://github.com/felpssantarosa/bloom-bell-backend.git
```

2. Create and populate a .env file

```bash
DISCORD_CLIENT_ID="YOUR-CLIENT-ID-HERE"
DISCORD_CLIENT_SECRET="YOUR-CLIENT-SECRET-HERE"
DISCORD_BOT_TOKEN="YOUR-BOT-TOKEN-HERE"
REDIRECT_URI=http://localhost:3333/callback
PORT=3333
```

>[!WARNING]
>It is important that you setup the port and redirect URI correctly, as they are used in the OAuth flow. The redirect URI must match the one you set in your Discord application settings.

3. Build the project to compile the TypeScript code

```bash
npm run build
```

4. Run the project

```bash
npm start
```

5. Enjoy!
