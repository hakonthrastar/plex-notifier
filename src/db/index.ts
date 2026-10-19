import "server-only";
import { createDb } from "./client.ts";

export const db = createDb();
