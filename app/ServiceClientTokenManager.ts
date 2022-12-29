export class ServiceClientTokenManager {
  private nsList = new Set<string>();
  private items = new Map<string, ServiceClientToken>();
  constructor(private store: ServiceClientTokenManagerStore) {
    //
    const str = localStorage.getItem(`__tk_list`);
    try {
      const arr = JSON.parse(str);
      Array.isArray(arr) && (this.nsList = new Set(arr));
    } catch (error) {
      //
    }
    this.nsList.size && this.restoreToken();
  }
  private saveNs() {
    //
    localStorage.setItem(`__tk_list`, JSON.stringify(Array.from(this.nsList)));
  }
  private setNSToken(
    ns: string,
    d: { token: string; expireIn: number },
    save = true
  ) {
    const item = this.items.get(ns);
    if (!item) {
      throw new Error(`${ns} need provider`);
    }
    item.token = d.token;
    item.expireIn = d.expireIn;
    save && this.store.set(ns, d);
  }
  private async restoreToken() {
    let nsChanged = false;
    for (const ns of this.nsList) {
      await this.store.get(ns).then((d) => {
        if (d && d.expireIn > Date.now() && d.token) {
          this.items.set(ns, {
            ...d,
            ns,
          });
        } else {
          nsChanged = true;
        }
      });
    }
    nsChanged && this.saveNs();
  }
  public add(
    ns: string,
    provider: () => Promise<{ token: string; expireIn: number }>,
    refresh = false
  ) {
    //
    if (!this.nsList.has(ns)) {
      this.nsList.add(ns);
      this.saveNs();
    }
    const el = this.items.get(ns);
    if (el) {
      el.provider = provider;
      if (refresh) {
        this.setNSToken(ns, { token: "", expireIn: 0 });
      }
      return;
    }
    this.items.set(ns, {
      ns,
      token: "",
      expireIn: 0,
      provider,
    });
    this.setNSToken(ns, { token: "", expireIn: 0 });
  }
  public async get(ns: string): Promise<string> {
    const item = this.items.get(ns);
    if (!item) {
      throw new Error(`${ns} need add`);
    }
    const now = Date.now();
    if (now < item.expireIn && item.token) {
      return item.token;
    }
    if (!item.provider) {
      throw new Error(`${ns} no provider`);
    }
    const res = await item.provider();
    this.setNSToken(ns, res);
    return item.token;
  }
}
export type ServiceClientToken = {
  ns: string;
  token: string;
  expireIn: number;
  provider?: () => Promise<{ token: string; expireIn: number }>;
};
export type ServiceClientTokenManagerStore = {
  get(key: string): Promise<undefined | { token: string; expireIn: number }>;
  set(key: string, data: { token: string; expireIn: number }): Promise<void>;
};
