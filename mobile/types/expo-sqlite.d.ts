declare module "expo-sqlite" {
  export function openDatabaseAsync(databaseName: string): Promise<unknown>;
}