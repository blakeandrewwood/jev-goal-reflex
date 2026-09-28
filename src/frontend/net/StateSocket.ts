import type { ClientMessage, Snapshot } from "../../shared/protocol";

const RECONNECT_MS = 1000;

export class StateSocket {
  private ws!: WebSocket;

  constructor(
    private readonly url: string,
    private readonly onSnapshot: (snapshot: Snapshot) => void,
  ) {
    this.connect();
  }

  send(message: ClientMessage) {
    this.ws.send(JSON.stringify(message));
  }

  private connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onmessage = (event) => this.onSnapshot(JSON.parse(event.data));
    this.ws.onclose = () => setTimeout(() => this.connect(), RECONNECT_MS);
  }
}
