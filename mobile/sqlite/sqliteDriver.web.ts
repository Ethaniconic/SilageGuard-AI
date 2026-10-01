export async function openDatabaseAsync(_databaseName: string): Promise<never> {
  throw new Error("SQLite is unavailable on web");
}