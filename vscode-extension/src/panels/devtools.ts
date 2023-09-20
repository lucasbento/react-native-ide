const http = require("http");
const { Server } = require("ws");

export class Devtools {
  private server: any;
  private socket: any;
  private listeners: Set<(event: string, payload: any) => void> = new Set();

  constructor({ port }: { port: number }) {
    this.server = http.createServer(() => {});
    const wss = new Server({ server: this.server });

    wss.on("connection", (ws: any) => {
      console.log("Client connected");
      this.socket = ws;

      // When data is received from a client
      ws.on("message", (message: string) => {
        try {
          const { event, payload } = JSON.parse(message);
          this.listeners.forEach((listener) => listener(event, payload));
        } catch (e) {
          console.log("Error", e);
        }
      });
    });

    this.server.listen(port, () => {});
  }

  public shutdown() {
    this.server.close();
  }

  public send(event: string, payload?: any) {
    this.socket?.send(JSON.stringify({ event, payload }));
  }

  public rpc(event: string, payload: any, responseEvent: string, callback: (payload: any) => void) {
    const listener = (event: string, payload: any) => {
      if (event === responseEvent) {
        callback(payload);
        this.removeListener(listener);
      }
    };

    this.addListener(listener);
    this.send(event, payload);
  }

  public addListener(listener: (event: string, payload: any) => void) {
    this.listeners.add(listener);
  }

  public removeListener(listener: (event: string, payload: any) => void) {
    this.listeners.delete(listener);
  }
}
