import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';

const app = express();

// initialize a simple http server
const server = http.createServer(app);

const port: string | number = process.env.PORT || 8999

// initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

const playerStatuses = {
    connected: 1,
    findingMatch: 2
}

const playerMessages = {
    findMatch: 'FindMatch'
}

class APIResponse {
    static jsonResponse (status: number, data: any = null): string {
        return JSON.stringify({
            status,
            data
        })
    }
}

/**
 * The Player
 */
class Player {
    ws: WebSocket
    status: number
    constructor (ws: WebSocket, status: number) {
        this.ws = ws
        if (Object.values(playerStatuses).indexOf(status) === -1) {
            console.error('Invalid status')
            process.exit(0)
        }
        this.status = status
    }
}

interface IPlayers {
    [key: string]: Player
}

interface IGame {
    white: Player
    black: Player
}

const players: IPlayers = {}
const matchQueue: Array<string> = []
const games: Array<IGame> = []

wss.on('connection', (ws: WebSocket, request: http.IncomingMessage) => {
    const id = request.headers['sec-websocket-key']
    if (typeof id !== 'string') {
        console.log('Invalid Player')
        return
    }

    const player = new Player(ws, playerStatuses.connected)
    players[id] = player

    ws.on('message', (message: string) => {
        switch (message) {
            case playerMessages.findMatch:
                if (matchQueue.length === 0) {
                    // No player in queue
                    if (matchQueue.indexOf(id) === -1) {
                        matchQueue.push(id)
                    }
                } else {
                    // Match with another player
                    const playerIdToFace = matchQueue.pop()
                    if (playerIdToFace && playerIdToFace !== id) {
                        const opponent = players[playerIdToFace]
                        games.push({
                            white: opponent,
                            black: player
                        })
                        const response = APIResponse.jsonResponse(200, 'MatchFound')
                        player.ws.send(response)
                        opponent.ws.send(response)
                    }
                }
                break
            default:
                break
        }
    });

    ws.on('close', () => {
        matchQueue.splice(matchQueue.indexOf(id), 1)
        ws.send(APIResponse.jsonResponse(200, 'Disconnected'));
    })

    ws.send('Connected!!!');
});

//start our server
server.listen(port, () => {
    console.log(`Server started on port ${port} :)`);
});