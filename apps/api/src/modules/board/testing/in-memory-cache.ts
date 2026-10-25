import { type CachePort } from "../../../shared/cache/cache.port";

export class InMemoryCache implements CachePort {
  private readonly values = new Map<string, string>();
  sets = 0;
  failGet = false;
  failSet = false;

  async get<T>(key: string): Promise<T | null> {
    if (this.failGet) {
      throw new Error("cache get failed");
    }
    const payload = this.values.get(key);
    if (!payload) {
      return null;
    }
    return JSON.parse(payload) as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.sets += 1;
    if (this.failSet) {
      throw new Error("cache set failed");
    }
    this.values.set(key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}
