"use strict";
import * as http from "http";
import * as fs from "fs";
import * as url from "url";
import * as querystring from "querystring";
import * as ServerManager from "./ServerManager";
import { MinecraftManager } from "./MinecraftManager";
import { BackgroundTasks } from "./BackgroundTasks";
import { RequestHandler, ServerRequest } from "./Common";

var extTypes = {
    "css": "text/css",
    "html": "text/html",
    "ico": "image/x-icon",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "js": "application/javascript",
    "png": "image/png",
    "svg": "image/svg+xml",
    "svgz": "image/svg+xml",
    "text": "text/plain",
    "tif": "image/tiff",
    "tiff": "image/tiff",
    "txt": "text/plain",
    "xml": "application/xml"
};
type extKey = keyof typeof extTypes;

interface ServerRequestParameters {
    id: string;
    r: string;
    p: any
    ts: number;
    response?: any;
}

function getFileType(fileName: string) {
    const i = fileName.lastIndexOf('.');
    const ext: extKey = (i < 0) ? '' as extKey : fileName.substr(i + 1).toLowerCase() as extKey;
    if (extTypes[ext])
        return extTypes[ext];
    return 'text/plain';
}

export namespace Server {
    const port = process.env.port || 3000;
    const allRoutes: { [k: string]: ServerRequest } = {};

    export function start() {
        var server = http.createServer();
        server.addListener("request", httpConnection);
        server.listen(port, function () {
            console.log('Server starting, listening on port ' + port);
        });
        registerRoutes([MinecraftManager.getInstance(), new ServerManager.ServerManager()]);
        BackgroundTasks.StartupBrackgroundTasks();
        return 0;
    }

    export function testRoute(route: string, parameters?: any) {
        return handleRequest({
            id: "",
            r: route,
            p: parameters,
            ts: new Date().getTime()
        });
    }

    function registerRoutes(handlers: RequestHandler[]) {
        handlers.forEach((handler) => {
            var routes = handler.getRoutes();
            for (var route in routes) {
                allRoutes[route] = routes[route];
            }
        });
    }
    function httpConnection(request: http.IncomingMessage, response: http.ServerResponse) {
        var content = "";

        request.addListener("data", function (chunk) {
            content += decodeURIComponent(chunk.toString('utf8'));
        });

        request.addListener("end", async () => {
            if (request.method === 'GET') {
                var fileName = resolveGetRequest(request);
                fs.readFile(fileName, function (a, b) {
                    writeFile(request, response, a, b);
                });
            }
            else if (request.method === 'POST') {
                var query = querystring.parse(content);
                try {
                    const data = await handleRequest(JSON.parse(query.ps as string));
                    response.end(JSON.stringify(data), () => {
                        response.destroy();
                    });
                } catch (e: any) {
                    writeError(response, 500, e.toString());
                }
            }
            else {
                writeError(response, 405, "Method Not Allowed");
            }
        });
    }

    function writeFile(request: http.IncomingMessage, response: http.ServerResponse, err: NodeJS.ErrnoException | null, file: Buffer) {
        if (err) {
            writeError(response, 404, 'File not found');
            return;
        }
        setHeader(response, getFileType(resolveGetRequest(request)), file.length);
        response.write(file, 'binary');
        response.end();
    }

    function resolveGetRequest(request: http.IncomingMessage) {
        var urlData = url.parse(request.url ?? "");
        var file = urlData.href.replace(urlData.search ?? "", '');
        if (file === '/') {
            file += 'index.html';
        }
        return '../webroot' + file;
    }

    function setHeader(response: http.ServerResponse, contentType: string, size: number) {
        if (size === null)
            size = 0;
        response.writeHead(200, {
            "Content-Type": contentType,
            "Date": new Date().toUTCString(),
            "Content-Length": size,
            "Connection": "close"
        });
    }

    function writeError(response: http.ServerResponse, code: number, message: string) {
        response.writeHead(code, {
            'Content-Type': 'text/plain'
        });
        response.write(message);
        response.end();
    }

    async function handleRequest(data: ServerRequestParameters): Promise<any> {
        if (!allRoutes[data.r]) {
            throw "Invalid Route";
        }
        try {
            let answer = await allRoutes[data.r](data.p);
            if (answer === null || !answer) {
                answer = '';
            }
            data.response = answer;
            return data;
        } catch (e) {
            console.log(e);
            throw "Server Error";
        }
    }
}
Server.start();
