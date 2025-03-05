import { Hono } from "hono";
import categories from "./routes/categories";
import questions from "./routes/questions";

const app = new Hono();

app.get("/", (c) => c.text("Hono API is running!"));

app.route("/categories", categories);
app.route("/questions", questions);

export default app;