# 🌸 Bloom Bell Backend

**Required server to run the Bloom Bell plugin.** It handles authentication and communication between the integrated applications and the user's plugin.

---

## How to use

### Requirements:

<div align=center>
Docker and Docker Compose (recommended) <br/>
<strong>or</strong>
Node v20+
</div>

<br/>

### 1. Clone the repository

```bash
git clone https://github.com/felpssantarosa/bloom-bell-backend.git
```

### 2. Create and populate a .env file

```bash
DISCORD_CLIENT_ID=YOUR-CLIENT-ID-HERE
DISCORD_CLIENT_SECRET=YOUR-CLIENT-SECRET-HERE
DISCORD_BOT_TOKEN=YOUR-BOT-TOKEN-HERE
REDIRECT_URI=http://localhost:3333/callback
PORT=3333
```

> [!WARNING]
> The redirect URI must match the one you set in your Discord application settings.

> [!WARNING]
> Do not put quotation marks around the values in the .env file. It breaks the parsing when using Docker.

### 3. Run the project

#### 3.1 Using Docker (recommended):

```bash
docker compose up -d
```

#### 3.2 Using Node directly:

build the project

```bash
npm run build
```

after that, you can start it

```bash
npm start
```
