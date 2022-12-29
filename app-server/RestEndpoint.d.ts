export type RequestAuthData = {
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  project: string;
  [key: string]: any;
};

export interface IUser {
  id: string;
  name: string;
  avatar: string;
}
export type Request<Q = any, D = any> = {
  _query: Q;
  _data: D;
  userId(check?: boolean): string;
  user(check?: boolean): Promise<IUser>;
  connId: string;
  meta?: {
    method: "get" | "post" | "put" | "delete";
  };
  query: DataFetcher;
  header: (key: string, def?: string) => string;
  data: DataFetcher;
  debug(config?: {
    query: boolean;
    data?: boolean;
    meta?: boolean;
    header?: boolean;
    response?: boolean;
    raw?: boolean;
    auth?: boolean;
  }): void;
  auth: DataFetcher;
};
export type Validator<T = any> = (k: T) => boolean | string | void | undefined;
export type SimpleFetcher<T> = (
  key: string,
  def?: T,
  validator?: Validator<T>
) => T;

export type DataFetcher = {
  str: SimpleFetcher<string>;
  obj: SimpleFetcher<any>;
  num: SimpleFetcher<number>;
  exist: <T = any>(key: string, validator?: Validator<T>) => T;
  arr: <T = any>(key: string, def?: T[], validator?: Validator<T[]>) => T[];
  arrSplit: <T = any>(
    key: string,
    transform?: "split" | "wrap",
    spliter?: string,
    validator?: Validator<T[]>
  ) => T[];
};
export type Connection = {
  auth: RequestAuthData;
  userId: string;
};
export type Response = {
  data: (d: any) => void;
  error: (code: number, reason: string, alert?: string) => void;
  log: (msg: string, level?: "log" | "error" | "record", data?: any) => void;
  assign: (d: { [key: string]: any }) => any;
};
export type MethodValidator = (
  req: Request,
  res: Response
) => Promise<void | boolean> | void | boolean;
export type MethodConfig = {
  validator?: MethodValidator;
};
export type routeHander<Q = any, D = any> = (
  req: Request<Q, D>,
  res: Response
) => Promise<void> | void | Promise<any>;

export interface RestEndpoint {
  get<Q = any, D = any>(cb: routeHander<Q, D>, conf?: MethodConfig): void;
  post<Q = any, D = any>(cb: routeHander<Q, D>, conf?: MethodConfig): void;
  put<Q = any, D = any>(cb: routeHander<Q, D>, conf?: MethodConfig): void;
  delete<Q = any, D = any>(cb: routeHander<Q, D>, conf?: MethodConfig): void;
  publish(func: any, conf?: any): void;
}
