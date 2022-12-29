import {
  BehaviorSubject,
  firstValueFrom,
  Observable,
  Subject,
  distinctUntilChanged,
  filter,
  take,
} from "rxjs";
import { createDataFetcher } from "./ServiceClientSafeData";
import {
  ServerResponse,
  ServiceClientConfig,
  ServiceClientProvider,
  TokenProvider,
} from "./ServiceClient";

type DDPClientTokenType = "con" | "api";
export type DDPClientTokenProvider = TokenProvider<{
  kind: DDPClientTokenType;
}>;
export class ServiceClientProviderDDP implements ServiceClientProvider {
  public error$ = new BehaviorSubject(null);
  private static clients = new Map<string, ServiceClientProviderDDP>();
  private collections = new Map<string, Mongo.Collection<any>>();
  connection: DDP.DDPStatic;
  public debug = true;
  private isReady$$ = new BehaviorSubject(false);
  private isReady$ = this.isReady$$.pipe(distinctUntilChanged());
  private configuration: ServiceClientConfig = {
    timeout: 10000,
    retry: 0,
  };
  public config(c: Partial<ServiceClientConfig>) {
    Object.assign(this.configuration, c);
    if (c.token && this.isReady$$.value) {
      this.isReady$$.next(false);
      this.onConnected();
    }
  }
  private onceReady$ = this.isReady$$.pipe(
    filter((v) => !!v),
    take(1)
  );
  private connectTracker: any;
  constructor(public readonly server: string) {
    this.connection = DDP.connect(server);
    this.connectTracker = Tracker.autorun(() => {
      console.log(this.server, this.connection.status());
      const connected = this.connection.status().connected;
      if (!connected) {
        this.isReady$$.next(false);
        return;
      }
      this.onConnected();
    });
  }
  private async onConnected() {
    let token = this.configuration.token;
    if (typeof this.configuration.tokenProvider === "function") {
      const res = await this.configuration.tokenProvider({
        kind: "con",
      });
      token = res;
    }
    if (!token) {
      this.isReady$$.next(true);
      return;
    }
    this.connection.call(
      "resume",
      {
        token,
      },
      (err) => {
        console.log(`=== login resumed === `);
        !err && this.isReady$$.next(true);
      }
    );
  }
  private collection<T = any>(name: string): Mongo.Collection<T> {
    if (this.collections.has(name)) {
      return this.collections.get(name);
    }
    const col = new Mongo.Collection(name, {
      connection: this.connection,
    });
    this.collections.set(name, col);
    return col as any;
  }
  livequery<T extends { _id: string } = any>(name: string, params?: any) {
    // let suber:
    const col = this.collection(name);
    const isReady$ = new BehaviorSubject(false);
    const added$ = new Subject<T>();
    const removed$ = new Subject<T>();
    const changed$ = new Subject<T>();
    let sub: any;
    let ob: any;
    const isub = this.onceReady$.subscribe(() => {
      sub = this.connection.subscribe(name, params, {
        onReady: () => {
          this.debug && console.log(`[${name}] ready ~~~~`);
          isReady$.next(true);
        },
        onStop: () => {
          this.debug && console.log(`[${name}] stop ~~~~`);
          isReady$.next(false);
        },
      });
      ob = col.find({}).observe({
        added(doc) {
          added$.next(doc);
        },
        removed(doc) {
          removed$.next(doc);
        },
        changed(doc, od) {
          changed$.next(doc);
        },
      });
    });
    return {
      stop() {
        isub.unsubscribe();
        sub?.stop();
        ob?.stop();
      },
      changed$: changed$.asObservable(),
      removed$: removed$.asObservable(),
      added$: added$.asObservable(),
      ready$: isReady$.asObservable(),
    };
  }
  private call(name: string, query?: any, data?: any) {
    return new Observable<ServerResponse<any>>((suber) => {
      const startAt = Date.now();
      console.log(`[call ${name}] prepare`, query, data);
      return this.onceReady$.subscribe(() => {
        console.log(`[call ${name}] start`);
        this.connection.apply(name, [{ query, data }], (err: any, res: any) => {
          const timeused = Date.now() - startAt;
          console.log(`[call ${name}] result used ${timeused}`, err, res);
          if (suber.closed) {
            return;
          }
          if (err) {
            suber.error(err);
            return;
          }
          if (res?.__v !== "rest") {
            suber.next({
              data: res,
              ...createDataFetcher(res),
            });
          } else if (res?.error) {
            suber.error(res.error);
          } else {
            suber.next({
              ...res,
              ...createDataFetcher(res?.data),
            });
          }
          suber.complete();
        });
      });
    });
  }
  request<T = any>(name: string, method = "get", query?: any, data?: any) {
    return firstValueFrom<ServerResponse<T>>(
      this.call(method + "." + name, query, data)
    );
  }
  destroy(): void {
    this.connectTracker.stop();
    this.connection.disconnect();
  }
}
