import "dotenv/config";
import { parseArgs } from "node:util";
import { Engine } from "./engine/engine";
import { StateServer } from "./server/stateServer";

const { values } = parseArgs({ options: { port: { type: "string", default: "8765" } } });

new Engine(new StateServer(Number(values.port))).run();
