
      let global = globalThis;

      class MessageChannel {
        constructor() {
          this.port1 = new MessagePort();
          this.port2 = new MessagePort();
        }
      }
      class MessagePort {
        constructor() {
          this.onmessage = null;
        }
        postMessage(data) {
          if (this.onmessage) {
            setTimeout(() => this.onmessage({ data }), 0);
          }
        }
      }
      global.MessageChannel = MessageChannel;

      async function handleRequest(context){
        let routeParams = {};
        let pagesFunctionResponse = null;
        const request = context.request;
        const urlInfo = new URL(request.url);

        if (urlInfo.pathname !== '/' && urlInfo.pathname.endsWith('/')) {
          urlInfo.pathname = urlInfo.pathname.slice(0, -1);
        }

        let matchedFunc = false;
        
          if('/advanced-proxy' === urlInfo.pathname) {
            matchedFunc = true;
              (() => {
  // functions/advanced-proxy.js
  async function onRequest({ request }) {
    try {
      const url = new URL(request.url);
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) {
        return new Response("\u7F3A\u5C11\u76EE\u6807URL\u53C2\u6570", {
          status: 400,
          headers: { "Content-Type": "text/plain; charset=UTF-8" }
        });
      }
      console.log(`\u9AD8\u7EA7\u4EE3\u7406\u8BF7\u6C42: ${targetUrl}`);
      const headers = new Headers();
      const forwardHeaders = [
        "user-agent",
        "accept",
        "accept-language",
        "accept-encoding",
        "content-type",
        "referer",
        "cache-control"
      ];
      forwardHeaders.forEach((header) => {
        if (request.headers.get(header)) {
          headers.set(header, request.headers.get(header));
        }
      });
      const targetRequest = new Request(targetUrl, {
        method: request.method,
        headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? await request.blob() : void 0,
        redirect: "follow"
      });
      const response = await fetch(targetRequest);
      const responseHeaders = new Headers();
      for (const [key, value] of response.headers.entries()) {
        if (!["content-encoding", "content-length", "connection", "transfer-encoding"].includes(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      }
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("X-Proxied-By", "EdgeOne-Pages-Advanced-Proxy");
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        let html = await response.text();
        const requestUrl = new URL(request.url);
        const proxyBase = `${requestUrl.protocol}//${requestUrl.host}/advanced-proxy?url=`;
        const parsedTargetUrl = new URL(targetUrl);
        html = replaceLinksImproved(html, parsedTargetUrl, proxyBase);
        responseHeaders.set("Content-Type", "text/html; charset=UTF-8");
        return new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        });
      } else {
        const body = await response.arrayBuffer();
        return new Response(body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        });
      }
    } catch (error) {
      console.error(`\u4EE3\u7406\u8BF7\u6C42\u5931\u8D25: ${error.message}`);
      return new Response(`\u4EE3\u7406\u8BF7\u6C42\u5931\u8D25: ${error.message}`, {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
  function replaceLinksImproved(html, targetUrl, proxyBase) {
    const targetOrigin = targetUrl.origin;
    const targetHost = targetUrl.host;
    const targetPath = targetUrl.pathname;
    const currentDir = targetPath.substring(0, targetPath.lastIndexOf("/") + 1);
    html = html.replace(/(href|src)=(["'])(https?:\/\/[^"']+)(["'])/gi, (match, attr, quote1, url, quote2) => {
      if (url.includes("/advanced-proxy?url="))
        return match;
      return `${attr}=${quote1}${proxyBase}${encodeURIComponent(url)}${quote2}`;
    });
    html = html.replace(/(href|src)=(["'])\/\/([^"']+)(["'])/gi, (match, attr, quote1, url, quote2) => {
      const absoluteUrl = `${targetUrl.protocol}//${url}`;
      return `${attr}=${quote1}${proxyBase}${encodeURIComponent(absoluteUrl)}${quote2}`;
    });
    html = html.replace(/(href|src)=(["'])(\/[^"']*)(["'])/gi, (match, attr, quote1, path, quote2) => {
      return `${attr}=${quote1}${proxyBase}${encodeURIComponent(targetOrigin + path)}${quote2}`;
    });
    html = html.replace(
      /(href|src)=(["'])(?!https?:\/\/)(?!\/\/)(?!\/)(?!#)(?!javascript:)(?!data:)([^"']+)(["'])/gi,
      (match, attr, quote1, path, quote2) => {
        if (path.startsWith("./")) {
          path = path.substring(2);
        }
        let fullUrl;
        if (path.startsWith("?")) {
          fullUrl = targetOrigin + targetPath + path;
        } else {
          fullUrl = targetOrigin + (currentDir + path).replace(/\/\.?\//g, "/").replace(/\/+/g, "/");
        }
        return `${attr}=${quote1}${proxyBase}${encodeURIComponent(fullUrl)}${quote2}`;
      }
    );
    html = html.replace(/url\((["']?)([^)'"]+)(["']?)\)/gi, (match, quote1, url, quote2) => {
      if (url.startsWith("data:") || url.startsWith("#") || url.includes("/advanced-proxy?url=")) {
        return match;
      }
      let fullUrl;
      if (url.match(/^https?:\/\//i)) {
        fullUrl = url;
      } else if (url.startsWith("//")) {
        fullUrl = `${targetUrl.protocol}${url}`;
      } else if (url.startsWith("/")) {
        fullUrl = targetOrigin + url;
      } else {
        if (url.startsWith("./")) {
          url = url.substring(2);
        }
        fullUrl = targetOrigin + (currentDir + url).replace(/\/\.?\//g, "/").replace(/\/+/g, "/");
      }
      return `url(${quote1}${proxyBase}${encodeURIComponent(fullUrl)}${quote2})`;
    });
    html = html.replace(/action=(["'])(https?:\/\/[^"']+|\/[^"']+|[^"':]+)(["'])/gi, (match, quote1, url, quote2) => {
      if (url.includes("/advanced-proxy?url="))
        return match;
      let fullUrl;
      if (url.match(/^https?:\/\//i)) {
        fullUrl = url;
      } else if (url.startsWith("/")) {
        fullUrl = targetOrigin + url;
      } else {
        if (url.startsWith("./")) {
          url = url.substring(2);
        }
        fullUrl = targetOrigin + (currentDir + url).replace(/\/\.?\//g, "/").replace(/\/+/g, "/");
      }
      return `action=${quote1}${proxyBase}${encodeURIComponent(fullUrl)}${quote2}`;
    });
    return html;
  }

        pagesFunctionResponse = onRequest;
      })();
          }
        
          if('/' === urlInfo.pathname) {
            matchedFunc = true;
              (() => {
  // functions/index.js
  function onRequest(context) {
    return new Response(null, {
      status: 302,
      headers: {
        "Location": "/index.html"
      }
    });
  }

        pagesFunctionResponse = onRequest;
      })();
          }
        
          if('/proxy' === urlInfo.pathname) {
            matchedFunc = true;
              (() => {
  // functions/proxy.js
  async function onRequest({ request }) {
    try {
      const url = new URL(request.url);
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) {
        return new Response("\u7F3A\u5C11\u76EE\u6807URL\u53C2\u6570", {
          status: 400,
          headers: { "Content-Type": "text/plain; charset=UTF-8" }
        });
      }
      console.log(`\u4EE3\u7406\u8BF7\u6C42: ${targetUrl}`);
      const headers = new Headers();
      const forwardHeaders = [
        "user-agent",
        "accept",
        "accept-language",
        "accept-encoding",
        "content-type"
      ];
      forwardHeaders.forEach((header) => {
        if (request.headers.get(header)) {
          headers.set(header, request.headers.get(header));
        }
      });
      const targetRequest = new Request(targetUrl, {
        method: request.method,
        headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? await request.blob() : void 0,
        redirect: "follow"
      });
      const response = await fetch(targetRequest);
      const responseHeaders = new Headers();
      for (const [key, value] of response.headers.entries()) {
        if (!["content-encoding", "content-length", "connection"].includes(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      }
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("X-Proxied-By", "EdgeOne-Pages-Proxy");
      const body = await response.arrayBuffer();
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (error) {
      console.error(`\u4EE3\u7406\u8BF7\u6C42\u5931\u8D25: ${error.message}`);
      return new Response(`\u4EE3\u7406\u8BF7\u6C42\u5931\u8D25: ${error.message}`, {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }

        pagesFunctionResponse = onRequest;
      })();
          }
        

        const params = {};
        if (routeParams.id) {
          if (routeParams.mode === 1) {
            const value = urlInfo.pathname.match(routeParams.left);        
            for (let i = 1; i < value.length; i++) {
              params[routeParams.id[i - 1]] = value[i];
            }
          } else {
            const value = urlInfo.pathname.replace(routeParams.left, '');
            const splitedValue = value.split('/');
            if (splitedValue.length === 1) {
              params[routeParams.id] = splitedValue[0];
            } else {
              params[routeParams.id] = splitedValue;
            }
          }
          
        }
        if(!matchedFunc){
          pagesFunctionResponse = function() {
            return new Response(null, {
              status: 404,
              headers: {
                "content-type": "text/html; charset=UTF-8",
                "x-edgefunctions-test": "Welcome to use Pages Functions.",
              },
            });
          }
        }
        return pagesFunctionResponse({request, params, env: {} });
      }addEventListener('fetch',event=>{return event.respondWith(handleRequest({request:event.request,params: {}, env: {} }))});