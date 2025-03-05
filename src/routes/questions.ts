import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import xss from "xss";

const questions = new Hono();
const prisma = new PrismaClient();

//búa til nýja spurningu
questions.post("/", async (c) => {
    const body = await c.req.json();
    const schema = z.object({
        content: z.string().min(5),
        categoryId: z.string().uuid(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: "Invalid data" }, 400);
    }

    try {
        const newQuestion = await prisma.question.create({
            data: {
                content: xss(body.content),
                categoryId: body.categoryId,
            },
        });
        return c.json(newQuestion, 201);
    } catch (error) {
        return c.json({ error: "Internal Server Error" }, 500);
    }
});

//eyða spurningu
questions.delete("/:id", async (c) => {
    const { id } = c.req.param();
    try {
        await prisma.question.delete({ where: { id } });
        return c.newResponse(null, { status: 204 });
    } catch (error) {
        return c.json({ error: "Question not found" }, 404);
    }
});

export default questions;