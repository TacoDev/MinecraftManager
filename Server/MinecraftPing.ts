import * as dgram from "dgram";

export type PingOptions = {
    host: string;
    port: number;
    timeout?: number
};

export namespace MinecraftPing {

    export function pingJava(options: PingOptions): Promise<PingResponse> {
        return new Promise((resolve: (response: PingResponse) => void, reject: (error: Error) => void) => {
            var host = options.host;
            var port = options.port;
            var udp = dgram.createSocket('udp4');
            var STARTED = 0;
            var SENT_CHALLENGE_REQUEST = 1;
            var SENT_STATUS_REQUEST = 2;
            var DONE = 3;
            var state = 0;
            udp.on('error', function (err) {
                reject(err);
                udp.close();
            });
            udp.on('message', function (msg, rinfo) {
                if (state === STARTED) {
                    reject(new Error('received unexpected packet before sent anything'));
                    return;
                }
                else if (state === SENT_CHALLENGE_REQUEST) {
                    if (msg[0] != 0x09) {
                        reject(new Error('unexpected packet received after sent challenge request'));
                        return;
                    }
                    var challengeTokenString = msg.slice(5).toString();
                    var challengeTokenInt = parseInt(challengeTokenString);
                    var challengeTokenBuffer = Buffer.alloc(4);
                    challengeTokenBuffer.writeUInt32BE(challengeTokenInt, 0);
                    var statusRequest = Buffer.from('fefd' +
                        '00' +
                        '00000000' +
                        challengeTokenBuffer.toString('hex') +
                        '00000000', 'hex');
                    udp.send(statusRequest, 0, statusRequest.length, port, host, function () {
                        state = SENT_STATUS_REQUEST;
                    });
                }
                else if (state === SENT_STATUS_REQUEST) {
                    var array = msg.toString('binary').split('\0');
                    var result: PingResponse = {
                        worldHeight: array[6].charCodeAt(0),
                        motd: array[8],
                        gameType: array[10],
                        gameName: array[12],
                        gameVersion: array[14],
                        plugins: array[16],
                        defaultWorld: array[18],
                        numPlayers: parseInt(array[20]),
                        maxPlayers: parseInt(array[22]),
                        host: options.host,
                        port: options.port,
                        players: [] as string[]
                    };
                    for (var i = 0; i < result.numPlayers; i++) {
                        result.players.push(array[30 + i]);
                    }
                    state = DONE;
                    resolve(result);
                    udp.close();
                }
            });
            udp.on('listening', function () {
                var request = Buffer.from('fefd090000000000000000', 'hex');
                udp.send(request, 0, request.length, port, host, function () {
                    state = SENT_CHALLENGE_REQUEST;
                });
            });
            udp.bind();
            setTimeout(() => {
                try {
                    udp.close();
                } catch (e) { }
                reject(new Error(`Ping Timeout ${options.host}:${options.port}`));
            }, options.timeout || 1500);
        });
    }
}