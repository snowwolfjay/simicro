import { Observable } from "rxjs";
import { DataFetcher } from "./ServerClientSafeData";
import { ServiceClientProviderDDP } from "./ServiceClientProviderDDP";

export class ServiceClient {
  private static clients = new Map<string, ServiceClient>();
  private service: ServiceClientProvider;
  public static create(
    server: string,
    kind = "meteor" as "meteor" | "http",
    config: ClientInitOptions
  ) {
    const key = server + ":" + kind;
    if (this.clients.has(key)) {
      return this.clients.get(key)!;
    }
    return new ServiceClient(server, kind, config);
  }
  private constructor(
    public readonly server: string,
    public readonly kind = "meteor" as "meteor" | "http",
    public readonly config: ClientInitOptions
  ) {}
  public configure(c: ClientInitOptions) {
    this.service.config(c);
  }
  private inited = false;
  private init() {
    if (this.inited) {
      return;
    }
    this.inited = true;
    if (this.kind === "meteor") {
      this.service = new ServiceClientProviderDDP(this.server);
      this.service.config(this.config);
    }
  }
  destroy() {
    this.service?.destroy();
  }
  api(name: string): ApiEndpoint {
    const serv = this;
    return {
      get: <T = any>(query?: any) => {
        this.init();
        return this.service.request<T>(name, "get", query);
      },
      post: <T = any>(data?: any, query?: any) => {
        this.init();
        return this.service.request<T>(name, "post", query, data);
      },
      put: <T = any>(data?: any, query?: any) => {
        this.init();
        return this.service.request<T>(name, "put", query, data);
      },
      delete: <T = any>(data?: any, query?: any) => {
        this.init();
        return this.service.request<T>(name, "delete", query, data);
      },
      livequery: (params?: any) => {
        this.init();
        return this.service.livequery(name, params);
      },
    };
  }
}

export type TokenProvider<T> = (arg?: T) => Promise<string | undefined>;

export interface ClientInitOptions {
  token?: string;
  tokenProvider?: TokenProvider<any>;
}

interface LiveQueryResult<T = any> {
  ready$: Observable<boolean>;
  stop(): void;
  changed$: Observable<T>;
  added$: Observable<T>;
  removed$: Observable<T>;
}

export type ServerResponse<T> = {
  data: T;
} & DataFetcher;

export interface ApiEndpoint {
  get<T = any>(query?: any): Promise<ServerResponse<T>>;
  post<T = any>(data?: any, query?: any): Promise<ServerResponse<T>>;
  put<T = any>(data?: any, query?: any): Promise<ServerResponse<T>>;
  delete<T = any>(data?: any, query?: any): Promise<ServerResponse<T>>;
  livequery(params?: any): LiveQueryResult;
}

export interface ServiceClientConfig extends ClientInitOptions {
  timeout?: number;
  retry?: number;
}

export interface ServiceClientProvider {
  error$: Observable<any>;
  config(config: ServiceClientConfig): void;
  livequery(sources: string, params?: any): LiveQueryResult;
  request<T = any>(
    path: string,
    methods?: "get" | "post" | "put" | "delete",
    query?: any,
    data?: any
  ): Promise<ServerResponse<T>>;
  destroy(): void;
}
