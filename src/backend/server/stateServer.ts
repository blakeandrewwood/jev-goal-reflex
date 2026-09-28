import { WebSocket, WebSocketServer } from "ws";
import type { ClientMessage, Snapshot } from "../../shared/protocol";

/** Pushes engine snapshots to every connected viewer and forwards their messages. */
export class StateServer {
  onMessage: (message: ClientMessage) => void = () => {};
  private readonly server: WebSocketServer;

  constructor(port: number) {
    this.server = new WebSocketServer({ host: "localhost", port });
    this.server.on("listening", () => console.log(`WebSocket server on ws://localhost:${port}`));
    this.server.on("connection", (socket) => {
      socket.on("message", (raw) => this.onMessage(JSON.parse(raw.toString())));
      socket.on("error", () => socket.terminate()); // viewer vanished (tab closed, page reloaded)
    });
  }

  broadcast(snapshot: Snapshot) {
    const message = JSON.stringify(snapshot);
    for (const socket of this.server.clients) {
      if (socket.readyState === WebSocket.OPEN) socket.send(message);
    }
  }
}
