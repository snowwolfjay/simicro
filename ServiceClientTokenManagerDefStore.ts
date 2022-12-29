import { ServiceClientTokenManagerStore } from "./ServerClientTokenManager";

export const ServerClientTokenManagerDefStore: ServiceClientTokenManagerStore = {
  async get(key: string) {
    const d = localStorage.getItem(`__tk_${key}`);
    try {
      const t = JSON.parse(d);
      return t || undefined;
    } catch (error) {
      //
    }
  },
  async set(key: string, data: any) {
    localStorage.setItem(`__tk_${key}`, JSON.stringify(data));
  },
};
