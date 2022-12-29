import { DataFetcher, SimpleFetcher, Validator } from "./types";

export const createDataFetcher = (
  response: {
    error: (code: number, reason: string) => void;
  },
  source?: any
): DataFetcher => {
  let _str: SimpleFetcher<string>;
  let _obj: SimpleFetcher<any>;
  let _exist: any;
  console.log(typeof response.error);
  const useValidator = <T = any>(
    key: string,
    val: T,
    validator?: Validator<T>
  ) => {
    if (typeof validator !== "function") {
      return val;
    }
    const result = validator(val);
    if (result === false) {
      response.error(400, `${key} is not a valid `);
    } else if (typeof result === "string") {
      response.error(400, `${key} is not a valid : ${result} `);
    }
    return val;
  };
  return {
    get str() {
      if (!_str) {
        _str = (key, def, validator) => {
          let val = source?.[key];
          if (typeof val !== "string") {
            if (typeof def === "string") {
              return def;
            }
            console.error(source);
            response.error(400, `${key} is not a string`);
          }
          return useValidator(key, val, validator);
        };
      }
      return _str;
    },
    get obj() {
      if (!_obj) {
        _obj = (key, def, validator) => {
          const val = source?.[key];
          if (typeof val !== "object" || !val) {
            if (def) {
              return def;
            }
            console.error(source);
            response.error(400, `${key} is not a object`);
            return;
          }
          return useValidator(key, val, validator);
        };
      }
      return _obj;
    },
    exist(key, validator) {
      const val = source?.[key];
      if (
        val === undefined ||
        val === null ||
        Number.isNaN(val) ||
        val === ""
      ) {
        console.error(source);
        response.error(400, `${key} is not exist`);
      }
      return useValidator(key, val, validator);
    },
    num(key, def, validator) {
      const val = Number(source?.[key]);
      if (typeof val !== "number" || Number.isNaN(val)) {
        if (typeof def === "number") {
          return def;
        }
        console.error(source);
        response.error(400, `${key} is not a number`);
      }
      return useValidator(key, val, validator);
    },
    arr(key, def, validator) {
      let val = source?.[key];
      if (Array.isArray(val)) {
        return useValidator(key, val, validator);
      }
      if (Array.isArray(def)) {
        return def;
      }
      console.error(source);
      response.error(400, `${key} is not a array`);
      return [];
    },
    arrSplit(key, transform, spliter, validator) {
      let val = source?.[key];
      if (Array.isArray(val)) {
        return useValidator(key, val, validator);
      }
      if (val === undefined || val === null) {
        console.error(source);
        response.error(400, `${key} is not a array`);
      }
      if (transform === "split") {
        if (typeof val === "string") {
          return useValidator(
            key,
            val.split(spliter || ";").map((v) => !!v) as any[],
            validator
          );
        }
        response.error(
          400,
          `${key} is not a string with ${spliter || ";"} connected`
        );
      }
      return useValidator(key, [val], validator);
    },
  };
};
