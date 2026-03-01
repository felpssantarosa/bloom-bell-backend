const isDevelopment = process.env.NODE_ENV !== "production";

/**
 * Lightweight structured logger.
 *
 * Levels:
 *  - info  → both environments, no sensitive data
 *  - debug → development only, may contain sensitive data (user IDs, socket keys, etc.)
 *  - warn  → both environments, no sensitive data
 *  - error → both environments; error object/stack only in development
 */
export class Logger {
	constructor(private readonly context: string) {}

	private format(level: string, message: string): string {
		return `[${new Date().toISOString()}] [${level}] [${this.context}] ${message}`;
	}

	info(message: string): void {
		console.log(this.format("INFO", message));
	}

	debug(message: string, ...data: unknown[]): void {
		if (!isDevelopment) return;
		console.log(this.format("DEBUG", message), ...data);
	}

	warn(message: string): void {
		console.warn(this.format("WARN", message));
	}

	error(message: string, error?: unknown): void {
		if (isDevelopment) {
			console.error(
				this.format("ERROR", message),
				...(error !== undefined ? [error] : []),
			);
		} else {
			console.error(this.format("ERROR", message));
		}
	}
}
