import { WebApp } from "meteor/webapp";
import express, { RequestHandler } from "express";
import { MeteorServerInstance } from "../core/server";
import { Meteor } from "meteor/meteor";
import { getUserInfoByToken } from "../core/user";
import { RequestAuthData } from "../core/rest";
const app = express();

WebApp.connectHandlers.use((req, res) => {
  console.log(req.url, req.method);
  app(req, res);
});
app.use(express.json());
app.use((req, res, nex) => {
  if (typeof req.query?.json === "string") {
    try {
      const json = JSON.parse(decodeURIComponent(req.query.json));
      req.query = {
        ...req.query,
        ...json,
      };
    } catch (error) {
      //
    }
  }
  res.setHeader("Access-Control-Allow-Origin", "*");
  nex();
});
app.get("/hello", async (req, res) => {
  const servers = {} as {
    [key: string]: {
      count: number;
      url: string;
    };
  };
  for (const inst of await MeteorServerInstance.find({
    status: 1,
  }).fetchAsync()) {
    servers[inst.instanceId] = {
      count: inst.connectionCount,
      url: inst.ddpUrl,
    };
  }
  res.json({
    servers,
  });
});

const apiSuites = {} as {
  [key: string]: string[];
};

app.get("/ok", (_, res) => {
  res.sendStatus(200);
});

app.get("/apis", (_, res) => {
  res.send(apiSuites);
});

Meteor.startup(() => {
  const handlers = (Meteor as any).server.method_handlers as {
    [key: string]: Function;
  };
  console.log(`endpoints: ${Object.keys(handlers).length}`);
  for (const endp of Object.keys(handlers)) {
    const handler: RequestHandler = async (req, res, nex) => {
      const token =
        req.headers.authorization?.slice("JWT=".length).trim() || "";
      // console.log(token);
      let auth: RequestAuthData | null = null;
      if (token) {
        auth = await getUserInfoByToken(token);
      }
      console.log({
        token,
        auth,
      });
      try {
        const params = req.body || [];
        const ans = await handlers[endp]?.apply(
          {
            get userId() {
              return auth?.user.id;
            },
            connection: {
              auth,
            },
          },
          Array.isArray(params) ? params : params != undefined ? [params] : []
        );
        console.info(`${endp} answered `, ans);
        res.send(ans || { ok: true });
      } catch (error: any) {
        res.send({
          error: error?.messgae || String(error) || error,
        });
        console.info(`${endp} error `, error);
      }
    };
    let method = "";
    let path = "";
    if (endp.startsWith("get.")) {
      path = endp.slice(4);
      path = path.startsWith("/") ? path : "/" + path;
      method = "get";
      app.get(path, (req, res, nex) => {
        req.body = [
          {
            query: req.query,
            headers: req.headers,
          },
        ];
        handler(req, res, nex);
      });
    } else if (endp.startsWith("put.")) {
      method = "put";
      path = endp.slice(4);
      path = path.startsWith("/") ? path : "/" + path;
      app.put(path, (req, res, nex) => {
        req.body = [
          {
            query: req.query,
            data: req.body,
            headers: req.headers,
          },
        ];
        handler(req, res, nex);
      });
    } else if (endp.startsWith("delete.")) {
      method = "delete";
      path = endp.slice(7);
      path = path.startsWith("/") ? path : "/" + path;
      app.delete(path, (req, res, nex) => {
        req.body = [
          {
            query: req.query,
            data: req.body,
            headers: req.headers,
          },
        ];
        handler(req, res, nex);
      });
    } else if (endp.startsWith("post.")) {
      method = "post";
      path = endp.slice(5);
      path = path.startsWith("/") ? path : "/" + path;
      app.post(path, (req, res, nex) => {
        req.body = [
          {
            query: req.query,
            data: req.body,
            headers: req.headers,
          },
        ];
        handler(req, res, nex);
      });
    } else if (endp.endsWith("/insert")) {
      method = "post";
      path = endp.slice(0, -7);
      app.post(endp.slice(0, -7), handler);
    } else if (endp.endsWith("/update")) {
      method = "put";
      path = endp.slice(0, -7);
      app.put(endp.slice(0, -7), handler);
    } else if (endp.endsWith("/remove")) {
      method = "delete";
      path = endp.slice(0, -7);
      app.delete(endp.slice(0, -7), handler);
    } else {
      method = "post";
      path = endp.startsWith("/") ? endp : "/" + endp;
      // default and fallback
      app.post(path, handler);
    }
    if (!apiSuites[path]) {
      apiSuites[path] = [];
    }
    apiSuites[path].push(method);
    console.log(`${endp} => ${method} ：${path}`);
  }
});
